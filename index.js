const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    players: [], // { id: '', name: '', hand: [], tokens: 3 }
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
    // --- JOIN / REJOIN LOGIC ---
    socket.on('join_game', (data) => {
        let player = gameState.players.find(p => p.name === data.name);
        
        if (!player) {
            // New player joining for the first time
            player = { id: socket.id, name: data.name, hand: [], tokens: 3 };
            gameState.players.push(player);
        } else {
            // Player refreshing their browser - update their socket ID
            player.id = socket.id;
        }

        // Inform everyone of the updated lobby
        io.emit('update_player_list', gameState.players.map(p => p.name));
        
        // If they refreshed mid-game, send them back into the action
        if (gameState.gameStarted) {
            socket.emit('game_start', gameState);
            socket.emit('receive_hand', player.hand);
            io.emit('game_update', gameState);
        }
    });

    // --- START GAME LOGIC ---
    socket.on('start_request', () => {
        if (gameState.players.length >= 2) {
            gameState.gameStarted = true;
            gameState.currentTotal = 0;
            gameState.deck = createDeck();
            
            // Deal 3 cards to each player
            gameState.players.forEach(p => {
                p.hand = gameState.deck.splice(0, 3);
                io.to(p.id).emit('receive_hand', p.hand);
            });
            
            io.emit('game_start', gameState);
            io.emit('game_update', gameState);
        }
    });

    // --- PLAY CARD LOGIC ---
    socket.on('play_card', (data) => {
        const player = gameState.players.find(p => p.id === socket.id);
        
        // Security check: only allow play if it's actually their turn
        if (!player || gameState.players[gameState.turnIndex].id !== socket.id) return;

        const { card, aceValue } = data;
        gameState.lastPlayed = card;

        // 99 Rules Application
        if (card.
