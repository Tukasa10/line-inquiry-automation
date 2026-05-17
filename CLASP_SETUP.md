# clasp導入手順

## 目的

ローカルの `Code.gs` と `appsscript.json` をGoogle Apps Scriptへ反映しやすくするための手順です。

この手順では、LINEのアクセストークンや通知先IDはリポジトリに入れません。秘密情報はApps ScriptのScript Propertiesで管理します。

## 事前準備

- Googleアカウントにログインできること
- Node.js / npm が使えること
- 反映先のGoogleスプレッドシートを用意していること
- スプレッドシートに紐づくApps Scriptプロジェクトを作成していること
- Apps Script APIを有効化していること

## claspのインストール

```bash
npm install -g @google/clasp
```

インストール後、以下でバージョンが表示されることを確認します。

```bash
clasp --version
```

## Googleアカウントへログイン

```bash
clasp login
```

ブラウザでGoogleアカウントの認証画面が開きます。反映先のApps Scriptを操作するGoogleアカウントで承認してください。

## 既存Apps Scriptプロジェクトと紐づける

Apps ScriptエディタのURLからスクリプトIDを確認します。

URL例:

```text
https://script.google.com/home/projects/{SCRIPT_ID}/edit
```

ローカルでは以下のように `.clasp.json` を作成します。

```json
{
  "scriptId": "ここにApps ScriptのスクリプトIDを入れる",
  "rootDir": "."
}
```

注意: `.clasp.json` には実際のスクリプトIDが入るため、このプロジェクトではGit管理対象外にします。

## Apps Scriptへ反映する

対象ディレクトリで以下を実行します。

```bash
clasp push
```

このプロジェクトでは `.claspignore` により、Apps Scriptへ送るファイルを以下に限定しています。

- `Code.gs`
- `appsscript.json`

READMEやテスト手順、秘密情報ファイルはApps Scriptへ送信しません。

## 作成済みプロジェクトを開く

Apps Scriptエディタを開く場合:

```bash
clasp open-script
```

紐づいているGoogleスプレッドシートを開く場合:

```bash
clasp open-container
```

`.clasp.json` に `scriptId` と `parentId` が保存されている場合は、以下のURL形式でも開けます。

```text
https://script.google.com/d/{scriptId}/edit
https://docs.google.com/spreadsheets/d/{parentId}/edit
```

注意: `scriptId` と `parentId` はローカルの `.clasp.json` に保存されます。GitHub公開対象には含めないでください。

## セットアップ関数の実行

通常はApps Scriptエディタを開き、関数選択から以下を実行します。

1. `setupInquiryFormIntegration`
2. `runInitialSetupCheck`
3. `testSendLineMessage`

`clasp run` は、Apps Script側がAPI実行可能な状態でないと実行できない場合があります。その場合はApps Scriptエディタ上から実行してください。

## Google側で必要な最小手作業

1. Googleスプレッドシートを作成します。
2. スプレッドシートに紐づくApps Scriptプロジェクトを作成します。
3. Apps Script APIを有効化します。
4. `clasp login` でGoogleアカウントを承認します。
5. `.clasp.json` にスクリプトIDを設定します。
6. Apps ScriptのScript Propertiesに以下を設定します。
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_TO_ID`
7. `clasp push` で `Code.gs` と `appsscript.json` を反映します。
8. Apps Script側で `runInitialSetupCheck()` を実行します。
9. Apps Script側で `testSendLineMessage()` を実行します。

`clasp create --type sheets` で新規作成する場合は、1と2はclasp側で作成できます。

## 安全な運用ルール

- LINEのアクセストークンを `Code.gs` に書かない
- `LINE_TO_ID` を `Code.gs` に書かない
- `.clasp.json` をGitHubへ公開しない
- `.clasprc.json` をGitHubへ公開しない
- `.claspignore` でApps Scriptへの送信対象を限定する
- Script Propertiesの値はGoogle側で設定する

## まだ実装しないこと

- Googleフォーム連携
- OpenAI API処理
- 未対応アラート
- Webhook / `doPost`
