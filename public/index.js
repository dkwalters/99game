const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let gameData = {
    currentTotal: 0,
    currentIndex: 0,
    roundOver: false,
    lastCard: null,
    playerMode: 3,
    players: [
        { name: "Aleigha", hand: [], tokens: 3, active: true },
        { name: "Mommy", hand: [], tokens: 3, active: true },
        { name: "Daddy", hand: [], tokens: 3, active: true }
    ],
    deck: []
};

function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = [
        { n: 'A', v: 1 }, { n: '2', v: 2 }, { n: '3', v: 3 }, { n: '4', v: 0 },
        { n: '5', v: 5 }, { n: '6', v: 6 }, { n: '7', v: 7 }, { n: '8', v: 8 },
        { n: '9', v: 0 }, { n: '10', v: -10 }, { n: 'J', v: 10 }, { n: 'Q', v: 10 }, { n: 'K', v: 99 }
    ];
    let newDeck = [];
    suits.forEach(s => values.forEach(v => newDeck.push({ display: v.n + s, value: v.v, name: v.n })));
    return newDeck.sort(() => Math.random() - 0.5);
}

function drawCards(count) {
    let cards = [];
    for (let i = 0; i < count; i++) {
        if (gameData.deck.length === 0) gameData.deck = createDeck();
        cards.push(gameData.deck.pop());
    }
    return cards;
}

function initGame() {
    gameData.deck = createDeck();
    gameData.currentTotal = 0;
    gameData.currentIndex = 0;
    gameData.roundOver = false;
    gameData.players.forEach(p => {
        if (gameData.playerMode === 2 && p.name === "Daddy") {
            p.active = false;
            p.tokens = 0;
            p.hand = [];
        } else {
            p.active = true;
            p.tokens = 3;
            p.hand = drawCards(3);
        }
    });
}

initGame();

app.get('/status', (req, res) => res.json(gameData));

app.post('/set-mode', (req, res) => {
    gameData.playerMode = parseInt(req.query.mode);
    initGame();
    res.sendStatus(200);
});

app.post('/play', (req, res) => {
    const { cardIndex, userName, aceValue } = req.body;
    const player = gameData.players.find(p => p.name === userName);
    const card = player.hand[cardIndex];

    let val = (card.name === 'A') ? aceValue : card.value;
    
    if (card.name === 'K') gameData.currentTotal = 99;
    else gameData.currentTotal += val;

    gameData.lastCard = { display: card.display, playedBy: userName };
    player.hand.splice(cardIndex, 1);
    player.hand.push(...drawCards(1));

    if (gameData.currentTotal > 99) {
        player.tokens--;
        gameData.roundOver = true;
    } else {
        do {
            gameData.currentIndex = (gameData.currentIndex + 1) % 3;
        } while (!gameData.players[gameData.currentIndex].active || gameData.players[gameData.currentIndex].tokens <= 0);
    }
    res.json(gameData);
});

app.post('/reset', (req, res) => {
    gameData.currentTotal = 0;
    gameData.roundOver = false;
    gameData.players.forEach(p => {
        if (p.tokens > 0) {
            p.active = true;
            p.hand = drawCards(3);
        } else {
            p.active = false;
        }
    });
    gameData.currentIndex = gameData.players.findIndex(p => p.active);
    res.json(gameData);
});

app.post('/new-season', (req, res) => {
    initGame();
    res.json(gameData);
});

app.listen(port, () => console.log(`99 Game Server active on port ${port}`));