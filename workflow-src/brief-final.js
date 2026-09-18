// Remove source links and historical source statistics before the Agent call.
const data = $input.first().json;
const clean = value => String(value ?? '').replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, '$1').replace(/https?:\/\/\S+/gi, '').trim();
const contacts = data.demand.contacts.map(c => ({
  name: clean(c.name), classCode: clean(c.classCode), course: clean(c.course),
  interest: clean(c.interest), email: clean(c.email),
}));
const comments = data.comments.map(c => ({
  courseCode: clean(c.source), classCode: clean(c.classCode),
  recommendReason: clean(c.recommendReason), improvement: clean(c.improvement),
  serviceFeedback: clean(c.serviceFeedback),
}));
return [{ json: {
  kind: 'finalBrief', month: data.month, asOf: data.asOf,
  totalResponses: data.totalResponses, recommend: data.recommend, nps: data.nps,
  serviceSatisfaction: data.serviceSatisfaction,
  overallSatisfaction: data.overallSatisfaction,
  demand: { count: data.demand.count, valid: data.demand.valid,
    percent: data.demand.percent, interests: data.demand.interests, contacts },
  comments, warnings: data.warnings,
} }];
