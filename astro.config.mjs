// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// リポジトリ名を取得（GitHub Pages のベースパスとして使用）
// 環境変数から取得するか、デフォルト値を使用
const REPO_NAME = import.meta.env.PUBLIC_REPOSITORY_NAME || 'etosora-player';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()],
  output: 'static',  // GitHub Pages は静的ファイルのみをサポート
  outDir: 'site',
  base: `/${REPO_NAME}`, // GitHub Pages のベースパス
});
