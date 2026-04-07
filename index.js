const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    players: [], 
    deck: [],
    currentTotal: 0,
    turnIndex: 0,
    direction: 1,
    lastPlayed: null,
    gameStarted: false,
    winner: null
};

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    suits.forEach(s => values.forEach(v => deck.push({ suit: s, value: v })));
    return deck.sort(() => Math.random() - 0.5);
}

function dealNewRound() {
    gameState.deck = createDeck();
    gameState.currentTotal = 0;
    gameState.lastPlayed = null;
    gameState.players.forEach(p => {
        if (p.tokens > 0) {
            p.hand = gameState.deck.splice(0, 3);
            io.to(p.id).emit('receive_hand', p.hand);
        } else {
            p.hand = [];
            io.to(p.id).emit('receive_hand', []);
        }
    });
}

function checkWinner() {
    const activePlayers = gameState.players.filter(p => p.tokens > 0);
    if (activePlayers.length === 1) {
        gameState.winner = activePlayers[0].name;
        io.emit('game_over', { winner: gameState.winner });
    }
}

function nextTurn() {
    let attempts = 0;
    do {
        gameState.turnIndex = (gameState.turnIndex + gameState.direction + gameState.players.length) % gameState.players.length;
        attempts++;
    } while (gameState.players[gameState.turnIndex].tokens <= 0 && attempts < gameState.players.length);
}

io.on('connection', (socket) => {
    socket.on('request_player_list', () => {
        socket.emit('update_player_list', gameState.players.map(p => p.name));
    });

    socket.on('join_game', (data) => {
        let player = gameState.players.find(p => p.name === data.name);
        if (!player) {
            player = { id: socket.id, name: data.name, hand: [], tokens: 3 };
            gameState.players.push(player);
        } else {
            player.id = socket.id;
        }
        io.emit('update_player_list', gameState.players.map(p => p.name));
    });

    socket.on('start_request', () => {
        if (gameState.players.length >= 2) {
            gameState.gameStarted = true;
            gameState.winner = null;
            gameState.players.forEach(p => p.tokens = 3);
            dealNewRound();
            io.emit('game_start', gameState);
            io.emit('game_update', gameState);
        }
    });

    socket.on('play_card', (data) => {
        if (gameState.winner) return;
        const player = gameState.players.find(p => p.id === socket.id);
        if (!player || gameState.players[gameState.turnIndex].id !== socket.id) return;

        const { card, aceValue } = data;
        gameState.lastPlayed = card;

        if (card.value === '4') gameState.direction *= -1;
        else if (card.value === '10') gameState.currentTotal -= 10;
        else if (card.value === 'K') gameState.currentTotal = 99;
        else if (card.value === 'A') gameState.currentTotal += (aceValue || 1);
        else if (card.value !== '9') {
            let val = parseInt(card.value) || 10;
            gameState.currentTotal += val;
        }

        if (gameState.currentTotal > 99) {
            player.tokens -= 1;
            io.emit('player_bust', { name: player.name, tokens: player.tokens });
            
            // Advance turn before checking winner/dealing to ensure turnIndex is valid
            nextTurn();

            if (player.tokens <= 0) checkWinner();
            if (!gameState.winner) dealNewRound();
        } else {
            player.hand = player.hand.filter(c => !(c.value === card.value && c.suit === card.suit));
            if (gameState.deck.length > 0) player.hand.push(gameState.deck.shift());
            socket.emit('receive_hand', player.hand);
            nextTurn();
        }
        
        io.emit('game_update', gameState);
    });

    socket.on('play_again', () => {
        gameState.winner = null;
        gameState.players.forEach(p => p.tokens = 3);
        dealNewRound();
        io.emit('game_start', gameState);
        io.emit('game_update', gameState);
    });

    socket.on('reset_game', () => {
        gameState = { players: [], deck: [], currentTotal: 0, turnIndex: 0, direction: 1, lastPlayed: null, gameStarted: false, winner: null };
        io.emit('game_reset_complete');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`99 Server Running...`));
