# GitHub公開手順

## 前提

- このフォルダ単体をGit管理します。
- 親フォルダ `New project` はGit管理しません。
- `.clasp.json` と `.clasprc.json` は公開対象に含めません。
- APIキー、LINEトークン、通知先IDの実値は公開しません。

## GitHub Desktopで公開する場合

1. GitHub Desktopを開きます。
2. `File` から `Add Local Repository` を選びます。
3. 以下のフォルダを選択します。

```text
/Users/asoutsukasa/Documents/New project/line-inquiry-automation
```

4. リポジトリ名を `line-inquiry-automation` にします。
5. 公開範囲は最初は `Private` を推奨します。
6. `Publish repository` を実行します。
7. GitHub上で以下を確認します。
   - `README.md` が表示される
   - `Code.gs` がある
   - `.clasp.json` がない
   - `.clasprc.json` がない
   - APIキー、LINEトークン、通知先IDの実値がない

## ブラウザで公開する場合

1. GitHubで新規リポジトリを作成します。
2. リポジトリ名を `line-inquiry-automation` にします。
3. README、.gitignore、LicenseはGitHub側で新規作成しません。
4. ローカルで作成済みの初回コミットをpushします。
5. push後、GitHub上で公開対象ファイルを確認します。

## Public化前の確認

- [ ] `GITHUB_RELEASE_CHECKLIST.md` を確認した
- [ ] `.clasp.json` がGitHub上にない
- [ ] `.clasprc.json` がGitHub上にない
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` の実値がない
- [ ] `LINE_TO_ID` の実値がない
- [ ] `OPENAI_API_KEY` の実値がない
- [ ] スプレッドシートURLやApps Script URLを公開してよいか確認した
- [ ] 未実装機能を実装済みのように書いていない
