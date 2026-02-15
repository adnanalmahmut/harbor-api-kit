// export-project.js
// يدمج كل ملفات المشروع في ملف نصي واحد مع ترويسة "# FILE: <path>"

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'project-dump.txt');

// الامتدادات المراد تضمينها
const INCLUDE_EXT = new Set(['.ts', '.js', '.json', '.prisma', '.md', '.mjs']);

// الملفات والمجلدات المستثناة
const EXCLUDE_PATH_PARTS = [
  'playground',
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'package-lock.json',
  'export-project.js',
  'project-dump.txt',
  'prisma_client_types.d.ts',
  'README.md',
  'LICENSE',
  'tsconfig.build.json',
  'prisma.config.js.map',
  'prisma.config.js',
  'generated',
  'tsconfig.build.tsbuildinfo',
];

function shouldExclude(filePath) {
  return EXCLUDE_PATH_PARTS.some((part) => filePath.includes(part));
}

function shouldInclude(filePath) {
  const ext = path.extname(filePath);
  return INCLUDE_EXT.has(ext);
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

    if (shouldExclude(relPath)) continue;

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && shouldInclude(relPath)) {
      files.push(relPath);
    }
  }

  return files;
}

function main() {
  console.log('Scanning project...');
  const files = walk(ROOT_DIR).sort();

  console.log(`Found ${files.length} files to export.`);

  const writeStream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

  for (const relPath of files) {
    console.log(`Writing: ${relPath}`);
    const content = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');

    writeStream.write(`# FILE: ${relPath}\n`);
    writeStream.write(content);
    writeStream.write('\n\n');
  }

  writeStream.end(() => {
    console.log(`Done. Output written to: ${OUTPUT_FILE}`);
  });
}

main();
