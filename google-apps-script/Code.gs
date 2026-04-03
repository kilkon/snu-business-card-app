function doPost(e) {
  const headers = [
    "contact_id",
    "created_at",
    "name_kr",
    "name_en",
    "title_kr",
    "title_en",
    "org_kr",
    "org_en",
    "phone_mobile",
    "phone_office",
    "email",
    "website",
    "address_kr",
    "address_en",
    "summary_kr",
    "summary_en"
  ];
  const sheet = getSheet_();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  const params = e.parameter || {};
  const row = headers.map(function (key) {
    return params[key] || "";
  });

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const callback = (e.parameter && e.parameter.callback) || "";
  const action = (e.parameter && e.parameter.action) || "";

  if (action !== "get") {
    return respond_(callback, { ok: false, error: "Unsupported action" });
  }

  const contactId = (e.parameter && e.parameter.id) || "";
  const record = findRecordById_(contactId);
  if (!record) {
    return respond_(callback, { ok: false, error: "Not found" });
  }

  return respond_(callback, { ok: true, record: record });
}

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("responses") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("responses");
}

function findRecordById_(contactId) {
  const headers = [
    "contact_id",
    "created_at",
    "name_kr",
    "name_en",
    "title_kr",
    "title_en",
    "org_kr",
    "org_en",
    "phone_mobile",
    "phone_office",
    "email",
    "website",
    "address_kr",
    "address_en",
    "summary_kr",
    "summary_en"
  ];
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][0]) === String(contactId)) {
      var record = {};
      for (var j = 0; j < headers.length; j += 1) {
        record[headers[j]] = values[i][j] || "";
      }
      return record;
    }
  }
  return null;
}

function respond_(callback, payload) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(payload) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
