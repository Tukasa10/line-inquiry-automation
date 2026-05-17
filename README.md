# LINE問い合わせ通知・未対応アラート自動化システム

## プロジェクト概要

Googleフォームに届いた問い合わせをGoogleスプレッドシートへ記録し、OpenAI APIで内容を分析したうえでLINEへ通知する業務自動化システムです。

フォーム送信直後の新規問い合わせ通知に加えて、未対応のまま一定時間が経過した問い合わせをLINEへ再通知し、対応漏れを防ぎます。

## 解決する業務課題

- 問い合わせに気づくのが遅れる
- 問い合わせ内容を毎回読み込む手間がある
- 緊急度の高い問い合わせを優先しにくい
- 対応状況がスプレッドシートや担当者間で分散する
- 未対応の問い合わせが埋もれる
- 通知済み、再通知済み、エラー状態を後から確認しづらい

## 使用技術

- Google Apps Script
- Googleフォーム
- Googleスプレッドシート
- LINE Messaging API
- OpenAI API
- Script Properties
- clasp

## 主な機能

- Googleフォーム作成
- フォーム回答先のスプレッドシート連携
- `問い合わせ管理` シートの自動作成
- 標準ヘッダーの自動作成
- フォーム回答の `問い合わせ管理` シート転記
- OpenAI APIによる問い合わせ分析
  - AI要約
  - 分類
  - 緊急度
  - 確認事項
- AI結果入りLINE通知
- LINE通知ステータス管理
- 未対応問い合わせのLINE再通知
- 再通知回数の記録
- 最終再通知日時の記録
- 未対応アラート用トリガー作成
- テスト用関数による動作確認
- claspによるApps Script反映
- Script Propertiesによる秘密情報管理

## 処理の流れ

1. 利用者がGoogleフォームから問い合わせを送信します。
2. Apps Scriptのフォーム送信時トリガーが起動します。
3. 回答内容を `問い合わせ管理` シートへ転記します。
4. OpenAI APIで問い合わせ内容を分析します。
5. AI要約、分類、緊急度、確認事項をシートへ記録します。
6. AI結果を含む新規問い合わせ通知をLINEへ送信します。
7. LINE通知ステータス、通知日時、エラー内容をシートへ記録します。
8. 時間主導トリガーで未対応問い合わせを定期チェックします。
9. 条件に合う未対応問い合わせをLINEへ再通知します。
10. 再通知回数、最終再通知日時、LINE通知ステータスを更新します。

## セットアップ手順

1. LINE DevelopersでMessaging APIチャネルを作成します。
2. チャネルアクセストークンを発行します。
3. 通知先のユーザーIDまたはグループIDを用意します。
4. OpenAI PlatformでAPIキーを作成します。
5. Apps ScriptのScript Propertiesに必要な値を設定します。
6. claspまたはApps Scriptエディタで `Code.gs` と `appsscript.json` を反映します。
7. `setupInquiryFormIntegration()` を実行します。
8. `runInitialSetupCheck()` を実行します。
9. `testSendLineMessage()` を実行し、LINE通知を確認します。
10. `testAnalyzeInquiryWithOpenAI()` を実行し、OpenAI分析を確認します。
11. Googleフォームからテスト送信し、AI結果入りLINE通知を確認します。
12. `createUnhandledAlertTrigger()` を実行し、未対応アラート用トリガーを作成します。

詳しいLINE設定は [LINE_SETUP.md](./LINE_SETUP.md)、OpenAI設定は [OPENAI_SETUP.md](./OPENAI_SETUP.md)、clasp設定は [CLASP_SETUP.md](./CLASP_SETUP.md) を参照してください。

## Script Properties一覧

| キー | 必須 | 用途 |
| --- | --- | --- |
| `LINE_CHANNEL_ACCESS_TOKEN` | 必須 | LINE Messaging APIのチャネルアクセストークン |
| `LINE_TO_ID` | 必須 | 通知先のユーザーIDまたはグループID |
| `OPENAI_API_KEY` | 必須 | OpenAI APIキー |
| `OPENAI_MODEL` | 任意 | 使用するOpenAIモデル。未設定時はコード内の初期値を使用 |
| `INQUIRY_FORM_ID` | 自動保存 | 作成済みGoogleフォームID |
| `INQUIRY_FORM_EDIT_URL` | 自動保存 | Googleフォーム編集URL |
| `INQUIRY_FORM_PUBLIC_URL` | 自動保存 | Googleフォーム公開URL |

未対応アラート設定は、現時点では `Code.gs` 内の定数で管理しています。将来的にScript Properties化する場合は、以下のキーを使う想定です。

| キー | 用途 |
| --- | --- |
| `UNHANDLED_ALERT_AFTER_HOURS` | 受付から何時間後に再通知対象にするか |
| `UNHANDLED_ALERT_INTERVAL_HOURS` | 再通知の最短間隔 |
| `UNHANDLED_ALERT_MAX_COUNT` | 最大再通知回数 |

秘密情報の実値は、コードやREADMEに記載しません。

## 実行する関数一覧

| 関数名 | 用途 |
| --- | --- |
| `initializeInquirySheet()` | `問い合わせ管理` シートと標準ヘッダーを作成 |
| `setupInquiryFormIntegration()` | Googleフォーム作成、回答先連携、フォーム送信時トリガー作成 |
| `runInitialSetupCheck()` | シート、LINE設定、OpenAI設定をまとめて確認 |
| `checkLineSettings()` | LINE設定の不足確認 |
| `checkOpenAISettings()` | OpenAI設定の不足確認 |
| `testSendLineMessage()` | LINEテスト通知 |
| `testAnalyzeInquiryWithOpenAI()` | OpenAI分析だけのテスト |
| `testHandleFormSubmitWithAiLikeData()` | フォーム送信相当データでシート記録、AI分析、LINE通知をテスト |
| `handleFormSubmit(e)` | フォーム送信時に自動実行される本処理 |
| `sendUnhandledInquiryAlerts()` | 未対応問い合わせをチェックしてLINE再通知 |
| `createUnhandledAlertTrigger()` | 未対応アラート用の時間主導トリガー作成 |
| `getUnhandledAlertSettings()` | 未対応アラート設定確認 |
| `createTestUnhandledInquiryAlertRow()` | 再通知条件を満たすテスト行を作成 |
| `testSendUnhandledInquiryAlertWithTestRow()` | テスト行を作成し、その1行だけLINE再通知 |

## テスト手順

1. `runInitialSetupCheck()` で初期設定を確認します。
2. `testSendLineMessage()` でLINEにテスト通知が届くことを確認します。
3. `testAnalyzeInquiryWithOpenAI()` でAI要約、分類、緊急度、確認事項が返ることを確認します。
4. `testHandleFormSubmitWithAiLikeData()` でフォーム送信相当の処理を確認します。
5. Googleフォームから実際にテスト送信します。
6. `問い合わせ管理` シートにAI結果とLINE通知ステータスが記録されることを確認します。
7. `createTestUnhandledInquiryAlertRow()` で未対応アラート用のテスト行を作成します。
8. `testSendUnhandledInquiryAlertWithTestRow()` でテスト行だけがLINE再通知されることを確認します。
9. `createUnhandledAlertTrigger()` で時間主導トリガーが作成できることを確認します。

## 未対応アラート条件

- `対応ステータス` が `未対応`
- `受付日時` から24時間以上経過
- `再通知回数` が3回未満
- `最終再通知日時` が空、または前回再通知から24時間以上経過

再通知成功時は以下を更新します。

- `LINE通知ステータス`: `再通知済み`
- `再通知回数`: 現在値 + 1
- `最終再通知日時`: 実行日時
- `エラー内容`: 空欄

## 運用時の注意点

- APIキー、LINEトークン、通知先IDはScript Propertiesで管理します。
- `Code.gs` やREADMEに秘密情報の実値を書かないでください。
- 問い合わせ内容はOpenAI APIへ送信されます。
- 個人情報を扱う場合は、利用規約、プライバシーポリシー、社内ルールに沿って運用してください。
- `対応ステータス` を `対応済み` にすると、未対応アラートの対象外になります。
- `.clasp.json` と `.clasprc.json` はGit管理対象外にします。
- Webhook / `doPost` は未実装です。
- LINEから直接 `対応済み` にする機能は未実装です。

## 今後の拡張候補

- 未対応アラート条件のScript Properties化
- 対応期限の自動設定
- 担当者の自動割り当て
- LINEからの対応ステータス更新
- Webhook連携
- 管理画面化
- 月次レポート作成
