import { Card, Suit, Value, GameState } from '../types/game';

export class Game {
  private id: string;
  private players: string[];
  private deck: Card[];
  private hands: { [key: string]: Card[] };
  private centerPile: Card[];
  private currentTurn: string | null;
  private suiteChanged: Suit | undefined
  private status: 'waiting' | 'playing' | 'finished';

  constructor(id: string) {
    this.id = id;
    this.players = [];
    this.deck = [];
    this.hands = {};
    this.centerPile = [];
    this.currentTurn = null;
    this.status = 'waiting';
  }

  getPlayers(): string[] {
    return [...this.players];
  }

  addPlayer(playerId: string): boolean {
    if (this.players.length < 2) {
      this.players.push(playerId);
      return true;
    }
    return false;
  }

  start(): boolean {
    if (this.players.length !== 2) return false;
    this.initializeDeck();
    this.dealCards();
    this.status = 'playing';
    this.currentTurn = this.players[0];
    return true;
  }

  private initializeDeck(): void {
    this.deck = [];
    Object.values(Suit).forEach(suit => {
      Object.values(Value).forEach(value => {
        this.deck.push({ suit, value });
      });
    });
    this.shuffleDeck();
  }

  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  private dealCards(): void {
    this.players.forEach(playerId => {
      this.hands[playerId] = this.deck.splice(0, 7);
    });

    let isFirstCardValid = false
    let counter = 1

    do {
      const firstCard = this.deck[counter]
      if ([Value.EIGHT, Value.TWO, Value.JACK, Value.KING].includes(firstCard.value)) {
        console.error('Invalid first card', this.id, firstCard)
        counter++
        continue
      }

      this.centerPile = [this.deck.splice(counter, 1)[0]];
      isFirstCardValid = true
    }
    while (!isFirstCardValid)
  }

  private removeCardFromPlayersHand(playerId: string, card: Card) {
    const index = this.hands[playerId].findIndex((playerCard) => playerCard.suit === card.suit && playerCard.value === card.value)
    this.hands[playerId].splice(index, 1)
  }

  private checkIfPlayerHasWon(playerId: string) {
    if (this.hands[playerId].length) {
      return
    }

    this.status = 'finished'
  }

  getGameStateForPlayer(playerId: string): GameState {
    return {
      yourHand: this.hands[playerId],
      topCard: this.centerPile[this.centerPile.length - 1],
      isMyTurn: this.currentTurn === playerId,
      opponentCardCount: this.hands[this.getOpponentId(playerId)].length,
      suiteChanged: this.suiteChanged,
      status: this.status
    };
  }

  getOpponentId(playerId: string): string {
    return this.players.find(id => id !== playerId) || '';
  }

  playCard(playerId: string, card: Card, suiteChanged?: Suit): boolean {
    if (this.currentTurn !== playerId) {
      return false
    };

    const topCard = this.centerPile[this.centerPile.length - 1];

    if (card.value === Value.EIGHT) {
      this.suiteChanged = suiteChanged
      this.centerPile.push(card);
      this.currentTurn = this.getOpponentId(playerId);
      this.removeCardFromPlayersHand(playerId, card)
      this.checkIfPlayerHasWon(playerId)

      return true;
    }

    const isSuitEquals = (this.suiteChanged && this.suiteChanged === card.suit) || topCard.suit === card.suit
    if (!isSuitEquals && card.value !== topCard.value) {
      return false
    }

    this.suiteChanged = undefined


    if (card.value === Value.TWO) {
      this.centerPile.push(card);
      this.removeCardFromPlayersHand(playerId, card)

      return true;
    }

    if (card.value === Value.JACK) {
      this.centerPile.push(card);
      this.removeCardFromPlayersHand(playerId, card)

      return true;
    }

    if (card.value === Value.KING) {
      this.centerPile.push(card);
      this.removeCardFromPlayersHand(playerId, card)
      this.currentTurn = this.getOpponentId(playerId);
    }

    this.centerPile.push(card);
    this.removeCardFromPlayersHand(playerId, card)
    this.currentTurn = this.getOpponentId(playerId);
    this.checkIfPlayerHasWon(playerId)

    return true;
  }

  drawCard(playerId: string): Card | undefined {
    if (this.deck.length === 0) {
      const topCard = this.centerPile.pop();
      if (topCard) {
        this.deck = [...this.centerPile];
        this.centerPile = [topCard];
        this.shuffleDeck();
      }
    }
    const card = this.deck.splice(0, 1)[0];
    if (card) {
      this.hands[playerId].push(card);
    }
    return card;
  }

  pass(playerId: string) {
    if (this.currentTurn !== playerId) {
      return false
    };

    this.currentTurn = this.getOpponentId(playerId);
  }
} 