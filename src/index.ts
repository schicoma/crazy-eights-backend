import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Game } from './models/game';
import { Card, Suit } from './types/game';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    // just for test purposes
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const games: { [key: string]: Game } = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createGame', () => {
    const gameId = Math.random().toString(36).substring(2, 8);
    const game = new Game(gameId);
    game.addPlayer(socket.id);
    games[gameId] = game;

    socket.join(gameId);
    socket.join(socket.id);

    socket.emit('gameCreated', { gameId });
  });

  socket.on('joinGame', (gameId: string) => {
    const game = games[gameId];
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (game.addPlayer(socket.id)) {
      socket.join(gameId);
      socket.join(socket.id);

      game.start();

      // Send game state to the joining player
      socket.emit('gameJoined', {
        gameId,
        gameState: game.getGameStateForPlayer(socket.id)
      });

      // Notify the other player
      const opponentId = game.getOpponentId(socket.id);
      io.to(opponentId).emit('updateGameState', {
        type: 'opponentJoined',
        gameId,
        gameState: game.getGameStateForPlayer(opponentId)
      });
    } else {
      socket.emit('error', { message: 'Game is full' });
    }
  });


  socket.on('playCard', ({ gameId, card, suiteChanged }: { gameId: string, card: Card, suiteChanged?: Suit }) => {
    const game = games[gameId];
    if (game && game.playCard(socket.id, card, suiteChanged)) {
      // Update both players
      game.getPlayers().forEach(playerId => {
        io.to(playerId).emit('updateGameState', {
          type: 'cardPlayed',
          gameId,
          gameState: game.getGameStateForPlayer(playerId)
        });
      });
    }
  });

  socket.on('drawCard', (gameId: string) => {
    const game = games[gameId];
    if (!game) {
      return
    }
    const card = game.drawCard(socket.id);
    if (!card) {
      return
    }
    // Update both players
    game.getPlayers().forEach(playerId => {
      io.to(playerId).emit('updateGameState', {
        type: 'cardDrawn',
        gameId,
        gameState: game.getGameStateForPlayer(playerId)
      });
    });
  });

  socket.on('pass', (gameId: string) => {
    const game = games[gameId];
    if (!game) {
      return
    }

    game.pass(socket.id);

    // Update both players
    game.getPlayers().forEach(playerId => {
      io.to(playerId).emit('updateGameState', {
        type: 'pass',
        gameId,
        gameState: game.getGameStateForPlayer(playerId)
      });
    });
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up games where this player was participating
    Object.entries(games).forEach(([gameId, game]) => {
      if (game.getPlayers().includes(socket.id)) {
        const opponentId = game.getOpponentId(socket.id);
        if (opponentId) {
          io.to(opponentId).emit('opponentDisconnected', { gameId });
        }
        delete games[gameId];
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 