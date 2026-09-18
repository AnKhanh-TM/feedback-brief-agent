// Ensure the AI Agent output uses bold uppercase headings for Base.vn.
const input = $input.first().json;
let reportMarkdown = String(input.output ?? '').trim();
if (!reportMarkdown) throw new Error('AI Agent không trả về nội dung báo cáo');
reportMarkdown = reportMarkdown
  .replace(/^\s*#{1,6}\s+(.+)$/gm, (_, title) => `**${title.replace(/\*/g, '').trim().toUpperCase()}**`)
  .replace(/^```(?:markdown|md)?\s*$/gmi, '')
  .replace(/^```\s*$/gm, '')
  .replace(/^.*(?:sheetUrl|Nguồn\s*(?:&|và)\s*dòng).*$/gmi, '')
  .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, '$1')
  .replace(/https?:\/\/\S+/gi, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
return [{ json: { reportMarkdown, generatedAt: new Date().toISOString() } }];
