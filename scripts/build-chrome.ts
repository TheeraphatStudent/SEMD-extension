import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const outDir = path.join(rootDir, 'out', 'chrome');
const manifestsDir = path.join(rootDir, 'manifests');

async function build() {
  console.log('🚀 Building SEMD Chrome Extension...\n');

  // Clean output directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Step 1: Build Next.js app
  console.log('📦 Building Next.js application...');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Next.js build completed\n');
  } catch (error) {
    console.error('❌ Next.js build failed');
    process.exit(1);
  }

  // Step 2: Copy Next.js static output
  console.log('📁 Copying Next.js static files...');
  const nextOutDir = path.join(rootDir, 'out');
  if (fs.existsSync(nextOutDir)) {
    copyDirectory(nextOutDir, outDir, ['chrome', 'firefox']);
    console.log('✅ Static files copied\n');
  }

  // Step 3: Bundle background script with esbuild
  console.log('🔧 Bundling background script...');
  try {
    await esbuild.build({
      entryPoints: [path.join(srcDir, 'extension', 'background', 'index.ts')],
      bundle: true,
      outfile: path.join(outDir, 'background.js'),
      format: 'esm',
      platform: 'browser',
      target: ['chrome90'],
      minify: true,
      sourcemap: false,
    });
    console.log('✅ Background script bundled\n');
  } catch (error) {
    console.error('❌ Background script bundling failed:', error);
    process.exit(1);
  }

  // Step 4: Bundle content script with esbuild
  console.log('🔧 Bundling content script...');
  try {
    await esbuild.build({
      entryPoints: [path.join(srcDir, 'extension', 'content', 'index.ts')],
      bundle: true,
      outfile: path.join(outDir, 'content.js'),
      format: 'iife',
      platform: 'browser',
      target: ['chrome90'],
      minify: true,
      sourcemap: false,
    });
    console.log('✅ Content script bundled\n');
  } catch (error) {
    console.error('❌ Content script bundling failed:', error);
    process.exit(1);
  }

  // Step 5: Copy manifest
  console.log('📋 Copying manifest...');
  const manifestSrc = path.join(manifestsDir, 'manifest.chrome.json');
  const manifestDest = path.join(outDir, 'manifest.json');
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('✅ Manifest copied\n');

  // Step 6: Copy/create icons
  console.log('🎨 Setting up icons...');
  const iconsDir = path.join(outDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const publicIconsDir = path.join(rootDir, 'public', 'icons');
  if (fs.existsSync(publicIconsDir)) {
    copyDirectory(publicIconsDir, iconsDir);
  } else {
    // Create placeholder icons
    [16, 32, 48, 128].forEach((size) => {
      const iconPath = path.join(iconsDir, `icon${size}.png`);
      if (!fs.existsSync(iconPath)) {
        fs.writeFileSync(iconPath, '');
      }
    });
  }
  console.log('✅ Icons ready\n');

  // Done
  console.log('🎉 Chrome extension build completed!');
  console.log(`📁 Output: ${outDir}`);
  console.log('\n📋 Installation:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" (top right)');
  console.log('3. Click "Load unpacked"');
  console.log(`4. Select: ${outDir}`);
}

function copyDirectory(src: string, dest: string, exclude: string[] = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    if (entry.name.startsWith('_')) continue;
    if (entry.name === '.git' || entry.name === 'node_modules') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
