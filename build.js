const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const tscPath = path.join(
  __dirname,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);

if (!fs.existsSync(tscPath)) {
  console.error(`tsc não encontrado em ${tscPath}. Rode "npm install" primeiro.`);
  process.exit(1);
}

const result = spawnSync(
  tscPath,
  ['-p', 'tsconfig.json'],
  { stdio: 'inherit', shell: true }
);

if (result.status !== 0) {
  console.log(
    `\n⚠️  tsc reportou erros de tipo (exit ${result.status}), mas o dist/ foi emitido (noEmitOnError=false no tsconfig). Continuando.`
  );
}

// Copy src/prompts/ → dist/prompts/ (tsc ignores non-ts files)
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const srcPrompts = path.join(__dirname, 'src', 'prompts');
const distPrompts = path.join(__dirname, 'dist', 'prompts');

if (fs.existsSync(srcPrompts)) {
  copyDirSync(srcPrompts, distPrompts);
  console.log('✅ src/prompts/ copiado para dist/prompts/');
} else {
  console.warn('⚠️  src/prompts/ não encontrado — prompts não copiados para dist/');
}

const srcDashboard = path.join(__dirname, 'src', 'dashboard');
const distDashboard = path.join(__dirname, 'dist', 'dashboard');

if (fs.existsSync(srcDashboard)) {
  copyDirSync(srcDashboard, distDashboard);
  console.log('✅ src/dashboard/ copiado para dist/dashboard/');
} else {
  console.warn('⚠️  src/dashboard/ não encontrado — dashboard não copiado para dist/');
}

process.exit(0);
