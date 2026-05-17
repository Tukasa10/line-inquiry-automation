# テストチェックリスト

## 事前確認

- [ ] `Code.gs` に `LINE_CHANNEL_ACCESS_TOKEN` の実値を書いていない
- [ ] `Code.gs` に `LINE_TO_ID` の実値を書いていない
- [ ] `Code.gs` に `OPENAI_API_KEY` の実値を書いていない
- [ ] Script Propertiesに `LINE_CHANNEL_ACCESS_TOKEN` を設定した
- [ ] Script Propertiesに `LINE_TO_ID` を設定した
- [ ] Script Propertiesに `OPENAI_API_KEY` を設定した
- [ ] 必要に応じてScript Propertiesに `OPENAI_MODEL` を設定した
- [ ] 秘密情報が実行ログに出ていない

## LINEテスト通知

- [ ] `checkLineSettings()` を実行できた
- [ ] `checkLineSettings()` で設定不足がないことを確認した
- [ ] `testSendLineMessage()` を実行できた
- [ ] LINEにテスト通知が届いた
- [ ] LINE通知失敗時にレスポンスコードと本文がログに残る
- [ ] LINE通知失敗時に秘密情報がログに出ていない

## スプレッドシート初期化

- [ ] `initializeInquirySheet()` を実行できた
- [ ] `問い合わせ管理` シートが作成された
- [ ] 1行目に標準ヘッダーが作成された
- [ ] 既存ヘッダーがある場合、不足ヘッダーだけ追加された
- [ ] 既存データが削除されていない
- [ ] 1行目が固定表示された

## Googleフォーム作成

- [ ] `setupInquiryFormIntegration()` を実行できた
- [ ] Googleフォームが作成された
- [ ] フォーム項目に `氏名` がある
- [ ] フォーム項目に `メールアドレス` がある
- [ ] フォーム項目に `問い合わせ内容` がある
- [ ] フォーム回答先が対象スプレッドシートに設定された
- [ ] フォーム送信時トリガーが作成された
- [ ] 同じフォーム送信時トリガーが重複作成されない
- [ ] Script Propertiesに `INQUIRY_FORM_ID` が保存された
- [ ] Script Propertiesに `INQUIRY_FORM_EDIT_URL` が保存された
- [ ] Script Propertiesに `INQUIRY_FORM_PUBLIC_URL` が保存された

## OpenAI分析テスト

- [ ] `checkOpenAISettings()` を実行できた
- [ ] `checkOpenAISettings()` で設定不足がないことを確認した
- [ ] `testAnalyzeInquiryWithOpenAI()` を実行できた
- [ ] `AI要約` が返った
- [ ] `分類` が返った
- [ ] `緊急度` が返った
- [ ] `確認事項` が返った
- [ ] OpenAI API失敗時に分かりやすいエラーになる
- [ ] OpenAI API失敗時に秘密情報がログに出ていない

## フォーム送信テスト

- [ ] `testHandleFormSubmitWithAiLikeData()` を実行できた
- [ ] Googleフォームからテスト送信できた
- [ ] `問い合わせ管理` シートに1行追加された
- [ ] `受付ID` が自動入力された
- [ ] `受付日時` が記録された
- [ ] `氏名` が記録された
- [ ] `メールアドレス` が記録された
- [ ] `問い合わせ内容` が記録された
- [ ] `対応ステータス` が `未対応` になった

## AI結果入りLINE通知

- [ ] `AI要約` がシートに記録された
- [ ] `分類` がシートに記録された
- [ ] `緊急度` がシートに記録された
- [ ] `確認事項` がシートに記録された
- [ ] LINEにAI結果入りの新規問い合わせ通知が届いた
- [ ] `LINE通知ステータス` が `通知済み` になった
- [ ] `LINE通知日時` が記録された
- [ ] `エラー内容` が空欄になった
- [ ] LINE通知失敗時に `LINE通知ステータス` が `通知エラー` になる
- [ ] LINE通知失敗時に `エラー内容` が記録される

## 未対応アラートテスト

- [ ] `getUnhandledAlertSettings()` を実行できた
- [ ] 未対応アラート条件を確認した
- [ ] テスト用受付IDプレフィックスが `TEST-ALERT-` であることを確認した
- [ ] `createTestUnhandledInquiryAlertRow()` を実行できた
- [ ] テスト行の `受付日時` が25時間前になっていることを確認した
- [ ] テスト行の `対応ステータス` が `未対応` になっていることを確認した
- [ ] テスト行の `再通知回数` が `0` になっていることを確認した
- [ ] `createTestUnhandledInquiryAlertRow()` 実行時にはLINE通知が送信されないことを確認した
- [ ] `testSendUnhandledInquiryAlertWithTestRow()` を実行できた
- [ ] 作成したテスト行だけが再通知対象になった
- [ ] LINEに未対応問い合わせアラートが届いた

## 再通知回数更新

- [ ] 再通知成功時に `LINE通知ステータス` が `再通知済み` になった
- [ ] 再通知成功時に `再通知回数` が1増えた
- [ ] `再通知回数` が3回以上の行はスキップされた
- [ ] 前回再通知から24時間未満の行はスキップされた
- [ ] `対応ステータス` が `未対応` 以外の行はスキップされた

## 最終再通知日時更新

- [ ] 再通知成功時に `最終再通知日時` が記録された
- [ ] 再通知成功時に `エラー内容` が空欄になった
- [ ] 再通知失敗時に `LINE通知ステータス` が `通知エラー` になった
- [ ] 再通知失敗時に `エラー内容` が記録された

## トリガー作成

- [ ] `createUnhandledAlertTrigger()` を実行できた
- [ ] 未対応アラート用の時間主導トリガーが作成された
- [ ] 同じ未対応アラートトリガーが重複作成されない
- [ ] Apps Scriptのトリガー画面で `sendUnhandledInquiryAlerts` が確認できた

## clasp反映

- [ ] `appsscript.json` がある
- [ ] `.claspignore` がある
- [ ] `.claspignore` でApps Scriptへの送信対象が `Code.gs` と `appsscript.json` に限定されている
- [ ] `.gitignore` に `.clasp.json` が含まれている
- [ ] `.gitignore` に `.clasprc.json` が含まれている
- [ ] `clasp push` を実行できた
- [ ] Apps Script側に `Code.gs` が反映された
- [ ] Apps Script側に `appsscript.json` が反映された

## 未実装範囲の確認

- [ ] Webhook / `doPost` をまだ実装していない
- [ ] LINEから直接 `対応済み` にする機能をまだ実装していない
