# obsidian-clip CLI 工具设计文档

## 概述

基于 obsidian-clipper 的 `defuddle` + `linkedom` + `createMarkdownContent` 内容提取管线，构建一个独立的零配置 CLI 工具。一条命令即可将任意网页保存为 Obsidian 兼容的 Markdown 文件。

## 使用方式

```bash
# 最简单用法 — 输出到当前目录
clip https://example.com/article

# 指定输出路径
clip https://example.com/article -o ~/Obsidian/InBox/文章.md

# 使用自定义模板
clip https://example.com/article -t my-template.json
```

## 内置默认模板

不传 `-t` 时使用内置模板，生成效果：

```markdown
---
source: "https://example.com/article"
author: "作者名"
published: 2024-01-15
created: 2026-06-05T10:30:00+08:00
tags:
---
正文内容...
```

## 参数优先级

`命令行参数 > ~/.cliprc 配置 > 内置默认值`

## 配置文件 `~/.cliprc`

```json
{
  "outputDir": "~/Obsidian/MyVault/Inbox",
  "templatePath": "~/.clip-template.json"
}
```

## 技术栈

- TypeScript + Node.js
- esbuild 打包为单文件 CJS 脚本
- 复用 `defuddle`、`linkedom`、`dayjs` 依赖

## 项目结构

```
obsidian-clip/              # 独立新项目（与 obsidian-clipper 平级）
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts              # 入口：参数解析 + 主流程
│   ├── config.ts           # ~/.cliprc 配置读取
│   └── default-template.ts # 内置模板常量
└── scripts/
    └── build.mjs           # esbuild 打包脚本
```

## 数据流

```
URL → fetch HTML → defuddle.parse() → createMarkdownContent()
                                           ↓
                              模板编译（变量替换）
                                           ↓
                              生成 frontmatter + 正文
                                           ↓
                              写入 .md 文件
```

## 依赖

直接从 obsidian-clipper 复用：
- `defuddle` — HTML 内容提取
- `defuddle/full` — HTML→Markdown 转换
- `linkedom` — 服务端 DOM
- `dayjs` — 日期格式化

## 核心逻辑（复用 obsidian-clipper api.ts）

```typescript
// 1. 解析参数
// 2. 读取 ~/.cliprc（可选）
// 3. 加载模板（命令行 > 配置 > 内置默认）
// 4. fetch URL 获取 HTML
// 5. linkedom 解析 DOM
// 6. defuddle.parse() 提取内容
// 7. createMarkdownContent() 转 Markdown
// 8. 模板编译 → frontmatter + 正文
// 9. 写入文件
```

## 错误处理

- 网络请求失败 → 输出错误信息，exit 1
- 内容提取失败 → 输出错误信息，exit 1
- 文件写入失败 → 输出错误信息，exit 1

## 不做

- 不支持 Obsidian URI 发送（`--open`）— 保持极简
- 不支持 schema.org 触发器模板匹配 — 默认模板无需匹配
- 不支持高亮处理 — 无需浏览器扩展的高亮功能
- 不支持 `--html` 从文件/stdin 读取 — YAGNI，后续按需加
