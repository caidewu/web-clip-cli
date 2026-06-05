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
