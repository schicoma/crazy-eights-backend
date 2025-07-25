import { Value } from '../types/game';
import { Suit } from '../types/game';
import { Game } from './game';

const gameId = '123';

describe('Last Card', () => {
	it('player should win if they have a King, and the opponent does not', () => {
		const lastCardKingOfPlayer1 = { suit: Suit.HEARTS, value: Value.KING }
		const game = new Game(gameId, ['player1', 'player2'], {
			player1: [lastCardKingOfPlayer1],
			player2: [{ suit: Suit.DIAMONDS, value: Value.QUEEN }],
		}, [{ suit: Suit.HEARTS, value: Value.THREE }], 'player1');

		game.playCard('player1', lastCardKingOfPlayer1);

		expect(game.getGameStateForPlayer('player1')).toEqual({
			"currentDrawPenalty": 3,
			"isMyTurn": false,
			"opponentCardCount": 1,
			"status": "finished",
			"topCard": {
				"suit": Suit.HEARTS,
				"value": Value.KING,
			},
			"yourHand": [],
		});
	});

	it('player should NOT win if they have a King, and the opponent has a King', () => {
		const lastCardKingOfPlayer1 = { suit: Suit.HEARTS, value: Value.KING }
		const game = new Game(gameId, ['player1', 'player2'], {
			player1: [lastCardKingOfPlayer1],
			player2: [{ suit: Suit.DIAMONDS, value: Value.KING }, { suit: Suit.SPADES, value: Value.QUEEN }],
		}, [{ suit: Suit.HEARTS, value: Value.THREE }], 'player1');

		game.playCard('player1', lastCardKingOfPlayer1);

		expect(game.getGameStateForPlayer('player1')).toEqual({
			"currentDrawPenalty": 3,
			"isMyTurn": false,
			"opponentCardCount": 2,
			"status": "waiting",
			"topCard": {
				"suit": Suit.HEARTS,
				"value": Value.KING,
			},
			"yourHand": [],
		});
	});
});

describe('Non Last card', () => {
	it('Punishment to the opponent', () => {
		const cardPlayedKing = { suit: Suit.HEARTS, value: Value.KING }
		const game = new Game(gameId, ['player1', 'player2'], {
			player1: [{ suit: Suit.HEARTS, value: Value.SEVEN }, cardPlayedKing],
			player2: [{ suit: Suit.DIAMONDS, value: Value.QUEEN }],
		}, [{ suit: Suit.HEARTS, value: Value.THREE }], 'player1');

		game.playCard('player1', cardPlayedKing);

		expect(game.getGameStateForPlayer('player1')).toEqual({
			"currentDrawPenalty": 3,
			"isMyTurn": false,
			"opponentCardCount": 1,
			"status": "waiting",
			"topCard": {
				"suit": Suit.HEARTS,
				"value": Value.KING,
			},
			"yourHand": [{ suit: Suit.HEARTS, value: Value.SEVEN }],
		});
	});


});