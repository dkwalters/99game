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
    gameStarted: false
};

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    suits.forEach(s => values.forEach(v => deck.push({ suit: s, value: v })));
    return deck.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
    socket.on('rejoin_game', (savedName) => {
        const player = gameState.players.find(p => p.name === savedName);
        if (player) {
            player.id = socket.id; 
            socket.emit('receive_hand', player.hand);
            if (gameState.gameStarted) socket.emit('game_start', gameState);
            io.emit('update_player_list', gameState.players.map(p => p.name));
            io.emit('game_update', gameState);
        }
    });

    socket.on('join_game', (data) => {
        const existing = gameState.players.find(p => p.name === data.name);
        if (!gameState.gameStarted && !existing && gameState.players.length < 4) {
            gameState.players.push({ id: socket.id, name: data.name, hand: [], tokens: 3 });
        }
        io.emit('update_player_list', gameState.players.map(p => p.name));
    });

    socket.on('start_request', () => {
        if (gameState.players.length >= 2) {
            gameState.gameStarted = true;
            gameState.currentTotal = 0;
            gameState.deck = createDeck();
            gameState.players.forEach(p => {
                p.hand = gameState.deck.splice(0, 3);
                io.to(p.id).emit('receive_hand', p.hand);
            });
            io.emit('game_start', gameState);
        }
    });

    socket.on('play_card', (data) => {
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
            gameState.currentTotal = 0;
            io.emit('player_bust', { name: player.name, tokens: player.tokens });
        }

        player.hand = player.hand.filter(c => !(c.value === card.value && c.suit === card.suit));
        if (gameState.deck.length > 0) player.hand.push(gameState.deck.shift());
        socket.emit('receive_hand', player.hand);

        gameState.turnIndex = (gameState.turnIndex + gameState.direction + gameState.players.length) % gameState.players.length;
        io.emit('game_update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server Live on ${PORT}`));
