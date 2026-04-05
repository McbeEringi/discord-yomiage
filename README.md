# discord-yomiage
VOICEVOX ENGINEを用いたDiscord読み上げbot

## Usage
<https://discord.com/developers/applications>でアプリを作成してトークンを入手する
botのトークンを`config/token_tmpl.mjs`を参考に`config/token.mjs`へ記載

- サーバーのインストール
    - スコープ
        - application.commands
        - bot
    - 権限
        - チャンネルを表示
        - メッセージを送る
        - メッセージ履歴を読む
        - 接続
        - 発言
