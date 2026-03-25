# AI Prompts Used

This file documents how I used AI assistance during development.
My approach was to use AI for quick lookups and debugging. Architecture decisions, stack choices, and implementation were my own.

---

## 1. Initial architecture planning

**Prompt:**
> "I'm building an AI-powered flashcard app on Cloudflare. I want to use
> Workers AI for the LLM, and I need persistent state per user session.
> What's the tradeoff between using Durable Objects vs KV for session state?"

**How I used it:**
I already knew I wanted Durable Objects for live session state and KV for
persistent flashcard storage. I used this to validate my reasoning.
The response confirmed my approach that Durable Objects for low latency
mutable state and KV for durable storage. 

---

## 2. Llama 3.3 prompt engineering for structured output

**Prompt:**
> "I'm calling Llama 3.3 via Workers AI and need it to return a strict JSON
> array of flashcard objects. What's the most reliable way to prompt it to
> avoid markdown formatting or extra explanation in the output?"

**How I used it:**
I was getting inconsistent output formats in early testing, sometimes the
model wrapped JSON in markdown code blocks, sometimes added preamble text.
AI helped me land on the explicit "respond ONLY with a JSON array, no
markdown, no explanation" phrasing. I then added a regex fallback myself
to extract the array even if formatting was inconsistent.

---

## 3. Debugging the response parsing issue

**Prompt:**
> "My Workers AI response is returning `response.response` as an array
> directly instead of a string. My JSON.parse is failing because I'm
> calling .trim() on an array. Here's my code: [pasted code block].
> What's wrong?"

**How I used it:**
I had already identified that the parse was failing and suspected a type
issue. I used AI to confirm quickly rather than spending time console
logging. The fix was a simple Array.isArray() check, something I would
have landed on anyway, but AI got me there in 30 seconds.

---

## 4. Durable Objects migration error

**Prompt:**
> "Cloudflare is throwing error code 10097 when I deploy, says I need to
> use new_sqlite_classes instead of new_classes for Durable Objects on the
> free plan. How do I update my wrangler config?"

**How I used it:**
This was a pure documentation lookup. The free plan SQLite requirement
is a recent Cloudflare change. I used AI to get the exact config key
instead of digging through changelog docs.

---

## 5. Answer evaluation logic

**Prompt:**
> "For my quiz feature, I want the LLM to evaluate whether a student's
> answer is correct and give encouraging feedback. What's a good prompt
> structure that keeps responses short and consistent?"

**How I used it:**
I had the evaluation logic working but responses were too long and
inconsistent in tone. AI helped me tighten the prompt to constrain
output to 1-2 sentences. I wrote the isCorrect heuristic myself by
scanning for positive keywords. I didn't want to make an extra AI call
just for a boolean.

---

## What I did without AI

- Designed the full three panel UI layout and wrote all the CSS from scratch
- Chose the Cloudflare stack (Workers + Durable Objects + KV + Pages)
  based on my own evaluation of the requirements
- Structured the Worker routing and request/response flow
- Wrote the Durable Object class and storage logic
- Debugged the CORS and local vs remote mode issues
- Decided to use a single HTML file for the frontend to keep deployment simple