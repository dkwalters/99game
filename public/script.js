const socket = io();
let myName = localStorage.getItem('99_player_name') || "";
const bustSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

// AUTO-REJOIN LOGIC
if (myName) {
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

// JOINING THE GAME
function join(selectedName) {
    myName = selectedName;
    localStorage.setItem('99_player_name', myName);
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

function start() {
    socket.emit('start_request');
}

// THE NUCLEAR RESET
function triggerReset() {
    if (confirm("WARNING: This clears ALL players, resets all tokens, and wipes the season memory. Everyone will have to rejoin. Proceed?")) {
        socket.emit('reset_game');
    }
}

// LOBBY UPDATES
socket.on('update_player_list', (names) => {
    const list = document.getElementById('player-list');
    list.innerHTML = names.map(n => `<li>${n} ${n === myName ? '(You)' : ''}</li>`).join('');
    
    const btn = document.getElementById('start-btn');
    if (btn) btn.disabled = (names.length < 2);
});

// GAME TRANSITIONS
socket.on('game_start', () => {
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
});

socket.on('player_bust', (data) => {
    bustSound.play();
    alert(`${data.name} BUSTED!`);
});

// HANDLING THE HARD RESET
socket.on('game_reset_complete', () => {
    localStorage.removeItem('99_player_name'); // Clear browser memory
    window.location.reload(); // Refresh to start-over screen
});

// HAND UPDATES
socket.on('receive_hand', (hand) => {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = hand.map(card => `
        <div class="card ${['♥','♦'].includes(card.suit) ? 'red' : ''}" onclick="playCard('${card.value}', '${card.suit}')">
            <div class="card-corner top">${card.value}</div>
            <div class="card-suit">${card.suit}</div>
            <div class="card-corner bottom">${card.value}</div>
        </div>
    `).join('');
});

socket.on('game_update', renderGame);

// CORE RENDER LOGIC
function renderGame(state) {
    const totalDiv = document.getElementById('total-display');
    totalDiv.innerText = state.currentTotal;
    totalDiv.className = state.currentTotal >= 90 ? 'danger' : '';
    
    // Update Mini Card in top-left
    if (state.lastPlayed) {
        const lastCardDiv = document.getElementById('last-card-visual');
        lastCardDiv.className = `mini-card ${['♥','♦'].includes(state.lastPlayed.suit) ? 'red' : ''}`;
        lastCardDiv.innerHTML = `<div>${state.lastPlayed.value}</div><div>${state.lastPlayed.suit}</div>`;
    }

    // Update Opponent/Family area
    const opArea = document.getElementById('opponent-area');
    opArea.innerHTML = state.players.map((p, idx) => `
        <div class="player-card ${idx === state.turnIndex ? 'active-turn' : ''}">
            <div class="p-name">${p.name}</div>
            <div class="p-tokens">${'🟡'.repeat(p.tokens)}</div>
        </div>
    `).join('');

    // Turn Logic
    window.isMyTurn = (state.players[state.turnIndex].name === myName);
    const indicator = document.getElementById('turn-indicator');
    if (window.isMyTurn) {
        indicator.innerText = "⭐ YOUR TURN ⭐";
        indicator.style.color = "#ffd700";
    } else {
        indicator.innerText = `${state.players[state.turnIndex].name}'s Turn`;
        indicator.style.color = "white";
    }
}

// PLAYING A CARD
function playCard(value, suit) {
    if (!window.isMyTurn) return;
    
    let aceValue = 1;
    if (value === 'A') {
        aceValue = confirm("Use Ace as 11?") ? 11 : 1;
    }
    
    socket.emit('play_card', { card: {value, suit}, aceValue });
}
