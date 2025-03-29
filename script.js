document.addEventListener('DOMContentLoaded', () => {
    // DOM elements - Screens
    const welcomeScreen = document.getElementById('welcome-screen');
    const homeScreen = document.getElementById('home-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const gameScreen = document.getElementById('game-screen');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    
    // DOM elements - Welcome screen
    const usernameInput = document.getElementById('username-input');
    const enterGameBtn = document.getElementById('enter-game-btn');
    
    // DOM elements - Home screen
    const userStatsDiv = document.getElementById('user-stats');
    const userWins = document.getElementById('user-wins');
    const userLosses = document.getElementById('user-losses');
    const userDraws = document.getElementById('user-draws');
    const usernameDisplay = document.getElementById('username-display');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomIdInput = document.getElementById('room-id-input');
    const connectionStatus = document.getElementById('connection-status');
    const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
    
    // DOM elements - Waiting screen
    const roomIdDisplay = document.getElementById('room-id-display');
    const copyRoomIdBtn = document.getElementById('copy-room-id');
    const cancelWaitBtn = document.getElementById('cancel-wait-btn');

    // DOM elements - Leaderboard screen
    // const leaderboardContent = document.getElementById('leaderboard-content');
    const backToHomeBtn = document.getElementById('back-to-home-btn');

    // DOM elements - Game screen
    const gameRoomId = document.getElementById('game-room-id');
    const connectionBadge = document.getElementById('connection-badge');
    const playerTurn = document.getElementById('player-turn');
    const playerXName = document.getElementById('player-x-name');
    const playerOName = document.getElementById('player-o-name');
    const youBadgeX = document.getElementById('you-badge-x');
    const youBadgeO = document.getElementById('you-badge-o');
    const gameStatus = document.getElementById('game-status');
    const scoreX = document.getElementById('score-x');
    const scoreO = document.getElementById('score-o');
    const scoreDraws = document.getElementById('score-draws');
    const cells = document.querySelectorAll('.cell');
    const resetButton = document.getElementById('reset-btn');
    const leaveGameBtn = document.getElementById('leave-game-btn');
    
    // DOM elements - Notification
    const notificationToast = document.getElementById('notification-toast');
    const notificationMessage = document.getElementById('notification-message');
    
    // Game state
    let gameActive = false;
    let currentPlayer = 'X';
    let gameState = ['', '', '', '', '', '', '', '', ''];
    let scores = { X: 0, O: 0, draws: 0 };
    let isMultiplayer = true;
    
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
                
                // Show username
                if (data.username) {
                    usernameDisplay.textContent = data.username;
                }
                
                // Show stats div
                userStatsDiv.classList.remove('hidden');
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
            connectionBadge.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
            connectionBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-green-500 mr-1"></span>Connected';
        } else {
            connectionBadge.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
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
    
    // DOM elements - Leaderboard screen
    const leaderboardContent = document.getElementById('leaderboard-content');
    const canceWaitBtn = document.getElementById('cancel-wait-btn');
    
    // Show a specific screen and hide others
    function showScreen(screenToShow) {
        [welcomeScreen, homeScreen, waitingScreen, gameScreen, leaderboardScreen].forEach(screen => {
            if (screen === screenToShow) {
                screen.classList.remove('hidden');
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
        updatePlayerNames();
    }
    
    // Update turn indicator
    function updateTurnIndicator() {
        playerTurn.textContent = currentPlayerTurn(currentPlayer);
        
        if (currentPlayer === 'X') {
            playerTurn.className = 'text-xl font-semibold text-blue-600';
        } else {
            playerTurn.className = 'text-xl font-semibold text-red-600';
        }
        
        // Update game status message
        if (!gameActive) {
            // Game is over, status message is already set by handleWin or handleDraw
            return;
        } else if (isMultiplayer && !ticTacToeClient.isMyTurn()) {
            gameStatus.textContent = waitingForOpponent();
        } else {
            gameStatus.textContent = 'Your turn...';
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
            cell.classList.remove('bg-green-200', 'text-blue-600', 'text-red-600', 'x', 'o');
            cell.classList.add('bg-white');
        });
        
        // Update UI
        gameStatus.textContent = '';
        updateTurnIndicator();
        updateCellsInteractivity();
    }
    
    // Handle win condition
    function handleWin(winner, winningCombo, updatedScores) {
        const isYou = ticTacToeClient.getMySymbol() === winner;
        gameStatus.textContent = winningMessage(winner, isYou);
        
        // Highlight winning cells
        winningCombo.forEach(index => {
            cells[index].classList.remove('bg-white');
            cells[index].classList.add('bg-green-200');
        });
        
        // Update score
        scores = updatedScores || scores;
        updateScoreDisplay();
        updateCellsInteractivity();
    }
    
    // Handle draw condition
    function handleDraw(updatedScores) {
        gameStatus.textContent = drawMessage();
        scores = updatedScores || scores;
        updateScoreDisplay();
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
        
        // In multiplayer mode, send the move to the server
        if (isMultiplayer) {
            // Check if it's the player's turn and the cell is empty
            if (ticTacToeClient.isMyTurn() && gameState[clickedCellIndex] === '' && gameActive) {
                ticTacToeClient.makeMove(clickedCellIndex);
            }
        } else {
            // Local game logic (fallback)
            if (gameState[clickedCellIndex] !== '' || !gameActive) {
                return;
            }
            
            // Update game state and UI
            gameState[clickedCellIndex] = currentPlayer;
            updateCellUI(clickedCellIndex, currentPlayer);
            
            // Check for win or draw
            let roundWon = false;
            let winningCombo = [];
            
            // Check all winning combinations
            for (let i = 0; i < winningConditions.length; i++) {
                const [a, b, c] = winningConditions[i];
                const condition = gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c];
                
                if (condition) {
                    roundWon = true;
                    winningCombo = [a, b, c];
                    break;
                }
            }
            
            // Handle win
            if (roundWon) {
                handleWin(currentPlayer, winningCombo, scores);
                gameActive = false;
                return;
            }
            
            // Handle draw
            const roundDraw = !gameState.includes('');
            if (roundDraw) {
                handleDraw(scores);
                gameActive = false;
                return;
            }
            
            // Continue game with next player
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateTurnIndicator();
        }
    }
    
    // Update leaderboard display
    function updateLeaderboard(players) {
        if (!players || players.length === 0) {
            leaderboardContent.innerHTML = '<div class="text-center text-gray-500 py-2">No players found</div>';
            return;
        }
        
        let html = '<table class="w-full">';
        html += '<thead><tr class="border-b border-gray-200">';
        html += '<th class="text-left py-2">Player</th>';
        html += '<th class="text-center py-2">Wins</th>';
        html += '<th class="text-center py-2">Losses</th>';
        html += '<th class="text-center py-2">Draws</th>';
        html += '</tr></thead><tbody>';
        
        players.forEach((player, index) => {
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
    
    // Update player names in game screen
    function updatePlayerNames() {
        if (!ticTacToeClient.room || !ticTacToeClient.player) return;
        
        const players = ticTacToeClient.room.players;
        const mySymbol = ticTacToeClient.player.symbol;
        
        // Find players by symbol
        const playerX = players.find(p => p.symbol === 'X');
        const playerO = players.find(p => p.symbol === 'O');
        
        // Update player X info
        if (playerX) {
            playerXName.textContent = playerX.username || 'Player X';
            youBadgeX.classList.toggle('hidden', mySymbol !== 'X');
        }
        
        // Update player O info
        if (playerO) {
            playerOName.textContent = playerO.username || 'Player O';
            youBadgeO.classList.toggle('hidden', mySymbol !== 'O');
        }
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
    
    // Event listeners - Leaderboard screen
    canceWaitBtn.addEventListener('click', () => {
        showScreen(homeScreen);
    });
    
    // Event listeners - Home screen
    viewLeaderboardBtn.addEventListener('click', () => {
        ticTacToeClient.getLeaderboard();
        showScreen(leaderboardScreen);
    });
    
    createRoomBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        ticTacToeClient.createRoom(username);
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
    
    // Initialize UI
    showScreen(welcomeScreen);
});
