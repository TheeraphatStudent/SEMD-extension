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
    version: '1.0.1',
    permissions: ['activeTab', 'tabs', 'storage', 'webNavigation', 'webRequest', 'webRequestBlocking'],
    host_permissions: ['<all_urls>'],
    action: {},
    browser_specific_settings: {
    gecko: {
      "id": "th33raphat@gmail.com",
      "data_collection_permissions": { "required": ["none"] }
    }
  },
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

