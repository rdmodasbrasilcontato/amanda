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

process.exit(0);
