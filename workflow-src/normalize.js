// KIND is injected by build-workflow.js: 'session' or 'final'.
// Normalize headers before matching. A trailing colon, whitespace, newline,
// accent, question number, or equivalent punctuation does not split columns.
const fold = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase()
  .replace(/^\s*\d+\s*[.)]\s*/, '')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

const aliases = {
  timestamp: ['timestamp', 'thoi gian', 'thoi gian gui'],
  name: ['ten cua ban', 'ten cua ban la', 'ho va ten', 'ho ten cua ban'],
  classCode: ['ma lop ban tham gia', 'ma lop'],
  email: ['email address', 'email', 'dia chi email'],
  lesson: ['ban feedback cho buoi hoc nao', 'ten buoi hoc'],
  trainer: ['trainer buoi hoc nay la', 'giang vien buoi hoc nay la', 'ten giang vien'],
  expectation: ['buoi hoc dap ung duoc bao nhieu ki vong so voi ban dau cua ban', 'muc do buoi hoc dap ung ky vong', 'muc do dap ung ky vong'],
  comprehension: ['muc do hieu bai va tiep thu kien thuc cua ban trong buoi hom nay', 'muc do hieu bai va tiep thu kien thuc', 'muc do hieu bai va tiep thu'],
  delivery: ['kha nang truyen dat kien thuc cua trainer', 'kha nang truyen dat kien thuc cua giang vien', 'kha nang truyen dat cua giang vien'],
  trainerComment: ['nhan xet danh cho trainer', 'nhan xet danh cho giang vien'],
  contentComment: ['nhan xet danh cho noi dung bai giang', 'nhan xet ve noi dung bai giang'],
  serviceComment: ['nhan xet danh cho service truc lop', 'nhan xet danh cho bo phan truc lop'],
  recommend: ['voi nhung trai nghiem tai tm ban san sang gioi thieu khoa hoc cho ban be minh chu', 'muc do san sang gioi thieu khoa hoc'],
  recommendReason: ['ban co the cho tm biet ly do khong', 'ly do gioi thieu khoa hoc'],
  improvement: ['dieu gi cua khoa hoc tm can cai thien', 'dieu gi cua khoa hoc can cai thien'],
  serviceSatisfaction: ['ban danh gia nhu the nao ve muc do hai long doi voi ban service ho tro khoa hoc', 'muc do hai long voi service', 'muc do hai long voi bo phan cham soc khach hang'],
  overallSatisfaction: ['ban danh gia muc do hai long cua ban voi trai nghiem tai tm nhe', 'muc do hai long voi trai nghiem tai tm'],
  serviceFeedback: ['ban chua hai long dieu gi voi dich vu o tm hoac co gop y gi voi team customer service tai tm', 'gop y cho customer service'],
  nextCourse: ['trong vong 2 thang toi ban co nhu cau tham gia khoa hoc nao khac cua tm khong', 'nhu cau tham gia khoa hoc khac trong 2 thang toi'],
};

function read(raw, field) {
  const entries = Object.entries(raw).map(([key, value]) => ({ key, norm: fold(key), value }));
  const wanted = aliases[field] || [];
  const matches = entries.filter(e => wanted.some(a => e.norm === a || e.norm.startsWith(a + ' ')));
  const nonEmpty = matches.filter(e => e.value !== null && e.value !== undefined && String(e.value).trim() !== '');
  const chosen = nonEmpty[0] || matches[0];
  const values = [...new Set(nonEmpty.map(e => String(e.value).trim()))];
  return { value: chosen?.value ?? null, conflict: values.length > 1 ? `${field}: ${matches.map(e => e.key).join(' | ')}` : null };
}

function score(value, max, min) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(String(value).trim().replace(',', '.'));
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function localDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && value > 20000 && value < 100000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (slash) {
    const a = Number(slash[1]), b = Number(slash[2]), y = Number(slash[3]);
    // Google Forms samples use M/D/YYYY. If first component > 12, use D/M/YYYY.
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

const inputs = $input.all().map(i => i.json);
const sources = new Map();
const headersBySource = new Map();
const rows = [];
const warnings = [];
const conflicts = [];
for (const item of inputs) {
  const source = item.source || {};
  const id = `${source.code || '?'}:${source.spreadsheetId || '?'}`;
  if (!sources.has(id)) sources.set(id, { code: source.code, course: source.course, spreadsheetId: source.spreadsheetId, inputRowCount: 0, rowCount: 0, error: null });
  if (item.error) { sources.get(id).error = String(item.error); continue; }
  if (item.empty) continue;
  const raw = item.raw || {};
  sources.get(id).inputRowCount++;
  if (!headersBySource.has(id)) headersBySource.set(id, new Set());
  for (const key of Object.keys(raw)) headersBySource.get(id).add(fold(key));
  const fields = KIND === 'session'
    ? ['timestamp','name','classCode','email','lesson','trainer','expectation','comprehension','delivery','trainerComment','contentComment','serviceComment']
    : ['timestamp','name','classCode','email','recommend','recommendReason','improvement','serviceSatisfaction','overallSatisfaction','serviceFeedback','nextCourse'];
  const out = {};
  for (const field of fields) {
    const picked = read(raw, field);
    out[field] = picked.value;
    if (picked.conflict) conflicts.push(`${source.code} dòng ${raw.row_number ?? '?'}: ${picked.conflict}`);
  }
  out.date = localDate(out.timestamp);
  out.source = source;
  out.rowNumber = raw.row_number ?? null;
  if (!out.date) {
    warnings.push(`${source.code} dòng ${out.rowNumber ?? '?'}: Timestamp không hợp lệ (${out.timestamp ?? 'trống'})`);
    continue;
  }
  if (KIND === 'session') {
    for (const field of ['expectation','comprehension','delivery']) {
      const original = out[field];
      out[field] = score(original, 5, 1);
      if (original !== null && String(original).trim() !== '' && out[field] === null) warnings.push(`${source.code} dòng ${out.rowNumber ?? '?'}: điểm ${field} ngoài thang 1–5 (${original})`);
    }
  } else {
    for (const field of ['recommend','serviceSatisfaction','overallSatisfaction']) {
      const original = out[field];
      out[field] = score(original, 10, 0);
      if (original !== null && String(original).trim() !== '' && out[field] === null) warnings.push(`${source.code} dòng ${out.rowNumber ?? '?'}: điểm ${field} ngoài thang 0–10 (${original})`);
    }
  }
  rows.push(out);
  sources.get(id).rowCount++;
}
if (sources.size !== 18) throw new Error(`Thiếu nguồn: chỉ nhận ${sources.size}/18 sheet. Kiểm tra các nhánh Merge.`);
const failed = [...sources.values()].filter(s => s.error);
if (failed.length) throw new Error(`Không đọc được ${failed.length} nguồn: ${failed.map(s => `${s.code}: ${s.error}`).join('; ')}`);
if (conflicts.length) throw new Error(`Cột trùng sau chuẩn hóa nhưng giá trị khác nhau: ${conflicts.slice(0, 10).join('; ')}`);
const required = KIND === 'session'
  ? ['timestamp','classCode','lesson','trainer','expectation','comprehension','delivery']
  : ['timestamp','classCode','recommend','serviceSatisfaction','overallSatisfaction','nextCourse'];
const missing = [];
for (const [id, source] of sources) {
  if (!source.inputRowCount) continue;
  const headers = headersBySource.get(id) || new Set();
  for (const field of required) {
    if (!(aliases[field] || []).some(a => [...headers].some(h => h === a || h.startsWith(a + ' ')))) missing.push(`${source.code}: ${field}`);
  }
}
if (missing.length) throw new Error(`Thiếu cột bắt buộc hoặc chưa ánh xạ: ${missing.join('; ')}`);
return [{ json: { kind: KIND, rows, sources: [...sources.values()], warnings } }];
