import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const outDir = path.join(rootDir, 'out', 'firefox');
const manifestsDir = path.join(rootDir, 'manifests');
const exportDir = path.join(rootDir, 'export');

async function build() {
  console.log('🚀 Building SEMD Firefox Extension...\n');

  // Clean output directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Ensure export directory exists
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

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
      format: 'iife',
      platform: 'browser',
      target: ['firefox109'],
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
      target: ['firefox109'],
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
  const manifestSrc = path.join(manifestsDir, 'manifest.firefox.json');
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
    [16, 32, 48, 128].forEach((size) => {
      const iconPath = path.join(iconsDir, `icon${size}.png`);
      if (!fs.existsSync(iconPath)) {
        fs.writeFileSync(iconPath, '');
      }
    });
  }
  console.log('✅ Icons ready\n');

  // Step 7: Create XPI and ZIP packages
  console.log('📦 Creating Firefox packages...');
  await createPackage(outDir, path.join(exportDir, 'semd-addon.xpi'));
  await createPackage(outDir, path.join(exportDir, 'semd-addon.zip'));
  console.log('✅ Packages created\n');

  // Done
  console.log('🎉 Firefox extension build completed!');
  console.log(`📁 Output: ${outDir}`);
  console.log(`📦 Packages: ${exportDir}`);
  console.log('\n📋 Installation:');
  console.log('1. Open Firefox and go to about:addons');
  console.log('2. Click the gear icon → "Install Add-on From File..."');
  console.log(`3. Select: ${path.join(exportDir, 'semd-addon.xpi')}`);
  console.log('\nOr for development:');
  console.log('1. Go to about:debugging#/runtime/this-firefox');
  console.log('2. Click "Load Temporary Add-on"');
  console.log(`3. Select: ${path.join(outDir, 'manifest.json')}`);
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

function createPackage(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`  ✓ Created: ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
