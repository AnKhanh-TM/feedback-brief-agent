// KIND and EXPECTED_TABS are injected by patch-current-workflow.js.
const items = $input.all().map(i => i.json);
const statuses = items.filter(i => i.kind === 'sourceStatus');
const ids = statuses.map(i => `${i.source?.spreadsheetId}:${i.source?.sheetId}`);
if (statuses.length !== EXPECTED_TABS || new Set(ids).size !== EXPECTED_TABS) {
  throw new Error(`Union thiếu/nhân đôi tab: ${statuses.length} marker, ${new Set(ids).size} tab duy nhất; cần ${EXPECTED_TABS}`);
}
const failures = statuses.filter(i => (i.errors || []).length);
if (failures.length) throw new Error(`Nguồn dữ liệu lỗi: ${failures.map(s => `${s.source.code}/${s.source.sheetTitle}: ${s.errors.join(', ')}`).join('; ')}`);
const sourceMap = new Map();
for (const status of statuses) {
  const key = status.source.spreadsheetId;
  if (!sourceMap.has(key)) sourceMap.set(key, { code: status.source.code, course: status.source.course, spreadsheetId: key, tabs: [], inputRowCount: 0, periodRowCount: 0 });
  const source = sourceMap.get(key);
  source.tabs.push({ sheetId: status.source.sheetId, title: status.source.sheetTitle });
  source.inputRowCount += status.inputRows || 0;
  source.periodRowCount += status.periodRows || 0;
}
if (sourceMap.size !== 18) throw new Error(`Chỉ có ${sourceMap.size}/18 khóa học trong dữ liệu`);
const rows = items.filter(i => i.kind === 'normalizedRow').map(i => i.row);
const warnings = statuses.flatMap(s => (s.warnings || []).map(w => `${s.source.code}/${s.source.sheetTitle}: ${w}`));
return [{ json: { kind: KIND, rows, sources: [...sourceMap.values()], warnings } }];
