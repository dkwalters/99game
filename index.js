const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let gameData = {
    currentTotal: 0,
    currentIndex: 0, 
    direction: 1,
    players: ["Aleigha", "Mommy", "Daddy"],
    gameOver: false
};

// Get current game status
app.get('/status', (req, res) => {
    res.json(gameData);
});

// Play a card
app.post('/play', (req, res) => {
    const { value } = req.body;
    
    if (gameData.gameOver) return res.status(400).json({ error: "Game is over!" });

    // Card Logic
    if (value === 4) {
        gameData.direction *= -1; // Reverse
    } else if (value === 99) {
        gameData.currentTotal = 99; // King sets to 99
    } else {
        gameData.currentTotal += value;
    }

    // Win/Loss Check
    if (gameData.currentTotal > 99) {
        gameData.gameOver = true;
    } else {
        // Move to next player
        gameData.currentIndex = (gameData.currentIndex + gameData.direction + gameData.players.length) % gameData.players.length;
    }

    res.json(gameData);
});

// Reset Game
app.post('/reset', (req, res) => {
    gameData = { currentTotal: 0, currentIndex: 0, direction: 1, players: ["Aleigha", "Mommy", "Daddy"], gameOver: false };
    res.json(gameData);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});