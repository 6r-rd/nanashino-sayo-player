type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface DebugOptions {
  namespace?: string;
  level?: LogLevel;
  color?: string; // ログの色を指定するオプション
}

// 本番環境かどうかを判定
const isProduction = () => {
  // ブラウザ環境
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.PROD === true;
  }
  // Node.js環境
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }
  return false;
};

// 名前空間に基づいて色を自動生成
const getColorForNamespace = (namespace: string): string => {
  // 単純なハッシュ関数
  let hash = 0;
  for (let i = 0; i < namespace.length; i++) {
    hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // 32bit整数に変換
  }
  
  // いくつかの明るい色を用意
  const colors = [
    '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a',
    '#cddc39', '#ffc107', '#ff9800', '#ff5722'
  ];
  
  // ハッシュ値を使って色を選択
  return colors[Math.abs(hash) % colors.length];
};

// デバッグロガーの作成
const createLogger = (options: DebugOptions = {}) => {
  const { namespace = '', level = 'debug', color } = options;
  const prefix = namespace ? `[${namespace}]` : '';
  const logColor = color || (namespace ? getColorForNamespace(namespace) : '#888');
  
  // ブラウザ環境でのスタイル付きログ
  const browserStyles = `color: ${logColor}; font-weight: bold;`;
  
  // Node.js環境での色付きログ（ANSIエスケープシーケンス）
  const isNodeEnv = typeof window === 'undefined';
  
  const logger = {
    _namespace: namespace, // 子ロガーを作成できるように名前空間を保存
    
    debug: (...args: any[]) => {
      if (!isProduction()) {
        if (isNodeEnv) {
          console.debug(prefix, ...args);
        } else {
          console.debug(`%c${prefix}`, browserStyles, ...args);
        }
      }
    },
    log: (...args: any[]) => {
      if (!isProduction()) {
        if (isNodeEnv) {
          console.log(prefix, ...args);
        } else {
          console.log(`%c${prefix}`, browserStyles, ...args);
        }
      }
    },
    info: (...args: any[]) => {
      if (!isProduction()) {
        if (isNodeEnv) {
          console.info(prefix, ...args);
        } else {
          console.info(`%c${prefix}`, browserStyles, ...args);
        }
      }
    },
    warn: (...args: any[]) => {
      if (isNodeEnv) {
        console.warn(prefix, ...args);
      } else {
        console.warn(`%c${prefix}`, browserStyles, ...args);
      }
    },
    error: (...args: any[]) => {
      if (isNodeEnv) {
        console.error(prefix, ...args);
      } else {
        console.error(`%c${prefix}`, browserStyles, ...args);
      }
    }
  };
  
  return logger;
};

// デフォルトロガー
export const debug = createLogger();

// 名前空間付きロガーの作成
export const createNamespacedLogger = (namespace: string, color?: string) => {
  return createLogger({ namespace, color });
};

// 子名前空間を作成するヘルパー
export const createChildLogger = (parentLogger: ReturnType<typeof createLogger>, childNamespace: string) => {
  // 親の名前空間が存在する場合は、親の名前空間:子の名前空間の形式にする
  const parentNamespace = (parentLogger as any)._namespace || '';
  const namespace = parentNamespace ? `${parentNamespace}:${childNamespace}` : childNamespace;
  
  const logger = createNamespacedLogger(namespace);
  
  return logger;
};

export default debug;
