const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = []; 
let gameStarted = false;
let currentTotal = 0;
let turnIndex = 0;
let direction = 1; // 1 = Forward, -1 = Reverse

function createDeck() {
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    suits.forEach(s => values.forEach(v => deck.push({ suit: s, value: v })));
    return deck.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
    socket.on('join_game', (data) => {
        if (!gameStarted && players.length < 4) {
            players.push({ id: socket.id, name: data.name, hand: [] });
            io.emit('update_player_list', players.map(p => p.name));
        }
    });

    socket.on('start_request', () => {
        if (players.length >= 2) {
            gameStarted = true;
            let deck = createDeck();
            players.forEach(p => p.hand = deck.splice(0, 3));
            io.emit('game_start', { players, turn: players[turnIndex].name });
        }
    });

    socket.on('play_card', (card) => {
        // "99" Specific Logic
        if (card.value === '4') {
            direction *= -1; 
        } else if (card.value === '10') {
            currentTotal -= 10;
        } else if (card.value === 'K') {
            currentTotal = 99;
        } else {
            let val = parseInt(card.value) || (['J','Q'].includes(card.value) ? 10 : 11);
            currentTotal += val;
        }

        // Clamp total so it doesn't go below 0
        if (currentTotal < 0) currentTotal = 0;

        // Move Turn
        turnIndex = (turnIndex + direction + players.length) % players.length;
        
        io.emit('game_update', { 
            total: currentTotal, 
            nextTurn: players[turnIndex].name,
            lastPlayed: card 
        });
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('update_player_list', players.map(p => p.name));
        if (players.length === 0) { 
            gameStarted = false; 
            currentTotal = 0; 
            direction = 1;
            turnIndex = 0;
        }
    });
});

http.listen(3001, () => console.log('Server running on http://localhost:3000'));