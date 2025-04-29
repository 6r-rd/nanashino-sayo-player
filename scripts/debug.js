import chalk from 'chalk';

// 本番環境かどうかを判定
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// 名前空間に基づいて色を自動生成
const getColorForNamespace = (namespace) => {
  // 単純なハッシュ関数
  let hash = 0;
  for (let i = 0; i < namespace.length; i++) {
    hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // 32bit整数に変換
  }
  
  // いくつかの明るい色を用意
  const colors = [
    'red', 'magenta', 'blue', 'cyan', 'green',
    'yellow', 'redBright', 'magentaBright', 'blueBright',
    'cyanBright', 'greenBright', 'yellowBright'
  ];
  
  // ハッシュ値を使って色を選択
  return colors[Math.abs(hash) % colors.length];
};

// デバッグロガーの作成
const createLogger = (options = {}) => {
  const { namespace = '', level = 'debug', color } = options;
  const prefix = namespace ? `[${namespace}]` : '';
  const colorName = color || (namespace ? getColorForNamespace(namespace) : 'gray');
  
  const logger = {
    _namespace: namespace, // 子ロガーを作成できるように名前空間を保存
    
    debug: (...args) => {
      if (!isProduction()) {
        console.debug(chalk[colorName](prefix), ...args);
      }
    },
    log: (...args) => {
      if (!isProduction()) {
        console.log(chalk[colorName](prefix), ...args);
      }
    },
    info: (...args) => {
      if (!isProduction()) {
        console.info(chalk[colorName](prefix), ...args);
      }
    },
    warn: (...args) => {
      console.warn(chalk[colorName](prefix), ...args);
    },
    error: (...args) => {
      console.error(chalk[colorName](prefix), ...args);
    }
  };
  
  return logger;
};

// デフォルトロガー
const debug = createLogger();

// 名前空間付きロガーの作成
const createNamespacedLogger = (namespace, color) => {
  return createLogger({ namespace, color });
};

// 子名前空間を作成するヘルパー
const createChildLogger = (parentLogger, childNamespace) => {
  // 親の名前空間が存在する場合は、親の名前空間:子の名前空間の形式にする
  const parentNamespace = parentLogger._namespace || '';
  const namespace = parentNamespace ? `${parentNamespace}:${childNamespace}` : childNamespace;
  
  return createNamespacedLogger(namespace);
};

export {
  debug,
  createNamespacedLogger,
  createChildLogger
};

export default debug;
