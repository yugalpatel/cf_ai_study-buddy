# cf_ai_study-buddy

An AI-powered flashcard and quiz app built on Cloudflare infrastructure.

## Live Demo
https://330befdb.cf-ai-study-buddy-cp4.pages.dev

## What it does
1. Paste any text (notes, articles, textbook excerpts)
2. Llama 3.3 generates 5 flashcards instantly
3. Click cards to reveal answers
4. Quiz yourself via chat and AI evaluates your answers naturally
5. Score and progress tracked across the session

## Stack
| Component | Technology |
|---|---|
| LLM | Llama 3.3 70B via Cloudflare Workers AI |
| Backend | Cloudflare Workers |
| Session state | Durable Objects |
| Flashcard storage | Workers KV |
| Frontend | Cloudflare Pages (single HTML file) |

## Running locally
1. Clone the repo
2. Install Wrangler: `npm install -g wrangler`
3. Login: `wrangler login`
4. `cd worker && wrangler dev --remote`
5. Open `frontend/index.html` in your browser

## Deploying
```bash
cd worker && wrangler deploy
cd ../frontend && wrangler pages deploy . --project-name cf-ai-study-buddy
```

## Architecture
- Worker exposes two endpoints: `/generate` and `/quiz`
- `/generate` sends user text to Llama 3.3 and stores cards in KV
- `/quiz` routes through a Durable Object to track session state,
  then calls Llama 3.3 to evaluate answers conversationally
- Frontend is a single HTML file deployed to Pages