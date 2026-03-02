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
    permissions: ['activeTab', 'tabs', 'storage', 'webNavigation'],
    host_permissions: ['<all_urls>'],
    action: {},
  },
  autoIcons: {
    enabled: true,
    // baseIconPath: ""
  },
  runner: {
    startUrls: ['https://example.com'],
  },
});
