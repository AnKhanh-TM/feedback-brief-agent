const data = $input.first().json;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const month = today.slice(0, 7);
const seenRows = new Set();
const seenResponses = new Set();
const rows = data.rows.filter(r => {
  if (!r.date.startsWith(month)) return false;
  const key = `${r.source.spreadsheetId}:${r.source.sheetId}:${r.rowNumber ?? `${r.timestamp}:${r.classCode}:${r.name}`}`;
  const responseKey = JSON.stringify([r.source.spreadsheetId,r.timestamp,r.classCode,r.name,r.recommend,r.serviceSatisfaction,r.overallSatisfaction,r.recommendReason]);
  if (seenRows.has(key) || seenResponses.has(responseKey)) return false;
  seenRows.add(key);
  seenResponses.add(responseKey);
  return true;
});
function distribution(field) {
  const valid = rows.map(r => r[field]).filter(v => v !== null);
  const counts = { high: valid.filter(v => v >= 9).length, mid: valid.filter(v => v >= 7 && v <= 8).length, low: valid.filter(v => v <= 6).length };
  const pct = n => valid.length ? Math.round(n / valid.length * 1000) / 10 : null;
  return { valid: valid.length, counts, percent: { high: pct(counts.high), mid: pct(counts.mid), low: pct(counts.low) } };
}
const recommend = distribution('recommend');
const nps = recommend.valid ? Math.round((recommend.counts.high - recommend.counts.low) / recommend.valid * 100) : null;
const hasDemand = value => {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s || /^(không|khong|chưa|chua|no|none|0)(\b|$)/i.test(s)) return false;
  return true;
};
const demandRows = rows.filter(r => hasDemand(r.nextCourse));
const uniqueDemand = new Map();
for (const r of demandRows) {
  const person = String(r.email || '').trim().toLowerCase() || `${String(r.name || '').trim().toLowerCase()}:${String(r.classCode || '').trim().toLowerCase()}`;
  const key = person === ':' ? `${r.source.spreadsheetId}:${r.rowNumber}` : person;
  if (!uniqueDemand.has(key)) uniqueDemand.set(key, { name: r.name, email: r.email, classCode: r.classCode, course: r.source.course, interest: r.nextCourse, source: r.source, rowNumber: r.rowNumber });
}
const demandValid = rows.filter(r => String(r.nextCourse ?? '').trim() !== '').length;
const interestCounts = {};
for (const person of uniqueDemand.values()) {
  for (const interest of String(person.interest).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)) {
    interestCounts[interest] = (interestCounts[interest] || 0) + 1;
  }
}
const demand = { count: uniqueDemand.size, valid: demandValid, percent: demandValid ? Math.round(uniqueDemand.size / demandValid * 1000) / 10 : null, interests: Object.entries(interestCounts).sort((a,b) => b[1]-a[1]).map(([course,count]) => ({course,count})), contacts: [...uniqueDemand.values()] };
const comments = rows.map(r => ({ source: r.source.code, classCode: r.classCode, name: r.name, recommend: r.recommend, recommendReason: r.recommendReason, improvement: r.improvement, serviceFeedback: r.serviceFeedback }))
  .filter(r => r.recommendReason || r.improvement || r.serviceFeedback);
return [{ json: { kind: 'final', month, asOf: today, totalResponses: rows.length, recommend, nps, serviceSatisfaction: distribution('serviceSatisfaction'), overallSatisfaction: distribution('overallSatisfaction'), demand, comments, sources: data.sources, warnings: data.warnings } }];
