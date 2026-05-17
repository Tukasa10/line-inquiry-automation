# 操作手順書

## 初回セットアップ手順

1. Googleスプレッドシートを作成します。
2. スプレッドシートに紐づくApps Scriptプロジェクトを開きます。
3. `Code.gs` と `appsscript.json` をApps Scriptへ反映します。
4. Apps ScriptのScript Propertiesに以下を設定します。
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_TO_ID`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`（任意）
5. `runInitialSetupCheck()` を実行します。
6. 初回権限承認を行います。
7. `setupInquiryFormIntegration()` を実行します。
8. 作成されたGoogleフォームの編集URLと公開URLを確認します。
9. `testSendLineMessage()` を実行し、LINE通知を確認します。
10. `testAnalyzeInquiryWithOpenAI()` を実行し、OpenAI分析を確認します。
11. `createUnhandledAlertTrigger()` を実行し、未対応アラート用トリガーを作成します。

## 日常運用手順

1. 利用者がGoogleフォームから問い合わせを送信します。
2. `問い合わせ管理` シートに問い合わせ内容とAI分析結果が記録されます。
3. 担当者はLINE通知を確認します。
4. 対応状況に応じて `対応ステータス` を更新します。
5. 未対応のまま一定時間が経過した問い合わせはLINEへ再通知されます。
6. 対応が完了したら `対応ステータス` を `対応済み` に変更します。

## 問い合わせ確認方法

`問い合わせ管理` シートで以下の列を確認します。

- `受付ID`
- `受付日時`
- `氏名`
- `メールアドレス`
- `問い合わせ内容`
- `AI要約`
- `分類`
- `緊急度`
- `確認事項`
- `対応ステータス`
- `LINE通知ステータス`
- `エラー内容`

緊急度が高いもの、または確認事項が多いものから優先して確認します。

## 対応ステータス更新方法

`対応ステータス` 列を手動で更新します。

| ステータス | 用途 |
| --- | --- |
| `未対応` | まだ対応していない |
| `対応中` | 担当者が確認または対応中 |
| `対応済み` | 対応が完了した |
| `保留` | すぐには対応しないが確認済み |

未対応アラートの対象になるのは `未対応` の行だけです。対応済みの問い合わせは必ず `対応済み` に変更してください。

## 未対応アラートの確認方法

未対応アラートは以下の条件を満たす行を対象にします。

- `対応ステータス` が `未対応`
- `受付日時` から24時間以上経過
- `再通知回数` が3回未満
- `最終再通知日時` が空、または前回再通知から24時間以上経過

再通知後は以下の列を確認します。

- `LINE通知ステータス`: `再通知済み`
- `再通知回数`: 1増える
- `最終再通知日時`: 実行日時が入る
- `エラー内容`: 成功時は空欄

24時間待たずに確認する場合は、`createTestUnhandledInquiryAlertRow()` でテスト行を作成し、`testSendUnhandledInquiryAlertWithTestRow()` を実行します。

## よくあるエラーと対処

### Script Propertiesに設定値がありません

原因:
Script Propertiesに必要なキーが登録されていません。

対応:
Apps Scriptのプロジェクト設定を開き、以下を確認します。

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_TO_ID`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`（任意）

### LINE通知に失敗します

原因:
LINEトークン、通知先ID、Messaging API設定のいずれかが正しくない可能性があります。

対応:
`checkLineSettings()` を実行し、`LINE_CHANNEL_ACCESS_TOKEN` と `LINE_TO_ID` を確認します。LINE Developers側でチャネルアクセストークンが有効かも確認します。

### OpenAI分析に失敗します

原因:
OpenAI APIキーが未設定、無効、または利用制限に達している可能性があります。

対応:
`checkOpenAISettings()` を実行し、`OPENAI_API_KEY` を確認します。必要に応じてOpenAI Platform側の利用状況も確認します。

### Googleフォームが作成されません

原因:
Apps Scriptの権限承認が完了していない、またはスプレッドシートに紐づいたプロジェクトではない可能性があります。

対応:
スプレッドシートからApps Scriptを開き、`setupInquiryFormIntegration()` を実行して権限承認を行います。

### 未対応アラートが送られません

原因:
対象行が条件を満たしていない可能性があります。

対応:
対象行の `対応ステータス`、`受付日時`、`再通知回数`、`最終再通知日時` を確認します。トリガーが作成されているかも確認します。

## Script Propertiesの確認方法

1. Apps Scriptエディタを開きます。
2. 左メニューからプロジェクトの設定を開きます。
3. スクリプト プロパティを確認します。
4. 必要なキーが登録されているか確認します。
5. 値を公開ドキュメントやGitHubに貼り付けないよう注意します。

## トリガー確認方法

1. Apps Scriptエディタを開きます。
2. 左メニューからトリガーを開きます。
3. `handleFormSubmit` のフォーム送信時トリガーがあるか確認します。
4. `sendUnhandledInquiryAlerts` の時間主導トリガーがあるか確認します。
5. トリガーがない場合は、以下を実行します。
   - `setupInquiryFormIntegration()`
   - `createUnhandledAlertTrigger()`
