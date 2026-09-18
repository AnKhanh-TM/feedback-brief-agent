// Give the Agent only the evidence needed for a short CS briefing.
const data = $input.first().json;
const fmt = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const inclusiveEnd = new Date(Date.parse(`${data.period.endExclusive}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
const clean = value => String(value ?? '').replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, '$1').replace(/https?:\/\/\S+/gi, '').trim();
const alerts = data.alerts.map(a => ({
  course: a.source.course, classCode: clean(a.classCode), lesson: clean(a.lesson),
  trainer: clean(a.trainer), learner: clean(a.name), scores: a.scores,
  lowCriteria: a.lowCriteria,
  comments: {
    trainer: clean(a.comments?.trainer), content: clean(a.comments?.content),
    service: clean(a.comments?.service),
  },
}));
const commentsForThemes = data.commentsForThemes.map(c => ({
  courseCode: c.source, lesson: clean(c.lesson), trainer: clean(c.trainer),
  trainerComment: clean(c.trainerComment), contentComment: clean(c.contentComment),
  serviceComment: clean(c.serviceComment),
}));
return [{ json: {
  kind: 'sessionBrief', periodText: `${fmt(data.period.start)} – ${fmt(inclusiveEnd)}`,
  totalResponses: data.totalResponses, metrics: data.metrics, alerts, commentsForThemes,
  warnings: data.warnings,
} }];
