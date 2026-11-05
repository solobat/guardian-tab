import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'img/logo-48.png',
  },
  web_accessible_resources: [
    {
      resources: ['img/logo-16.png', 'img/logo-34.png', 'img/logo-48.png', 'img/logo-128.png'],
      matches: [],
    },
  ],
  permissions: ['storage', 'webNavigation'],
  host_permissions: ['<all_urls>'],
  // Safe Browsing 为可选功能：仅在用户主动开启时申请该域名权限，
  // 避免版本更新时因权限增加导致老用户的扩展被停用
  optional_host_permissions: ['https://safebrowsing.googleapis.com/*'],
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  chrome_url_overrides: {
    newtab: 'newtab.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'none'",
  },
})
