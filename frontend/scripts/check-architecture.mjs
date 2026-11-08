import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

const cssFiles = walk(srcRoot, (filePath) => filePath.endsWith('.css')).map(rel);
assert.deepEqual(
  cssFiles,
  ['src/styles/globals.css'],
  `Expected only src/styles/globals.css to remain, found: ${cssFiles.join(', ')}`
);

const formTsxFiles = walk(path.join(srcRoot, 'forms'), (filePath) => filePath.endsWith('.tsx')).map(rel);
assert.equal(
  formTsxFiles.length,
  0,
  `Expected src/forms to contain only pure .ts modules, found: ${formTsxFiles.join(', ')}`
);

for (const filePath of walk(path.join(srcRoot, 'forms'), (candidate) => candidate.endsWith('.ts'))) {
  const source = fs.readFileSync(filePath, 'utf8');
  assert.ok(!source.includes('react/jsx-runtime'), `${rel(filePath)} still contains JSX runtime output`);
}

for (const filePath of walk(path.join(srcRoot, 'api'), (candidate) => candidate.endsWith('.ts'))) {
  const source = fs.readFileSync(filePath, 'utf8');
  assert.ok(!/export\s+(interface|type)\s+/m.test(source), `${rel(filePath)} still defines exported types directly`);
}

const codeFiles = walk(srcRoot, (candidate) => /\.(ts|tsx)$/.test(candidate));
for (const filePath of codeFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.trim().split('\n');
  assert.ok(lines.length > 1, `${rel(filePath)} looks like a 1-line proxy file`);
  assert.ok(lines.length <= 400, `${rel(filePath)} exceeds 400 lines (${lines.length} lines)`);
}

const routePages = walk(path.join(srcRoot, 'app'), (candidate) => candidate.endsWith('page.tsx'));
for (const filePath of routePages) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  assert.ok(lines.length <= 20, `${rel(filePath)} should be a thin route entry (found ${lines.length} lines)`);
}

console.log(`Architecture check passed (${codeFiles.length} TypeScript/TSX modules verified).`);
