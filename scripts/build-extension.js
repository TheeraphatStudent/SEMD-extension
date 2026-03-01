#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');
const yaml = require('js-yaml');

// Get target browser from command line argument
const targetBrowser = process.argv[2] || 'chrome';
const isChrome = targetBrowser.toLowerCase() === 'chrome';
const isFirefox = targetBrowser.toLowerCase() === 'firefox';

if (!isChrome && !isFirefox) {
    console.error('❌ Invalid target. Use: chrome or firefox');
    process.exit(1);
}

const browserName = isChrome ? 'Chrome' : 'Firefox';
console.log(`🚀 Building SEMD ${browserName} Extension...`);

// Paths
const rootDir = path.resolve(__dirname, '..');
const sourceDir = isChrome ? path.join(rootDir, 'chrome_extension') : path.join(rootDir, 'firefox_addons');
const outDir = path.join(rootDir, 'out');
const distDir = sourceDir; // Build directly to source folder
const configPath = path.join(rootDir, 'extension.conf.yaml');

// Load extension config
let extensionConfig = null;
console.log('📋 Loading extension config...');
try {
    if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        extensionConfig = yaml.load(configContent);
        console.log('✅ Config loaded from extension.conf.yaml');
    } else {
        console.log('⚠️  No extension.conf.yaml found, using manifest defaults');
    }
} catch (error) {
    console.warn('⚠️  Failed to load config:', error.message);
}

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Step 1: Build Next.js app
console.log('📦 Building Next.js application...');
try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Next.js build completed');
} catch (error) {
    console.error('❌ Next.js build failed:', error.message);
    process.exit(1);
}

// Step 2: Copy exported app files to extension folder
console.log('📁 Copying exported app files...');
try {
    const appOutDir = path.join(rootDir, 'out');
    if (fs.existsSync(appOutDir)) {
        // Copy app files (HTML, JS, CSS) to extension folder
        const appFiles = fs.readdirSync(appOutDir);
        appFiles.forEach(file => {
            const srcPath = path.join(appOutDir, file);
            const destPath = path.join(distDir, file);
            
            if (file === '.next' || file === 'node_modules' || file === '.git' || file === '_next' || file.startsWith('_')) {
                return;
            }
            
            try {
                const stats = fs.statSync(srcPath);
                if (stats.isDirectory()) {
                    if (!file.startsWith('_')) {
                        copyDirectory(srcPath, destPath);
                        console.log(`  ✓ Copied ${file}/`);
                    }
                } else {
                    fs.copyFileSync(srcPath, destPath);
                    console.log(`  ✓ Copied ${file}`);
                }
            } catch (err) {
                console.warn(`  ⚠️  Skipped ${file}: ${err.message}`);
            }
        });
        console.log('✅ App files copied to extension folder');
    } else {
        console.log('⚠️  No exported app files found in out/ folder');
    }
} catch (error) {
    console.error('❌ Failed to copy app files:', error.message);
    process.exit(1);
}

// Step 2.5: Copy additional scripts
console.log('📄 Copying additional scripts...');
try {
    const additionalScriptsDir = path.join(rootDir, 'scripts', 'additional_scripts');
    if (fs.existsSync(additionalScriptsDir)) {
        const scriptFiles = fs.readdirSync(additionalScriptsDir);
        scriptFiles.forEach(file => {
            const srcPath = path.join(additionalScriptsDir, file);
            const destPath = path.join(distDir, file);
            
            if (fs.statSync(srcPath).isFile()) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`  ✓ Copied ${file}`);
            }
        });
        console.log('✅ Additional scripts copied to extension folder');
    } else {
        console.log('⚠️  No additional scripts directory found');
    }
} catch (error) {
    console.error('❌ Failed to copy additional scripts:', error.message);
    process.exit(1);
}

// Step 3: Create/Update manifest for target browser
console.log('🔍 Creating manifest for ' + browserName + '...');
try {
    const sourceManifestPath = path.join(sourceDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
    
    // Apply config from extension.conf.yaml
    if (extensionConfig && extensionConfig.extension) {
        const config = extensionConfig.extension;
        const browserConfig = isChrome ? config.chrome_extension : config.firefox_addons;
        
        // Apply common app settings
        if (config.app) {
            if (config.app.name) manifest.name = config.app.name;
            if (config.app.version) manifest.version = config.app.version;
            if (config.app.description) manifest.description = config.app.description;
            if (config.app.title && manifest.action) {
                manifest.action.default_title = config.app.title;
            }
        }
        
        // Apply manifest version
        if (config.manifest_version) {
            manifest.manifest_version = config.manifest_version;
        }
        
        // Apply browser-specific settings
        if (browserConfig) {
            if (browserConfig.permissions) {
                manifest.permissions = browserConfig.permissions;
            }
            if (browserConfig.host_permissions) {
                manifest.host_permissions = browserConfig.host_permissions;
            }
            if (isFirefox && browserConfig.browser_specific_settings) {
                manifest.browser_specific_settings = browserConfig.browser_specific_settings;
            }
        }
        
        console.log('✅ Applied settings from extension.conf.yaml');
    }
    
    // Firefox-specific defaults
    if (isFirefox && !manifest.browser_specific_settings) {
        manifest.browser_specific_settings = {
            gecko: {
                id: "semd-extension@example.com",
                strict_min_version: "109.0"
            }
        };
    }
    
    // Check required fields
    const requiredFields = ['manifest_version', 'name', 'version'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Write manifest to dist
    const manifestPath = path.join(distDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('✅ Manifest created successfully');
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Manifest Version: ${manifest.manifest_version}`);
    console.log(`   Target: ${browserName}`);
} catch (error) {
    console.error('❌ Manifest creation failed:', error.message);
    process.exit(1);
}

// Step 4: Create icons if they don't exist
console.log('🎨 Checking icons...');
const iconSizes = [16, 32, 48, 128];
const iconsDir = path.join(distDir, 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

iconSizes.forEach(size => {
    const iconPath = path.join(iconsDir, `icon${size}.png`);
    if (!fs.existsSync(iconPath) || fs.statSync(iconPath).size === 0) {
        // Create a simple colored square as placeholder
        createPlaceholderIcon(iconPath, size);
        console.log(`  ✓ Created placeholder icon${size}.png`);
    }
});

console.log('✅ Icons checked');

// Step 5: Final validation
console.log('🔍 Final validation...');
const requiredFiles = [
    'manifest.json'
];

const missingFiles = requiredFiles.filter(file => {
    const filePath = path.join(distDir, file);
    return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles.join(', '));
    process.exit(1);
}

console.log('✅ Manifest validation passed');

// Step 6: Create packaged extension file
if (isFirefox) {
    console.log('📦 Creating Firefox packages (.xpi and .zip)...');
    
    const createArchive = (outputPath, format) => {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            output.on('close', () => {
                console.log(`  ✓ Created: ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(distDir, false);
            archive.finalize();
        });
    };

    try {
        const xpiPath = path.join(rootDir, '../export/semd-addon.xpi');
        const zipPath = path.join(rootDir, '../export/semd-addon.zip');
        
        Promise.all([
            createArchive(xpiPath, 'xpi'),
            createArchive(zipPath, 'zip')
        ]).then(() => {
            console.log('✅ Firefox packages created successfully');
        }).catch((err) => {
            console.error('❌ Failed to create packages:', err.message);
        });
    } catch (error) {
        console.error('❌ Failed to create Firefox packages:', error.message);
        process.exit(1);
    }
}

// Success
console.log('\n🎉 Extension build completed successfully!');
console.log(`📁 Extension files are in: ${distDir}`);

if (isChrome) {
    console.log('\n📋 Chrome Installation:');
    console.log('1. Open Chrome and go to chrome://extensions/');
    console.log('2. Enable "Developer mode" (top right)');
    console.log('3. Click "Load unpacked"');
    console.log(`4. Select the folder: ${distDir}`);
} else {
    console.log('\n📋 Firefox Installation:');
    console.log('1. Open Firefox and go to about:addons');
    console.log('2. Click the gear icon and select "Install Add-on From File..."');
    console.log(`3. Select the .xpi or .zip file from: ${rootDir}`);
    console.log(`   - semd-addon.xpi`);
    console.log(`   - firefox_addons.zip`);

    console.log('\n📋 Alternative: Load as temporary add-on for development:');
    console.log('1. Open Firefox and go to about:debugging#/runtime/this-firefox');
    console.log('2. Click "Load Temporary Add-on"');
    console.log(`3. Select the manifest.json file from: ${distDir}`);
}

// Helper functions
function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✓ Copied ${entry.name}`);
        }
    }
}

function createPlaceholderIcon(iconPath, size) {
    // Create a simple SVG and convert to PNG placeholder
    // For now, just create an empty file - in production, you'd want actual icons
    const svgContent = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="${size}" height="${size}" fill="url(#grad)" rx="4"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${size/4}" font-weight="bold">SEMD</text>
        </svg>
    `;
    
    // For now, just create the file - in production you'd convert SVG to PNG
    fs.writeFileSync(iconPath, ''); // Placeholder
}
