import { promises as fs } from 'fs';
import path from 'path';
import globby from 'globby';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const SIZE_LIMIT = 1024 * 1024;
const argv = yargs(hideBin(process.argv))
  .option('dry-run', { type: 'boolean', default: false, desc: 'Scan only' })
  .option('limit', { type: 'number', desc: 'Stop after N issues' })
  .help().argv;

/**
 * Recursively collect image nodes from a Markdown AST.
 * @param {object} node AST node.
 * @param {object[]} acc accumulator.
 * @param {string} content full markdown.
 * @returns {object[]} list of images.
 */
function collectMdImages(node, acc, content) {
  if (node.type === 'image') {
    acc.push({
      url: node.url,
      start: node.position.start.offset,
      end: node.position.end.offset,
      full: content.slice(node.position.start.offset, node.position.end.offset)
    });
  }
  if (node.children) node.children.forEach(c => collectMdImages(c, acc, content));
  return acc;
}

/**
 * Extract images from markdown or html content.
 * @param {string} content file contents.
 * @param {string} ext file extension.
 * @returns {object[]} list with url, full, start, end.
 */
function extractImages(content, ext) {
  if (ext.match(/md|markdown/)) {
    const tree = unified().use(remarkParse).parse(content);
    return collectMdImages(tree, [], content);
  }
  const out = [];
  const re = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(content))) {
    out.push({ url: m[1], full: m[0], start: m.index, end: re.lastIndex });
  }
  return out;
}

/**
 * Find case-insensitive match for a filename.
 * @param {string} dir directory.
 * @param {string} name file name.
 * @returns {Promise<string|null>} corrected name or null.
 */
async function findCaseMatch(dir, name) {
  const files = await fs.readdir(dir).catch(() => []);
  const match = files.find(f => f.toLowerCase() === name.toLowerCase());
  return match || null;
}

/**
 * Generate three WebP versions and return metadata.
 * @param {string} abs absolute image path.
 * @returns {Promise<{paths:string[],meta:object,saved:number}>}
 */
async function createWebps(abs) {
  const img = sharp(abs);
  const meta = await img.metadata();
  const widths = [320, 768, meta.width];
  const paths = [];
  let saved = 0;
  for (const w of widths) {
    const out = abs.replace(/\.[^.]+$/, `-${w}.webp`);
    await img.resize({ width: w }).webp().toFile(out);
    const s = await fs.stat(out);
    saved += s.size;
    paths.push(path.relative(process.cwd(), out).split(path.sep).join('/'));
  }
  return { paths, meta, saved };
}

/**
 * Build <picture> HTML snippet.
 * @param {string[]} paths webp paths.
 * @param {string} original original image src.
 * @param {object} meta sharp metadata.
 * @returns {string} HTML snippet.
 */
function pictureHTML(paths, original, meta) {
  const srcset = paths
    .map((p, i) => `${p} ${[320, 768, meta.width][i]}w`)
    .join(', ');
  return `<picture><source type="image/webp" srcset="${srcset}"><img src="${original}" width="${meta.width}" height="${meta.height}"></picture>`;
}

/**
 * Check an image reference and create fixes if needed.
 * @param {string} src image path.
 * @param {string} dir base directory.
 * @returns {Promise<{status:string,fix:object,bytes:number}>}
 */
async function auditImage(src, dir) {
  const result = { status: 'OK', fix: {}, bytes: 0 };
  const local = !/^https?:/.test(src) && !src.startsWith('//');
  if (local) {
    const abs = path.resolve(dir, src);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) {
      const match = await findCaseMatch(path.dirname(abs), path.basename(src));
      if (match) {
        result.fix.correctedPath = path
          .relative(dir, path.join(path.dirname(abs), match))
          .split(path.sep)
          .join('/');
      } else {
        result.status = 'Missing';
      }
    } else if (stat.size > SIZE_LIMIT) {
      result.status = 'Oversize';
      const { paths, meta, saved } = await createWebps(abs);
      result.bytes = stat.size - saved;
      result.fix.webp = { paths, meta, original: src };
    }
  } else {
    const ok = await fetch(src, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
    if (!ok) result.status = 'Missing';
  }
  return result;
}

/**
 * Apply patches to content.
 * @param {string} content original content.
 * @param {object[]} patches list of {start,end,replacement}.
 * @returns {string} patched content.
 */
function applyPatches(content, patches) {
  patches.sort((a, b) => a.start - b.start);
  let offset = 0;
  for (const p of patches) {
    content =
      content.slice(0, p.start + offset) +
      p.replacement +
      content.slice(p.end + offset);
    offset += p.replacement.length - (p.end - p.start);
  }
  return content;
}

/**
 * Print audit table to console.
 * @param {object[]} rows audit rows.
 */
function printTable(rows) {
  const data = rows.map(r => ({
    File: r.file,
    Image: r.src,
    Status:
      r.status === 'OK'
        ? chalk.green('OK')
        : r.status === 'Missing'
        ? chalk.yellow('Missing')
        : chalk.red('Oversize'),
    'Bytes Saved': r.bytes ? `${(r.bytes / 1024).toFixed(1)}KB` : ''
  }));
  console.table(data);
}

/**
 * Main runner.
 */
async function run() {
  const files = await globby(['**/*.{html,htm,md,markdown}'], { gitignore: true });
  const report = [];
  let issues = 0;
  outer: for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const dir = path.dirname(file);
    let content = await fs.readFile(file, 'utf8');
    const imgs = extractImages(content, ext);
    const patches = [];
    for (const img of imgs) {
      const { status, fix, bytes } = await auditImage(img.url, dir);
      report.push({ file, src: img.url, status, bytes });
      if (status !== 'OK') issues++;
      let replacement = img.full;
      if (fix.correctedPath) {
        replacement = img.full.replace(img.url, fix.correctedPath);
      }
      if (fix.webp) {
        replacement = pictureHTML(fix.webp.paths, replacement.includes('src=') ? fix.webp.original : img.url, fix.webp.meta);
      }
      if (replacement !== img.full) {
        patches.push({ start: img.start, end: img.end, replacement });
      }
      if (argv.limit && issues >= argv.limit) break outer;
    }
    const updated = applyPatches(content, patches);
    if (!argv['dry-run'] && updated !== content) await fs.writeFile(file, updated);
  }
  if (!argv['dry-run'])
    await fs.writeFile('audit-report.json', JSON.stringify(report, null, 2));
  printTable(report);
  if (issues) process.exit(1);
}

run();
