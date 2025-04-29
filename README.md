# EtoSora player

バーチャルユニット「[エトソラ](https://www.youtube.com/@etosora)」による YouTube ライブ配信のアーカイブ動画を再生するための非公式 Web サイトとその運用ツールです。

Demo: https://6r-rd.github.io/etosora-player/

![PlayerImage](https://github.com/user-attachments/assets/c61044eb-6371-4e2c-acb4-c1cd6e1d172e)

![Songs Image](https://github.com/user-attachments/assets/6f02fd3a-40e8-45b2-b523-92845dd63676)

## 主な機能

- **アーカイブ動画の閲覧と再生**: サイドバーの `Archives` タブから過去の配信アーカイブを選択して視聴できます
- **曲ごとの詳細表示**: サイドバーの `Songs` タブから特定の曲が歌われた全ての動画を一覧表示します
- **タイムスタンプ**: 動画内の特定の曲の開始時間にタイムスタンプを通じて直接ジャンプできます
- **検索機能**: 曲名やアーティスト名で検索できます
- **日付フィルター**: 特定の期間の動画や曲を絞り込むことができます
- **ソート機能**: 動画は日付順、曲は歌われた回数順でソートできます

### 注意事項

EtoSora player では **[YouTube Data API](https://developers.google.com/youtube/v3/getting-started)** を使用して過去の配信データを取得し、タイムスタンプ付きで曲の情報を表示します。動画は **[YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)** を利用して埋め込みます。

そのため、以下の場合は動画を取得できません。

- アーカイブ動画がメンバー限定となっている
- URL 限定公開または非公開となっている

以下の場合は動画を取得できますが、再生できません。

- 動画の所有者が YouTube Studio で動画の埋め込みを許可していない

## 環境設定

```bash
# リポジトリのクローン
git clone https://github.com/6r-rd/etosora-player.git
cd etosora-player

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは http://localhost:4321 で起動します。4321 が使用中の場合はポート番号がインクリメントされます。

### 環境変数

`.env.example` を参照し、`.env` ファイルに環境変数を記述してください。

`YOUTUBE_CHANNEL_ID`: YouTube ライブ配信アーカイブを取得する対象となるチャンネルの ID
`YOUTUBE_API_KEY`: [Google Cloud Console](https://console.developers.google.com/) で発行した YouTube Data API キー

#### GitHub Actions

YouTube ライブ配信アーカイブを自動で取得したい場合は Repository secrets として環境変数を設定してください。

### プロジェクト構造

```
.
├── public/                 # 静的ファイルや取得した配信関連のデータ
├── schema/                 # 配信関連データの JSON Schema 定義
├── scripts/                # npm scripts や GitHub Actions から起動する処理
└── src/                    # Web サイトのソースコード
```

### ビルドとデプロイ

```bash
# 本番用ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

ビルドされたファイルは `site/` ディレクトリに出力されます。これらのファイルを任意のサーバーにデプロイできます。リポジトリの Settings > Pages で GitHub Pages を有効にしておくと、GitHub Actions を使って main merge 時に自動でデプロイされます。

### テスト

このプロジェクトは Vitest を使用してテストを実行します。

```bash
# すべてのテストを実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# UIでテストを実行
npm run test:ui

# カバレッジレポートを生成
npm run test:coverage
```

### GitHub Actions ワークフロー

以下の GitHub Actions ワークフローを使用しています。

- `deploy.yml`: `main` branch への push や merge 時に自動的にビルドとデプロイを実行する
- `run-tests.yml`: テスト
- `update-video-data.yml`: `workflow_dispatch` で動画 ID を指定し、配信データを取得する。他のチャンネルからも取得できる
- `fetch-new-videos.yml`: `YOUTUBE_CHANNEL_ID` として設定したチャンネルからタイトルに「歌枠」を含む配信データを定期的に取得する
- `validate-json.yml`: 配信データの JSON がスキーマに沿っているか検証する
- `backfill.yml`: `YOUTUBE_CHANNEL_ID` として設定したチャンネルの過去全配信からタイトルに「歌枠」を含む配信データを取得する

GitHub Actions で配信データを取得した後、`public/` 以下の JSON データを更新する Pull Request を作成します。この Pull Request の対象 branch をローカルに pull して確認・修正し、`main` branch に merge することで本番環境にデプロイされます。

タイムスタンプの解析には人間の目を使用しています。将来的には GitHub Models で AI にコメント解析してもらうかも...？

### GitHub Pages へのデプロイ

このプロジェクトは GitHub Pages を使用して自動的にデプロイするように設定されています。

1. **設定の確認**

   - `astro.config.mjs` ファイルで `base` パスがリポジトリ名と一致していることを確認します
   - 例: リポジトリ名が `etosora-player` の場合、`base: '/etosora-player'` と設定します

2. **GitHub リポジトリの設定**

   - リポジトリの "Settings" > "Pages" で、ソースを "GitHub Actions" に設定します
   - 初回デプロイ後、GitHub Pages の URL が表示されます（通常は `https://username.github.io/repository-name/`）

3. **手動デプロイ**
   - GitHub リポジトリの "Actions" タブから `Deploy to GitHub Pages` ワークフローを手動で実行することもできます

## データ構造の仕様

### songs.json

`songs.json` ファイルは、サイトで扱う全ての曲の情報を含みます。

```json
{
  "songs": [
    {
      "song_id": "T9nF-qT4Z6p",
      "title": "曲のタイトル",
      "artist_ids": ["mS8q1D_fA7x"],
      "alternate_titles": ["別名1", "別名2"],
      "description": "曲の説明や追加情報"
    }
  ]
}
```

`description` がある場合、ユーザーが info アイコンにマウスオーバーした際に popover を表示します。popover をクリックすると description に最初に記載された URL を開きます。

![Image](https://github.com/user-attachments/assets/0ee164af-a847-49a4-9608-8631c2991286)

### artists.json

`artists.json` ファイルは、全てのアーティスト情報を含みます。

```json
{
  "artists": [
    {
      "artist_id": "mS8q1D_fA7x",
      "name": "アーティスト名",
      "aliases": ["別名1", "別名2"],
      "description": "アーティストの説明"
    }
  ]
}
```

### videos/[video_id].json

各動画の情報は `videos/` ディレクトリ内の個別の JSON ファイルに保存されます。

```json
{
  "video_id": "AZ6KhfbTPDk",
  "title": "動画タイトル",
  "start_datetime": "2025-03-31T18:00:00Z",
  "thumbnail_url": "https://...",
  "timestamps": [
    {
      "time": 385,
      "original_time": "00:06:25",
      "song_id": "T9nF-qT4Z6p",
      "comment_source": "comment",
      "comment_date": "2025-04-01T19:30:00Z",
      "description": "補足情報やリンク"
    }
  ]
}
```

`description` がある場合、ユーザーが info アイコンにマウスオーバーした際に popover を表示します。popover をクリックすると description に最初に記載された URL を開きます。

![Image](https://github.com/user-attachments/assets/30fa6752-4850-471d-b617-94c88dda1858)
