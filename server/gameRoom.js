class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.currentPlayer = 'X';
        this.gameState = ['', '', '', '', '', '', '', '', ''];
        this.gameActive = false;
        this.scores = { X: 0, O: 0, draws: 0 };
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
        this.messages = []; // Add messages array to store chat history
    }

    // Add a player to the room
    addPlayer(playerId, socketId, username) {
        if (this.players.length >= 2) {
            return false;
        }

        // Assign X to first player, opposite symbol of first player to second player
        // Determine player symbol - first player gets 'X', second player gets opposite of first player's symbol
        const isFirstPlayer = this.players.length === 0;
        const symbol = isFirstPlayer ? 'X' : (this.players[0].symbol === 'X' ? 'O' : 'X');

        this.players.push({
            id: playerId,
            socketId,
            symbol,
            username: username || `Player ${symbol}`
        });

        // Start the game if we have 2 players
        if (this.players.length === 2) {
            this.gameActive = true;
        }

        return true;
    }

    // Remove a player from the room
    removePlayer(socketId) {
        const index = this.players.findIndex(player => player.socketId === socketId);
        if (index !== -1) {
            this.players.splice(index, 1);
            this.gameActive = false;
            return true;
        }
        return false;
    }

    // Check if the room is empty
    isEmpty() {
        return this.players.length === 0;
    }

    // Check if the room is full
    isFull() {
        return this.players.length === 2;
    }

    // Get player by socket ID
    getPlayerBySocketId(socketId) {
        return this.players.find(player => player.socketId === socketId);
    }

    // Check if it's the player's turn
    isPlayerTurn(socketId) {
        const player = this.getPlayerBySocketId(socketId);
        return player && player.symbol === this.currentPlayer;
    }

    // Make a move
    makeMove(socketId, cellIndex) {
        // Check if it's a valid move
        if (!this.gameActive || 
            !this.isPlayerTurn(socketId) || 
            this.gameState[cellIndex] !== '' || 
            cellIndex < 0 || 
            cellIndex > 8) {
            return false;
        }

        const player = this.getPlayerBySocketId(socketId);
        this.gameState[cellIndex] = player.symbol;

        // Check for win or draw
        const result = this.checkGameResult();
        
        // Switch player if game is still active
        if (this.gameActive) {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }

        return {
            success: true,
            result
        };
    }

    // Check for win or draw
    checkGameResult() {
        const winningConditions = [
            [0, 1, 2], // Top row
            [3, 4, 5], // Middle row
            [6, 7, 8], // Bottom row
            [0, 3, 6], // Left column
            [1, 4, 7], // Middle column
            [2, 5, 8], // Right column
            [0, 4, 8], // Diagonal top-left to bottom-right
            [2, 4, 6]  // Diagonal top-right to bottom-left
        ];

        let roundWon = false;
        let winningCombo = [];

        // Check all winning combinations
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            const condition = this.gameState[a] && 
                              this.gameState[a] === this.gameState[b] && 
                              this.gameState[a] === this.gameState[c];
            
            if (condition) {
                roundWon = true;
                winningCombo = winningConditions[i];
                break;
            }
        }

        // Handle win
        if (roundWon) {
            this.gameActive = false;
            this.scores[this.currentPlayer]++;
            
            return {
                status: 'win',
                winner: this.currentPlayer,
                winningCombo,
                scores: this.scores
            };
        }

        // Handle draw
        const roundDraw = !this.gameState.includes('');
        if (roundDraw) {
            this.gameActive = false;
            this.scores.draws++;
            
            return {
                status: 'draw',
                scores: this.scores
            };
        }

        // Game continues
        return {
            status: 'continue',
            currentPlayer: this.currentPlayer
        };
    }

    // Reset the game
    resetGame() {
        this.gameState = ['', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'X';
        this.gameActive = this.players.length === 2;
        
        return {
            gameState: this.gameState,
            currentPlayer: this.currentPlayer,
            gameActive: this.gameActive,
            scores: this.scores
        };
    }

    // Get room state including chat messages
    getState() {
        return {
            id: this.id,
            players: this.players,
            currentPlayer: this.currentPlayer,
            gameState: this.gameState,
            gameActive: this.gameActive,
            scores: this.scores,
            messages: this.messages // Include messages in room state
        };
    }

    // Add chat message to room
    addChatMessage(username, message) {
        const chatMessage = {
            username,
            message,
            timestamp: Date.now()
        };
        this.messages.push(chatMessage);
        this.lastActivity = Date.now();
        return chatMessage;
    }
}

module.exports = GameRoom;
