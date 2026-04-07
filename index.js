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
let direction = 1; 
let gameDeck = [];

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
            currentTotal = 0;
            direction = 1;
            turnIndex = 0;
            gameDeck = createDeck();
            
            players.forEach(p => {
                p.hand = gameDeck.splice(0, 3);
                io.to(p.id).emit('receive_hand', p.hand);
            });

            io.emit('game_start', { 
                playerNames: players.map(p => p.name), 
                turn: players[turnIndex].name 
            });
        }
    });

    socket.on('play_card', (data) => {
        const { card, aceValue } = data;
        const player = players.find(p => p.id === socket.id);
        
        if (!player || players[turnIndex].id !== socket.id) return;

        // 1. Remove played card & Draw new card
        player.hand = player.hand.filter(c => !(c.value === card.value && c.suit === card.suit));
        if (gameDeck.length > 0) {
            player.hand.push(gameDeck.shift());
        }
        socket.emit('receive_hand', player.hand);

        // 2. 99 Rules Logic
        if (card.value === '4') {
            direction *= -1;
        } else if (card.value === '9') {
            // Stay/Pass (0)
        } else if (card.value === '10') {
            currentTotal -= 10;
        } else if (card.value === 'K') {
            currentTotal = 99;
        } else if (card.value === 'A') {
            currentTotal += (aceValue === 11 ? 11 : 1);
        } else {
            let val = parseInt(card.value) || 10;
            currentTotal += val;
        }

        if (currentTotal < 0) currentTotal = 0;

        // 3. Update Turn
        turnIndex = (turnIndex + direction + players.length) % players.length;
        
        io.emit('game_update', { 
            total: currentTotal, 
            nextTurn: players[turnIndex].name,
            lastPlayed: card,
            deckRemaining: gameDeck.length
        });
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('update_player_list', players.map(p => p.name));
        if (players.length === 0) gameStarted = false;
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));