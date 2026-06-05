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
