require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const fs = require('fs');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3000;

const rules = JSON.parse(fs.readFileSync('./qualification-rules.json', 'utf-8'));

// Store conversations per session (in-memory)
const sessions = new Map();

app.use(express.static('public'));
app.use(express.json());

const SYSTEM_PROMPT = `You are a friendly sales assistant for a tech company. Your job is to have a natural conversation with potential customers to understand their needs.

During the conversation, try to learn:
1. What they need help with (be specific)
2. Their rough budget for the project
3. When they want to get started
4. How big their company/team is

Be conversational and natural. Don't fire off all questions at once — let the chat flow like a real conversation. Ask follow-up questions when something is interesting.

After you've gathered enough info (usually 4-6 messages), include a JSON block at the end of your message in this exact format:

\`\`\`json
{
  "qualified": true,
  "budget": 5000,
  "timeline_weeks": 4,
  "company_size": 15,
  "need_clarity": "specific",
  "summary": "Brief summary of what they need"
}
\`\`\`

For need_clarity, use: "specific", "general", or "vague".
If you don't know a value, use null.
Only include the JSON when you have enough information — not before.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'No message' });

    const sid = sessionId || crypto.randomUUID();

    if (!sessions.has(sid)) {
      sessions.set(sid, [{ role: 'system', content: SYSTEM_PROMPT }]);
    }

    const history = sessions.get(sid);
    history.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: history,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });

    // Check if GPT included qualification data
    let qualification = null;
    const jsonMatch = reply.match(/```json\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        if (data.qualified) {
          qualification = scoreLeadFromData(data);
        }
      } catch (e) {
        // JSON parse failed, that's fine
      }
    }

    // Strip the JSON block from the visible reply
    const cleanReply = reply.replace(/```json\n[\s\S]*?\n```/, '').trim();

    res.json({
      reply: cleanReply,
      sessionId: sid,
      qualification,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

function scoreLeadFromData(data) {
  let totalScore = 0;
  const breakdown = {};

  // Budget scoring
  const budgetCriteria = rules.criteria.budget;
  let budgetScore = budgetCriteria.thresholds.unknown.score;
  if (data.budget !== null) {
    if (data.budget >= budgetCriteria.thresholds.high.min) budgetScore = budgetCriteria.thresholds.high.score;
    else if (data.budget >= budgetCriteria.thresholds.medium.min) budgetScore = budgetCriteria.thresholds.medium.score;
    else if (data.budget >= budgetCriteria.thresholds.low.min) budgetScore = budgetCriteria.thresholds.low.score;
  }
  breakdown.budget = { score: budgetScore, weight: budgetCriteria.weight, value: data.budget };
  totalScore += budgetScore * (budgetCriteria.weight / 100);

  // Timeline scoring
  const timelineCriteria = rules.criteria.timeline;
  let timelineScore = timelineCriteria.thresholds.unknown.score;
  if (data.timeline_weeks !== null) {
    if (data.timeline_weeks <= timelineCriteria.thresholds.immediate.maxWeeks) timelineScore = timelineCriteria.thresholds.immediate.score;
    else if (data.timeline_weeks <= timelineCriteria.thresholds.short.maxWeeks) timelineScore = timelineCriteria.thresholds.short.score;
    else if (data.timeline_weeks <= timelineCriteria.thresholds.medium.maxWeeks) timelineScore = timelineCriteria.thresholds.medium.score;
    else timelineScore = timelineCriteria.thresholds.long.score;
  }
  breakdown.timeline = { score: timelineScore, weight: timelineCriteria.weight, value: data.timeline_weeks };
  totalScore += timelineScore * (timelineCriteria.weight / 100);

  // Company size scoring
  const sizeCriteria = rules.criteria.companySize;
  let sizeScore = sizeCriteria.thresholds.unknown.score;
  if (data.company_size !== null) {
    if (data.company_size >= sizeCriteria.thresholds.enterprise.min) sizeScore = sizeCriteria.thresholds.enterprise.score;
    else if (data.company_size >= sizeCriteria.thresholds.midMarket.min) sizeScore = sizeCriteria.thresholds.midMarket.score;
    else if (data.company_size >= sizeCriteria.thresholds.small.min) sizeScore = sizeCriteria.thresholds.small.score;
    else sizeScore = sizeCriteria.thresholds.micro.score;
  }
  breakdown.companySize = { score: sizeScore, weight: sizeCriteria.weight, value: data.company_size };
  totalScore += sizeScore * (sizeCriteria.weight / 100);

  // Need clarity scoring
  const needCriteria = rules.criteria.needClarity;
  const clarityKey = data.need_clarity || 'unknown';
  const needScore = (needCriteria.thresholds[clarityKey] || needCriteria.thresholds.unknown).score;
  breakdown.needClarity = { score: needScore, weight: needCriteria.weight, value: clarityKey };
  totalScore += needScore * (needCriteria.weight / 100);

  // Get label
  const score = Math.round(totalScore);
  let label = rules.labels.cold.label;
  if (score >= rules.labels.hot.min) label = rules.labels.hot.label;
  else if (score >= rules.labels.warm.min) label = rules.labels.warm.label;
  else if (score >= rules.labels.cool.min) label = rules.labels.cool.label;

  return {
    score,
    label,
    summary: data.summary,
    breakdown,
  };
}

app.listen(PORT, () => {
  console.log(`Lead qualifier running on http://localhost:${PORT}`);
});
