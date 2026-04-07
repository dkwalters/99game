const socket = io();
let myName = localStorage.getItem('99_player_name') || "";
const bustSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

socket.on('connect', () => {
    socket.emit('request_player_list');
    if (myName) socket.emit('join_game', { name: myName });
});

function join(selectedName) {
    myName = selectedName;
    localStorage.setItem('99_player_name', myName);
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

function start() { socket.emit('start_request'); }

function triggerReset() {
    if (confirm("Reset everything and return to lobby?")) socket.emit('reset_game');
}

socket.on('update_player_list', (names) => {
    const list = document.getElementById('player-list');
    if (list) list.innerHTML = names.map(n => `<li>${n} ${n === myName ? '(You)' : ''}</li>`).join('');
    const btn = document.getElementById('start-btn');
    if (btn) btn.disabled = (names.length < 2);
});

socket.on('game_start', () => {
    document.getElementById('win-overlay').style.display = 'none';
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
});

socket.on('game_over', (data) => {
    const overlay = document.getElementById('win-overlay');
    document.getElementById('winner-name').innerText = `${data.winner} WINS!`;
    overlay.style.display = 'flex';
});

socket.on('player_bust', (data) => {
    bustSound.play();
    alert(`${data.name} BUSTED!`);
});

socket.on('game_reset_complete', () => {
    localStorage.removeItem('99_player_name');
    window.location.reload();
});

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

function renderGame(state) {
    const totalDiv = document.getElementById('total-display');
    totalDiv.innerText = state.currentTotal;
    totalDiv.className = state.currentTotal >= 90 ? 'danger' : '';
    
    if (state.lastPlayed) {
        const lastCardDiv = document.getElementById('last-card-visual');
        lastCardDiv.className = `mini-card ${['♥','♦'].includes(state.lastPlayed.suit) ? 'red' : ''}`;
        lastCardDiv.innerHTML = `<div>${state.lastPlayed.value}</div><div>${state.lastPlayed.suit}</div>`;
    }

    const opArea = document.getElementById('opponent-area');
    opArea.innerHTML = state.players.map((p, idx) => `
        <div class="player-card ${idx === state.turnIndex ? 'active-turn' : ''} ${p.tokens <= 0 ? 'eliminated' : ''}">
            <div class="p-name">${p.name}</div>
            <div class="p-tokens">${p.tokens > 0 ? '🟡'.repeat(p.tokens) : '❌ OUT'}</div>
        </div>
    `).join('');

    window.isMyTurn = (state.players[state.turnIndex].name === myName && state.players[state.turnIndex].tokens > 0);
    const indicator = document.getElementById('turn-indicator');
    if (state.winner) {
        indicator.innerText = "GAME OVER";
    } else if (window.isMyTurn) {
        indicator.innerText = "⭐ YOUR TURN ⭐";
        indicator.style.color = "#ffd700";
    } else {
        indicator.innerText = `${state.players[state.turnIndex].name}'s Turn`;
        indicator.style.color = "white";
    }
}

function playCard(value, suit) {
    if (!window.isMyTurn) return;
    let aceValue = (value === 'A') ? (confirm("Use Ace as 11?") ? 11 : 1) : 1;
    socket.emit('play_card', { card: {value, suit}, aceValue });
}

function playAgain() { socket.emit('play_again'); }
function exitToLobby() { socket.emit('reset_game'); }
