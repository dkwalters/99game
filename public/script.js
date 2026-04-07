const socket = io();
let myName = "";

function join() {
    myName = document.getElementById('name-input').value.trim();
    if(myName) {
        socket.emit('join_game', { name: myName });
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('lobby-screen').style.display = 'block';
    }
}

function start() { socket.emit('start_request'); }

socket.on('update_player_list', (names) => {
    const list = document.getElementById('player-list');
    list.innerHTML = names.map(n => `<li>${n}</li>`).join('');
    document.getElementById('start-btn').disabled = names.length < 2;
});

socket.on('game_start', (data) => {
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
    
    const me = data.players.find(p => p.id === socket.id);
    renderHand(me.hand);
    updateTurn(data.turn);

    const others = data.players.filter(p => p.id !== socket.id);
    document.getElementById('opponent-area').innerHTML = others.map(o => 
        `<div class="opponent-slot"><b>${o.name}</b><br>3 Cards</div>`).join('');
});

function renderHand(hand) {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = '';
    hand.forEach(card => {
        const div = document.createElement('div');
        div.className = `card ${['Hearts','Diamonds'].includes(card.suit) ? 'red' : ''}`;
        div.innerHTML = card.value;
        div.onclick = () => {
            socket.emit('play_card', card);
            // Optimization: Hide card immediately for responsiveness
            div.style.visibility = 'hidden'; 
        };
        handDiv.appendChild(div);
    });
}

socket.on('game_update', (data) => {
    const totalDisplay = document.getElementById('total-display');
    totalDisplay.innerText = data.total;
    
    // Red Flash Alert Logic
    if (data.total >= 90) {
        totalDisplay.classList.add('danger');
    } else {
        totalDisplay.classList.remove('danger');
    }

    updateTurn(data.nextTurn);
});

function updateTurn(name) {
    const indicator = document.getElementById('turn-indicator');
    if (name === myName) {
        indicator.innerText = "⭐ YOUR TURN ⭐";
        indicator.style.color = "#ffd700";
    } else {
        indicator.innerText = `${name}'s Turn`;
        indicator.style.color = "white";
    }
}