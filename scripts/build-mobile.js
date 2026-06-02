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

try {
  // Move api folder out
  fs.renameSync(actualApiSrc, apiDest);

  // Run the Next.js static export build
  execSync('cross-env NEXT_MOBILE_BUILD=true next build', {
    stdio: 'inherit',
    cwd: root,
  });

} catch (err) {
  console.error('Build failed:', err.message);
} finally {
  // ALWAYS restore api folder, even if build failed
  if (fs.existsSync(apiDest)) {
    console.log('Restoring api folder...');
    fs.renameSync(apiDest, actualApiSrc);
    console.log('Api folder restored.');
  }
}
