# obsidian-clip CLI 工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 构建一个零配置 CLI 工具 `clip`，一条命令将任意网页保存为 Obsidian 兼容的 Markdown 文件。

**架构:** 独立 TypeScript 项目，通过 esbuild 打包为单文件 CJS 脚本。核心内容提取复用 `obsidian-clipper/src/api.ts` 的 `clip()` 函数，通过相对路径导入并由 esbuild 打包。内置默认模板，支持 `-o` 指定输出路径、`-t` 指定自定义模板、`~/.cliprc` 配置文件。

**技术栈:** TypeScript, Node.js 18+, esbuild, linkedom, defuddle, dayjs

**项目位置:** `/Users/fivecai/claude-project/obsidian-clip/`（与 obsidian-clipper 平级）

---

## 文件结构

```
obsidian-clip/
├── package.json              # 依赖声明 + bin 入口
├── tsconfig.json             # TypeScript 配置
├── .gitignore
├── README.md
├── src/
│   ├── cli.ts                # 入口：参数解析 + 主流程
│   ├── config.ts             # ~/.cliprc 配置读取
│   └── default-template.ts   # 内置模板常量
└── scripts/
    └── build.mjs             # esbuild 打包脚本
```

---

### Task 1: 项目初始化

**Files:**
- Create: `obsidian-clip/package.json`
- Create: `obsidian-clip/tsconfig.json`
- Create: `obsidian-clip/.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "obsidian-clip",
  "version": "0.1.0",
  "description": "一键将网页保存为 Obsidian 兼容的 Markdown 文件",
  "bin": {
    "clip": "./dist/cli.cjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "node scripts/build.mjs",
    "dev": "node scripts/build.mjs --dev"
  },
  "dependencies": {
    "dayjs": "^1.11.13",
    "defuddle": "^0.18.1",
    "linkedom": "^0.18.0"
  },
  "devDependencies": {
    "@types/node": "^25.4.0",
    "esbuild": "^0.25.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 4: 安装依赖并提交**

```bash
cd /Users/fivecai/claude-project/obsidian-clip && npm install
```

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "初始化 obsidian-clip 项目结构"
```

---

### Task 2: 内置默认模板

**Files:**
- Create: `obsidian-clip/src/default-template.ts`

- [ ] **Step 1: 创建内置模板常量**

```typescript
// 内置默认模板 — 无需配置文件即可使用
// 与 obsidian-clipper Template 类型保持一致

export const DEFAULT_TEMPLATE = {
  id: 'builtin-default',
  name: '默认模板',
  behavior: 'create' as const,
  noteNameFormat: '{{title}}',
  path: '',
  noteContentFormat: '{{content}}',
  properties: [
    { name: 'source', value: '{{url}}', type: 'text' },
    { name: 'author', value: '{{author}}', type: 'text' },
    { name: 'published', value: '{{published}}', type: 'date' },
    { name: 'created', value: '{{date}}', type: 'datetime' },
    { name: 'tags', value: '', type: 'multitext' },
  ],
  triggers: [],
};
```

- [ ] **Step 2: 提交**

```bash
git add src/default-template.ts
git commit -m "添加内置默认模板常量"
```

---

### Task 3: 配置文件读取

**Files:**
- Create: `obsidian-clip/src/config.ts`

- [ ] **Step 1: 实现 ~/.cliprc 配置读取**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ClipConfig {
  /** 默认输出目录，支持 ~ 路径 */
  outputDir?: string;
  /** 自定义模板文件路径，支持 ~ 路径 */
  templatePath?: string;
}

/**
 * 展开路径中的 ~ 为用户主目录
 */
function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * 读取 ~/.cliprc 配置文件
 * 文件不存在时返回空对象，JSON 解析失败时输出警告并返回空对象
 */
export function loadConfig(): ClipConfig {
  const configPath = path.join(os.homedir(), '.cliprc');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config: ClipConfig = JSON.parse(raw);

    // 展开路径中的 ~
    if (config.outputDir) {
      config.outputDir = expandHome(config.outputDir);
    }
    if (config.templatePath) {
      config.templatePath = expandHome(config.templatePath);
    }

    return config;
  } catch (err: any) {
    console.error(`警告: 无法解析 ~/.cliprc: ${err.message}`);
    return {};
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/config.ts
git commit -m "添加 ~/.cliprc 配置文件读取模块"
```

---

### Task 4: CLI 入口

**Files:**
- Create: `obsidian-clip/src/cli.ts`

- [ ] **Step 1: 实现 CLI 主逻辑**

```typescript
#!/usr/bin/env node

import { parseHTML } from 'linkedom';
import { clip, DocumentParser } from '../../obsidian-clipper/src/api';
import type { Template } from '../../obsidian-clipper/src/types/types';
import { DEFAULT_TEMPLATE } from './default-template';
import { loadConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// 命令行参数解析
// ---------------------------------------------------------------------------

interface CliArgs {
  url: string;
  outputPath?: string;
  templatePath?: string;
}

function printUsage(): void {
  console.log(`
Usage: clip <url> [options]

参数:
  <url>                  要抓取的网页 URL

选项:
  -o, --output <path>    输出 .md 文件路径（默认: 当前目录/文章标题.md）
  -t, --template <path>  自定义模板 JSON 文件路径
  -h, --help             显示帮助信息

配置:
  ~/.cliprc              JSON 配置文件，可设置默认 outputDir 和 templatePath
                         示例: { "outputDir": "~/Obsidian/Inbox", "templatePath": "~/.clip-template.json" }
`.trim());
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  let url = '';
  let outputPath: string | undefined;
  let templatePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
      case '-o':
      case '--output':
        if (i + 1 >= args.length) {
          console.error('错误: --output 需要指定路径');
          process.exit(1);
        }
        outputPath = args[++i];
        break;
      case '-t':
      case '--template':
        if (i + 1 >= args.length) {
          console.error('错误: --template 需要指定路径');
          process.exit(1);
        }
        templatePath = args[++i];
        break;
      default:
        if (!arg.startsWith('-') && !url) {
          url = arg;
        } else {
          console.error(`未知选项: ${arg}`);
          printUsage();
          process.exit(1);
        }
    }
  }

  if (!url) {
    console.error('错误: 请提供 URL');
    printUsage();
    process.exit(1);
  }

  return { url, outputPath, templatePath };
}

// ---------------------------------------------------------------------------
// linkedom 适配器
// ---------------------------------------------------------------------------

const linkedomParser: DocumentParser = {
  parseFromString(html: string, _mimeType: string) {
    return parseHTML(html).document;
  },
};

// ---------------------------------------------------------------------------
// 模板加载
// ---------------------------------------------------------------------------

function loadTemplate(templatePath: string): Template {
  const resolved = path.resolve(templatePath);
  if (!fs.existsSync(resolved)) {
    console.error(`错误: 模板文件不存在: ${resolved}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const config = loadConfig();

  // 参数优先级: 命令行 > ~/.cliprc > 内置默认
  const templatePath = args.templatePath || config.templatePath;
  const template = templatePath ? loadTemplate(templatePath) : DEFAULT_TEMPLATE;

  // 确保 URL 有协议前缀
  let url = args.url;
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  // 获取 HTML
  console.error(`正在抓取: ${url}`);
  let html: string;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`错误: 无法访问 ${url} (HTTP ${response.status})`);
      process.exit(1);
    }
    html = await response.text();
  } catch (err: any) {
    console.error(`错误: 网络请求失败: ${err.message}`);
    process.exit(1);
  }

  // 调用 clip API 提取内容
  console.error('正在提取内容...');
  let result;
  try {
    result = await clip({
      html,
      url,
      template,
      documentParser: linkedomParser,
    });
  } catch (err: any) {
    console.error(`错误: 内容提取失败: ${err.message}`);
    process.exit(1);
  }

  // 确定输出路径: 命令行 > ~/.cliprc > 当前目录
  const outputPath = args.outputPath
    || (config.outputDir ? path.join(config.outputDir, result.noteName + '.md') : undefined)
    || path.join(process.cwd(), result.noteName + '.md');

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入文件
  try {
    fs.writeFileSync(outputPath, result.fullContent, 'utf-8');
  } catch (err: any) {
    console.error(`错误: 无法写入文件: ${err.message}`);
    process.exit(1);
  }

  console.error(`已保存: ${outputPath}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
```

- [ ] **Step 2: 提交**

```bash
git add src/cli.ts
git commit -m "添加 CLI 入口：参数解析 + 网页抓取主流程"
```

---

### Task 5: esbuild 打包脚本

**Files:**
- Create: `obsidian-clip/scripts/build.mjs`

- [ ] **Step 1: 实现构建脚本**

```javascript
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
    'linkedom',
  ],
  define: {
    'DEBUG_MODE': 'false',
  },
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
```

- [ ] **Step 2: 运行构建验证**

```bash
cd /Users/fivecai/claude-project/obsidian-clip && npm run build
```

预期输出: `CLI 构建完成 → dist/cli.cjs`

- [ ] **Step 3: 提交**

```bash
git add scripts/build.mjs dist/cli.cjs
git commit -m "添加 esbuild 打包脚本"
```

---

### Task 6: README 与全局安装

**Files:**
- Create: `obsidian-clip/README.md`

- [ ] **Step 1: 编写 README**

````markdown
# obsidian-clip

一键将网页保存为 Obsidian 兼容的 Markdown 文件。

## 安装

```bash
cd obsidian-clip
npm install
npm run build
npm link
```

## 使用

```bash
# 最简单用法 — 输出到当前目录
clip https://example.com/article

# 指定输出路径
clip https://example.com/article -o ~/Obsidian/InBox/文章.md

# 使用自定义模板
clip https://example.com/article -t my-template.json
```

## 配置

可选创建 `~/.cliprc`:

```json
{
  "outputDir": "~/Obsidian/MyVault/Inbox",
  "templatePath": "~/.clip-template.json"
}
```

## 自定义模板

模板格式与 [obsidian-clipper](https://github.com/obsidianmd/obsidian-clipper) 兼容:

```json
{
  "id": "my-template",
  "name": "我的模板",
  "behavior": "create",
  "noteNameFormat": "{{title}}",
  "path": "",
  "noteContentFormat": "{{content}}",
  "properties": [
    { "name": "source", "value": "{{url}}", "type": "text" },
    { "name": "author", "value": "{{author}}", "type": "text" },
    { "name": "published", "value": "{{published}}", "type": "date" },
    { "name": "created", "value": "{{date}}", "type": "datetime" },
    { "name": "tags", "value": "", "type": "multitext" }
  ]
}
```
````

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "添加 README 使用文档"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 构建并 link**

```bash
cd /Users/fivecai/claude-project/obsidian-clip
npm run build
npm link
```

- [ ] **Step 2: 测试抓取一个简单网页**

```bash
cd /tmp && clip https://example.com -o test-output.md && cat test-output.md
```

验证输出文件包含:
- YAML frontmatter（`---` 包裹）
- `source`、`author`、`published`、`created`、`tags` 属性
- Markdown 正文内容

- [ ] **Step 3: 清理测试文件**

```bash
rm /tmp/test-output.md
```

---

## 实现顺序

```
Task 1 (项目初始化) → Task 2 (默认模板) → Task 3 (配置文件) → Task 4 (CLI 入口) → Task 5 (打包脚本) → Task 6 (README) → Task 7 (验证)
```
