# PROJECT_STATUS

## プロジェクト名

LINE問い合わせ通知・未対応アラート自動化システム

## 現在フェーズ

Phase 4 完了：LINE問い合わせ通知・AI分析・未対応アラート実装済み

## 完了したこと

- プロジェクトの基本ファイル構成を作成
- Googleフォーム作成関数を実装
- Googleフォーム回答先をスプレッドシートへ連携する処理を実装
- `問い合わせ管理` シートの自動作成を実装
- 標準ヘッダーの自動作成を実装
- 既存データを削除せず、不足ヘッダーだけ追加する方針を実装
- フォーム回答を `問い合わせ管理` シートへ転記する処理を実装
- OpenAI APIによる問い合わせ分析を実装
  - AI要約
  - 分類
  - 緊急度
  - 確認事項
- AI結果をスプレッドシートへ記録する処理を実装
- AI結果入りLINE通知を実装
- LINE通知ステータス管理を実装
- LINE通知日時の記録を実装
- LINE通知失敗時のエラー記録を実装
- 未対応問い合わせのLINE再通知を実装
- 再通知回数の記録を実装
- 最終再通知日時の記録を実装
- 未対応アラート用の時間主導トリガー作成を実装
- 未対応アラートのテスト用行作成関数を実装
- clasp反映用の `appsscript.json` を追加
- `.claspignore` でApps Script反映対象を `Code.gs` と `appsscript.json` に限定
- Script Propertiesで秘密情報を管理する設計にした
- `README.md` をポートフォリオ提出向けに整理
- `PORTFOLIO.md` を応募文へ転用しやすい形に整理
- `TEST_CHECKLIST.md` を完成版に整理
- `OPERATION_MANUAL.md` を作成
- `GITHUB_RELEASE_CHECKLIST.md` を作成
- `.gitignore` を公開前向けに整理

## 未完了のこと

- Google環境での最終一通りテスト
- GitHub公開判断
- スクリーンショットや実行例画像の追加
- Webhook / `doPost`
- LINEから直接 `対応済み` にする機能
- 未対応アラート条件のScript Properties化
- 対応期限の自動設定
- 担当者の自動割り当て

## 手動設定が必要なこと

- LINE DevelopersでMessaging APIチャネルを作成する
- `LINE_CHANNEL_ACCESS_TOKEN` をScript Propertiesへ登録する
- 通知先のユーザーIDまたはグループIDを用意する
- `LINE_TO_ID` をScript Propertiesへ登録する
- OpenAI APIキーを作成する
- `OPENAI_API_KEY` をScript Propertiesへ登録する
- 必要に応じて `OPENAI_MODEL` をScript Propertiesへ登録する
- Apps Scriptエディタで初回権限承認を行う
- `setupInquiryFormIntegration()` を実行する
- `createUnhandledAlertTrigger()` を実行する
- Googleフォームからテスト送信する

秘密情報の実値は、コードや公開ドキュメントには記載しません。

## テスト済み項目

ローカルで確認済みの項目です。

- `Code.gs` 構文チェック
- `appsscript.json` JSON形式チェック
- Markdown空白チェック
- 秘密情報の混入チェック
- `.gitignore` 内容確認
- Webhook / `doPost` を追加していないことの確認
- claspで `Code.gs` と `appsscript.json` をApps Scriptへ反映

Google環境で確認が必要な項目です。

- LINEテスト通知
- スプレッドシート初期化
- Googleフォーム作成
- フォーム送信テスト
- OpenAI分析テスト
- AI結果入りLINE通知
- 未対応アラートテスト
- 再通知回数更新
- 最終再通知日時更新
- 時間主導トリガー作成
- 秘密情報がログに出ないこと

## 次にやること

1. Apps ScriptのScript PropertiesにLINEとOpenAIの設定値を登録する。
2. Apps Scriptエディタで `runInitialSetupCheck()`、`testSendLineMessage()`、`testAnalyzeInquiryWithOpenAI()` を実行する。
3. Googleフォームからテスト送信し、AI結果入りLINE通知を確認する。
4. `createTestUnhandledInquiryAlertRow()` と `testSendUnhandledInquiryAlertWithTestRow()` で未対応アラートを確認する。
5. GitHub公開前に `GITHUB_RELEASE_CHECKLIST.md` を確認する。
