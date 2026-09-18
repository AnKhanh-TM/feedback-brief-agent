// KIND is injected by patch-current-workflow.js.
// Header normalization helpers are embedded ahead of this code.
const items = $input.all().map(i => i.json);
const status = items.find(i => i.kind === 'sourceStatus');
if (!status) throw new Error('Thiếu marker trạng thái nguồn sau bước lọc kỳ');
const required = KIND === 'session'
  ? ['timestamp','classCode','lesson','trainer','expectation','comprehension','delivery']
  : ['timestamp','classCode','recommend','serviceSatisfaction','overallSatisfaction','nextCourse'];
const headers = new Set((status.headers || []).map(fold));
if (status.inputRows) {
  for (const field of required) {
    if (!(aliases[field] || []).some(a => [...headers].some(h => h === a || h.startsWith(a + ' ')))) {
      status.errors.push(`Thiếu cột bắt buộc/chưa ánh xạ: ${field}`);
    }
  }
}
const output = [];
for (const item of items.filter(i => i.kind === 'rawPeriodRow')) {
  const raw = item.raw || {};
  const fields = KIND === 'session'
    ? ['timestamp','name','classCode','email','lesson','trainer','expectation','comprehension','delivery','trainerComment','contentComment','serviceComment']
    : ['timestamp','name','classCode','email','recommend','recommendReason','improvement','serviceSatisfaction','overallSatisfaction','serviceFeedback','nextCourse'];
  const row = { source: item.source, date: item.date, rowNumber: raw.row_number ?? null };
  for (const field of fields) {
    const picked = read(raw, field);
    row[field] = picked.value;
    if (picked.conflict) status.errors.push(`Dòng ${row.rowNumber ?? '?'}: cột tương đương có giá trị khác nhau (${picked.conflict})`);
  }
  const scoreFields = KIND === 'session'
    ? ['expectation','comprehension','delivery']
    : ['recommend','serviceSatisfaction','overallSatisfaction'];
  for (const field of scoreFields) {
    const original = row[field];
    row[field] = score(original, KIND === 'session' ? 5 : 10, KIND === 'session' ? 1 : 0);
    if (original !== null && String(original).trim() !== '' && row[field] === null) {
      status.warnings.push(`Dòng ${row.rowNumber ?? '?'}: điểm ${field} ngoài thang (${original})`);
    }
  }
  output.push({ json: { kind: 'normalizedRow', row } });
}
delete status.headers;
return [...output, { json: status }];
