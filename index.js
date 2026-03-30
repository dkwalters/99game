const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// --- GAME STATE ---
let gameData = {
    currentTotal: 0,
    currentIndex: 0,
    direction: 1,
    deck: [],
    lastCard: null,
    players: [
        { name: "Aleigha", hand: [], active: true, tokens: 3 },
        { name: "Mommy", hand: [], active: true, tokens: 3 },
        { name: "Daddy", hand: [], active: true, tokens: 3 }
    ],
    roundOver: false
};

// Standard Fisher-Yates Shuffle for maximum randomness
function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = [
        {n:'A', v:1}, {n:'2', v:2}, {n:'3', v:3}, {n:'4', v:0}, {n:'5', v:5}, 
        {n:'6', v:6}, {n:'7', v:7}, {n:'8', v:8}, {n:'9', v:0}, {n:'10', v:-10}, 
        {n:'J', v:10}, {n:'Q', v:10}, {n:'K', v:99}
    ];
    let deck = [];
    for(let s of suits) {
        for(let v of values) {
            deck.push({display: v.n + s, value: v.v, name: v.n, suit: s});
        }
    }
    // Shuffle logic
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function startNewRound() {
    gameData.deck = createDeck();
    gameData.currentTotal = 0;
    gameData.roundOver = false;
    gameData.direction = 1;
    gameData.lastCard = null; 
    gameData.players.forEach(p => {
        if (p.tokens > 0) {
            p.active = true;
            // Deal 3 cards
            p.hand = [gameData.deck.pop(), gameData.deck.pop(), gameData.deck.pop()];
        } else {
            p.active = false;
            p.hand = [];
        }
    });
    // Find first player with tokens to start
    while (!gameData.players[gameData.currentIndex].active) {
        gameData.currentIndex = (gameData.currentIndex + 1) % gameData.players.length;
    }
}

startNewRound();

app.get('/status', (req, res) => {
    const userName = req.query.user;
    const view = JSON.parse(JSON.stringify(gameData));
    view.players.forEach(p => {
        if (p.name !== userName) p.hand = p.hand.map(() => ({display: "?", value: 0}));
    });
    res.json(view);
});

app.post('/play', (req, res) => {
    const { cardIndex, userName, aceValue } = req.body;
    let player = gameData.players[gameData.currentIndex];

    if (player.name !== userName || !player.active || gameData.roundOver) return res.sendStatus(403);

    const card = player.hand[cardIndex];
    let nextTotal = gameData.currentTotal;

    // Set the "History" card data
    gameData.lastCard = { ...card, playedBy: userName };

    // Card Mechanics
    if (card.name === 'A') {
        const val = parseInt(aceValue) || 1;
        nextTotal += val;
        gameData.lastCard.display = val + card.suit;
    } else if (card.name === '4') {
        gameData.direction *= -1;
    } else if (card.name === 'K') {
        nextTotal = 99;
    } else {
        nextTotal += card.value;
    }

    // Bust Check (Cap at 99)
    if (nextTotal > 99) {
        player.tokens -= 1;
        player.active = false;
        const activeRemaining = gameData.players.filter(p => p.active).length;
        if (activeRemaining <= 1) gameData.roundOver = true;
        else moveNext();
    } else {
        gameData.currentTotal = nextTotal;
        
        // --- INFINITE DECK SAFETY ---
        if (gameData.deck.length === 0) {
            gameData.deck = createDeck();
        }
        
        player.hand[cardIndex] = gameData.deck.pop();
        moveNext();
    }
    res.json(gameData);
});

function moveNext() {
    do {
        gameData.currentIndex = (gameData.currentIndex + gameData.direction + gameData.players.length) % gameData.players.length;
    } while (!gameData.players[gameData.currentIndex].active && !gameData.roundOver);
}

app.post('/reset', (req, res) => { startNewRound(); res.sendStatus(200); });
app.post('/new-season', (req, res) => {
    gameData.players.forEach(p => p.tokens = 3);
    startNewRound();
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`99 Game Server started on port ${PORT}`));