const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const workflow = JSON.parse(fs.readFileSync('Feedback Brief Agent.json', 'utf8'));
const node = name => {
  const found = workflow.nodes.find(n => n.name === name);
  assert.ok(found, `Missing node: ${name}`);
  return found;
};
const next = name => workflow.connections[name]?.main?.[0] || [];
const run = (name, data) => vm.runInNewContext(`(function(){ ${node(name).parameters.jsCode}\n })()`, {
  $input: { all: () => data.map(json => ({ json })), first: () => ({ json: data[0] }) },
  Intl, Date, String, Number, Object, Array, Map, Set, JSON, Math, RegExp, Error,
});

const names = new Set(workflow.nodes.map(n => n.name));
assert.equal(names.size, workflow.nodes.length);
for (const [from, connection] of Object.entries(workflow.connections)) {
  assert.ok(names.has(from));
  for (const group of Object.values(connection)) for (const outputs of group) for (const edge of outputs) assert.ok(names.has(edge.node), `${from} -> ${edge.node}`);
}
const reads = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.googleSheets');
assert.equal(reads.length, 38);
for (const read of reads) {
  const filterName = next(read.name)[0]?.node;
  assert.match(filterName, /\| Lọc kỳ /);
  const normalizeName = next(filterName)[0]?.node;
  assert.match(normalizeName, /\| Chuẩn hóa /);
  const mergeName = next(normalizeName)[0]?.node;
  assert.equal(node(mergeName).type, 'n8n-nodes-base.merge');
  assert.equal(next(read.name).length, 1);
  assert.equal(next(filterName).length, 1);
}
assert.equal(workflow.nodes.filter(n => n.name.startsWith('BH | Lọc kỳ ')).length, 18);
assert.equal(workflow.nodes.filter(n => n.name.startsWith('CK | Lọc kỳ ')).length, 20);

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000);
const sessionDate = `${yesterday.getUTCMonth()+1}/${yesterday.getUTCDate()}/${yesterday.getUTCFullYear()} 10:17:58`;
const oldDate = '3/30/2024 18:29:42';
const sessionRow = {
  row_number: 2, Timestamp: sessionDate, 'Tên của bạn là:': 'Học viên A',
  'Mã lớp bạn tham gia:': 'FO40', 'Bạn feedback cho buổi học nào?': 'Buổi mẫu',
  'Trainer buổi học này là:\n': 'Giảng viên B',
  'Buổi học đáp ứng được bao nhiêu % kì vọng so với ban đầu của bạn?\n': 3,
  'Mức độ hiểu bài và tiếp thu kiến thức của bạn trong buổi hôm nay': 5,
  'Khả năng truyền đạt kiến thức của trainer\n': 4,
  'Nhận xét dành cho trainer:': 'Giảng hơi nhanh',
  'Nhận xét dành cho nội dung bài giảng': 'Cần thêm ví dụ',
  'Nhận xét dành cho service trực lớp:': 'Tốt',
};
const sFilter = run('BH | Lọc kỳ FO/TM', [sessionRow, { ...sessionRow, row_number: 3, Timestamp: oldDate }]).map(i => i.json);
assert.equal(sFilter.filter(i => i.kind === 'rawPeriodRow').length, 1);
assert.equal(sFilter.find(i => i.kind === 'sourceStatus').inputRows, 2);
const noRecent = run('BH | Lọc kỳ FO/TM', [{ ...sessionRow, Timestamp: oldDate }]).map(i => i.json);
assert.equal(noRecent.length, 1);
assert.equal(noRecent[0].kind, 'sourceStatus');
assert.equal(run('BH | Chuẩn hóa FO/TM', noRecent).map(i => i.json).filter(i => i.kind === 'normalizedRow').length, 0);
const sNorm = run('BH | Chuẩn hóa FO/TM', sFilter).map(i => i.json);
assert.equal(sNorm.filter(i => i.kind === 'normalizedRow').length, 1);
assert.equal(sNorm.find(i => i.kind === 'normalizedRow').row.expectation, 3);
assert.equal(sNorm.find(i => i.kind === 'normalizedRow').row.trainerComment, 'Giảng hơi nhanh');
const emptyStatuses = (count, start) => Array.from({ length: count }, (_, i) => ({ kind: 'sourceStatus', source: { code: `T${i+start}`, course: `Course ${i+start}`, spreadsheetId: `sheet${i+start}`, sheetId: i+start, sheetTitle: 'Feedback' }, inputRows: 0, periodRows: 0, errors: [], warnings: [] }));
const sUnion = run('BH | Kiểm tra union đã chuẩn hóa', [...sNorm, ...emptyStatuses(17, 1)])[0].json;
assert.equal(sUnion.rows.length, 1);
const sourceError = { ...sNorm.find(i => i.kind === 'sourceStatus'), errors: ['Không đọc được tab'] };
assert.throws(() => run('BH | Kiểm tra union đã chuẩn hóa', [sNorm.find(i => i.kind === 'normalizedRow'), sourceError, ...emptyStatuses(17, 1)]), /Nguồn dữ liệu lỗi/);
const sSummary = run('BH | Tính chỉ số', [sUnion])[0].json;
assert.equal(sSummary.totalResponses, 1);
assert.equal(sSummary.alerts.length, 1);
assert.equal(sSummary.metrics.overall.positive, 2);
const sBrief = run('BH | Chuẩn bị bản tin ngắn cho AI', [sSummary])[0].json;
assert.equal(sBrief.totalResponses, 1);
assert.equal(sBrief.alerts.length, 1);
assert.ok(!JSON.stringify(sBrief).includes('sheetUrl'));
assert.ok(!JSON.stringify(sBrief).includes('https://'));
assert.equal(sBrief.periodText.split(' – ').length, 2);
const fixedBrief = run('BH | Chuẩn bị bản tin ngắn cho AI', [{ ...sSummary, period: { start: '2026-09-16', endExclusive: '2026-09-18' } }])[0].json;
assert.equal(fixedBrief.periodText, '16/09/2026 – 17/09/2026');
assert.equal(next('BH | Tính chỉ số')[0].node, 'BH | Chuẩn bị bản tin ngắn cho AI');
assert.equal(next('BH | Chuẩn bị bản tin ngắn cho AI')[0].node, 'AI Agent');

const [year, month, day] = today.split('-').map(Number);
const finalDate = `${month}/${day}/${year} 10:17:58`;
const finalRow = {
  row_number: 2, Timestamp: finalDate, 'Họ tên của bạn': 'Học viên C',
  'Mã lớp bạn tham gia': 'FO40',
  '3. Với những trải nghiệm tại TM, bạn sẵn sàng giới thiệu khóa học cho bạn bè mình chứ? ': 10,
  '4. Bạn có thể cho TM biết lý do không?': 'Trợ giảng nhiệt tình',
  '2. Điều gì của khoá học TM cần cải thiện?': 'Cần thêm tài liệu',
  '5. Bạn đánh giá như thế nào về mức độ hài lòng đối với bạn Service hỗ trợ khoá học? ': 10,
  '6. Bạn đánh giá mức độ hài lòng của bạn với trải nghiệm tại TM nhé': 8,
  '7. Bạn chưa hài lòng điều gì với dịch vụ ở TM hoặc có góp ý gì với team Customer Service tại TM?': 'Không',
  '8. Trong vòng 2 tháng tới, bạn có nhu cầu tham gia khóa học nào khác của TM không? (Để team service có thể tư vấn và follow nhắc lịch học cho mọi người)\n\nTham khảo cụ thể thông tin các khoá học của TM tại đây: https://www.tomorrowmarketers.org/chinh-sach-gia-cuu-hoc-vien': 'Content Marketing',
};
const fFilter = run('CK | Lọc kỳ FO/TM', [finalRow, { ...finalRow, row_number: 3, Timestamp: oldDate }]).map(i => i.json);
assert.equal(fFilter.filter(i => i.kind === 'rawPeriodRow').length, 1);
const fNorm = run('CK | Chuẩn hóa FO/TM', fFilter).map(i => i.json);
assert.equal(fNorm.find(i => i.kind === 'normalizedRow').row.name, 'Học viên C');
const extraTab = { kind: 'sourceStatus', source: { ...fNorm.find(i => i.kind === 'sourceStatus').source, sheetId: 999 }, inputRows: 0, periodRows: 0, errors: [], warnings: [] };
const otherSources = emptyStatuses(17, 1);
const secondExtraTab = { ...otherSources[0], source: { ...otherSources[0].source, sheetId: 1000 } };
const fUnion = run('CK | Kiểm tra union đã chuẩn hóa', [...fNorm, extraTab, ...otherSources, secondExtraTab])[0].json;
assert.equal(fUnion.rows.length, 1);
const fSummary = run('CK | Tính chỉ số', [fUnion])[0].json;
assert.equal(fSummary.nps, 100);
assert.equal(fSummary.demand.count, 1);
assert.equal(fSummary.demand.interests[0].course, 'Content Marketing');
const fBrief = run('CK | Chuẩn bị bản tin ngắn cho AI', [fSummary])[0].json;
assert.equal(fBrief.demand.contacts.length, 1);
assert.ok(!JSON.stringify(fBrief).includes('sheetUrl'));
assert.ok(!JSON.stringify(fBrief).includes('https://'));
assert.equal(next('CK | Tính chỉ số')[0].node, 'CK | Chuẩn bị bản tin ngắn cho AI');
assert.equal(next('CK | Chuẩn bị bản tin ngắn cho AI')[0].node, 'AI Agent1');

for (const [agent, formatter, webhook] of [['AI Agent','BH | Kiểm tra Markdown cho Base.vn','HTTP Request - Khánh'],['AI Agent1','CK | Kiểm tra Markdown cho Base.vn','HTTP Request - Khánh1']]) {
  assert.match(node(agent).parameters.text, /JSON\.stringify\(\$json\)/);
  assert.doesNotMatch(node(agent).parameters.options.systemMessage, /^#{1,6}\s/m);
  assert.match(node(agent).parameters.options.systemMessage, /\*\*.*(?:FEEDBACK|PHẢN HỒI)/);
  assert.match(node(agent).parameters.options.systemMessage, /ví dụ/i);
  assert.equal(next(agent)[0].node, formatter);
  assert.equal(next(formatter)[0].node, webhook);
  assert.equal(node(webhook).parameters.bodyParameters.parameters.find(p => p.name === 'base_content').value, '={{ $json.reportMarkdown }}');
  assert.equal(crypto.createHash('sha256').update(node(webhook).parameters.url).digest('hex'), 'a40aa27d0e8357197aa569e5663a1dc361f0f3a9dc1d7bfeb2217cb4c28fffa9');
}
const formatted = run('BH | Kiểm tra Markdown cho Base.vn', [{ output: '# Báo cáo\n## Cần xử lý\nNội dung' }])[0].json.reportMarkdown;
assert.equal(formatted, '**BÁO CÁO**\n**CẦN XỬ LÝ**\nNội dung');
const noLink = run('BH | Kiểm tra Markdown cho Base.vn', [{ output: 'Thông tin [tại đây](https://example.com/a) và https://example.com/b\nNguồn & dòng: sheetUrl = https://example.com/c' }])[0].json.reportMarkdown;
assert.equal(noLink, 'Thông tin tại đây và');
console.log('Passed: 38 read → filter → normalize chains, both periods, metrics, AI Agent wiring, Markdown, Base.vn webhook preservation.');
