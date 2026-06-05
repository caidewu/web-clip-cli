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
