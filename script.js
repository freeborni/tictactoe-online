document.addEventListener('DOMContentLoaded', () => {
    // DOM elements - Screens
    const welcomeScreen = document.getElementById('welcome-screen');
    const homeScreen = document.getElementById('home-screen');
    const gameModeScreen = document.getElementById('game-mode-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const gameScreen = document.getElementById('game-screen');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    
    // DOM elements - Welcome screen
    const usernameInput = document.getElementById('username-input');
    const enterGameBtn = document.getElementById('enter-game-btn');
    
    // DOM elements - Home screen
    const userWins = document.getElementById('user-wins');
    const userLosses = document.getElementById('user-losses');
    const userDraws = document.getElementById('user-draws');
    const usernameDisplay = document.getElementById('username-display');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomIdInput = document.getElementById('room-id-input');
    const connectionStatus = document.getElementById('connection-status');
    const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
    
    // DOM elements - Game mode screen
    const singlePlayerBtn = document.getElementById('single-player-btn');
    const multiplayerBtn = document.getElementById('multiplayer-btn');
    const backToHomeFromModeBtn = document.getElementById('back-to-home-from-mode-btn');

    // DOM elements - Waiting screen
    const roomIdDisplay = document.getElementById('room-id-display');
    const copyRoomIdBtn = document.getElementById('copy-room-id');
    const cancelWaitBtn = document.getElementById('cancel-wait-btn');

    // DOM elements - Leaderboard screen
    const leaderboardContent = document.getElementById('leaderboard-content');
    const backToHomeBtn = document.getElementById('back-to-home-btn');

    // DOM elements - Game screen
    const gameRoomId = document.getElementById('game-room-id');
    const connectionBadge = document.getElementById('connection-badge');
    const playerTurn = document.getElementById('player-turn');
    const gameStatus = document.getElementById('game-status');
    const scoreX = document.getElementById('score-x');
    const scoreO = document.getElementById('score-o');
    const scoreDraws = document.getElementById('score-draws');
    const cells = document.querySelectorAll('.cell');
    const resetButton = document.getElementById('reset-btn');
    const leaveGameBtn = document.getElementById('leave-game-btn');
    const gamePlayers = document.getElementById('game-players');
    
    // DOM elements - Notification
    const notificationToast = document.getElementById('notification-toast');
    const notificationMessage = document.getElementById('notification-message');
    
    // Game state
    let gameActive = false;
    let currentPlayer = 'X';
    let gameState = ['', '', '', '', '', '', '', '', ''];
    let scores = { X: 0, O: 0, draws: 0 };
    let isMultiplayer = true;
    let isSinglePlayer = false;
    let aiPlayer = 'O'; // AI will always play as O
    
    // Winning combinations
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
    
    // Messages
    const winningMessage = (symbol, isYou) => isYou ? `You won!` : `Player ${symbol} won!`;
    const drawMessage = () => `Game ended in a draw!`;
    const currentPlayerTurn = (symbol) => `Player ${symbol}'s turn` + (ticTacToeClient.getMySymbol() === symbol ? ' (you)' : '');
    const waitingForOpponent = () => `Waiting for opponent...`;
    const opponentDisconnected = () => `Opponent disconnected`;
    
    // Initialize the Socket.IO client
    ticTacToeClient.init()
        .then(() => {
            // Update connection status
            connectionStatus.textContent = 'Connected to server';
            connectionStatus.classList.add('text-green-500');
            
            // Set up event handlers for Socket.IO events
            setupSocketEventHandlers();
            
            // Load saved username
            const savedUsername = ticTacToeClient.getSavedUsername();
            if (savedUsername) {
                usernameInput.value = savedUsername;
                // Fetch user stats
                ticTacToeClient.getUserStats(savedUsername);
            }
            
            // Fetch leaderboard
            ticTacToeClient.getLeaderboard();
            
            // Enable buttons
            createRoomBtn.disabled = false;
            joinRoomBtn.disabled = false;
        })
        .catch(error => {
            connectionStatus.textContent = 'Failed to connect to server';
            connectionStatus.classList.add('text-red-500');
            console.error('Socket.IO initialization error:', error);
        });
    
    // Set up Socket.IO event handlers
    function setupSocketEventHandlers() {
        // Connection events
        ticTacToeClient.on('onConnect', () => {
            updateConnectionStatus(true);
            showNotification('Connected to server');
        });
        
        ticTacToeClient.on('onDisconnect', () => {
            updateConnectionStatus(false);
            showNotification('Disconnected from server');
        });
        
        // User stats
        ticTacToeClient.on('onUserStats', (data) => {
            if (data) {
                // Update stats display
                userWins.textContent = data.wins || 0;
                userLosses.textContent = data.losses || 0;
                userDraws.textContent = data.draws || 0;
                console.log({ data });
                
                // Show username
                if (data.username) {
                    usernameDisplay.textContent = data.username;
                }
            }
        });
        
        // Leaderboard
        ticTacToeClient.on('onLeaderboard', (data) => {
            if (data && Array.isArray(data)) {
                updateLeaderboard(data);
            }
        });
        
        // Room events
        ticTacToeClient.on('onRoomCreated', (data) => {
            roomIdDisplay.textContent = data.roomId;
            gameRoomId.textContent = data.roomId;
            showScreen(waitingScreen);
        });
        
        ticTacToeClient.on('onRoomJoined', (data) => {
            resetButton.click(); // reset the game
            gameRoomId.textContent = data.roomId;
            updateGameState(data.room);
            showScreen(gameScreen);
            showNotification('Joined game room');
        });
        
        ticTacToeClient.on('onPlayerJoined', (data) => {
            updateGameState(data.room);
            showScreen(gameScreen);
            showNotification('Opponent joined the game');
        });
        
        // Game events
        ticTacToeClient.on('onMoveMade', (data) => {
            const { cellIndex, roomState, result } = data;
            
            // Update the game state
            updateGameState(roomState);
            
            // Update the UI
            updateCellUI(cellIndex, roomState.gameState[cellIndex]);
            
            // Handle game result
            if (result.status === 'win') {
                handleWin(result.winner, result.winningCombo, result.scores);
            } else if (result.status === 'draw') {
                handleDraw(result.scores);
            }
        });
        
        ticTacToeClient.on('onGameReset', (data) => {
            updateGameState(data.roomState);
            resetGameUI();
            showNotification('Game reset');
        });
        
        ticTacToeClient.on('onPlayerDisconnected', (data) => {
            if (data.roomState) {
                updateGameState(data.roomState);
            }
            gameStatus.textContent = opponentDisconnected();
            showNotification('Opponent disconnected');
        });
        
        // Error handling
        ticTacToeClient.on('onError', (data) => {
            showNotification(`Error: ${data.message}`, true);
        });
    }
    
    // Update connection status UI
    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            connectionBadge.className = 'inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-green-50 text-green-800';
            connectionBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-green-500 mr-1"></span>Connected';
        } else {
            connectionBadge.className = 'inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-red-100 text-red-800';
            connectionBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-red-500 mr-1"></span>Disconnected';
        }
    }
    
    // Show notification toast
    function showNotification(message, isError = false) {
        notificationMessage.textContent = message;
        
        if (isError) {
            notificationToast.classList.add('bg-red-600');
            notificationToast.classList.remove('bg-gray-800');
        } else {
            notificationToast.classList.add('bg-gray-800');
            notificationToast.classList.remove('bg-red-600');
        }
        
        notificationToast.classList.add('notification-show');
        
        setTimeout(() => {
            notificationToast.classList.remove('notification-show');
        }, 3000);
    }

    // Show a specific screen and hide others
    function showScreen(screenToShow) {
        [welcomeScreen, homeScreen, gameModeScreen, waitingScreen, gameScreen, leaderboardScreen].forEach(screen => {
            if (screen === screenToShow) {
                screen.classList.remove('hidden');
                if (screen === gameScreen) {
                    if (isSinglePlayer) {
                        const username = ticTacToeClient.getSavedUsername() || 'Player';
                        gamePlayers.textContent = `${username} vs Computer`;
                        document.getElementById('player-x').textContent = username;
                        document.getElementById('player-o').textContent = 'Computer';
                    } else {
                        const players = ticTacToeClient.room.players;
                        gamePlayers.textContent = `${players[0].username} vs ${players[1].username}`;
                        document.getElementById('player-x').textContent = players.find(player => player.symbol === 'X').username;
                        document.getElementById('player-o').textContent = players.find(player => player.symbol === 'O').username;
                    }
                }
            } else {
                screen.classList.add('hidden');
            }
        });
    }
    
    // Update game state from server data
    function updateGameState(roomState) {
        if (!roomState) return;
        
        gameState = roomState.gameState;
        currentPlayer = roomState.currentPlayer;
        gameActive = roomState.gameActive;
        scores = roomState.scores || { X: 0, O: 0, draws: 0 };
        
        // Update UI
        updateScoreDisplay();
        updateTurnIndicator();
        updateCellsInteractivity();
    }
    
    // Update turn indicator
    function updateTurnIndicator() {
        if (isSinglePlayer) {
            playerTurn.textContent = currentPlayer === 'X' ? 'Your turn' : "Computer's turn";
        } else {
            playerTurn.textContent = currentPlayerTurn(currentPlayer);
        }

        // Update game status message
        if (!gameActive) {
            return;
        } else if (isMultiplayer && !ticTacToeClient.isMyTurn()) {
            gameStatus.textContent = waitingForOpponent();
            gameStatus.classList.add('animate-pulse');
        } else {
            gameStatus.textContent = isSinglePlayer ?
                (currentPlayer === 'X' ? 'Your turn...' : "Computer is thinking...") :
                'Your turn...';
            gameStatus.classList.add('animate-pulse');
        }
    }
    
    // Update cells interactivity based on whose turn it is
    function updateCellsInteractivity() {
        if (isMultiplayer) {
            const isMyTurn = ticTacToeClient.isMyTurn();
            cells.forEach(cell => {
                if (isMyTurn && gameActive) {
                    cell.classList.remove('disabled');
                } else {
                    cell.classList.add('disabled');
                }
            });
        } else {
            cells.forEach(cell => {
                if (gameActive && currentPlayer === 'X') {
                    cell.classList.remove('disabled');
                } else {
                    cell.classList.add('disabled');
                }
            });
        }
    }
    
    // Update a single cell's UI
    function updateCellUI(cellIndex, symbol) {
        const cell = cells[cellIndex];
        
        // Update UI with player mark
        cell.textContent = symbol;
        
        // Apply color based on player
        cell.classList.remove('text-blue-600', 'text-red-600', 'x', 'o');
        if (symbol === 'X') {
            cell.classList.add('x');
        } else if (symbol === 'O') {
            cell.classList.add('o');
        }
    }
    
    // Reset the game UI
    function resetGameUI() {
        // Clear the board
        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('bg-green-200', 'text-blue-600', 'text-red-600', 'x', 'o', 'animate-pulse');
            cell.classList.add('bg-white');
        });
        
        // Update UI
        gameStatus.textContent = '';
        gameStatus.classList.remove('animate-pulse');
        updateTurnIndicator();
        updateCellsInteractivity();
        updateYourPlayerIcon(); // update your own user icon
    }
    
    // Handle win condition
    function handleWin(winner, winningCombo, updatedScores) {
        const isYou = isSinglePlayer ? winner === 'X' : ticTacToeClient.getMySymbol() === winner;
        gameStatus.textContent = winningMessage(winner, isYou);
        gameStatus.classList.add('animate-pulse');
        
        // Highlight winning cells
        winningCombo.forEach(index => {
            cells[index].classList.remove('bg-white');
            cells[index].classList.add('bg-green-200', 'animate-pulse');
        });
        
        // Update score
        if (isSinglePlayer) {
            // In single player mode, update scores locally
            if (winner === 'X') {
                scores.X = (scores.X || 0) + 1;
            } else {
                scores.O = (scores.O || 0) + 1;
            }
        } else {
        // In multiplayer mode, use server scores
            scores = updatedScores || scores;
        }
        updateScoreDisplay();

        // Update user stats in single player mode
        if (isSinglePlayer) {
            const username = ticTacToeClient.getSavedUsername();
            if (username) {
                if (winner === 'X') {
                    // User won
                    ticTacToeClient.updateUserStats(username, 1, 0, 0);
                } else {
                    // Computer won
                    ticTacToeClient.updateUserStats(username, 0, 1, 0);
                }
            }
        }

        updateCellsInteractivity();
    }
    
    // Handle draw condition
    function handleDraw(updatedScores) {
        gameStatus.textContent = drawMessage();
        gameStatus.classList.add('animate-pulse');

        // Update score
        if (isSinglePlayer) {
            // In single player mode, update scores locally
            scores.draws = (scores.draws || 0) + 1;
        } else {
        // In multiplayer mode, use server scores
            scores = updatedScores || scores;
        }
        updateScoreDisplay();

        // Update user stats in single player mode
        if (isSinglePlayer) {
            const username = ticTacToeClient.getSavedUsername();
            if (username) {
                ticTacToeClient.updateUserStats(username, 0, 0, 1);
            }
        }

        updateCellsInteractivity();
    }
    
    // Update score display
    function updateScoreDisplay() {
        scoreX.textContent = scores.X || 0;
        scoreO.textContent = scores.O || 0;
        
        // Update draws count
        if (scores.draws !== undefined) {
            scoreDraws.textContent = scores.draws;
        } else {
            // If not available, calculate it from the room state if possible
            if (ticTacToeClient.room && ticTacToeClient.room.draws !== undefined) {
                scoreDraws.textContent = ticTacToeClient.room.draws;
            } else {
                scoreDraws.textContent = '0';
            }
        }
    }
    
    // Handle cell click
    function handleCellClick(clickedCellEvent) {
        const clickedCell = clickedCellEvent.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (isMultiplayer) {
            // Check if it's the player's turn and the cell is empty
            if (ticTacToeClient.isMyTurn() && gameState[clickedCellIndex] === '' && gameActive) {
                ticTacToeClient.makeMove(clickedCellIndex);
            }
        } else {
            // Single player mode
            if (gameState[clickedCellIndex] !== '' || !gameActive || currentPlayer !== 'X') {
                return;
            }
            
            // Update game state and UI
            gameState[clickedCellIndex] = currentPlayer;
            updateCellUI(clickedCellIndex, currentPlayer);
            
            // Check for win or draw
            let roundWon = false;
            let winningCombo = [];

            for (let i = 0; i < winningConditions.length; i++) {
                const [a, b, c] = winningConditions[i];
                const condition = gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c];
                
                if (condition) {
                    roundWon = true;
                    winningCombo = [a, b, c];
                    break;
                }
            }

            if (roundWon) {
                handleWin(currentPlayer, winningCombo, scores);
                gameActive = false;
                return;
            }

            const roundDraw = !gameState.includes('');
            if (roundDraw) {
                handleDraw(scores);
                gameActive = false;
                return;
            }
            
            // Switch to AI's turn
            currentPlayer = aiPlayer;
            updateTurnIndicator();

            // Make AI move after a short delay
            setTimeout(makeAIMove, 500);
        }
    }
    
    // Update leaderboard display
    function updateLeaderboard(players) {
        if (!players || players.length === 0) {
            leaderboardContent.innerHTML = '<div class="text-center text-gray-500 py-2">No players found</div>';
            return;
        }
        
        // Filter out computer players
        const humanPlayers = players.filter(player => player.username !== 'Computer');

        let html = '<table class="w-full">';
        html += '<thead><tr class="border-b border-gray-200">';
        html += '<th class="text-left py-2">Player</th>';
        html += '<th class="text-center py-2">Wins</th>';
        html += '<th class="text-center py-2">Losses</th>';
        html += '<th class="text-center py-2">Draws</th>';
        html += '</tr></thead><tbody>';
        
        humanPlayers.forEach((player, index) => {
            html += `<tr class="${index % 2 === 0 ? 'bg-gray-50' : ''}">`;
            html += `<td class="py-2">${player.username}</td>`;
            html += `<td class="text-center py-2">${player.wins}</td>`;
            html += `<td class="text-center py-2">${player.losses}</td>`;
            html += `<td class="text-center py-2">${player.draws || 0}</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        leaderboardContent.innerHTML = html;
    }

    // Event listeners - Welcome screen
    enterGameBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            ticTacToeClient.saveUsername(username);
            ticTacToeClient.getUserStats(username);
            
            // Update username display
            usernameDisplay.textContent = username;
            
            showScreen(homeScreen);
        } else {
            showNotification('Please enter a username', true);
        }
    });

    // Update current player icon
    function updateYourPlayerIcon() {
        const playerXIcon = document.getElementById('player-x-icon');
        const playerOIcon = document.getElementById('player-o-icon');
        if (ticTacToeClient.getMySymbol() === 'X') {
            playerXIcon.classList.remove('hidden');
            playerOIcon.classList.add('hidden');
        } else {
            playerXIcon.classList.add('hidden');
            playerOIcon.classList.remove('hidden');
        }
    }
    
    // Event listeners - Leaderboard screen
    cancelWaitBtn.addEventListener('click', () => {
        showScreen(homeScreen);
    });
    
    // Event listeners - Home screen
    viewLeaderboardBtn.addEventListener('click', () => {
        ticTacToeClient.getLeaderboard();
        showScreen(leaderboardScreen);
    });
    
    createRoomBtn.addEventListener('click', () => {
        showScreen(gameModeScreen);
    });
    
    joinRoomBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim().toUpperCase();
        const username = usernameInput.value.trim();

        ticTacToeClient.joinRoom(roomId, username);
    });
    
    // Event listeners - Waiting screen
    copyRoomIdBtn.addEventListener('click', () => {
        const roomId = roomIdDisplay.textContent;
        navigator.clipboard.writeText(roomId)
            .then(() => {
                copyRoomIdBtn.classList.add('copy-success');
                setTimeout(() => {
                    copyRoomIdBtn.classList.remove('copy-success');
                }, 1000);
                showNotification('Room ID copied to clipboard');
            })
            .catch(err => {
                showNotification('Failed to copy room ID', true);
            });
    });
    
    cancelWaitBtn.addEventListener('click', () => {
        ticTacToeClient.leaveRoom();
        showScreen(homeScreen);
        showNotification('Waiting cancelled');
    });

    backToHomeBtn.addEventListener('click', () => {
        showScreen(homeScreen);
    });
    
    // Event listeners - Game screen
    resetButton.addEventListener('click', () => {
        if (isMultiplayer) {
            ticTacToeClient.resetGame();
        } else {
            resetGameUI();
            gameActive = true;
            currentPlayer = 'X';
            gameState = ['', '', '', '', '', '', '', '', ''];
            updateTurnIndicator();
        }
    });
    
    leaveGameBtn.addEventListener('click', () => {
        ticTacToeClient.leaveRoom();
        showScreen(homeScreen);
        showNotification('Left game room');
    });
    
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    
    // Set up additional Socket.IO event handlers
    ticTacToeClient.on('onRoomLeft', () => {
        // This event is triggered when the player leaves a room
        showNotification('Left the room');
    });
    
    // Event listeners - Game mode screen
    singlePlayerBtn.addEventListener('click', () => {
        isMultiplayer = false;
        isSinglePlayer = true;
        gameActive = true;
        currentPlayer = 'X';
        gameState = ['', '', '', '', '', '', '', '', ''];
        scores = { X: 0, O: 0, draws: 0 };
        showScreen(gameScreen);
        updateTurnIndicator();
        updateCellsInteractivity();
        // Fetch updated user stats when starting a new game
        const username = ticTacToeClient.getSavedUsername();
        if (username) {
            ticTacToeClient.getUserStats(username);
        }
    });

    multiplayerBtn.addEventListener('click', () => {
        isMultiplayer = true;
        isSinglePlayer = false;
        ticTacToeClient.createRoom();
        showScreen(waitingScreen);
    });

    backToHomeFromModeBtn.addEventListener('click', () => {
        showScreen(homeScreen);
    });

    // AI Player Logic
    function findBestMove() {
        // 1. Check if AI can win
        const aiWinningMove = findWinningMove(aiPlayer);
        if (aiWinningMove !== -1) return aiWinningMove;

        // 2. Check if opponent is about to win and block it
        const opponentWinningMove = findWinningMove('X');
        if (opponentWinningMove !== -1) return opponentWinningMove;

        // 3. Look for moves that create winning opportunities
        const strategicMove = findStrategicMove();
        if (strategicMove !== -1) return strategicMove;

        // 4. Use minimax to find the best move
        const minimaxMove = findMinimaxMove();
        if (minimaxMove !== -1) return minimaxMove;

        // 5. Take center if available
        if (gameState[4] === '') return 4;

        // 6. Take corners
        const corners = [0, 2, 6, 8];
        const availableCorners = corners.filter(corner => gameState[corner] === '');
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }

        // 7. Pick a random available spot
        const availableSpaces = gameState.map((space, index) => space === '' ? index : -1).filter(index => index !== -1);
        return availableSpaces[Math.floor(Math.random() * availableSpaces.length)];
    }

    function findWinningMove(player) {
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            const spaces = [gameState[a], gameState[b], gameState[c]];

            // If two spaces are filled by the player and one is empty
            if (spaces.filter(space => space === player).length === 2 && spaces.includes('')) {
                // Return the index of the empty space
                return [a, b, c][spaces.findIndex(space => space === '')];
            }
        }
        return -1;
    }

    function findStrategicMove() {
        // Try each available move
        for (let i = 0; i < gameState.length; i++) {
            if (gameState[i] === '') {
                // Simulate AI move
                gameState[i] = aiPlayer;

                // Check if this move creates a winning opportunity
                const hasWinningOpportunity = checkWinningOpportunity();

                // Undo the move
                gameState[i] = '';

                if (hasWinningOpportunity) {
                    return i;
                }
            }
        }
        return -1;
    }

    function checkWinningOpportunity() {
        // Count how many winning combinations are possible after this move
        let winningCombos = 0;

        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            const spaces = [gameState[a], gameState[b], gameState[c]];

            // If this combination has two AI marks and one empty space
            if (spaces.filter(space => space === aiPlayer).length === 2 && spaces.includes('')) {
                winningCombos++;
            }
        }

        // If there are multiple winning combinations, this is a good strategic move
        return winningCombos >= 2;
    }

    function findMinimaxMove() {
        let bestScore = -Infinity;
        let bestMove = -1;

        // Try each available move
        for (let i = 0; i < gameState.length; i++) {
            if (gameState[i] === '') {
                // Simulate AI move
                gameState[i] = aiPlayer;

                // Get score for this move
                const score = minimax(gameState, 0, false);

                // Undo the move
                gameState[i] = '';

                // Update best move if this score is better
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }

        return bestMove;
    }

    function minimax(board, depth, isMaximizing) {
        // Check for terminal states
        const aiWin = checkWinner(aiPlayer);
        const playerWin = checkWinner('X');
        const isDraw = !board.includes('');

        if (aiWin) return 10 - depth;
        if (playerWin) return depth - 10;
        if (isDraw) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < board.length; i++) {
                if (board[i] === '') {
                    board[i] = aiPlayer;
                    const score = minimax(board, depth + 1, false);
                    board[i] = '';
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < board.length; i++) {
                if (board[i] === '') {
                    board[i] = 'X';
                    const score = minimax(board, depth + 1, true);
                    board[i] = '';
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    function checkWinner(player) {
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (gameState[a] === player &&
                gameState[b] === player &&
                gameState[c] === player) {
                return true;
            }
        }
        return false;
    }

    function makeAIMove() {
        if (!gameActive || currentPlayer !== aiPlayer) return;

        const move = findBestMove();
        if (move !== -1) {
            gameState[move] = aiPlayer;
            updateCellUI(move, aiPlayer);

            // Check for win or draw
            let roundWon = false;
            let winningCombo = [];

            for (let i = 0; i < winningConditions.length; i++) {
                const [a, b, c] = winningConditions[i];
                const condition = gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c];

                if (condition) {
                    roundWon = true;
                    winningCombo = [a, b, c];
                    break;
                }
            }

            if (roundWon) {
                handleWin(aiPlayer, winningCombo, scores);
                gameActive = false;
                return;
            }

            const roundDraw = !gameState.includes('');
            if (roundDraw) {
                handleDraw(scores);
                gameActive = false;
                return;
            }

            currentPlayer = 'X';
            updateTurnIndicator();
        }
    }

    // Initialize UI
    showScreen(welcomeScreen);
});
