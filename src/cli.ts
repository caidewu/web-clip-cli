#!/usr/bin/env node

import { parseHTML } from 'linkedom';
import { clip, DocumentParser } from '../../obsidian-clipper/src/api';
import type { Template } from '../../obsidian-clipper/src/types/types';
import { DEFAULT_TEMPLATE } from './default-template';
import { loadConfig } from './config';
import * as fs from 'node:fs';
import * as path from 'node:path';

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

  let raw: string;
  try {
    raw = fs.readFileSync(resolved, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`错误: 模板文件不存在: ${resolved}`);
      process.exit(1);
    }
    console.error(`错误: 无法读取模板文件: ${resolved}`);
    process.exit(1);
  }

  try {
    return JSON.parse(raw);
  } catch {
    console.error(`错误: 模板文件格式无效: ${resolved}`);
    process.exit(1);
  }
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      console.error(`错误: 无法访问 ${url} (HTTP ${response.status})`);
      process.exit(1);
    }
    html = await response.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`错误: 网络请求失败: ${message}`);
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`错误: 内容提取失败: ${message}`);
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`错误: 无法写入文件: ${message}`);
    process.exit(1);
  }

  console.error(`已保存: ${outputPath}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
