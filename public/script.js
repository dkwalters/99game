const socket = io();

// UI Elements
const lobbyContainer = document.getElementById('lobby-container');
const setupScreen = document.getElementById('setup-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const playerListUI = document.getElementById('player-list');
const startBtn = document.getElementById('start-btn');
const gameBoard = document.getElementById('game-board');
const nameInput = document.getElementById('name-input');
const playerHandUI = document.getElementById('player-hand');

let myName = "";

// --- LOBBY LOGIC ---

// 1. Join the server
document.getElementById('join-btn').onclick = () => {
    myName = nameInput.value.trim();
    if (myName) {
        socket.emit('join_game', { name: myName });
        setupScreen.style.display = 'none';
        lobbyScreen.style.display = 'block';
    } else {
        alert("Please enter a name first.");
    }
};

// 2. Update the list of players in the lobby
socket.on('update_player_list', (names) => {
    playerListUI.innerHTML = '';
    names.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        // Highlight your own name in the list
        if (name === myName) li.style.color = '#2e7d32'; 
        playerListUI.appendChild(li);
    });

    // Enable Start button only if 2-4 players are present
    startBtn.disabled = (names.length < 2 || names.length > 4);
    
    const statusMsg = document.getElementById('status-msg');
    statusMsg.textContent = names.length < 2 ? "Waiting for more players..." : "Ready to start!";
});

// 3. Request to start the game
startBtn.onclick = () => {
    socket.emit('start_request');
};

// --- GAMEPLAY LOGIC ---

// 4. Transition from Lobby to Game
socket.on('game_start', (data) => {
    console.log("Game starting with players:", data.playerNames);
    
    // Hide Lobby, Show Board
    lobbyContainer.style.display = 'none';
    gameBoard.style.display = 'block';
    
    document.getElementById('local-player-name').textContent = `${myName}'s Hand`;
    
    // Initialize the board based on the number of players
    setupGameBoard(data.playerNames);
});

// 5. Setup the visual board
function setupGameBoard(names) {
    const opponentArea = document.getElementById('opponent-area');
    opponentArea.innerHTML = ''; // Clear previous

    // Filter out yourself to find your opponents
    const opponents = names.filter(n => n !== myName);

    opponents.forEach(oppName => {
        const div = document.createElement('div');
        div.className = 'opponent-slot';
        div.innerHTML = `<strong>${oppName}</strong><div class="card-back-count">Waiting...</div>`;
        opponentArea.appendChild(div);
    });
}

// 6. Handle errors (Lobby full, etc.)
socket.on('error_message', (msg) => {
    alert(msg);
});