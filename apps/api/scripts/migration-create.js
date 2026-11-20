const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const apiRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(apiRoot, 'src', 'database', 'migrations');
const args = process.argv.slice(2);

const nameIndex = args.findIndex((arg) => !arg.startsWith('-'));
const rawName = nameIndex !== -1 ? args[nameIndex].trim() : '';

if (!rawName) {
  console.error('Error: Migration name is required.');
  console.error('Usage: npm run migration:create -- <Name>');
  console.error('Example: npm run migration:create -- AddTaskPriority');
  process.exit(1);
}

const cleanName = path.basename(rawName).replace(/\.ts$/i, '');
if (!cleanName || cleanName === '.' || cleanName === '..') {
  console.error(`Error: Invalid migration name "${rawName}".`);
  process.exit(1);
}

fs.mkdirSync(migrationsDir, { recursive: true });

const targetPath = path.posix.join('src', 'database', 'migrations', cleanName);
const extraArgs = args.filter((_, idx) => idx !== nameIndex);

const cliBin = path.join(
  apiRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32'
    ? 'typeorm-ts-node-commonjs.cmd'
    : 'typeorm-ts-node-commonjs',
);

const cliArgs = ['migration:create', targetPath, ...extraArgs];

let result;
if (fs.existsSync(cliBin)) {
  result = spawnSync(cliBin, cliArgs, {
    cwd: apiRoot,
    stdio: 'inherit',
  });
} else {
  const cliJs = require.resolve('typeorm/cli-ts-node-commonjs', {
    paths: [apiRoot],
  });
  result = spawnSync(process.execPath, [cliJs, ...cliArgs], {
    cwd: apiRoot,
    stdio: 'inherit',
  });
}

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
