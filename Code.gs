/**
 * LINE問い合わせ通知・未対応アラート自動化システム
 *
 * Phase 1では、スプレッドシート初期化、Googleフォーム連携、
 * OpenAI APIによる問い合わせ分析、フォーム送信時のLINE通知、
 * 未対応問い合わせの再通知アラートまでを実装します。
 */

const SCRIPT_PROPERTY_KEYS = {
  LINE_CHANNEL_ACCESS_TOKEN: 'LINE_CHANNEL_ACCESS_TOKEN',
  LINE_TO_ID: 'LINE_TO_ID'
};

const OPENAI_PROPERTY_KEYS = {
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_MODEL: 'OPENAI_MODEL'
};

const SHEET_NAME = '問い合わせ管理';
const FORM_TITLE = 'LINE問い合わせフォーム';
const LINE_PUSH_MESSAGE_URL = 'https://api.line.me/v2/bot/message/push';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

const FORM_PROPERTY_KEYS = {
  INQUIRY_FORM_ID: 'INQUIRY_FORM_ID',
  INQUIRY_FORM_EDIT_URL: 'INQUIRY_FORM_EDIT_URL',
  INQUIRY_FORM_PUBLIC_URL: 'INQUIRY_FORM_PUBLIC_URL'
};

const FORM_FIELD_NAMES = {
  NAME: '氏名',
  EMAIL: 'メールアドレス',
  CONTENT: '問い合わせ内容'
};

const RESPONSE_STATUS = {
  UNHANDLED: '未対応'
};

const LINE_NOTIFICATION_STATUS = {
  NOT_NOTIFIED: '未通知',
  NOTIFIED: '通知済み',
  RENOTIFIED: '再通知済み',
  ERROR: '通知エラー'
};

const UNHANDLED_ALERT_SETTINGS = {
  THRESHOLD_HOURS: 24,
  RENOTIFY_INTERVAL_HOURS: 24,
  MAX_RENOTIFY_COUNT: 3,
  TRIGGER_EVERY_HOURS: 1,
  HANDLER_FUNCTION_NAME: 'sendUnhandledInquiryAlerts'
};

const UNHANDLED_ALERT_TEST_SETTINGS = {
  RECEIVED_HOURS_AGO: 25,
  RECEIPT_ID_PREFIX: 'TEST-ALERT-',
  NAME: '未対応アラートテスト',
  EMAIL: 'alert-test@example.com',
  CONTENT: '未対応アラートの動作確認用問い合わせです。再通知条件を満たすテスト行として作成されます。'
};

const INQUIRY_SHEET_HEADERS = [
  '受付ID',
  '受付日時',
  '氏名',
  'メールアドレス',
  '問い合わせ内容',
  'AI要約',
  '分類',
  '緊急度',
  '確認事項',
  '担当者',
  '対応ステータス',
  'LINE通知ステータス',
  'LINE通知日時',
  '再通知回数',
  '最終再通知日時',
  '対応期限',
  'エラー内容'
];

/**
 * Script Propertiesから指定キーの値を取得します。
 *
 * @param {string} key 取得するScript Propertiesのキー
 * @return {string} 設定値
 */
function getScriptProperty_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);

  if (!value || String(value).trim() === '') {
    throw new Error(
      'Script Propertiesに "' + key + '" が設定されていません。' +
      'LINE_SETUP.md または OPENAI_SETUP.md の手順に沿って設定してください。'
    );
  }

  return String(value).trim();
}

/**
 * Script Propertiesから任意キーの値を取得します。
 *
 * @param {string} key 取得するScript Propertiesのキー
 * @return {string} 設定値。未設定時は空文字
 */
function getOptionalScriptProperty_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);

  return value ? String(value).trim() : '';
}

/**
 * 問い合わせ管理シートを作成し、1行目に標準ヘッダーを設定します。
 *
 * 既存のヘッダーやデータは削除せず、不足している列だけ右側へ追加します。
 *
 * @return {Object} 初期化結果
 */
function initializeInquirySheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'アクティブなスプレッドシートが見つかりません。' +
      'スプレッドシートに紐づくApps Scriptから実行してください。'
    );
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  let createdSheet = false;

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    createdSheet = true;
  }

  const existingHeaders = getHeaderValues_(sheet);
  const hasAnyHeader = existingHeaders.some(function(header) {
    return header !== '';
  });

  let addedHeaders = [];

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, INQUIRY_SHEET_HEADERS.length)
      .setValues([INQUIRY_SHEET_HEADERS]);
    addedHeaders = INQUIRY_SHEET_HEADERS.slice();
  } else {
    const existingHeaderMap = existingHeaders.reduce(function(map, header) {
      if (header !== '') {
        map[header] = true;
      }
      return map;
    }, {});

    const missingHeaders = INQUIRY_SHEET_HEADERS.filter(function(header) {
      return !existingHeaderMap[header];
    });

    if (missingHeaders.length > 0) {
      const startColumn = Math.max(existingHeaders.length, 1) + 1;
      sheet.getRange(1, startColumn, 1, missingHeaders.length)
        .setValues([missingHeaders]);
      addedHeaders = missingHeaders;
    }
  }

  formatHeaderRow_(sheet);

  const result = {
    sheetName: SHEET_NAME,
    createdSheet: createdSheet,
    addedHeaders: addedHeaders,
    headerCount: INQUIRY_SHEET_HEADERS.length
  };

  writeLog_('INFO', '問い合わせ管理シートの初期化を実行しました。', result);
  return result;
}

/**
 * 問い合わせ管理シートを初期化してシートオブジェクトを返します。
 *
 * @return {Sheet} 問い合わせ管理シート
 */
function initializeInquirySheetAndGetSheet_() {
  initializeInquirySheet();

  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

/**
 * LINE通知に必要なScript Propertiesが設定されているか確認します。
 *
 * @return {Object} 設定確認結果
 */
function checkLineSettings() {
  const properties = PropertiesService.getScriptProperties();
  const result = {
    ok: true,
    requiredKeys: Object.keys(SCRIPT_PROPERTY_KEYS).map(function(name) {
      return SCRIPT_PROPERTY_KEYS[name];
    }),
    missingKeys: []
  };

  result.requiredKeys.forEach(function(key) {
    const value = properties.getProperty(key);
    if (!value || String(value).trim() === '') {
      result.ok = false;
      result.missingKeys.push(key);
    }
  });

  if (result.ok) {
    writeLog_('INFO', 'LINE設定の確認に成功しました。', result);
    return result;
  }

  writeLog_('WARN', 'LINE設定に不足があります。', result);
  throw new Error(
    'LINE設定に不足があります: ' + result.missingKeys.join(', ') +
    '。Apps ScriptのScript Propertiesを確認してください。'
  );
}

/**
 * OpenAI APIに必要なScript Propertiesが設定されているか確認します。
 *
 * @return {Object} 設定確認結果
 */
function checkOpenAISettings() {
  const apiKey = getOptionalScriptProperty_(OPENAI_PROPERTY_KEYS.OPENAI_API_KEY);
  const model = getOpenAIModel_();
  const result = {
    ok: Boolean(apiKey),
    requiredKeys: [OPENAI_PROPERTY_KEYS.OPENAI_API_KEY],
    optionalKeys: [OPENAI_PROPERTY_KEYS.OPENAI_MODEL],
    missingKeys: [],
    model: model
  };

  if (!apiKey) {
    result.missingKeys.push(OPENAI_PROPERTY_KEYS.OPENAI_API_KEY);
    writeLog_('WARN', 'OpenAI設定に不足があります。', result);
    throw new Error(
      'OpenAI設定に不足があります: ' + result.missingKeys.join(', ') +
      '。Apps ScriptのScript Propertiesを確認してください。'
    );
  }

  writeLog_('INFO', 'OpenAI設定の確認に成功しました。', {
    model: model
  });
  return result;
}

/**
 * 初期設定の確認をまとめて実行します。
 *
 * @return {Object} 初期設定チェック結果
 */
function runInitialSetupCheck() {
  const sheetResult = initializeInquirySheet();
  const lineSettingsResult = checkLineSettings();
  const openAISettingsResult = checkOpenAISettings();
  const result = {
    ok: true,
    sheet: sheetResult,
    lineSettings: lineSettingsResult,
    openAISettings: openAISettingsResult
  };

  writeLog_('INFO', '初期設定チェックが完了しました。', result);
  return result;
}

/**
 * Googleフォーム作成、スプレッドシート連携、送信時トリガー作成をまとめて実行します。
 *
 * LINE設定値の確認やLINE通知テストは別途実行してください。
 *
 * @return {Object} フォーム連携設定結果
 */
function setupInquiryFormIntegration() {
  const sheetResult = initializeInquirySheet();
  const form = getOrCreateInquiryForm_();
  const triggerResult = createFormSubmitTrigger_();

  const result = {
    ok: true,
    sheet: sheetResult,
    form: {
      id: form.getId(),
      title: form.getTitle(),
      editUrl: form.getEditUrl(),
      publicUrl: form.getPublishedUrl()
    },
    trigger: triggerResult
  };

  writeLog_('INFO', 'Googleフォーム連携の初期設定が完了しました。', result);
  return result;
}

/**
 * Googleフォーム送信時に実行されるハンドラーです。
 *
 * フォーム回答を問い合わせ管理シートへ転記し、LINEへ新規問い合わせ通知を送ります。
 *
 * @param {Object} e フォーム送信イベント
 */
function handleFormSubmit(e) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    writeLog_('ERROR', 'フォーム送信処理のロック取得に失敗しました。', {});
    throw new Error('別のフォーム送信処理が実行中です。しばらくしてから確認してください。');
  }

  let appendedResult = null;

  try {
    const inquiry = buildInquiryFromFormSubmitEvent_(e);
    appendedResult = appendInquiryToManagementSheet_(inquiry);
    const aiAnalysis = generateInquiryAiAnalysis_(appendedResult.inquiry);

    updateInquiryAiAnalysis_(
      appendedResult.sheet,
      appendedResult.rowNumber,
      aiAnalysis
    );
    appendedResult.inquiry.aiAnalysis = aiAnalysis;

    const message = buildNewInquiryLineMessage_(appendedResult.inquiry);
    sendLineMessage_(message);

    updateInquiryResult_(
      appendedResult.sheet,
      appendedResult.rowNumber,
      LINE_NOTIFICATION_STATUS.NOTIFIED,
      new Date(),
      ''
    );

    writeLog_('INFO', 'フォーム送信時のLINE通知が完了しました。', {
      receiptId: appendedResult.inquiry.receiptId,
      rowNumber: appendedResult.rowNumber
    });
  } catch (error) {
    if (appendedResult) {
      updateInquiryResult_(
        appendedResult.sheet,
        appendedResult.rowNumber,
        LINE_NOTIFICATION_STATUS.ERROR,
        '',
        error.message
      );
    }

    writeLog_('ERROR', 'フォーム送信時の処理に失敗しました。', {
      message: error.message,
      stack: error.stack || ''
    });
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 問い合わせ内容からAI要約・分類・緊急度・確認事項を生成します。
 *
 * @param {Object} inquiry 問い合わせ情報
 * @return {Object} AI分析結果
 */
function generateInquiryAiAnalysis_(inquiry) {
  const apiKey = getScriptProperty_(OPENAI_PROPERTY_KEYS.OPENAI_API_KEY);
  const model = getOpenAIModel_();
  const payload = {
    model: model,
    input: [
      {
        role: 'system',
        content: [
          'あなたは問い合わせ一次対応の業務アシスタントです。',
          '問い合わせ内容を日本語で簡潔に分析してください。',
          '分類は「予約」「料金」「トラブル」「キャンセル」「要望」「その他」のいずれかを基本にしてください。',
          '緊急度は「高」「中」「低」のいずれかにしてください。',
          '確認事項は担当者が次に確認すべき項目を0件以上で返してください。',
          '出力は必ず指定されたJSONスキーマに従ってください。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          '以下の問い合わせを分析してください。',
          '',
          '氏名: ' + inquiry.name,
          'メールアドレス: ' + inquiry.email,
          '問い合わせ内容:',
          inquiry.content
        ].join('\n')
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'inquiry_analysis',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: {
              type: 'string',
              description: '問い合わせ内容の要約。80文字以内を目安にする。'
            },
            category: {
              type: 'string',
              description: '問い合わせ分類。予約、料金、トラブル、キャンセル、要望、その他など。'
            },
            urgency: {
              type: 'string',
              enum: ['高', '中', '低'],
              description: '対応の緊急度。'
            },
            confirmationItems: {
              type: 'array',
              description: '担当者が確認すべき事項。',
              items: {
                type: 'string'
              }
            }
          },
          required: [
            'summary',
            'category',
            'urgency',
            'confirmationItems'
          ]
        }
      }
    }
  };
  const response = UrlFetchApp.fetch(OPENAI_RESPONSES_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode < 200 || responseCode >= 300) {
    writeLog_('ERROR', 'OpenAI APIによる問い合わせ分析に失敗しました。', {
      responseCode: responseCode,
      responseBody: responseBody
    });
    throw new Error(
      'OpenAI APIによる問い合わせ分析に失敗しました。レスポンスコード: ' +
      responseCode + '。Apps Scriptのログを確認してください。'
    );
  }

  const parsedBody = JSON.parse(responseBody);
  const outputText = extractOpenAIOutputText_(parsedBody);
  const analysis = JSON.parse(outputText);

  return normalizeInquiryAiAnalysis_(analysis);
}

/**
 * LINE Messaging APIでテキストメッセージを送信します。
 *
 * @param {string} message 送信するメッセージ
 * @return {Object} LINE APIのレスポンス情報
 */
function sendLineMessage_(message) {
  if (!message || String(message).trim() === '') {
    throw new Error('送信メッセージが空です。');
  }

  const channelAccessToken = getScriptProperty_(
    SCRIPT_PROPERTY_KEYS.LINE_CHANNEL_ACCESS_TOKEN
  );
  const toId = getScriptProperty_(SCRIPT_PROPERTY_KEYS.LINE_TO_ID);

  const payload = {
    to: toId,
    messages: [
      {
        type: 'text',
        text: String(message)
      }
    ]
  };

  const response = UrlFetchApp.fetch(LINE_PUSH_MESSAGE_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + channelAccessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode < 200 || responseCode >= 300) {
    writeLog_('ERROR', 'LINE通知に失敗しました。', {
      responseCode: responseCode,
      responseBody: responseBody
    });

    throw new Error(
      'LINE通知に失敗しました。レスポンスコード: ' + responseCode +
      '。Apps Scriptのログを確認してください。'
    );
  }

  writeLog_('INFO', 'LINE通知を送信しました。', {
    responseCode: responseCode
  });

  return {
    responseCode: responseCode,
    responseBody: responseBody
  };
}

/**
 * LINE通知の接続確認用テスト関数です。
 */
function testSendLineMessage() {
  const message = '【テスト通知】\nLINE問い合わせ自動化システムの通知テストです。';
  return sendLineMessage_(message);
}

/**
 * OpenAI APIによる問い合わせ分析だけを確認するテスト関数です。
 *
 * Apps Scriptエディタの関数一覧から実行できます。
 *
 * @return {Object} AI分析結果
 */
function testAnalyzeInquiryWithOpenAI() {
  const inquiry = {
    receivedAt: new Date(),
    name: 'テスト太郎',
    email: 'test@example.com',
    content: [
      '予約内容の変更について相談です。',
      '明日の午後に予約していましたが、急用が入ったため別日に変更できるか確認したいです。',
      '可能な候補日と、変更手数料の有無を教えてください。'
    ].join('\n')
  };
  const result = generateInquiryAiAnalysis_(inquiry);

  writeLog_('INFO', 'OpenAI問い合わせ分析テストが完了しました。', result);
  return result;
}

/**
 * フォーム送信時と同じ流れを、テストデータで確認する関数です。
 *
 * 実行すると問い合わせ管理シートへ1行追加し、OpenAI分析後にLINE通知を送信します。
 * Apps Scriptエディタの関数一覧から実行できます。
 *
 * @return {Object} テスト実行結果
 */
function testHandleFormSubmitWithAiLikeData() {
  const now = new Date();
  const testEvent = {
    values: [
      now,
      'テスト花子',
      'test-form@example.com',
      'Webサイトから問い合わせました。料金プランと最短開始日について確認したいです。'
    ],
    namedValues: {
      'タイムスタンプ': [now],
      'Timestamp': [now],
      '氏名': ['テスト花子'],
      'メールアドレス': ['test-form@example.com'],
      '問い合わせ内容': [
        'Webサイトから問い合わせました。料金プランと最短開始日について確認したいです。'
      ]
    }
  };

  handleFormSubmit(testEvent);

  const result = {
    ok: true,
    message: 'テスト用フォーム送信データで処理を実行しました。問い合わせ管理シートとLINE通知を確認してください。'
  };

  writeLog_('INFO', 'フォーム送信相当のAI連携テストが完了しました。', result);
  return result;
}

/**
 * 未対応問い合わせをチェックし、条件に合うものをLINEへ再通知します。
 *
 * Apps Scriptエディタから手動実行でき、時間主導トリガーからも実行できます。
 *
 * @return {Object} 再通知実行結果
 */
function sendUnhandledInquiryAlerts() {
  return runUnhandledInquiryAlerts_({});
}

/**
 * 未対応問い合わせアラートの現在設定を確認します。
 *
 * Apps Scriptエディタの関数一覧から実行できます。
 *
 * @return {Object} 未対応アラート設定
 */
function getUnhandledAlertSettings() {
  const result = {
    thresholdHours: UNHANDLED_ALERT_SETTINGS.THRESHOLD_HOURS,
    renotifyIntervalHours: UNHANDLED_ALERT_SETTINGS.RENOTIFY_INTERVAL_HOURS,
    maxRenotifyCount: UNHANDLED_ALERT_SETTINGS.MAX_RENOTIFY_COUNT,
    triggerEveryHours: UNHANDLED_ALERT_SETTINGS.TRIGGER_EVERY_HOURS,
    handlerFunctionName: UNHANDLED_ALERT_SETTINGS.HANDLER_FUNCTION_NAME,
    testReceivedHoursAgo: UNHANDLED_ALERT_TEST_SETTINGS.RECEIVED_HOURS_AGO,
    testReceiptIdPrefix: UNHANDLED_ALERT_TEST_SETTINGS.RECEIPT_ID_PREFIX
  };

  writeLog_('INFO', '未対応問い合わせアラート設定を確認しました。', result);
  return result;
}

/**
 * 未対応アラート検証用のテスト行を問い合わせ管理シートへ追加します。
 *
 * LINE通知は送信しません。
 *
 * @return {Object} 作成したテスト行情報
 */
function createTestUnhandledInquiryAlertRow() {
  const sheet = initializeInquirySheetAndGetSheet_();
  const headerIndex = buildHeaderIndex_(sheet);
  const rowNumber = Math.max(sheet.getLastRow() + 1, 2);
  const receivedAt = new Date(
    new Date().getTime() -
    UNHANDLED_ALERT_TEST_SETTINGS.RECEIVED_HOURS_AGO * 60 * 60 * 1000
  );
  const receiptId = createTestUnhandledAlertReceiptId_(receivedAt, rowNumber);
  const rowValues = new Array(sheet.getLastColumn()).fill('');

  setRowValueByHeader_(rowValues, headerIndex, '受付ID', receiptId);
  setRowValueByHeader_(rowValues, headerIndex, '受付日時', receivedAt);
  setRowValueByHeader_(rowValues, headerIndex, '氏名', UNHANDLED_ALERT_TEST_SETTINGS.NAME);
  setRowValueByHeader_(rowValues, headerIndex, 'メールアドレス', UNHANDLED_ALERT_TEST_SETTINGS.EMAIL);
  setRowValueByHeader_(rowValues, headerIndex, '問い合わせ内容', UNHANDLED_ALERT_TEST_SETTINGS.CONTENT);
  setRowValueByHeader_(rowValues, headerIndex, 'AI要約', '未対応アラート検証用の問い合わせです。');
  setRowValueByHeader_(rowValues, headerIndex, '分類', 'その他');
  setRowValueByHeader_(rowValues, headerIndex, '緊急度', '中');
  setRowValueByHeader_(rowValues, headerIndex, '確認事項', '再通知が届くことを確認してください。');
  setRowValueByHeader_(rowValues, headerIndex, '対応ステータス', RESPONSE_STATUS.UNHANDLED);
  setRowValueByHeader_(rowValues, headerIndex, 'LINE通知ステータス', LINE_NOTIFICATION_STATUS.NOTIFIED);
  setRowValueByHeader_(rowValues, headerIndex, 'LINE通知日時', receivedAt);
  setRowValueByHeader_(rowValues, headerIndex, '再通知回数', 0);
  setRowValueByHeader_(rowValues, headerIndex, '最終再通知日時', '');
  setRowValueByHeader_(rowValues, headerIndex, 'エラー内容', '');

  sheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);

  const result = {
    ok: true,
    rowNumber: rowNumber,
    receiptId: receiptId,
    receivedAt: receivedAt,
    receivedHoursAgo: UNHANDLED_ALERT_TEST_SETTINGS.RECEIVED_HOURS_AGO,
    message: '未対応アラート検証用のテスト行を作成しました。LINE通知はまだ送信していません。'
  };

  writeLog_('INFO', '未対応アラート検証用テスト行を作成しました。', result);
  return result;
}

/**
 * 未対応アラート検証用のテスト行を作成し、その1行だけ再通知します。
 *
 * 実行するとLINE再通知が送信されます。
 *
 * @return {Object} テスト実行結果
 */
function testSendUnhandledInquiryAlertWithTestRow() {
  const testRow = createTestUnhandledInquiryAlertRow();
  const result = runUnhandledInquiryAlerts_({
    onlyReceiptId: testRow.receiptId
  });

  result.testRow = testRow;
  writeLog_('INFO', '未対応アラートのテスト送信が完了しました。', result);
  return result;
}

/**
 * 未対応問い合わせアラート処理を実行します。
 *
 * @param {Object} options 実行オプション
 * @return {Object} 再通知実行結果
 */
function runUnhandledInquiryAlerts_(options) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    writeLog_('ERROR', '未対応問い合わせアラートのロック取得に失敗しました。', {});
    throw new Error('別の未対応問い合わせアラート処理が実行中です。しばらくしてから確認してください。');
  }

  try {
    const executeOptions = options || {};
    initializeInquirySheet();

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const result = {
      ok: true,
      checkedRows: 0,
      targetRows: 0,
      notifiedRows: 0,
      skippedRows: 0,
      errorRows: 0,
      thresholdHours: UNHANDLED_ALERT_SETTINGS.THRESHOLD_HOURS,
      maxRenotifyCount: UNHANDLED_ALERT_SETTINGS.MAX_RENOTIFY_COUNT,
      onlyReceiptId: executeOptions.onlyReceiptId || ''
    };

    if (lastRow < 2) {
      writeLog_('INFO', '未対応問い合わせアラート対象の行はありません。', result);
      return result;
    }

    const headerIndex = buildHeaderIndex_(sheet);
    const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const now = new Date();

    values.forEach(function(rowValues, index) {
      const rowNumber = index + 2;
      const inquiry = buildInquiryFromSheetRow_(rowValues, headerIndex, rowNumber);

      if (executeOptions.onlyReceiptId && inquiry.receiptId !== executeOptions.onlyReceiptId) {
        result.skippedRows++;
        return;
      }

      const targetCheck = shouldSendUnhandledAlert_(inquiry, now);

      result.checkedRows++;

      if (!targetCheck.shouldSend) {
        result.skippedRows++;
        return;
      }

      result.targetRows++;

      try {
        const message = buildUnhandledInquiryAlertMessage_(inquiry, targetCheck);
        sendLineMessage_(message);
        updateUnhandledAlertResult_(
          sheet,
          rowNumber,
          inquiry.renotifyCount + 1,
          now,
          ''
        );
        result.notifiedRows++;
      } catch (error) {
        updateInquiryResult_(
          sheet,
          rowNumber,
          LINE_NOTIFICATION_STATUS.ERROR,
          inquiry.lineNotifiedAt || '',
          error.message
        );
        result.errorRows++;
        writeLog_('ERROR', '未対応問い合わせの再通知に失敗しました。', {
          rowNumber: rowNumber,
          receiptId: inquiry.receiptId,
          message: error.message,
          stack: error.stack || ''
        });
      }
    });

    writeLog_('INFO', '未対応問い合わせアラート処理が完了しました。', result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 未対応問い合わせアラート用の時間主導トリガーを作成します。
 *
 * 同じハンドラーのトリガーが存在する場合は重複作成しません。
 *
 * @return {Object} トリガー作成結果
 */
function createUnhandledAlertTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'アクティブなスプレッドシートが見つかりません。' +
      'スプレッドシートに紐づくApps Scriptから実行してください。'
    );
  }

  const handlerName = UNHANDLED_ALERT_SETTINGS.HANDLER_FUNCTION_NAME;
  const existingTriggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === handlerName;
  });

  if (existingTriggers.length > 0) {
    const result = {
      created: false,
      handler: handlerName,
      reason: '既存トリガーがあるため新規作成しませんでした。'
    };

    writeLog_('INFO', '未対応問い合わせアラート用トリガーは作成済みです。', result);
    return result;
  }

  ScriptApp.newTrigger(handlerName)
    .timeBased()
    .everyHours(UNHANDLED_ALERT_SETTINGS.TRIGGER_EVERY_HOURS)
    .create();

  const result = {
    created: true,
    handler: handlerName,
    everyHours: UNHANDLED_ALERT_SETTINGS.TRIGGER_EVERY_HOURS
  };

  writeLog_('INFO', '未対応問い合わせアラート用トリガーを作成しました。', result);
  return result;
}

/**
 * 使用するOpenAIモデル名を取得します。
 *
 * @return {string} モデル名
 */
function getOpenAIModel_() {
  return getOptionalScriptProperty_(OPENAI_PROPERTY_KEYS.OPENAI_MODEL) ||
    DEFAULT_OPENAI_MODEL;
}

/**
 * 問い合わせフォームを取得または新規作成します。
 *
 * @return {Form} 問い合わせフォーム
 */
function getOrCreateInquiryForm_() {
  const properties = PropertiesService.getScriptProperties();
  const savedFormId = properties.getProperty(FORM_PROPERTY_KEYS.INQUIRY_FORM_ID);
  let form = null;

  if (savedFormId) {
    try {
      form = FormApp.openById(savedFormId);
    } catch (error) {
      writeLog_('WARN', '保存済みフォームIDのフォームを開けませんでした。新規作成します。', {
        formId: savedFormId,
        message: error.message
      });
    }
  }

  if (!form) {
    form = FormApp.create(FORM_TITLE);
    form.setDescription('問い合わせ内容を送信してください。送信後、担当者へLINE通知されます。');
  }

  configureInquiryForm_(form);
  linkFormToActiveSpreadsheet_(form);

  properties.setProperty(FORM_PROPERTY_KEYS.INQUIRY_FORM_ID, form.getId());
  properties.setProperty(FORM_PROPERTY_KEYS.INQUIRY_FORM_EDIT_URL, form.getEditUrl());
  properties.setProperty(FORM_PROPERTY_KEYS.INQUIRY_FORM_PUBLIC_URL, form.getPublishedUrl());

  return form;
}

/**
 * 問い合わせフォームに必要な質問項目を追加します。
 *
 * @param {Form} form 対象フォーム
 */
function configureInquiryForm_(form) {
  const existingTitles = form.getItems().reduce(function(map, item) {
    map[item.getTitle()] = true;
    return map;
  }, {});

  if (!existingTitles[FORM_FIELD_NAMES.NAME]) {
    form.addTextItem()
      .setTitle(FORM_FIELD_NAMES.NAME)
      .setRequired(true);
  }

  if (!existingTitles[FORM_FIELD_NAMES.EMAIL]) {
    const emailItem = form.addTextItem()
      .setTitle(FORM_FIELD_NAMES.EMAIL)
      .setRequired(true);

    try {
      const emailValidation = FormApp.createTextValidation()
        .requireTextIsEmail()
        .build();
      emailItem.setValidation(emailValidation);
    } catch (error) {
      writeLog_('WARN', 'メールアドレス形式の入力制限を設定できませんでした。', {
        message: error.message
      });
    }
  }

  if (!existingTitles[FORM_FIELD_NAMES.CONTENT]) {
    form.addParagraphTextItem()
      .setTitle(FORM_FIELD_NAMES.CONTENT)
      .setRequired(true);
  }
}

/**
 * 問い合わせフォームの回答先を現在のスプレッドシートに設定します。
 *
 * @param {Form} form 対象フォーム
 */
function linkFormToActiveSpreadsheet_(form) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'アクティブなスプレッドシートが見つかりません。' +
      'スプレッドシートに紐づくApps Scriptから実行してください。'
    );
  }

  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
}

/**
 * フォーム送信時トリガーを作成します。
 *
 * 同じハンドラーのトリガーが存在する場合は重複作成しません。
 *
 * @return {Object} トリガー作成結果
 */
function createFormSubmitTrigger_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'アクティブなスプレッドシートが見つかりません。' +
      'スプレッドシートに紐づくApps Scriptから実行してください。'
    );
  }

  const handlerName = 'handleFormSubmit';
  const existingTriggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === handlerName;
  });

  if (existingTriggers.length > 0) {
    return {
      created: false,
      handler: handlerName,
      reason: '既存トリガーがあるため新規作成しませんでした。'
    };
  }

  ScriptApp.newTrigger(handlerName)
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  return {
    created: true,
    handler: handlerName
  };
}

/**
 * フォーム送信イベントから問い合わせ情報を取り出します。
 *
 * @param {Object} e フォーム送信イベント
 * @return {Object} 問い合わせ情報
 */
function buildInquiryFromFormSubmitEvent_(e) {
  if (!e) {
    throw new Error('フォーム送信イベントが渡されていません。トリガーから実行してください。');
  }

  const namedValues = e.namedValues || {};
  const values = e.values || [];
  const receivedAt = normalizeDate_(
    values[0] ||
    getFirstNamedValue_(namedValues, ['タイムスタンプ', 'Timestamp']) ||
    new Date()
  );
  const name = getFirstNamedValue_(namedValues, [FORM_FIELD_NAMES.NAME]);
  const email = getFirstNamedValue_(namedValues, [FORM_FIELD_NAMES.EMAIL]);
  const content = getFirstNamedValue_(namedValues, [FORM_FIELD_NAMES.CONTENT]);

  if (!name) {
    throw new Error('フォーム回答に氏名がありません。');
  }

  if (!email) {
    throw new Error('フォーム回答にメールアドレスがありません。');
  }

  if (!content) {
    throw new Error('フォーム回答に問い合わせ内容がありません。');
  }

  return {
    receivedAt: receivedAt,
    name: name,
    email: email,
    content: content
  };
}

/**
 * 問い合わせ管理シートへ問い合わせ情報を追記します。
 *
 * @param {Object} inquiry 問い合わせ情報
 * @return {Object} 追記結果
 */
function appendInquiryToManagementSheet_(inquiry) {
  initializeInquirySheet();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const headerIndex = buildHeaderIndex_(sheet);
  const rowNumber = Math.max(sheet.getLastRow() + 1, 2);
  const receiptId = createReceiptId_(inquiry.receivedAt, rowNumber);
  const enrichedInquiry = {
    receiptId: receiptId,
    receivedAt: inquiry.receivedAt,
    name: inquiry.name,
    email: inquiry.email,
    content: inquiry.content
  };
  const rowValues = new Array(sheet.getLastColumn()).fill('');

  setRowValueByHeader_(rowValues, headerIndex, '受付ID', receiptId);
  setRowValueByHeader_(rowValues, headerIndex, '受付日時', inquiry.receivedAt);
  setRowValueByHeader_(rowValues, headerIndex, '氏名', inquiry.name);
  setRowValueByHeader_(rowValues, headerIndex, 'メールアドレス', inquiry.email);
  setRowValueByHeader_(rowValues, headerIndex, '問い合わせ内容', inquiry.content);
  setRowValueByHeader_(rowValues, headerIndex, 'AI要約', '');
  setRowValueByHeader_(rowValues, headerIndex, '分類', '');
  setRowValueByHeader_(rowValues, headerIndex, '緊急度', '');
  setRowValueByHeader_(rowValues, headerIndex, '確認事項', '');
  setRowValueByHeader_(rowValues, headerIndex, '対応ステータス', RESPONSE_STATUS.UNHANDLED);
  setRowValueByHeader_(
    rowValues,
    headerIndex,
    'LINE通知ステータス',
    LINE_NOTIFICATION_STATUS.NOT_NOTIFIED
  );
  setRowValueByHeader_(rowValues, headerIndex, '再通知回数', 0);

  sheet.getRange(rowNumber, 1, 1, rowValues.length).setValues([rowValues]);

  return {
    sheet: sheet,
    rowNumber: rowNumber,
    inquiry: enrichedInquiry
  };
}

/**
 * AI分析結果を問い合わせ管理シートへ記録します。
 *
 * @param {Sheet} sheet 対象シート
 * @param {number} rowNumber 対象行番号
 * @param {Object} aiAnalysis AI分析結果
 */
function updateInquiryAiAnalysis_(sheet, rowNumber, aiAnalysis) {
  const headerIndex = buildHeaderIndex_(sheet);

  setCellValueByHeader_(sheet, rowNumber, headerIndex, 'AI要約', aiAnalysis.summary);
  setCellValueByHeader_(sheet, rowNumber, headerIndex, '分類', aiAnalysis.category);
  setCellValueByHeader_(sheet, rowNumber, headerIndex, '緊急度', aiAnalysis.urgency);
  setCellValueByHeader_(
    sheet,
    rowNumber,
    headerIndex,
    '確認事項',
    aiAnalysis.confirmationItems.join('\n')
  );
}

/**
 * LINE通知結果を問い合わせ管理シートへ記録します。
 *
 * @param {Sheet} sheet 対象シート
 * @param {number} rowNumber 対象行番号
 * @param {string} status LINE通知ステータス
 * @param {Date|string} notifiedAt LINE通知日時
 * @param {string} errorMessage エラー内容
 */
function updateInquiryResult_(sheet, rowNumber, status, notifiedAt, errorMessage) {
  const headerIndex = buildHeaderIndex_(sheet);

  setCellValueByHeader_(sheet, rowNumber, headerIndex, 'LINE通知ステータス', status);
  setCellValueByHeader_(sheet, rowNumber, headerIndex, 'LINE通知日時', notifiedAt);
  setCellValueByHeader_(sheet, rowNumber, headerIndex, 'エラー内容', errorMessage || '');
}

/**
 * 新規問い合わせ用のLINE通知本文を作成します。
 *
 * @param {Object} inquiry 問い合わせ情報
 * @return {string} LINE通知本文
 */
function buildNewInquiryLineMessage_(inquiry) {
  const aiAnalysis = inquiry.aiAnalysis || {
    summary: '未生成',
    category: '未分類',
    urgency: '未判定',
    confirmationItems: []
  };
  const confirmationText = aiAnalysis.confirmationItems.length > 0
    ? aiAnalysis.confirmationItems.map(function(item) {
      return '- ' + item;
    }).join('\n')
    : '- なし';

  return [
    '【新規問い合わせ】',
    '受付ID: ' + inquiry.receiptId,
    '受付日時: ' + formatDateTime_(inquiry.receivedAt),
    '分類: ' + aiAnalysis.category,
    '緊急度: ' + aiAnalysis.urgency,
    'AI要約: ' + aiAnalysis.summary,
    '氏名: ' + inquiry.name,
    'メール: ' + inquiry.email,
    '',
    '確認事項:',
    confirmationText,
    '',
    '問い合わせ内容:',
    truncateText_(inquiry.content, 1000)
  ].join('\n');
}

/**
 * 問い合わせ管理シートの1行から問い合わせ情報を組み立てます。
 *
 * @param {Array} rowValues 行データ
 * @param {Object} headerIndex ヘッダーマップ
 * @param {number} rowNumber 行番号
 * @return {Object} 問い合わせ情報
 */
function buildInquiryFromSheetRow_(rowValues, headerIndex, rowNumber) {
  return {
    rowNumber: rowNumber,
    receiptId: String(getRowValueByHeader_(rowValues, headerIndex, '受付ID') || '').trim(),
    receivedAt: parseDateValue_(getRowValueByHeader_(rowValues, headerIndex, '受付日時')),
    name: String(getRowValueByHeader_(rowValues, headerIndex, '氏名') || '').trim(),
    email: String(getRowValueByHeader_(rowValues, headerIndex, 'メールアドレス') || '').trim(),
    content: String(getRowValueByHeader_(rowValues, headerIndex, '問い合わせ内容') || '').trim(),
    aiSummary: String(getRowValueByHeader_(rowValues, headerIndex, 'AI要約') || '').trim(),
    category: String(getRowValueByHeader_(rowValues, headerIndex, '分類') || '').trim(),
    urgency: String(getRowValueByHeader_(rowValues, headerIndex, '緊急度') || '').trim(),
    confirmationItems: String(getRowValueByHeader_(rowValues, headerIndex, '確認事項') || '').trim(),
    responseStatus: String(getRowValueByHeader_(rowValues, headerIndex, '対応ステータス') || '').trim(),
    lineNotificationStatus: String(
      getRowValueByHeader_(rowValues, headerIndex, 'LINE通知ステータス') || ''
    ).trim(),
    lineNotifiedAt: parseDateValue_(
      getRowValueByHeader_(rowValues, headerIndex, 'LINE通知日時')
    ),
    renotifyCount: normalizeNumber_(
      getRowValueByHeader_(rowValues, headerIndex, '再通知回数')
    ),
    lastRenotifiedAt: parseDateValue_(
      getRowValueByHeader_(rowValues, headerIndex, '最終再通知日時')
    ),
    dueAt: parseDateValue_(getRowValueByHeader_(rowValues, headerIndex, '対応期限')),
    errorMessage: String(getRowValueByHeader_(rowValues, headerIndex, 'エラー内容') || '').trim()
  };
}

/**
 * 未対応問い合わせアラートの対象か判定します。
 *
 * @param {Object} inquiry 問い合わせ情報
 * @param {Date} now 判定時刻
 * @return {Object} 判定結果
 */
function shouldSendUnhandledAlert_(inquiry, now) {
  if (inquiry.responseStatus !== RESPONSE_STATUS.UNHANDLED) {
    return {
      shouldSend: false,
      reason: '対応ステータスが未対応ではありません。'
    };
  }

  if (!inquiry.receivedAt) {
    return {
      shouldSend: false,
      reason: '受付日時が空、または日付として読み取れません。'
    };
  }

  const elapsedHours = getElapsedHours_(inquiry.receivedAt, now);

  if (elapsedHours < UNHANDLED_ALERT_SETTINGS.THRESHOLD_HOURS) {
    return {
      shouldSend: false,
      reason: '受付からの経過時間が再通知条件に達していません。',
      elapsedHours: elapsedHours
    };
  }

  if (inquiry.renotifyCount >= UNHANDLED_ALERT_SETTINGS.MAX_RENOTIFY_COUNT) {
    return {
      shouldSend: false,
      reason: '再通知回数が上限に達しています。',
      elapsedHours: elapsedHours
    };
  }

  if (inquiry.lastRenotifiedAt) {
    const hoursSinceLastAlert = getElapsedHours_(inquiry.lastRenotifiedAt, now);

    if (hoursSinceLastAlert < UNHANDLED_ALERT_SETTINGS.RENOTIFY_INTERVAL_HOURS) {
      return {
        shouldSend: false,
        reason: '前回の再通知からの経過時間が再通知間隔に達していません。',
        elapsedHours: elapsedHours,
        hoursSinceLastAlert: hoursSinceLastAlert
      };
    }
  }

  return {
    shouldSend: true,
    reason: '再通知対象です。',
    elapsedHours: elapsedHours,
    nextRenotifyCount: inquiry.renotifyCount + 1
  };
}

/**
 * 未対応問い合わせアラート用のLINE通知本文を作成します。
 *
 * @param {Object} inquiry 問い合わせ情報
 * @param {Object} targetCheck 対象判定結果
 * @return {string} LINE通知本文
 */
function buildUnhandledInquiryAlertMessage_(inquiry, targetCheck) {
  const confirmationText = inquiry.confirmationItems || 'なし';

  return [
    '【未対応問い合わせアラート】',
    '受付ID: ' + (inquiry.receiptId || '未設定'),
    '受付日時: ' + formatDateTime_(inquiry.receivedAt),
    '経過時間: 約' + targetCheck.elapsedHours + '時間',
    '再通知回数: ' + targetCheck.nextRenotifyCount + '/' +
      UNHANDLED_ALERT_SETTINGS.MAX_RENOTIFY_COUNT,
    '対応ステータス: ' + inquiry.responseStatus,
    '分類: ' + (inquiry.category || '未分類'),
    '緊急度: ' + (inquiry.urgency || '未判定'),
    'AI要約: ' + (inquiry.aiSummary || '未生成'),
    '氏名: ' + (inquiry.name || '未入力'),
    'メール: ' + (inquiry.email || '未入力'),
    '',
    '確認事項:',
    confirmationText,
    '',
    '問い合わせ内容:',
    truncateText_(inquiry.content, 800)
  ].join('\n');
}

/**
 * 未対応問い合わせアラートの送信結果をシートへ記録します。
 *
 * @param {Sheet} sheet 対象シート
 * @param {number} rowNumber 対象行番号
 * @param {number} renotifyCount 再通知回数
 * @param {Date} notifiedAt 再通知日時
 * @param {string} errorMessage エラー内容
 */
function updateUnhandledAlertResult_(sheet, rowNumber, renotifyCount, notifiedAt, errorMessage) {
  const headerIndex = buildHeaderIndex_(sheet);

  setCellValueByHeader_(
    sheet,
    rowNumber,
    headerIndex,
    'LINE通知ステータス',
    LINE_NOTIFICATION_STATUS.RENOTIFIED
  );
  setCellValueByHeader_(sheet, rowNumber, headerIndex, '再通知回数', renotifyCount);
  setCellValueByHeader_(sheet, rowNumber, headerIndex, '最終再通知日時', notifiedAt);
  setCellValueByHeader_(sheet, rowNumber, headerIndex, 'エラー内容', errorMessage || '');
}

/**
 * OpenAI Responses APIのレスポンスからテキスト出力を取り出します。
 *
 * @param {Object} responseBody OpenAI APIレスポンス
 * @return {string} 出力テキスト
 */
function extractOpenAIOutputText_(responseBody) {
  if (responseBody.output_text) {
    return responseBody.output_text;
  }

  const output = responseBody.output || [];

  for (let i = 0; i < output.length; i++) {
    const content = output[i].content || [];
    for (let j = 0; j < content.length; j++) {
      if (content[j].type === 'output_text' && content[j].text) {
        return content[j].text;
      }
      if (content[j].text) {
        return content[j].text;
      }
      if (content[j].refusal) {
        throw new Error('OpenAI APIが問い合わせ分析を拒否しました: ' + content[j].refusal);
      }
    }
  }

  throw new Error('OpenAI APIレスポンスから分析結果を取得できませんでした。');
}

/**
 * AI分析結果の不足値を補正します。
 *
 * @param {Object} analysis AI分析結果
 * @return {Object} 正規化済みAI分析結果
 */
function normalizeInquiryAiAnalysis_(analysis) {
  const confirmationItems = Array.isArray(analysis.confirmationItems)
    ? analysis.confirmationItems.filter(function(item) {
      return String(item || '').trim() !== '';
    }).map(function(item) {
      return String(item).trim();
    })
    : [];

  return {
    summary: String(analysis.summary || '').trim() || '要約を生成できませんでした',
    category: String(analysis.category || '').trim() || 'その他',
    urgency: ['高', '中', '低'].indexOf(analysis.urgency) >= 0 ? analysis.urgency : '中',
    confirmationItems: confirmationItems
  };
}

/**
 * 1行目に入力済みのヘッダーを取得します。
 *
 * @param {Sheet} sheet 対象シート
 * @return {string[]} ヘッダー配列
 */
function getHeaderValues_(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return [];
  }

  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });
}

/**
 * ヘッダー名から列番号を引けるマップを作成します。
 *
 * @param {Sheet} sheet 対象シート
 * @return {Object} ヘッダーマップ
 */
function buildHeaderIndex_(sheet) {
  const headers = getHeaderValues_(sheet);

  return headers.reduce(function(map, header, index) {
    if (header !== '') {
      map[header] = index + 1;
    }
    return map;
  }, {});
}

/**
 * 行配列へヘッダー名ベースで値を設定します。
 *
 * @param {Array} rowValues 行配列
 * @param {Object} headerIndex ヘッダーマップ
 * @param {string} header ヘッダー名
 * @param {*} value 値
 */
function setRowValueByHeader_(rowValues, headerIndex, header, value) {
  const column = headerIndex[header];

  if (!column) {
    throw new Error('必要なヘッダーが見つかりません: ' + header);
  }

  rowValues[column - 1] = value;
}

/**
 * セルへヘッダー名ベースで値を設定します。
 *
 * @param {Sheet} sheet 対象シート
 * @param {number} rowNumber 行番号
 * @param {Object} headerIndex ヘッダーマップ
 * @param {string} header ヘッダー名
 * @param {*} value 値
 */
function setCellValueByHeader_(sheet, rowNumber, headerIndex, header, value) {
  const column = headerIndex[header];

  if (!column) {
    throw new Error('必要なヘッダーが見つかりません: ' + header);
  }

  sheet.getRange(rowNumber, column).setValue(value);
}

/**
 * 行配列からヘッダー名ベースで値を取得します。
 *
 * @param {Array} rowValues 行配列
 * @param {Object} headerIndex ヘッダーマップ
 * @param {string} header ヘッダー名
 * @return {*} 値
 */
function getRowValueByHeader_(rowValues, headerIndex, header) {
  const column = headerIndex[header];

  if (!column) {
    throw new Error('必要なヘッダーが見つかりません: ' + header);
  }

  return rowValues[column - 1];
}

/**
 * ヘッダー行の最低限の表示形式を整えます。
 *
 * @param {Sheet} sheet 対象シート
 */
function formatHeaderRow_(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return;
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastColumn)
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
}

/**
 * namedValuesから最初に見つかった値を取得します。
 *
 * @param {Object} namedValues フォーム送信イベントのnamedValues
 * @param {string[]} keys 候補キー
 * @return {string} 値
 */
function getFirstNamedValue_(namedValues, keys) {
  for (let i = 0; i < keys.length; i++) {
    const values = namedValues[keys[i]];

    if (values && values.length > 0 && String(values[0]).trim() !== '') {
      return String(values[0]).trim();
    }
  }

  return '';
}

/**
 * 日付値をDateへ正規化します。
 *
 * @param {*} value 日付として扱う値
 * @return {Date} Date値
 */
function normalizeDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

/**
 * 日付として扱える場合だけDateへ変換します。
 *
 * @param {*} value 日付として扱う値
 * @return {Date|null} Date値。変換できない場合はnull
 */
function parseDateValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * 数値として扱える値を数値へ変換します。
 *
 * @param {*} value 数値として扱う値
 * @return {number} 数値。変換できない場合は0
 */
function normalizeNumber_(value) {
  const number = Number(value);

  if (isNaN(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
}

/**
 * 2つの日時の差を時間単位で返します。
 *
 * @param {Date} startDate 開始日時
 * @param {Date} endDate 終了日時
 * @return {number} 経過時間
 */
function getElapsedHours_(startDate, endDate) {
  const elapsedMilliseconds = endDate.getTime() - startDate.getTime();

  return Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
}

/**
 * 受付IDを作成します。
 *
 * @param {Date} date 受付日時
 * @param {number} rowNumber 行番号
 * @return {string} 受付ID
 */
function createReceiptId_(date, rowNumber) {
  const dateText = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const rowText = ('0000' + rowNumber).slice(-4);

  return 'INQ-' + dateText + '-' + rowText;
}

/**
 * 未対応アラート検証用の受付IDを作成します。
 *
 * @param {Date} date 受付日時
 * @param {number} rowNumber 行番号
 * @return {string} 受付ID
 */
function createTestUnhandledAlertReceiptId_(date, rowNumber) {
  const dateText = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const rowText = ('0000' + rowNumber).slice(-4);

  return UNHANDLED_ALERT_TEST_SETTINGS.RECEIPT_ID_PREFIX + dateText + '-' + rowText;
}

/**
 * 日時を通知用文字列に整形します。
 *
 * @param {Date} date 日時
 * @return {string} 整形済み日時
 */
function formatDateTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
}

/**
 * 長すぎるテキストを通知用に切り詰めます。
 *
 * @param {string} text 対象テキスト
 * @param {number} maxLength 最大文字数
 * @return {string} 切り詰め後のテキスト
 */
function truncateText_(text, maxLength) {
  const value = String(text || '');

  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength) + '\n...（以下省略）';
}

/**
 * Apps Scriptの実行ログへ構造化ログを出力します。
 *
 * @param {string} level INFO / WARN / ERRORなど
 * @param {string} message ログメッセージ
 * @param {Object|string=} detail 補足情報
 */
function writeLog_(level, message, detail) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    detail: detail || ''
  };
  const logMessage = JSON.stringify(entry);

  if (level === 'ERROR') {
    console.error(logMessage);
  } else if (level === 'WARN') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }

  Logger.log(logMessage);
}
