const socket = io();

const lobbyContainer = document.getElementById('lobby-container');
const setupScreen = document.getElementById('setup-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const playerListUI = document.getElementById('player-list');
const startBtn = document.getElementById('start-btn');
const gameBoard = document.getElementById('game-board');

// 1. Join the game
document.getElementById('join-btn').onclick = () => {
    const name = document.getElementById('name-input').value.trim();
    if (name) {
        socket.emit('join_game', { name: name });
        setupScreen.style.display = 'none';
        lobbyScreen.style.display = 'block';
    } else {
        alert("Please enter a name!");
    }
};

// 2. Listen for player list updates
socket.on('update_player_list', (names) => {
    playerListUI.innerHTML = '';
    names.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        playerListUI.appendChild(li);
    });

    // Enable start button if 2-4 players are present
    startBtn.disabled = (names.length < 2 || names.length > 4);
});

// 3. Request game start
startBtn.onclick = () => {
    socket.emit('start_request');
};

// 4. Handle game start signal
socket.on('game_start', (data) => {
    console.log("Starting game with:", data.playerNames);
    lobbyContainer.style.display = 'none';
    gameBoard.style.display = 'block';
    
    // Initialize your game logic here using data.playerCount
    // initGame(data.playerCount);
});

// Error handling
socket.on('error_message', (msg) => {
    alert(msg);
});