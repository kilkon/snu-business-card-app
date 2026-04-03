function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("responses") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("responses");
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
