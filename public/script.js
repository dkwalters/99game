const socket = io();
let myName = "";
let isMyTurn = false;

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

socket.on('receive_hand', (hand) => {
    renderHand(hand);
});

socket.on('game_start', (data) => {
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-board').style.display = 'block';
    updateTurn(data.turn);
});

function renderHand(hand) {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = '';
    hand.forEach(card => {
        const div = document.createElement('div');
        div.className = `card ${['Hearts','Diamonds'].includes(card.suit) ? 'red' : ''}`;
        div.innerHTML = `${card.value}<br><small>${card.suit[0]}</small>`;
        
        div.onclick = () => {
            if (!isMyTurn) {
                alert("It's not your turn!");
                return;
            }
            let aceValue = 1;
            if (card.value === 'A') {
                aceValue = confirm("Play Ace as 11? (Cancel for 1)") ? 11 : 1;
            }
            socket.emit('play_card', { card, aceValue });
        };
        handDiv.appendChild(div);
    });
}

socket.on('game_update', (data) => {
    const totalDisplay = document.getElementById('total-display');
    totalDisplay.innerText = data.total;
    
    if (data.total >= 90) {
        totalDisplay.classList.add('danger');
    } else {
        totalDisplay.classList.remove('danger');
    }

    updateTurn(data.nextTurn);
});

function updateTurn(name) {
    isMyTurn = (name === myName);
    const indicator = document.getElementById('turn-indicator');
    if (isMyTurn) {
        indicator.innerText = "⭐ YOUR TURN ⭐";
        indicator.style.color = "#ffd700";
    } else {
        indicator.innerText = `${name}'s Turn`;
        indicator.style.color = "white";
    }
}