#!/usr/bin/env node
/**
 * scripts/css-usage.mjs
 *
 * Scans src/ for usage of every CSS class defined in src/index.css.
 * Produces docs/ui/css-usage.md: for each class, the list of files that use it,
 * and a "SHARED" flag when used by more than one page file.
 *
 * Usage: node scripts/css-usage.mjs
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CSS_FILE = join(ROOT, 'src', 'index.css');
const SRC_DIR = join(ROOT, 'src');
const OUT_DIR = join(ROOT, 'docs', 'ui');
const OUT_FILE = join(OUT_DIR, 'css-usage.md');

/**
 * Extract class names from a CSS file.
 * Handles simple selectors like .className, .className.modifier, .parent .className,
 * and combined selectors like .a, .b. Also handles pseudo-classes like .btn:hover,
 * ::before, ::after, :last-child, etc.
 */
function extractCssClasses(css) {
  const classes = new Map(); // className -> { base, files }

  // Remove comments
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Split into rule blocks by finding selector lists before { ... }
  const ruleRegex = /([^{]+)\{[\s\S]*?\}/g;
  let match;

  while ((match = ruleRegex.exec(noComments)) !== null) {
    const selectorList = match[1];
    const selectors = selectorList.split(',');

    for (const sel of selectors) {
      const trimmed = sel.trim();
      if (!trimmed) continue;

      // Find all .className tokens in this selector
      const classRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
      let classMatch;

      while ((classMatch = classRegex.exec(trimmed)) !== null) {
        const className = classMatch[1];

        if (!classes.has(className)) {
          classes.set(className, {
            base: className,
            files: new Set(),
          });
        }
      }
    }
  }

  return classes;
}

/**
 * Recursively list all .tsx and .ts files under a directory.
 */
function listSourceFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Scan a source file for usage of each CSS class.
 * Only matches class names inside JSX className="..." / class="..." attributes
 * and template literals, not bare word occurrences in TypeScript code.
 */
function scanFileForClasses(filePath, classNames) {
  const content = readFileSync(filePath, 'utf8');
  const found = new Set();

  // Extract all string contents from className="..." / class="..." attributes
  // and template literals className={`...`} / class={`...`}
  const classAttrRegex = /(?:className|class)\s*=\s*([`"'])(?:(?!\1).)*?\1/g;
  let attrMatch;
  const allClassStrings = [];

  while ((attrMatch = classAttrRegex.exec(content)) !== null) {
    const quote = attrMatch[1];
    const fullMatch = attrMatch[0];
    // Extract the inner content (between quotes/backticks)
    const inner = fullMatch.slice(fullMatch.indexOf(quote) + 1, fullMatch.lastIndexOf(quote));
    allClassStrings.push(inner);
  }

  const joinedClassStrings = allClassStrings.join(' ');

  for (const className of classNames) {
    // Match the class name as a whitespace-delimited token within class strings
    const pattern = new RegExp(`(?:^|\\s)${className}(?:\\s|$)`);
    if (pattern.test(joinedClassStrings)) {
      found.add(className);
    }
  }

  return found;
}

/**
 * Determine if a file path is a "page" file.
 * Page files are in src/pages/ or are top-level route components.
 */
function isPageFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const rel = norm.replace(SRC_DIR.replace(/\\/g, '/') + '/', '');
  return rel.startsWith('pages/') || rel.startsWith('shell/') || rel === 'App.tsx';
}

/**
 * Main.
 */
const css = readFileSync(CSS_FILE, 'utf8');
const classes = extractCssClasses(css);
const sourceFiles = listSourceFiles(SRC_DIR);

// Scan each file
const classToFiles = new Map(); // className -> Set<filePath>

for (const file of sourceFiles) {
  const found = scanFileForClasses(file, Array.from(classes.keys()));
  for (const className of found) {
    if (!classToFiles.has(className)) {
      classToFiles.set(className, new Set());
    }
    classToFiles.get(className).add(file);
  }
}

// Build report
const lines = [];
lines.push('# CSS Class Usage Report');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Source CSS: \`src/index.css\``);
lines.push(`Source files scanned: ${sourceFiles.length}`);
lines.push(`Total classes defined: ${classes.size}`);
lines.push(`Total classes used: ${classToFiles.size}`);
lines.push(`Total classes unused: ${classes.size - classToFiles.size}`);
lines.push('');
lines.push('## Classes (alphabetical)');
lines.push('');
lines.push('| Class | Files | SHARED |');
lines.push('|-------|-------|--------|');

const sortedClasses = Array.from(classToFiles.entries()).sort((a, b) => a[0].localeCompare(b[0]));

let sharedCount = 0;
let pageFileCount = 0;

for (const [className, files] of sortedClasses) {
  const fileList = Array.from(files).sort();
  const pageFiles = fileList.filter(f => isPageFile(f));
  const isShared = pageFiles.length > 1;
  const fileLinks = fileList.map(f => {
    const norm = f.replace(/\\/g, '/');
    const rel = norm.replace(ROOT.replace(/\\/g, '/') + '/', '');
    return `\`${rel}\``;
  }).join(', ');

  if (isShared) sharedCount++;
  if (pageFiles.length > 0) pageFileCount++;

  lines.push(`| \`.${className}\` | ${fileLinks} | ${isShared ? 'SHARED' : '—'} |`);
}

// Unused classes
const unusedClasses = Array.from(classes.keys()).filter(c => !classToFiles.has(c));
if (unusedClasses.length > 0) {
  lines.push('');
  lines.push('## Unused classes (defined but not referenced in src/)');
  lines.push('');
  for (const c of unusedClasses.sort()) {
    lines.push(`- \`.${c}\``);
  }
}

lines.push('');
lines.push('## Summary');
lines.push(`- Shared classes (used by multiple pages): ${sharedCount}`);
lines.push(`- Page files referencing CSS: ${pageFileCount}`);

// Ensure output directory exists
try { readdirSync(OUT_DIR); } catch { mkdirSync(OUT_DIR, { recursive: true }); }

writeFileSync(OUT_FILE, lines.join('\n') + '\n');
console.log(`Wrote ${OUT_FILE}`);