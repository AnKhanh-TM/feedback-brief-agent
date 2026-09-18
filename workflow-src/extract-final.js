const response = $input.first().json;
if (response.status && response.status !== 'completed') throw new Error(`OpenAI API chưa hoàn tất báo cáo: ${response.status}`);
const text = (response.output || []).flatMap(o => o.content || []).filter(c => c.type === 'output_text').map(c => c.text || '').join('\n').trim();
if (!text) throw new Error(`OpenAI API không trả về nội dung báo cáo. Trạng thái: ${response.status || 'không rõ'}`);
const source = $('CK | Chuẩn bị prompt tiếng Việt').first().json;
return [{ json: { reportType: 'final', month: source.month, metrics: source.metrics, reportMarkdown: text, openaiResponseId: response.id, generatedAt: new Date().toISOString() } }];
