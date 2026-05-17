# GitHub公開前チェックリスト

## 秘密情報

- [ ] `LINE_CHANNEL_ACCESS_TOKEN` の実値が含まれていない
- [ ] `LINE_TO_ID` の実値が含まれていない
- [ ] `OPENAI_API_KEY` の実値が含まれていない
- [ ] `.env` がGit管理対象外になっている
- [ ] `.env.*` がGit管理対象外になっている
- [ ] `secrets.*` がGit管理対象外になっている
- [ ] `credentials.*` がGit管理対象外になっている
- [ ] `client_secret*.json` がGit管理対象外になっている

## clasp関連

- [ ] `.clasp.json` がGit管理外になっている
- [ ] `.clasprc.json` がGit管理外になっている
- [ ] Apps Scriptの実スクリプトIDを公開してよいか確認した
- [ ] claspのローカル認証情報を公開していない

## ドキュメント

- [ ] README.mdにAPIキーの実値がない
- [ ] README.mdにLINEトークンの実値がない
- [ ] README.mdに通知先IDの実値がない
- [ ] README.mdが初見でも概要、機能、手順を理解できる内容になっている
- [ ] PORTFOLIO.mdが応募用に使える内容になっている
- [ ] TEST_CHECKLIST.mdが完成版になっている
- [ ] OPERATION_MANUAL.mdがある
- [ ] 未実装機能を実装済みのように書いていない

## URLと個人情報

- [ ] スプレッドシートURLを公開してよいか確認した
- [ ] Apps Script URLを公開してよいか確認した
- [ ] GoogleフォームURLを公開してよいか確認した
- [ ] LINE通知先IDや個人のユーザーIDを公開していない
- [ ] テストデータに実名、実メールアドレス、実問い合わせ内容が含まれていない

## コード

- [ ] Webhook / `doPost` を追加していない
- [ ] LINEから直接 `対応済み` にする機能を実装済みのように書いていない
- [ ] 本番データを削除する処理がない
- [ ] `Code.gs` の構文チェックが通っている
- [ ] `appsscript.json` のJSONチェックが通っている

## 公開判断

- [ ] GitHub公開範囲をPrivateにするかPublicにするか決めた
- [ ] Publicにする前に秘密情報スキャンを実行した
- [ ] 公開後にREADME表示を確認する
- [ ] 公開後に不要ファイルが混ざっていないか確認する
