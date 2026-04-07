const socket = io();
let myName = localStorage.getItem('99_player_name') || "";

if (myName) {
    socket.emit('rejoin_game', myName);
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

function join(nameFromBtn) {
    myName = nameFromBtn || document.getElementById('name-input').value;
    if (!myName) return;
    localStorage.setItem('99_player_name', myName);
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

function start() { socket.emit('start_request'); }

socket.on('update_player_list', (names) => {
    const list = document.getElementById('player-list');
    list.innerHTML = names.map(n => `<li>${n} ${n === myName ? '(You)' : ''}</li>`).join('');
    document.getElementById('start-btn').disabled = names.length < 2;
});

socket.on('game_start', (state) => {
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
    renderGame(state);
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
    document.getElementById('total-display').innerText = state.currentTotal;
    document.getElementById('total-display').className = state.currentTotal >= 90 ? 'danger' : '';
    
    if (state.lastPlayed) {
        document.getElementById('last-card-val').innerText = `${state.lastPlayed.value}${state.lastPlayed.suit}`;
    }

    const opArea = document.getElementById('opponent-area');
    opArea.innerHTML = state.players.map((p, idx) => `
        <div class="player-card ${idx === state.turnIndex ? 'active-turn' : ''}">
            <div class="p-name">${p.name}</div>
            <div class="p-tokens">${'🟡'.repeat(p.tokens)}</div>
        </div>
    `).join('');

    window.isMyTurn = state.players[state.turnIndex].name === myName;
    document.getElementById('turn-indicator').innerText = window.isMyTurn ? "YOUR TURN" : `${state.players[state.turnIndex].name}'s Turn`;
}

function playCard(value, suit) {
    if (!window.isMyTurn) return;
    let aceValue = (value === 'A') ? (confirm("Use Ace as 11?") ? 11 : 1) : 1;
    socket.emit('play_card', { card: {value, suit}, aceValue });
}
