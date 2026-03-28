const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let gameData = {
    currentTotal: 0,
    currentIndex: 0,
    direction: 1,
    deck: [],
    players: [
        { name: "Aleigha", hand: [], active: true },
        { name: "Mommy", hand: [], active: true },
        { name: "Daddy", hand: [], active: true }
    ],
    gameOver: false
};

function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = [
        { n: 'A', v: 1 }, { n: '2', v: 2 }, { n: '3', v: 3 }, { n: '4', v: 0 },
        { n: '5', v: 5 }, { n: '6', v: 6 }, { n: '7', v: 7 }, { n: '8', v: 8 },
        { n: '9', v: 0 }, { n: '10', v: -10 }, { n: 'J', v: 10 }, { n: 'Q', v: 10 }, { n: 'K', v: 99 }
    ];
    let deck = [];
    for (let s of suits) {
        for (let v of values) deck.push({ display: v.n + s, value: v.v, name: v.n });
    }
    return deck.sort(() => Math.random() - 0.5);
}

function startNewRound() {
    gameData.deck = createDeck();
    gameData.currentTotal = 0;
    gameData.gameOver = false;
    gameData.players.forEach(p => {
        p.active = true;
        p.hand = [gameData.deck.pop(), gameData.deck.pop(), game Flea.deck.pop()];
    });
}
startNewRound();

// Modified status: It now takes a ?user=Name parameter
app.get('/status', (req, res) => {
    const userName = req.query.user;
    const playerView = JSON.parse(JSON.stringify(gameData));
    
    // Privacy Logic: Hide other players' hands
    playerView.players.forEach(p => {
        if (p.name !== userName) p.hand = ["?", "?", "?"]; 
    });
    
    res.json(playerView);
});

app.post('/play', (req, res) => {
    const { cardIndex, userName } = req.body;
    let player = gameData.players[gameData.currentIndex];

    // Security: Only the current player can play
    if (player.name !== userName || !player.active || gameData.gameOver) return res.status(403).send();

    const card = player.hand[index];
    if (card.name === '4') gameData.direction *= -1;
    else if (card.name === 'K') gameData.currentTotal = 99;
    else gameData.currentTotal += card.value;

    if (gameData.currentTotal > 99) {
        player.active = false;
        const activeCount = gameData.players.filter(p => p.active).length;
        if (activeCount <= 1) gameData.gameOver = true;
        else moveToNext();
    } else {
        player.hand[cardIndex] = gameData.deck.pop() || { display: "X", value: 0 };
        moveToNext();
    }
    res.json(gameData);
});

function moveToNext() {
    do {
        gameData.currentIndex = (gameData.currentIndex + gameData.direction + gameData.players.length) % gameData.players.length;
    } while (!gameData.players[gameData.currentIndex].active && !gameData.gameOver);
}

app.post('/reset', (req, res) => { startNewRound(); res.json(gameData); });
app.listen(PORT, () => console.log(`Server live on ${PORT}`));