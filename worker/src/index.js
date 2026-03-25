export { QuizSession } from './session.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      // Generate flashcards from pasted text
      if (path === '/generate' && request.method === 'POST') {
        const { text, sessionId } = await request.json();

        const prompt = `You are a flashcard generator. Given the following text, create exactly 5 flashcards.
Respond ONLY with a JSON array, no explanation, no markdown, just raw JSON like this:
[{"question": "...", "answer": "..."}]

Text: ${text}`;

        const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        });

        let cards;
        try {
          const raw = response.response;
          if (Array.isArray(raw)) {
            cards = raw;
          } else {
            const jsonMatch = raw.trim().match(/\[[\s\S]*\]/);
            cards = JSON.parse(jsonMatch ? jsonMatch[0] : raw.trim());
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Failed to parse flashcards', raw: response.response }), { headers, status: 500 });
        }

        // Save cards to KV
        await env.FLASHCARDS.put(sessionId, JSON.stringify(cards));

        return new Response(JSON.stringify({ cards }), { headers });
      }

      // Start or continue a quiz session
      if (path === '/quiz' && request.method === 'POST') {
        const { sessionId, message, cardIndex } = await request.json();

        // Get the Durable Object for this session
        const id = env.QUIZ_SESSION.idFromName(sessionId);
        const session = env.QUIZ_SESSION.get(id);

        // Forward the request to the Durable Object
        const doResponse = await session.fetch('https://do/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, cardIndex, sessionId, env: null }),
        });

        const data = await doResponse.json();

        // Use AI to evaluate the answer
        const cards = JSON.parse(await env.FLASHCARDS.get(sessionId) || '[]');
        const card = cards[data.cardIndex];

        if (!card) {
          return new Response(JSON.stringify({ reply: "No flashcards found. Please generate some first!", score: data.score, total: data.total }), { headers });
        }

        const evalPrompt = `You are a friendly study tutor. 
Question: "${card.question}"
Correct answer: "${card.answer}"
Student's answer: "${message}"

In 1-2 sentences: tell them if they got it right or wrong, and give the correct answer if wrong. Be encouraging.`;

        const aiReply = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [{ role: 'user', content: evalPrompt }],
          max_tokens: 200,
        });

        const isCorrect = aiReply.response.toLowerCase().includes('correct') || 
                          aiReply.response.toLowerCase().includes('right') ||
                          aiReply.response.toLowerCase().includes('great') ||
                          aiReply.response.toLowerCase().includes('exactly');

        // Update score in Durable Object
        await session.fetch('https://do/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCorrect }),
        });

        const nextIndex = data.cardIndex + 1;
        const hasMore = nextIndex < cards.length;
        const nextQuestion = hasMore ? `\n\nNext question (${nextIndex + 1}/${cards.length}): ${cards[nextIndex].question}` : `\n\n🎉 Quiz complete! Check your score below.`;

        return new Response(JSON.stringify({
          reply: aiReply.response + nextQuestion,
          nextCardIndex: hasMore ? nextIndex : null,
          score: data.score + (isCorrect ? 1 : 0),
          total: cards.length,
          done: !hasMore,
        }), { headers });
      }

      // Get session score
      if (path === '/session' && request.method === 'GET') {
        const sessionId = url.searchParams.get('sessionId');
        const id = env.QUIZ_SESSION.idFromName(sessionId);
        const session = env.QUIZ_SESSION.get(id);
        const res = await session.fetch('https://do/state');
        const state = await res.json();
        return new Response(JSON.stringify(state), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { headers, status: 404 });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { headers, status: 500 });
    }
  }
};