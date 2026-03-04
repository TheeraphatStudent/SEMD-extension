import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/auto-icons'
  ],
  manifest: {
    name: 'SEMD - Suspicious URL Evaluation',
    description: 'SEMD - Suspicious URL Evaluation for Malicious Detection',
    version: '1.0.0',
    permissions: ['activeTab', 'tabs', 'storage', 'webNavigation', 'webRequest'],
    host_permissions: ['<all_urls>'],
    action: {},
  },
  zip: {
    
  },
  autoIcons: {
    enabled: true,
    // baseIconPath: ""
    // sizes: [16, 32, 48, 128],
  },
  runner: {
    startUrls: ['https://example.com'],
  },
});

