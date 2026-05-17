# OpenAI API設定手順

## 目的

Googleフォームから送信された問い合わせ内容をOpenAI APIで分析し、以下を自動生成するための設定手順です。

- AI要約
- 分類
- 緊急度
- 確認事項

## Script Propertiesに設定する項目

Apps ScriptのScript Propertiesに以下を設定します。

| キー | 必須 | 内容 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 必須 | OpenAI APIキー |
| `OPENAI_MODEL` | 任意 | 使用するOpenAIモデル。未設定時は `gpt-5.4-mini` を使用 |

注意: `OPENAI_API_KEY` は秘密情報です。`Code.gs` やGitHubに直接書かないでください。

## 設定手順

1. OpenAI PlatformでAPIキーを作成します。
2. Apps Scriptエディタを開きます。
3. 左メニューのプロジェクトの設定を開きます。
4. スクリプト プロパティに `OPENAI_API_KEY` を追加します。
5. 必要に応じて `OPENAI_MODEL` を追加します。
6. `runInitialSetupCheck()` を実行し、OpenAI設定の不足がないことを確認します。

## 生成するAI結果

フォーム送信時に以下を生成し、`問い合わせ管理` シートへ記録します。

| AI結果 | 記録先列 |
| --- | --- |
| 要約 | AI要約 |
| 分類 | 分類 |
| 緊急度 | 緊急度 |
| 確認事項 | 確認事項 |

## 注意事項

- OpenAI APIの利用には料金が発生する場合があります。
- APIキーはScript Propertiesで管理します。
- 問い合わせ内容はOpenAI APIへ送信されます。
- 個人情報を扱う運用では、利用規約、プライバシーポリシー、社内ルールに沿って利用してください。
