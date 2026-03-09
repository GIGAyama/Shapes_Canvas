# 図形キャンバス (Math Shape Note)

**「図形キャンバス」**は、GIGAスクール構想下の小学校・教育現場向けに開発された、直感的でモダンな図形学習Webアプリケーションです。プログラミングの知識がない先生や、低学年の児童でもすぐに使いこなせる「神アプリ」を目指して作られました。

## ✨ 主な特徴 (Features)

*   **🎓 児童に優しいモダンUI/UX**
    
    *   すべての漢字にルビ（ふりがな）を完備。
        
    *   指先でのタッチ操作（タブレット）に最適化された大きなコントロールポイント。
        
    *   直感的に操作できるツールバーとポップなデザイン。
        
*   **📡 サーバーレス問題配信機能 (URL Sharing)**
    
    *   先生がキャンバスに図形を配置し、「問題を配る」ボタンを押すだけで、現在の状態を圧縮した固有のURLが生成されます（`lz-string`を使用）。
        
    *   データベース不要（サーバーレス）で、URLを児童に共有するだけで一斉学習がスタートできます。
        
*   **✏️ 手書き（フリードローイング）機能**
    
    *   図形の操作だけでなく、キャンバスに直接文字や計算式を書き込むことができます。
        
*   **📐 充実した図形・定規ツール**
    
    *   四角、三角、円などの基本図形に加え、自由な頂点数（3〜12角形）の多角形生成が可能。
        
    *   センチメートル（cm）単位でのサイズ指定生成。
        
    *   画面上で動かせる定規と分度器ツールを搭載。
        
*   **🔄 高度な編集と操作**
    
    *   頂点（ノード）を直接動かして図形を変形させる「編集モード」。
        
    *   Undo/Redo（戻る/進む）、複製、全消し機能。
        
    *   キーボードショートカット対応（`Ctrl+Z`, `Ctrl+D`, `Delete` など）。
        

## 🛠 技術スタック (Tech Stack)

このアプリケーションは、すべてフロントエンド（クライアントサイド）の技術のみで完結しており、バックエンドサーバーを必要としません。

*   **UI Framework:** React (Hooks)
    
*   **Styling:** Tailwind CSS
    
*   **Canvas Manipulation:** [Fabric.js](http://fabricjs.com/ "null") (v5.3.1)
    
*   **Data Compression:** [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html "null") (URL生成用データ圧縮)
    
*   **Icons:** [Lucide React](https://lucide.dev/ "null")
    

## 🚀 ローカルでの実行方法 (Getting Started)

このプロジェクトは単一のコンポーネントファイル (`App.jsx`) で構成されています。一般的なReact開発環境（Create React App や Vite など）で簡単に起動できます。

### Vite を使用したセットアップ例

1.  プロジェクトの作成と移動
    
    ```
    npm create vite@latest math-note -- --template react
    cd math-note
    ```
    
2.  依存関係のインストール
    
    ```
    npm install
    npm install lucide-react
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
    
3.  Tailwind の設定 (`tailwind.config.js` などを適切に設定してください)
    
4.  `App.jsx` の内容を本リポジトリのコードで上書き
    
5.  開発サーバーの起動
    
    ```
    npm run dev
    ```
    

> **Note:** `fabric.js` と `lz-string` は CDN経由で動的に読み込まれるように設計されているため、`npm install` は不要です。

## 🌐 GitHub Pages へのデプロイ

サーバーレスアプリケーションであるため、ビルドした静的ファイルを GitHub Pages にそのままホスティングするだけで世界中に公開できます。

1.  Vite などでビルドを実行します。
    
    ```
    npm run build
    ```
    
2.  出力された `dist` フォルダの中身を、GitHub リポジトリの `gh-pages` ブランチ、またはメインブランチの `/docs` フォルダにプッシュして公開設定を行ってください。
    

## 👨‍🏫 作者 (Author)

**GIGA山**

*   note: [https://note.com/cute_borage86](https://note.com/cute_borage86 "null")
    

*このアプリは教育現場のDX推進と、子供たちの算数・図形学習の楽しさをサポートするために開発されました。*
