const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Resolve paths relative to project root
const root = path.resolve(__dirname, '..');
const apiSrc = path.join(root, 'src', 'app', 'api');
const apiDest = path.join(root, 'api_temp_mobile_excluded');

// Check if api folder is under src/app or app (handle both structures)
const apiSrcAlt = path.join(root, 'app', 'api');
const actualApiSrc = fs.existsSync(apiSrc) ? apiSrc : apiSrcAlt;

if (!fs.existsSync(actualApiSrc)) {
  console.error('Could not find app/api directory at:', actualApiSrc);
  process.exit(1);
}

console.log('Moving api folder temporarily:', actualApiSrc, '->', apiDest);

const actionsSrc = path.join(root, 'src', 'lib', 'actions.ts');
const actionsDest = path.join(root, 'src', 'lib', 'actions.ts.backup');
const reportActionsSrc = path.join(root, 'src', 'lib', 'reportActions.ts');
const reportActionsDest = path.join(root, 'src', 'lib', 'reportActions.ts.backup');

function createMock(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)/g;
    let match;
    const functions = [];
    while ((match = regex.exec(content)) !== null) {
        functions.push(match[1]);
    }
    const mockContent = functions.map(fn => `export async function ${fn}(...args: any[]): Promise<any> { throw new Error('Not available in mobile build'); }`).join('\n');
    return mockContent;
}

const actionsMock = createMock(actionsSrc);
const reportActionsMock = createMock(reportActionsSrc);

let buildFailed = false;

const tsconfigPath = path.join(root, 'tsconfig.json');
let originalTsconfig = null;
const dynamicFiles = [];

try {
  // Move api folder out
  fs.renameSync(actualApiSrc, apiDest);

  // Exclude api_temp from tsconfig and disable strict
  if (fs.existsSync(tsconfigPath)) {
      originalTsconfig = fs.readFileSync(tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(originalTsconfig);
      if (!tsconfig.exclude) tsconfig.exclude = [];
      if (!tsconfig.exclude.includes('api_temp_mobile_excluded')) {
          tsconfig.exclude.push('api_temp_mobile_excluded');
      }
      if (tsconfig.compilerOptions) {
          tsconfig.compilerOptions.noImplicitAny = false;
          tsconfig.compilerOptions.strict = false;
      }
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }

  // Strip force-dynamic from all page.tsx files
  function stripDynamic(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
              stripDynamic(fullPath);
          } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
              const content = fs.readFileSync(fullPath, 'utf8');
              if (content.includes('export const dynamic')) {
                  const newContent = content.replace(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"];?/g, '// export const dynamic stripped by mobile build');
                  if (content !== newContent) {
                      dynamicFiles.push({ path: fullPath, original: content });
                      fs.writeFileSync(fullPath, newContent);
                  }
              }
          }
      }
  }
  stripDynamic(path.join(root, 'src', 'app'));

  // Swap actions with mocks
  if (actionsMock) {
      fs.renameSync(actionsSrc, actionsDest);
      fs.writeFileSync(actionsSrc, actionsMock);
  }
  if (reportActionsMock) {
      fs.renameSync(reportActionsSrc, reportActionsDest);
      fs.writeFileSync(reportActionsSrc, reportActionsMock);
  }

  // Run the Next.js static export build using webpack
  execSync('cross-env NEXT_MOBILE_BUILD=true next build --webpack', {
    stdio: 'inherit',
    cwd: root,
  });

} catch (err) {
  console.error('Build failed:', err.message);
  buildFailed = true;
} finally {
  // ALWAYS restore api folder, even if build failed
  if (fs.existsSync(apiDest)) {
    console.log('Restoring api folder...');
    fs.renameSync(apiDest, actualApiSrc);
    console.log('Api folder restored.');
  }
  // Restore tsconfig
  if (originalTsconfig) {
      console.log('Restoring tsconfig.json...');
      fs.writeFileSync(tsconfigPath, originalTsconfig);
  }
  // Restore dynamic files
  if (dynamicFiles && dynamicFiles.length > 0) {
      console.log(`Restoring ${dynamicFiles.length} files with force-dynamic...`);
      for (const file of dynamicFiles) {
          fs.writeFileSync(file.path, file.original);
      }
  }
  // Restore actions
  if (fs.existsSync(actionsDest)) {
      console.log('Restoring actions.ts...');
      fs.renameSync(actionsDest, actionsSrc);
  }
  if (fs.existsSync(reportActionsDest)) {
      console.log('Restoring reportActions.ts...');
      fs.renameSync(reportActionsDest, reportActionsSrc);
  }
}

if (buildFailed) {
  console.error('Mobile build failed. api folder has been restored. Fix errors and retry.');
  process.exit(1);
}

console.log('Build succeeded. api folder restored.');
