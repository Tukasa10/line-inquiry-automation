# LINE設定手順

## 目的

Google Apps ScriptからLINE Messaging APIを使って通知を送るための設定手順です。

## 1. Messaging APIチャネルを作成

1. LINE Developersにログインします。
2. Providerを作成または選択します。
3. Messaging APIチャネルを作成します。
4. チャネル名、説明、業種など必要項目を入力します。

## 2. チャネルアクセストークンを発行

1. 作成したMessaging APIチャネルを開きます。
2. Messaging API設定を開きます。
3. チャネルアクセストークンを発行します。
4. 発行した値を控えます。

注意: チャネルアクセストークンは秘密情報です。GitHubやドキュメントに記載しないでください。

## 3. 通知先IDを用意

通知先として、ユーザーIDまたはグループIDを用意します。

- 個人宛てに送る場合: ユーザーID
- グループ宛てに送る場合: グループID

Phase 1では、用意した通知先IDを `LINE_TO_ID` としてScript Propertiesに登録します。

## 4. Script Propertiesを設定

1. Apps Scriptエディタを開きます。
2. 左メニューのプロジェクトの設定を開きます。
3. スクリプト プロパティを追加します。
4. 以下のキーと値を登録します。

| キー | 値 |
| --- | --- |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developersで発行したチャネルアクセストークン |
| `LINE_TO_ID` | 通知先のユーザーIDまたはグループID |

注意: `Code.gs` にアクセストークンや通知先IDを直接書かないでください。

## 5. テスト通知を実行

1. Apps Scriptに `Code.gs` を貼り付け、保存します。
2. 実行関数として `testSendLineMessage` を選択します。
3. 初回実行時は権限承認を行います。
4. 実行後、LINEに以下の通知が届くことを確認します。

```text
【テスト通知】
LINE問い合わせ自動化システムの通知テストです。
```

## 6. 失敗した場合

- `LINE_CHANNEL_ACCESS_TOKEN` が未設定でないか確認します。
- `LINE_TO_ID` が未設定でないか確認します。
- チャネルアクセストークンが有効か確認します。
- 通知先IDが正しいか確認します。
- Apps Scriptの実行ログにレスポンスコードとレスポンス本文が出ているか確認します。
