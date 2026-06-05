import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const defuddleDir = path.join(root, 'node_modules', 'defuddle', 'dist');

// linkedom 全局 polyfill — 必须在任何模块代码之前执行
const polyfillBanner = `
#!/usr/bin/env node
;(function() {
  var linkedom = require("linkedom");
  var _parseHTML = linkedom.parseHTML;

  var LP = function() {};
  LP.prototype.parseFromString = function(html) {
    return _parseHTML(html).document;
  };

  if (typeof globalThis.window === "undefined") globalThis.window = globalThis;
  if (!globalThis.DOMParser) globalThis.DOMParser = LP;
  if (!globalThis.window.DOMParser) globalThis.window.DOMParser = LP;
  if (typeof globalThis.document === "undefined") {
    globalThis.document = _parseHTML("<!DOCTYPE html><html><head></head><body></body></html>").document;
  }
  // linkedom 的 navigator 补丁 — sanitizeFileName 等需要
  if (typeof globalThis.navigator === "undefined") {
    globalThis.navigator = { platform: "${process.platform}", userAgent: "" };
  }
})();
`.trim();

const isDev = process.argv.includes('--dev');

await esbuild.build({
  entryPoints: [path.join(root, 'src/cli.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(root, 'dist/cli.cjs'),
  banner: {
    js: polyfillBanner,
  },
  external: [
    'dayjs',
    'linkedom',
  ],
  define: {
    'DEBUG_MODE': isDev ? 'true' : 'false',
  },
  sourcemap: isDev ? 'inline' : false,
  alias: {
    // 将 obsidian-clipper 内部浏览器依赖替换为 CLI stub
    'webextension-polyfill': path.join(root, '..', 'obsidian-clipper', 'src', 'utils', 'cli-stubs.ts'),
    // defuddle 发布包入口在 dist/ 子目录
    'defuddle/full': path.join(defuddleDir, 'index.full.js'),
    'defuddle': path.join(defuddleDir, 'index.js'),
  },
  minify: !isDev,
  logLevel: 'info',
});

console.log('CLI 构建完成 → dist/cli.cjs');
