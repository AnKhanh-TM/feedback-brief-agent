// Regenerate the importable n8n workflow from the reviewed Code-node sources.
// Run: node build-workflow.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const existingWorkflowPath = path.join(root, 'Feedback Brief Agent.json');
if (fs.existsSync(existingWorkflowPath)) {
  const current = JSON.parse(fs.readFileSync(existingWorkflowPath, 'utf8'));
  if (current.nodes?.some(n => n.type === '@n8n/n8n-nodes-langchain.agent' || n.name?.startsWith('HTTP Request - Khánh'))) {
    throw new Error('Dừng build: JSON hiện có chứa AI Agent/webhook do người dùng chỉnh. Script build cũ không được ghi đè workflow hiện tại.');
  }
}
const read = name => fs.readFileSync(path.join(root, 'workflow-src', name), 'utf8');
const workflow = {
  name: 'Feedback Brief Agent | 18 khóa | Buổi học + Cuối khóa',
  nodes: [], pinData: {}, connections: {}, active: false,
  settings: { executionOrder: 'v1', timezone: 'Asia/Ho_Chi_Minh' },
  tags: [],
};
const sources = [
  ['FO/TM','Marketing Foundation','1J2sQSztiJ67sC1yEOFbikKFJoTKP0LKdgM5iV5uy6N8'],
  ['BD','Brand Development','1ZCEUn9OSc5B-mKUgMuChLDU7qfnkwhPbCS6WEkmLcaw'],
  ['CASE','Case Mastery','1dAWyM6lRWDz7CVvvkhUCTFdJNBV7ERv-HC0dqg8STNw'],
  ['CM','Content Marketing','1D35Ifz-iSVnhvoqBkvRXEYGuSuHHqZUP6qhauIxfTyM'],
  ['DI','Digital Foundation','1KrbPwQSyc3gLxg_IGrUpTF1-6d9SDHOAgQApxEZ4yro'],
  ['DP','Digital Performance','1DLoRUzoH-caddhaD8jXlj63MEde60CSmpvLp8TF3TZI'],
  ['MCI','Master Critical Thinking','16ugx-fQZLJGxkSvie_s8-6-_veEe50kVDJQJ0ekkqYI'],
  ['Python','AI & Machine Learning with Python','1g4O4lUHytDswtPUoWbUl832MbZLScphyoO4EJPvYCqo'],
  ['Excel','Excel & AI for Data Analytics','1-_A2kuaN0BPoR-Y4qzGJ5aIhvpqaFgqEsknRgtHUl1g'],
  ['SQL','Database System with SQL','1Ph3-EPcO-WUI_jvVUVQbrs1Ljbx-emlYFji934mHwhw'],
  ['DA','Power BI & AI for Data Analytics','1Xm8aQ2nfshS6z2zp3VKlwBix7GWL05StlkmGUDLeEHU'],
  ['PSY','Consumer Psychology','1ePG5GzCnJijSKNITNRXxUNfdx0LA7X_4fgvO6wcsgHs'],
  ['GAI','Generative AI','1Qb8F1crZT-O-62k1KVsRt2jwMAsiEsvRo3iFaouILEk'],
  ['STR','Strategy Formulation','1Vq52RUYW8odAtISfhFBIqMSAq12Y2OaapjSNcTr21Wo'],
  ['DECS','Decision Science','1UQdtXJEK_Sn5Xa5cAaS2MW93zdOqpXJvdpOh9fbpoEo'],
  ['AIM','AI Marketing','192_6Pcp4zKNra5dq7l4g7kHlRHrkM0WNzG_ooIpXgz8'],
  ['TRORG','Transform Organization with AI & Technology','1hd6t_hNv5sPRix8yltTKG-5KCYQq73BGy1gWZOTTrAs'],
  ['AISYS','AI Marketing & Sales System','1TOgGVUScC2w3ObDCtrJa_mv04dMoFt-V0pcNtpXoC-0'],
].map(([code, course, spreadsheetId]) => ({ code, course, spreadsheetId }));
const tabIds = {
  'FO/TM': [1506415216,1010941268], BD: [1124064427,1853902459],
  CASE: [990846238,991367200], CM: [402789807,1573075100],
  DI: [15745835,1136558248], DP: [668114466,1153511617],
  MCI: [1509052139,2142418473], Python: [398551619,1446633860],
  Excel: [973156694,633892866], SQL: [973084119,2094717340],
  DA: [1215208248,957792378], PSY: [1667274252,1137642372],
  GAI: [1724642614,1999270606], STR: [562166442,1190057216],
  DECS: [402623252,1751880839], AIM: [1167775378,844531921],
  TRORG: [1603333234,75118046], AISYS: [1434289293,1604728060],
};
for (const source of sources) {
  const [sessionGid, finalGid] = tabIds[source.code];
  source.sessionTab = { gid: sessionGid, title: source.code === 'BD' ? 'Feedback buổi học ' : 'Feedback buổi học' };
  source.finalTabs = [{ gid: finalGid, title: source.code === 'SQL' || source.code === 'PSY' ? 'Feedback cuối khoá' : 'Feedback cuối khóa' }];
}
sources.find(s => s.code === 'SQL').finalTabs.push({ gid: 739888760, title: 'Feedback cuối khóa' });
sources.find(s => s.code === 'PSY').finalTabs.push({ gid: 988363788, title: 'Feedback cuối khóa' });

function add(name, type, version, parameters, position, extra={}) {
  if (workflow.nodes.some(n => n.name === name)) throw new Error(`Duplicate node ${name}`);
  const id = crypto.createHash('sha256').update(name).digest('hex');
  const uuid = `${id.slice(0,8)}-${id.slice(8,12)}-4${id.slice(13,16)}-a${id.slice(17,20)}-${id.slice(20,32)}`;
  workflow.nodes.push({ id: uuid, name, type, typeVersion: version, position, parameters, ...extra });
  workflow.connections[name] = { main: [[]] };
  return name;
}
function edge(from, to, input=0) { workflow.connections[from].main[0].push({ node: to, type: 'main', index: input }); }
function code(name, jsCode, pos, extra={}) { return add(name, 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', jsCode }, pos, extra); }
function merge(name, count, pos) { return add(name, 'n8n-nodes-base.merge', 3, { mode: 'append', numberInputs: count }, pos); }

const sessionSchedule = add('BH | Lịch sáng thứ 2-4-6 (08:00)', 'n8n-nodes-base.scheduleTrigger', 1.2,
  { rule: { interval: [{ field: 'cronExpression', expression: '0 8 * * 1,3,5' }] } }, [-1560,-750]);
const sessionManual = add('BH | Chạy thử thủ công', 'n8n-nodes-base.manualTrigger', 1, {}, [-1560,-600]);
const finalSchedule = add('CK | Lịch hằng ngày (23:55)', 'n8n-nodes-base.scheduleTrigger', 1.2,
  { rule: { interval: [{ field: 'cronExpression', expression: '55 23 * * *' }] } }, [-1560,1350]);
const finalManual = add('CK | Chạy thử thủ công', 'n8n-nodes-base.manualTrigger', 1, {}, [-1560,1500]);
const finalGate = code('CK | Chỉ chạy ngày cuối tháng', `const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());\nconst tomorrow = new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0,10);\nreturn date.slice(0,7) !== tomorrow.slice(0,7) ? $input.all() : [];`, [-1320,1350]);
edge(finalSchedule, finalGate);

function tagCode(source) {
  return `const source = ${JSON.stringify({ ...source, sheetUrl: `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit#gid=${source.sheetId}` })};\n` +
    `const items = $input.all();\nif (!items.length) return [{ json: { source, empty: true } }];\n` +
    `return items.map(item => { const raw = item.json || {}; const keys = Object.keys(raw);\n` +
    `if (!keys.length) return { json: { source, empty: true } };\n` +
    `if (raw.error && keys.length <= 2) return { json: { source, error: typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error) } };\n` +
    `return { json: { source, raw } }; });`;
}

function buildBranch(kind, yBase, startNodes) {
  const short = kind === 'session' ? 'BH' : 'CK';
  const title = kind === 'session' ? 'buổi học' : 'cuối khóa';
  const tagged = [];
  const tasks = sources.flatMap(source => (kind === 'session' ? [source.sessionTab] : source.finalTabs).map(tab => ({ source, tab })));
  const groupSize = kind === 'session' ? 9 : 10;
  tasks.forEach(({ source, tab }, i) => {
    const row = i % groupSize, group = Math.floor(i / groupSize);
    const x = -1060 + group * 620;
    const y = yBase + row * 160;
    const sheetName = { __rl: true, value: String(tab.gid), mode: 'id', cachedResultName: tab.title };
    const suffix = kind === 'final' && source.finalTabs.length > 1 ? ` [${tab.title}]` : '';
    const readName = `${short} | Đọc ${source.code} - ${source.course}${suffix}`;
    add(readName, 'n8n-nodes-base.googleSheets', 4.7, {
      operation: 'read',
      documentId: { __rl: true, value: source.spreadsheetId, mode: 'id' },
      sheetName, filtersUI: { values: [] }, options: {},
    }, [x,y], {
      credentials: { googleSheetsOAuth2Api: { id: '9gcZECvMAhPxKBMb', name: 'Google Sheets account 3' } },
      alwaysOutputData: true, continueOnFail: true,
      notes: `Đọc tab ${tab.title} (GID ${tab.gid}) của ${source.course}; GID đã đối chiếu với metadata Google Sheets.`, notesInFlow: true,
    });
    for (const start of startNodes) edge(start, readName);
    const tagName = `${short} | Gắn nguồn ${source.code}${suffix}`;
    code(tagName, tagCode({ code: source.code, course: source.course, spreadsheetId: source.spreadsheetId, sheetId: tab.gid, sheetTitle: tab.title }), [x+260,y]);
    edge(readName, tagName);
    tagged.push(tagName);
  });
  const mergeA = merge(`${short} | Union tab 1-${groupSize}`, groupSize, [230,yBase+320]);
  const mergeB = merge(`${short} | Union tab ${groupSize+1}-${tasks.length}`, tasks.length-groupSize, [230,yBase+640]);
  tagged.slice(0,groupSize).forEach((name,i) => edge(name,mergeA,i));
  tagged.slice(groupSize).forEach((name,i) => edge(name,mergeB,i));
  const mergeAll = merge(`${short} | Union ${tasks.length} tab`, 2, [500,yBase+480]);
  edge(mergeA,mergeAll,0); edge(mergeB,mergeAll,1);
  const normalized = code(`${short} | Chuẩn hóa cột và dữ liệu`, `const KIND = '${kind}';\n` + read('normalize.js'), [760,yBase+480]);
  edge(mergeAll,normalized);
  const aggregate = code(`${short} | Tính chỉ số và lọc kỳ`, read(kind === 'session' ? 'session.js' : 'final.js'), [1020,yBase+480]);
  edge(normalized,aggregate);
  const prompt = code(`${short} | Chuẩn bị prompt tiếng Việt`, read(kind === 'session' ? 'prompt-session.js' : 'prompt-final.js'), [1280,yBase+480]);
  edge(aggregate,prompt);
  const request = add(`${short} | OpenAI API - tạo báo cáo`, 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'POST', url: 'https://api.openai.com/v1/responses',
    authentication: 'genericCredentialType', genericAuthType: 'httpBearerAuth',
    sendBody: true, contentType: 'json', specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ model: 'gpt-5.6-luna', store: false, instructions: $json.systemPrompt, input: $json.userPrompt, max_output_tokens: 7000 }) }}`,
    options: { timeout: 120000 },
  }, [1540,yBase+480], { notes: 'Chọn n8n Bearer Auth credential chứa OpenAI API key. Không lưu API key trong JSON.', notesInFlow: true });
  edge(prompt,request);
  const extract = code(`${short} | Xuất báo cáo Markdown`, read(kind === 'session' ? 'extract-session.js' : 'extract-final.js'), [1800,yBase+480]);
  edge(request,extract);
}

buildBranch('session', -460, [sessionSchedule, sessionManual]);
buildBranch('final', 1640, [finalGate, finalManual]);

// Verify every graph edge and the configured source inventory before writing.
const names = new Set(workflow.nodes.map(n => n.name));
for (const [from, outputs] of Object.entries(workflow.connections)) {
  if (!names.has(from)) throw new Error(`Missing source node ${from}`);
  for (const edge of outputs.main.flat()) if (!names.has(edge.node)) throw new Error(`Missing destination node ${edge.node}`);
}
if (sources.length !== 18 || sources.reduce((n,s)=>n+s.finalTabs.length,0) !== 20) throw new Error('Expected 18 sheets / 20 final tabs');
fs.writeFileSync(path.join(root, 'Feedback Brief Agent.json'), JSON.stringify(workflow, null, 2) + '\n');
console.log(`Wrote Feedback Brief Agent.json: ${workflow.nodes.length} nodes, ${sources.length} sheets / 38 feedback tabs`);
