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
        { name: "Aleigha", hand: [], active: true, tokens: 3 },
        { name: "Mommy", hand: [], active: true, tokens: 3 },
        { name: "Daddy", hand: [], active: true, tokens: 3 }
    ],
    roundOver: false
};

function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = [
        {n:'A',v:1}, {n:'2',v:2}, {n:'3',v:3}, {n:'4',v:0}, {n:'5',v:5}, 
        {n:'6',v:6}, {n:'7',v:7}, {n:'8',v:8}, {n:'9',v:0}, {n:'10',v:-10}, 
        {n:'J',v:10}, {n:'Q',v:10}, {n:'K',v:99}
    ];
    let deck = [];
    for(let s of suits) for(let v of values) deck.push({display: v.n+s, value: v.v, name: v.n});
    return deck.sort(() => Math.random() - 0.5);
}

function startNewRound() {
    gameData.deck = createDeck();
    gameData.currentTotal = 0;
    gameData.roundOver = false;
    gameData.direction = 1;
    // Only deal to players who still have tokens
    gameData.players.forEach(p => {
        if (p.tokens > 0) {
            p.active = true;
            p.hand = [gameData.deck.pop(), gameData.deck.pop(), gameData.deck.pop()];
        } else {
            p.active = false;
            p.hand = [];
        }
    });
    // Ensure the first turn belongs to an active player
    while (!gameData.players[gameData.currentIndex].active) {
        gameData.currentIndex = (gameData.currentIndex + 1) % gameData.players.length;
    }
}

startNewRound();

app.get('/status', (req, res) => {
    const userName = req.query.user;
    const view = JSON.parse(JSON.stringify(gameData));
    view.players.forEach(p => { if (p.name !== userName) p.hand = ["?", "?", "?"]; });
    res.json(view);
});

app.post('/play', (req, res) => {
    const { cardIndex, userName } = req.body;
    let player = gameData.players[gameData.currentIndex];

    if (player.name !== userName || !player.active || gameData.roundOver) return res.sendStatus(403);

    const card = player.hand[cardIndex];
    let nextTotal = gameData.currentTotal;

    if (card.name === '4') gameData.direction *= -1;
    else if (card.name === 'K') nextTotal = 99;
    else nextTotal += card.value;

    // --- RULE: DO NOT EXCEED 99 ---
    if (nextTotal > 99) {
        player.tokens -= 1;
        player.active = false;
        
        const activeRemaining = gameData.players.filter(p => p.active).length;
        if (activeRemaining <= 1) {
            gameData.roundOver = true;
            // The last remaining player wins the round (they don't lose a token)
        } else {
            moveNext();
        }
    } else {
        gameData.currentTotal = nextTotal;
        player.hand[cardIndex] = gameData.deck.pop() || {display: "X", value: 0};
        moveNext();
    }
    res.json(gameData);
});

function moveNext() {
    do {
        gameData.currentIndex = (gameData.currentIndex + gameData.direction + gameData.players.length) % gameData.players.length;
    } while (!gameData.players[gameData.currentIndex].active && !gameData.roundOver);
}

app.post('/reset', (req, res) => {
    startNewRound();
    res.sendStatus(200);
});

// Full reset for a new season
app.post('/new-season', (req, res) => {
    gameData.players.forEach(p => p.tokens = 3);
    startNewRound();
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`99 Game with Tokens live on ${PORT}`));