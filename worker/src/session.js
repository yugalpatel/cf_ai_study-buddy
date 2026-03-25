export class QuizSession {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/quiz') {
      const { cardIndex } = await request.json();
      const currentIndex = cardIndex ?? 0;
      const score = (await this.state.storage.get('score')) || 0;
      const total = (await this.state.storage.get('total')) || 0;
      await this.state.storage.put('cardIndex', currentIndex);
      return new Response(JSON.stringify({ cardIndex: currentIndex, score, total }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/score') {
      const { isCorrect } = await request.json();
      const score = (await this.state.storage.get('score')) || 0;
      const total = (await this.state.storage.get('total')) || 0;
      await this.state.storage.put('score', isCorrect ? score + 1 : score);
      await this.state.storage.put('total', total + 1);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/state') {
      const score = (await this.state.storage.get('score')) || 0;
      const total = (await this.state.storage.get('total')) || 0;
      const cardIndex = (await this.state.storage.get('cardIndex')) || 0;
      return new Response(JSON.stringify({ score, total, cardIndex }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
}