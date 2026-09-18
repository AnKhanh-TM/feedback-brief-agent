const data = $input.first().json;
const nowText = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const today = new Date(`${nowText}T00:00:00Z`);
const dateBefore = days => new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10);
const start = dateBefore(2), end = nowText;
const seen = new Set();
const rows = data.rows.filter(r => {
  if (r.date < start || r.date >= end) return false;
  const key = `${r.source.spreadsheetId}:${r.source.sheetId}:${r.rowNumber ?? `${r.timestamp}:${r.classCode}:${r.name}:${r.lesson}`}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
const criteria = [
  ['expectation', 'Mức độ đáp ứng kỳ vọng'],
  ['comprehension', 'Mức độ hiểu bài và tiếp thu'],
  ['delivery', 'Khả năng truyền đạt của giảng viên'],
];
const metrics = {};
let allValid = 0, allPositive = 0;
for (const [field, label] of criteria) {
  const scores = rows.map(r => r[field]).filter(v => v !== null);
  const positive = scores.filter(v => v >= 4).length;
  metrics[field] = { label, positive, valid: scores.length, percent: scores.length ? Math.round(positive / scores.length * 1000) / 10 : null };
  allValid += scores.length; allPositive += positive;
}
metrics.overall = { label: 'Tỷ lệ đánh giá tích cực chung', positive: allPositive, valid: allValid, percent: allValid ? Math.round(allPositive / allValid * 1000) / 10 : null };
const alerts = rows.filter(r => criteria.some(([f]) => r[f] !== null && r[f] <= 3)).map(r => ({
  source: r.source, rowNumber: r.rowNumber, timestamp: r.timestamp, name: r.name,
  classCode: r.classCode, lesson: r.lesson, trainer: r.trainer,
  scores: Object.fromEntries(criteria.map(([f, label]) => [label, r[f]])),
  lowCriteria: criteria.filter(([f]) => r[f] !== null && r[f] <= 3).map(([f, label]) => ({ label, score: r[f] })),
  comments: { trainer: r.trainerComment, content: r.contentComment, service: r.serviceComment },
}));
const commentsForThemes = rows.map(r => ({ source: r.source.code, lesson: r.lesson, trainer: r.trainer, trainerComment: r.trainerComment, contentComment: r.contentComment, serviceComment: r.serviceComment }))
  .filter(r => r.trainerComment || r.contentComment || r.serviceComment);
return [{ json: { kind: 'session', period: { start, endExclusive: end }, totalResponses: rows.length, metrics, alerts, commentsForThemes, sources: data.sources, warnings: data.warnings } }];
