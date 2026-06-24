class MemoryMatchGame {
  constructor() {
    this.board = document.getElementById('gameBoard');
    this.scoreNode = document.getElementById('score');
    this.movesNode = document.getElementById('moves');
    this.timerNode = document.getElementById('timer');
    this.highScoreNode = document.getElementById('highScore');
    this.statusNode = document.getElementById('statusText');
    this.winOverlay = document.getElementById('winOverlay');
    this.winSummary = document.getElementById('winSummary');
    
    this.sound = new SoundEngine();
    this.confetti = new ConfettiBurst(document.getElementById('confettiCanvas'));
    
    this.cards = [];
    this.openCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.score = 0;
    this.seconds = 0;
    this.timer = null;
    this.locked = false;
    this.started = false;
    this.highScore = Number(localStorage.getItem('royalMemoryHighScore')) || 0;
    
    this.deckSeed = [
      { rank: 'A', suit: '♠', color: 'black' },
      { rank: 'K', suit: '♥', color: 'red' },
      { rank: 'Q', suit: '♦', color: 'red' },
      { rank: 'J', suit: '♣', color: 'black' },
      { rank: '10', suit: '♠', color: 'black' },
      { rank: '9', suit: '♥', color: 'red' },
    ];
  }

  init() {
    this.bindEvents();
    this.newGame();
  }

  bindEvents() {
    document.getElementById('restartBtn').addEventListener('click', () => this.newGame());
    document.getElementById('playAgainBtn').addEventListener('click', () => this.newGame());
    
    // Event Delegation: One listener for all cards
    this.board.addEventListener('click', (e) => {
      const cardBtn = e.target.closest('.memory-card');
      if (cardBtn && !this.locked) this.flipCard(cardBtn.dataset.id);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'r') this.newGame();
      if (event.code === 'Space') {
        event.preventDefault();
        const focusedCard = document.activeElement;
        if (focusedCard && focusedCard.classList.contains('memory-card')) {
          this.flipCard(focusedCard.dataset.id);
        }
      }
    });
  }

  newGame() {
    this.stopTimer();
    this.cards = this.createDeck();
    this.openCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.score = 0;
    this.seconds = 0;
    this.locked = false;
    this.started = false;
    this.winOverlay.classList.remove('open');
    this.render();
    this.updateHud();
  }

  startTimer() {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => {
      this.seconds++;
      this.updateHud();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  render() {
    this.board.innerHTML = '';
    this.cards.forEach((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'memory-card';
      button.dataset.id = card.id;
      button.style.animationDelay = `${index * 55}ms`;
      button.innerHTML = `
        <span class="memory-card-inner">
            <span class="card-face card-back"></span>
            <span class="card-face card-front ${card.color}">
                <span class="rank">${card.rank}</span>
                <span class="suit">${card.suit}</span>
                <span class="rank bottom">${card.rank}</span>
            </span>
        </span>
      `;
      this.board.appendChild(button);
    });
  }

  flipCard(cardId) {
    const card = this.cards.find((item) => item.id === cardId);
    const element = this.cardElement(cardId);
    
    if (!card || card.matched || this.openCards.includes(card) || !element) return;

    this.startTimer();
    element.classList.add('flipped');
    this.openCards.push(card);
    this.sound.play('flip');

    if (this.openCards.length === 2) {
      this.moves++;
      this.updateHud();
      this.checkPair();
    }
  }

  checkPair() {
    this.locked = true;
    const [first, second] = this.openCards;

    setTimeout(() => {
      if (first.pairId === second.pairId) {
        [first, second].forEach(c => {
          c.matched = true;
          this.cardElement(c.id).classList.add('matched');
        });
        this.matchedPairs++;
        this.score += Math.max(120 - this.moves * 2, 40);
        this.sound.play('match');
        this.checkWin();
      } else {
        [first, second].forEach(c => this.cardElement(c.id).classList.remove('flipped'));
        this.score = Math.max(this.score - 10, 0);
        this.sound.play('miss');
      }
      this.openCards = [];
      this.locked = false;
      this.updateHud();
    }, 600);
  }

  checkWin() {
    if (this.matchedPairs !== this.deckSeed.length) return;
    this.stopTimer();
    const finalScore = this.score + Math.max(240 - this.seconds, 0);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('royalMemoryHighScore', String(finalScore));
    }
    this.sound.play('win');
    this.confetti.launch();
    this.winSummary.textContent = `Score ${finalScore} in ${this.formatTime(this.seconds)} with ${this.moves} moves.`;
    this.winOverlay.classList.add('open');
  }

  updateHud() {
    this.scoreNode.textContent = this.score;
    this.movesNode.textContent = this.moves;
    this.timerNode.textContent = this.formatTime(this.seconds);
    this.highScoreNode.textContent = this.highScore;
  }

  cardElement(cardId) {
    return this.board.querySelector(`[data-id="${cardId}"]`);
  }

  formatTime(totalSeconds) {
    return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  }

  createDeck() {
    const paired = this.deckSeed.flatMap((card, pairIndex) => [
      { ...card, id: `${pairIndex}-a`, pairId: pairIndex, matched: false },
      { ...card, id: `${pairIndex}-b`, pairId: pairIndex, matched: false },
    ]);
    return this.fisherYates(paired);
  }

  fisherYates(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
