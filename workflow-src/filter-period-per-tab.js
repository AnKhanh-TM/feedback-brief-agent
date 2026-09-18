// SOURCE and KIND are injected by patch-current-workflow.js.
// This node sees one Google Sheets tab. Filter before any union.
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
function dateInVietnam(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (typeof value === 'number' && value > 20000 && value < 100000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000).toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (slash) {
    const a = Number(slash[1]), b = Number(slash[2]), y = Number(slash[3]);
    const m = a > 12 ? b : a, d = a > 12 ? a : b;
    const check = new Date(Date.UTC(y, m - 1, d));
    return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d
      ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const date = new Date(s);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const start = KIND === 'session'
  ? new Date(Date.parse(today + 'T00:00:00Z') - 2 * 86400000).toISOString().slice(0, 10)
  : today.slice(0, 7) + '-01';
const status = { kind: 'sourceStatus', source: SOURCE, inputRows: 0, periodRows: 0, invalidTimestamps: 0, headers: [], errors: [], warnings: [], period: { start, endExclusive: KIND === 'session' ? today : null, month: KIND === 'final' ? today.slice(0, 7) : null } };
const filtered = [];
for (const item of $input.all()) {
  const raw = item.json || {};
  const keys = Object.keys(raw);
  if (raw.error && keys.length <= 2) {
    status.errors.push(typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error));
    continue;
  }
  if (!keys.length) continue;
  status.inputRows++;
  if (!status.headers.length) status.headers = keys;
  const timestampKey = keys.find(k => ['timestamp','thoi gian','thoi gian gui'].includes(fold(k)));
  if (!timestampKey) { status.errors.push('Thiếu cột Timestamp'); continue; }
  const date = dateInVietnam(raw[timestampKey]);
  if (!date) { status.invalidTimestamps++; continue; }
  const inPeriod = KIND === 'session' ? date >= start && date < today : date.startsWith(today.slice(0, 7));
  if (!inPeriod) continue;
  status.periodRows++;
  filtered.push({ json: { kind: 'rawPeriodRow', source: SOURCE, date, raw } });
}
if (status.invalidTimestamps) status.warnings.push(`${status.invalidTimestamps} dòng có Timestamp không hợp lệ`);
return [...filtered, { json: status }];
