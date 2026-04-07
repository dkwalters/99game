const socket = io();
let myName = localStorage.getItem('99_name') || "";

if (myName) {
    socket.emit('rejoin_game', myName);
}

function join() {
    myName = document.getElementById('name-input').value;
    localStorage.setItem('99_name', myName);
    socket.emit('join_game', { name: myName });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'block';
}

socket.on('game_update', (state) => {
    // 1. Update Total
    const display = document.getElementById('total-display');
    display.innerText = state.currentTotal;
    display.style.color = state.currentTotal >= 90 ? '#ff4444' : 'white';

    // 2. Update Last Card
    if (state.lastPlayed) {
        document.getElementById('last-card-val').innerText = `${state.lastPlayed.value} ${state.lastPlayed.suit}`;
    }

    // 3. Update Players & Tokens
    const opArea = document.getElementById('opponent-area');
    opArea.innerHTML = state.players.map((p, idx) => `
        <div class="player-card ${idx === state.turnIndex ? 'active-turn' : ''}">
            <b>${p.name}</b><br>
            Tokens: ${'🟡'.repeat(p.tokens)}
        </div>
    `).join('');

    window.isMyTurn = state.players[state.turnIndex].name === myName;
});

socket.on('receive_hand', (hand) => {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = hand.map(card => `
        <div class="card ${['♥','♦'].includes(card.suit) ? 'red' : ''}" onclick="playCard('${card.value}', '${card.suit}')">
            <div>${card.value}</div>
            <div class="card-suit">${card.suit}</div>
            <div style="transform: rotate(180deg)">${card.value}</div>
        </div>
    `).join('');
});

function playCard(value, suit) {
    if (!window.isMyTurn) return alert("Not your turn!");
    let aceValue = (value === 'A') ? (confirm("Use Ace as 11?") ? 11 : 1) : 1;
    socket.emit('play_card', { card: {value, suit}, aceValue });
}
