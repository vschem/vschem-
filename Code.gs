// VS Chem - ฐานข้อมูลบน Google Sheet (วางทั้งไฟล์นี้ใน Extensions > Apps Script ของชีต)
// 1) เปลี่ยน TOKEN เป็นรหัสลับของคุณ  2) Deploy > New deployment > Web app
//    Execute as: Me   Who has access: Anyone   3) คัดลอก URL ที่ลงท้าย /exec ไปใส่ในแอป
const TOKEN = 'เปลี่ยนเป็นรหัสลับของคุณ';
const SHEET_NAME = 'Data';
const CHUNK = 45000;   // 1 เซลล์เก็บได้ไม่เกิน 50,000 ตัวอักษร จึงแบ่งเก็บสูงสุด 4 เซลล์ (180,000 ตัวอักษรต่อรายการ)
const PARTS = 4;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.appendRow(['key', 'seq', 't', 'deleted', 'json1', 'json2', 'json3', 'json4']);
    s.setFrozenRows(1);
  }
  return s;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  const p = e.parameter || {};
  if (p.token !== TOKEN) return out_({ ok: false, error: 'unauthorized' });
  const since = Number(p.since) || 0, s = sheet_(), n = s.getLastRow();
  const meta = n > 1 ? s.getRange(2, 1, n - 1, 4).getValues() : [];
  const rows = []; let max = since;
  meta.forEach((r, i) => {
    const seq = Number(r[1]) || 0;
    if (seq > max) max = seq;
    if (seq > since) {
      const deleted = r[3] === true || r[3] === 'TRUE';
      const json = deleted ? '' : s.getRange(i + 2, 5, 1, PARTS).getValues()[0].join('');
      rows.push({ key: r[0], seq: seq, t: Number(r[2]) || 0, deleted: deleted, json: json });
    }
  });
  return out_({ ok: true, max: max, rows: rows });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.token !== TOKEN) return out_({ ok: false, error: 'unauthorized' });
    const del = b.action === 'delete', json = del ? '' : String(b.json || '');
    if (json.length > CHUNK * PARTS) return out_({ ok: false, error: 'ข้อมูลรายการนี้ใหญ่เกินไป' });
    const props = PropertiesService.getScriptProperties();
    const seq = (Number(props.getProperty('seq')) || 0) + 1;
    props.setProperty('seq', String(seq));
    const s = sheet_(), n = s.getLastRow();
    const keys = n > 1 ? s.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
    const i = keys.indexOf(b.key);
    const row = [b.key, seq, b.t || Date.now(), del];
    for (var k = 0; k < PARTS; k++) row.push(json.substr(k * CHUNK, CHUNK));
    if (i >= 0) s.getRange(i + 2, 1, 1, row.length).setValues([row]); else s.appendRow(row);
    return out_({ ok: true, seq: seq });
  } finally { lock.releaseLock(); }
}
