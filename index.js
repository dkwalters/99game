const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let players = []; // Stores { id: socket.id, name: "PlayerName" }
let gameStarted = false;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. Handle player joining with a name
    socket.on('join_game', (data) => {
        if (gameStarted) {
            socket.emit('error_message', 'Game already in progress.');
            return;
        }

        if (players.length >= 4) {
            socket.emit('error_message', 'Lobby is full.');
            return;
        }

        // Add player to the list
        players.push({ id: socket.id, name: data.name });
        
        // Broadcast updated player list to everyone in the lobby
        io.emit('update_player_list', players.map(p => p.name));
    });

    // 2. Handle the Start Game trigger
    socket.on('start_request', () => {
        if (players.length >= 2 && players.length <= 4) {
            gameStarted = true;
            
            // Send the start signal along with the final player list
            // This lets the client know how many hands to render
            io.emit('game_start', {
                playerCount: players.length,
                playerNames: players.map(p => p.name)
            });

            console.log(`Game started with ${players.length} players.`);
        } else {
            socket.emit('error_message', 'Need 2-4 players to start.');
        }
    });

    // 3. Handle Disconnects
    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('update_player_list', players.map(p => p.name));
        
        if (players.length === 0) {
            gameStarted = false; // Reset if everyone leaves
        }
    });
});

http.listen(3000, () => {
    console.log('Server listening on port 3000');
});