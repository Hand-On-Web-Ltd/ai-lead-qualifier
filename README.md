# AI Lead Qualifier

A chatbot that qualifies leads through natural conversation. It asks the right questions, figures out budget, timeline, company size, and needs — then gives each lead a score from 1 to 100.

Built with Node.js, Express, and OpenAI. Drop it into your site and let it handle the first conversation with prospects.

## What it does

- Has a natural back-and-forth conversation with visitors
- Extracts key info: budget, timeline, company size, and what they need
- Scores leads 1-100 based on configurable rules
- Shows the qualification summary when enough info is gathered

## Quick start

```bash
git clone https://github.com/Hand-On-Web-Ltd/ai-lead-qualifier.git
cd ai-lead-qualifier
npm install
cp .env.example .env
# Add your OpenAI API key to .env
npm start
```

Open `http://localhost:3000` and start a conversation.

## Project structure

```
├── server.js                  # Express server + OpenAI chat logic
├── qualification-rules.json   # Scoring criteria and weights
├── public/
│   ├── index.html             # Chat UI
│   ├── app.js                 # Client-side chat logic
│   └── style.css              # Styles
├── package.json
├── .env.example
└── LICENSE
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `PORT` | Server port (default: 3000) |

## Scoring

Edit `qualification-rules.json` to change how leads get scored. Each criterion has a weight and thresholds:

- **Budget** (weight: 30) — higher budget = higher score
- **Timeline** (weight: 25) — sooner timeline = higher score
- **Company size** (weight: 20) — mid-size companies score highest
- **Need clarity** (weight: 25) — clear, specific needs score better

The chatbot gathers info naturally through conversation, then uses GPT to extract the structured data and apply the scoring rules.

## Customising

Want to change the questions or scoring? Two files to edit:

1. `qualification-rules.json` — adjust weights and thresholds
2. The system prompt in `server.js` — change the conversation style

## About Hand On Web
We build AI chatbots, voice agents, and automation tools for businesses.
- 🌐 [handonweb.com](https://www.handonweb.com)
- 📧 outreach@handonweb.com
- 📍 Chester, UK

## Licence
MIT
