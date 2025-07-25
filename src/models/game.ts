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
  private currentDrawPenalty: number = 0

  constructor(id: string);
  constructor(id: string, players: string[], hands: { [key: string]: Card[] }, centerPile: Card[], currentTurn: string);

  constructor(id: string, players?: string[], hands?: { [key: string]: Card[] }, centerPile?: Card[], currentTurn?: string) {
    this.id = id;
    this.players = players || [];
    this.deck = [];
    this.hands = hands || {};
    this.centerPile = centerPile || [];
    this.currentTurn = currentTurn || null;
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

    // this.deck.unshift({ value: Value.KING, suit: Suit.SPADES })
    // this.deck.unshift({ value: Value.KING, suit: Suit.CLUBS })
    // this.deck.splice(8, 0, { value: Value.KING, suit: Suit.HEARTS })
    // this.deck.splice(8, 0, { value: Value.KING, suit: Suit.DIAMONDS })
  }

  private resetCenterPile(): void {
    const topCard = this.centerPile.pop();
    if (topCard) {
      this.deck = [...this.centerPile];
      this.centerPile = [topCard];
      this.shuffleDeck();
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

  private checkIfPlayerHasWon(playerId: string, card?: Card) {
    if (card?.value === Value.KING) {
      // if the other player does not have another KING, the player with the KING wins

      const opponentHand = this.hands[this.getOpponentId(playerId)]
      if (opponentHand.filter((card) => card.value === Value.KING).length === 0 && !this.hands[playerId].length) {
        this.status = 'finished'
      }

      return
    }

    if (!this.hands[playerId].length) {
      this.status = 'finished'
    }
  }

  getGameStateForPlayer(playerId: string): GameState {
    return {
      yourHand: this.hands[playerId],
      topCard: this.centerPile[this.centerPile.length - 1],
      isMyTurn: this.currentTurn === playerId,
      opponentCardCount: this.hands[this.getOpponentId(playerId)].length,
      suiteChanged: this.suiteChanged,
      status: this.status,
      currentDrawPenalty: this.currentDrawPenalty
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

    if (this.currentDrawPenalty) {
      if (card.value === Value.KING) {
        this.centerPile.push(card);
        this.removeCardFromPlayersHand(playerId, card)
        this.currentTurn = this.getOpponentId(playerId);

        this.currentDrawPenalty += 3

        return true
      }

      return false
    }

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
      this.checkIfPlayerHasWon(playerId, card)

      this.currentDrawPenalty += 3

      return true
    }

    this.centerPile.push(card);
    this.removeCardFromPlayersHand(playerId, card)
    this.currentTurn = this.getOpponentId(playerId);
    this.checkIfPlayerHasWon(playerId)

    return true;

  }

  drawCard(playerId: string): Card[] {
    if (this.deck.length === 0) {
      this.resetCenterPile()
    }

    if (this.currentDrawPenalty) {
      return this.drawPenaltyCards(playerId)
    }

    const card = this.deck.splice(0, 1)[0];
    if (card) {
      this.hands[playerId].push(card);
    }
    return [card];
  }

  drawPenaltyCards(playerId: string): Card[] {
    const remainingCards = this.deck.length - this.currentDrawPenalty

    let penalty = this.deck.splice(0, Math.min(this.deck.length, this.currentDrawPenalty))

    if (remainingCards < 0) {
      this.resetCenterPile()

      penalty = [...penalty, ...this.deck.splice(0, remainingCards)]
    }

    this.hands[playerId].push(...penalty)
    this.currentDrawPenalty = 0

    return penalty
  }

  pass(playerId: string) {
    if (this.currentTurn !== playerId) {
      return false
    };

    this.currentTurn = this.getOpponentId(playerId);
  }

  printLogs() {
    console.log({
      centerPileLimit9: this.centerPile.length > 9 ? this.centerPile.slice(Math.max(this.centerPile.length - 9, 1)) : this.centerPile,
      centerPileCount: this.centerPile.length,
      hands: this.hands,
      deckCount: this.deck.length,
      deckLimit9: this.deck.length > 9 ? this.deck.slice(0, 9) : this.deck,
    })
  }
} 