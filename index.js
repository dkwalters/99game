const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Game State
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

// Create and Shuffle Deck
function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = [
        { n: 'A', v: 1 }, { n: '2', v: 2 }, { n: '3', v: 3 }, { n: '4', v: 0 }, // 4 is Reverse
        { n: '5', v: 5 }, { n: '6', v: 6 }, { n: '7', v: 7 }, { n: '8', v: 8 },
        { n: '9', v: 0 }, { n: '10', v: -10 }, { n: 'J', v: 10 }, { n: 'Q', v: 10 }, { n: 'K', v: 99 }
    ];
    let deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ display: v.n + s, value: v.v, name: v.n });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function startNewRound() {
    gameData.deck = createDeck();
    gameData.currentTotal = 0;
    gameData.gameOver = false;
    gameData.players.forEach(p => {
        if (p.active) p.hand = [gameData.deck.pop(), gameData.deck.pop(), gameData.deck.pop()];
    });
}

// Initial Deal
startNewRound();

app.get('/status', (req, res) => res.json(gameData));

app.post('/play', (req, res) => {
    const { cardIndex } = req.body;
    let player = gameData.players[gameData.currentIndex];

    if (!player.active || gameData.gameOver) return res.status(400).send();

    const card = player.hand[cardIndex];
    
    // Logic for Special Cards
    if (card.name === '4') {
        gameData.direction *= -1;
    } else if (card.name === 'K') {
        gameData.currentTotal = 99;
    } else {
        gameData.currentTotal += card.value;
    }

    // Check if player "Goes Out"
    if (gameData.currentTotal > 99) {
        player.active = false;
        const activePlayers = gameData.players.filter(p => p.active);
        if (activePlayers.length <= 1) {
            gameData.gameOver = true;
        } else {
            // Find next active player
            moveToNext();
        }
    } else {
        // Draw a new card and move turn
        player.hand[cardIndex] = gameData.deck.pop() || { display: "Empty", value: 0 };
        moveToNext();
    }
    res.json(gameData);
});

function moveToNext() {
    do {
        gameData.currentIndex = (gameData.currentIndex + gameData.direction + gameData.players.length) % gameData.players.length;
    } while (!gameData.players[gameData.currentIndex].active && !gameData.gameOver);
}

app.post('/reset', (req, res) => {
    gameData.players.forEach(p => p.active = true);
    startNewRound();
    res.json(gameData);
});

app.listen(PORT, () => console.log(`99 Game on port ${PORT}`));