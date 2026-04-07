const socket = io();
let myName = localStorage.getItem('99_player_name') || "";
const bustSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

if (myName) {
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

function join(selectedName) {
    myName = selectedName;
    localStorage.setItem('99_player_name', myName);
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

function start() { socket.emit('start_request'); }

function triggerReset() {
    if (confirm("Reset all tokens and the 99 total? This starts a brand new game.")) {
        socket.emit('reset_game');
    }
}

socket.on('update_player_list', (names) => {
    const list = document.getElementById('player-list');
    list.innerHTML = names.map(n => `<li>${n} ${n === myName ? '(You)' : ''}</li>`).join('');
    const btn = document.getElementById('start-btn');
    if (btn) btn.disabled = names.length < 2;
});

socket.on('game_start', () => {
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
});

socket.on('player_bust', (data) => {
    bustSound.play();
    alert(`${data.name} BUSTED!`);
});

socket.on('game_reset_complete', () => {
    document.getElementById('game-board').style.display = 'none';
    document.getElementById('lobby-container').style.display = 'block';
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
        <div class="player-card ${idx === state.turnIndex ? 'active-turn' : ''}">
            <div class="p-name">${p.name}</div>
            <div class="p-tokens">${'🟡'.repeat(p.tokens)}</div>
        </div>
    `).join('');

    window.isMyTurn = (state.players[state.turnIndex].name === myName);
    document.getElementById('turn-indicator').innerText = window.isMyTurn ? "⭐ YOUR TURN ⭐" : `${state.players[state.turnIndex].name}'s Turn`;
}

function playCard(value, suit) {
    if (!window.isMyTurn) return;
    let aceValue = (value === 'A') ? (confirm("Use Ace as 11?") ? 11 : 1) : 1;
    socket.emit('play_card', { card: {value, suit}, aceValue });
}
