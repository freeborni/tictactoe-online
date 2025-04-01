// Socket.IO client for Tic-Tac-Toe multiplayer game

class TicTacToeClient {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.player = null;
        this.room = null;
        this.userStats = null;
        this.gameCallbacks = {};
        this.username = this.getSavedUsername() || '';
    }

    // Initialize the socket connection
    init(serverUrl = '') {
        return new Promise((resolve, reject) => {
            // Load Socket.IO client script dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            script.integrity = 'sha384-mZLF4UVrpi/QTWPA7BjNPEnkIfRFn4ZEO3Qt/HFklTJBj/gBOV8G3HcKn4NfQblz';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                // Connect to the server
                this.socket = io(serverUrl);
                
                // Set up event listeners
                this.setupEventListeners();
                
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load Socket.IO client'));
            };
            
            document.head.appendChild(script);
        });
    }

    // Set up Socket.IO event listeners
    setupEventListeners() {
        // Room creation response
        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.playerId = data.playerId;
            this.player = data.player;
            this.room = data.room;
            this.userStats = data.userStats;
            
            if (this.gameCallbacks.onRoomCreated) {
                this.gameCallbacks.onRoomCreated(data);
            }
        });
        
        // Room joining response
        this.socket.on('roomJoined', (data) => {
            this.roomId = data.roomId;
            this.playerId = data.playerId;
            this.player = data.player;
            this.room = data.room;
            this.userStats = data.userStats;
            
            if (this.gameCallbacks.onRoomJoined) {
                this.gameCallbacks.onRoomJoined(data);
            }
        });
        
        // Player joined notification
        this.socket.on('playerJoined', (data) => {
            this.room = data.room;
            
            if (this.gameCallbacks.onPlayerJoined) {
                this.gameCallbacks.onPlayerJoined(data);
            }
        });
        
        // Move made by any player
        this.socket.on('moveMade', (data) => {
            this.room = data.roomState;
            
            if (this.gameCallbacks.onMoveMade) {
                this.gameCallbacks.onMoveMade(data);
            }
        });
        
        // Game reset
        this.socket.on('gameReset', (data) => {
            this.room = data.roomState;
            
            if (this.gameCallbacks.onGameReset) {
                this.gameCallbacks.onGameReset(data);
            }
        });
        
        // Player disconnected
        this.socket.on('playerDisconnected', (data) => {
            this.room = data.roomState;
            
            if (this.gameCallbacks.onPlayerDisconnected) {
                this.gameCallbacks.onPlayerDisconnected(data);
            }
        });
        
        // User stats
        this.socket.on('userStats', (data) => {
            this.userStats = data;
            
            if (this.gameCallbacks.onUserStats) {
                this.gameCallbacks.onUserStats(data);
            }
        });
        
        // Leaderboard
        this.socket.on('leaderboard', (data) => {
            if (this.gameCallbacks.onLeaderboard) {
                this.gameCallbacks.onLeaderboard(data);
            }
        });
        
        // Error handling
        this.socket.on('error', (data) => {
            if (this.gameCallbacks.onError) {
                this.gameCallbacks.onError(data);
            }
        });
        
        // Room left response
        this.socket.on('roomLeft', (data) => {
            // Reset room-specific state
            this.roomId = null;
            this.playerId = null;
            this.player = null;
            this.room = null;
            
            if (this.gameCallbacks.onRoomLeft) {
                this.gameCallbacks.onRoomLeft(data);
            }
        });
        
        // Connection events
        this.socket.on('connect', () => {
            if (this.gameCallbacks.onConnect) {
                this.gameCallbacks.onConnect();
            }
        });
        
        this.socket.on('disconnect', () => {
            if (this.gameCallbacks.onDisconnect) {
                this.gameCallbacks.onDisconnect();
            }
        });

        // Chat events
        this.socket.on('chatMessage', (data) => {
            if (this.gameCallbacks.onChatMessage) {
                this.gameCallbacks.onChatMessage(data);
            }
        });

        // Chat history
        this.socket.on('chatHistory', (messages) => {
            if (this.gameCallbacks.onChatHistory) {
                this.gameCallbacks.onChatHistory(messages);
            }
        });
    }

    // Register callback functions
    on(event, callback) {
        this.gameCallbacks[event] = callback;
    }

    // Save username to local storage
    saveUsername(username) {
        if (username && username.trim() !== '') {
            this.username = username.trim();
            localStorage.setItem('ticTacToeUsername', this.username);
        }
    }

    // Get saved username from local storage
    getSavedUsername() {
        return localStorage.getItem('ticTacToeUsername');
    }

    // Create a new game room
    createRoom(username) {
        if (username) {
            this.saveUsername(username);
        }
        this.socket.emit('createRoom', { username: this.username });
    }

    // Join an existing room
    joinRoom(roomId, username) {
        if (username) {
            this.saveUsername(username);
        }
        this.socket.emit('joinRoom', { roomId, username: this.username });
    }

    // Make a move
    makeMove(cellIndex) {
        this.socket.emit('makeMove', { cellIndex });
    }

    // Reset the game
    resetGame() {
        this.socket.emit('resetGame');
    }

    // Get user stats
    getUserStats(username) {
        this.socket.emit('getUserStats', { username: username || this.username });
    }

    // Get leaderboard
    getLeaderboard() {
        this.socket.emit('getLeaderboard');
    }

    // Leave the current room without disconnecting from the server
    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('leaveRoom', { roomId: this.roomId });
            
            // Reset room-specific state
            this.roomId = null;
            this.playerId = null;
            this.player = null;
            this.room = null;
            
            // Emit an event to notify the client that the room was left
            if (this.gameCallbacks.onRoomLeft) {
                this.gameCallbacks.onRoomLeft();
            }
            
            return true;
        }
        return false;
    }

    // Check if it's the player's turn
    isMyTurn() {
        return this.room && 
               this.player && 
               this.room.currentPlayer === this.player.symbol;
    }

    // Get the current player's symbol (X or O)
    getMySymbol() {
        return this.player ? this.player.symbol : null;
    }

    // Get opponent player
    getOpponent() {
        if (!this.room || !this.player || this.room.players.length < 2) {
            return null;
        }
        
        return this.room.players.find(p => p.symbol !== this.player.symbol);
    }

    // Check if the game is active
    isGameActive() {
        return this.room && this.room.gameActive;
    }

    // Check if the room is full (2 players)
    isRoomFull() {
        return this.room && this.room.players.length === 2;
    }

    // Disconnect from the server
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    // Chat methods
    sendChatMessage(message) {
        if (this.socket && this.room) {
            this.socket.emit('chatMessage', {
                roomId: this.roomId,
                message: message,
                username: this.getSavedUsername()
            });
        }
    }
}

// Create a global instance
const ticTacToeClient = new TicTacToeClient();
