const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Import custom modules
const GameManager = require('./gameManager');
const db = require('./database');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '..')));
app.set("trust proxy", 1);


// Initialize Socket.IO
const io = socketIO(server, {
    cors: {
        origin: "localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Initialize game manager
const gameManager = new GameManager();

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Create a new game room
    socket.on('createRoom', async ({ username }) => {
        try {
            // Get or create user in database
            const user = await db.getOrCreateUser(username || 'Anonymous');
            
            // Create a new room
            const roomId = gameManager.createRoom();
            const playerId = uuidv4();
            
            // Add player to room
            const result = gameManager.addPlayerToRoom(roomId, playerId, socket.id, user.username);
            
            if (result.success) {
                // Join the socket room
                socket.join(roomId);
                
                // Send room created event
                socket.emit('roomCreated', {
                    roomId,
                    playerId,
                    player: result.player,
                    room: result.room,
                    userStats: user
                });
                
                console.log(`Room created: ${roomId} by ${user.username}`);
            } else {
                socket.emit('error', { message: result.message });
            }
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', { message: 'Failed to create room' });
        }
    });

    // Join an existing game room
    socket.on('joinRoom', async ({ roomId, username }) => {
        try {
            // Get or create user in database
            const user = await db.getOrCreateUser(username || 'Anonymous');
            
            // Get the room
            const room = gameManager.getRoom(roomId);
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            
            // Add player to room
            roomId = room.id;
            const playerId = uuidv4();
            const result = gameManager.addPlayerToRoom(roomId, playerId, socket.id, user.username);
            
            if (result.success) {
                // Join the socket room
                socket.join(roomId);
                
                // Send room joined event to the player
                socket.emit('roomJoined', {
                    roomId,
                    playerId,
                    player: result.player,
                    room: result.room,
                    userStats: user
                });
                
                // Notify other players in the room
                socket.to(roomId).emit('playerJoined', {
                    player: result.player,
                    room: result.room
                });
                
                console.log(`Player ${user.username} joined room: ${roomId}`);
            } else {
                socket.emit('error', { message: result.message });
            }
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Leave the current room
    socket.on('leaveRoom', async ({ roomId }) => {
        try {
            const result = gameManager.removePlayer(socket.id);
            
            if (result) {
                // Leave the socket room
                socket.leave(result.roomId);
                
                // Notify other players in the room
                socket.to(result.roomId).emit('playerDisconnected', {
                    roomState: result.room ? result.room.getRoomState() : null
                });
                
                // Notify the player
                socket.emit('roomLeft', { success: true });
                
                console.log(`Player left room: ${result.roomId}`);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
            socket.emit('error', { message: 'Failed to leave room' });
        }
    });

    // Make a move
    socket.on('makeMove', async ({ cellIndex }) => {
        try {
            const result = gameManager.makeMove(socket.id, cellIndex);
            
            if (result.success) {
                const room = gameManager.getPlayerRoom(socket.id);
                const roomId = room.id;
                
                // Broadcast the move to all players in the room
                io.to(roomId).emit('moveMade', {
                    cellIndex,
                    roomState: result.roomState,
                    result: result.result
                });
                
                // If the game ended, update player stats
                if (result.result.status === 'win' || result.result.status === 'draw') {
                    const players = room.players;
                    
                    // Find winner and loser
                    if (result.result.status === 'win') {
                        const winner = players.find(p => p.symbol === result.result.winner);
                        const loser = players.find(p => p.symbol !== result.result.winner);
                        
                        if (winner && loser) {
                            // Update stats in database
                            await db.updateUserStats(winner.username, true);
                            await db.updateUserStats(loser.username, false);
                            
                            // Record the game
                            await db.recordGame(
                                players[0].username,
                                players[1].username,
                                winner.username
                            );
                            
                            // Send updated stats to players
                            const winnerStats = await db.getUserStats(winner.username);
                            const loserStats = await db.getUserStats(loser.username);
                            
                            const winnerSocket = io.sockets.sockets.get(winner.socketId);
                            const loserSocket = io.sockets.sockets.get(loser.socketId);
                            
                            if (winnerSocket) {
                                winnerSocket.emit('userStats', winnerStats);
                            }
                            
                            if (loserSocket) {
                                loserSocket.emit('userStats', loserStats);
                            }
                        }
                    } else if (result.result.status === 'draw') {
                        // Update draw stats for both players
                        await db.updateUserDrawStats(players[0].username);
                        await db.updateUserDrawStats(players[1].username);
                        
                        // Record the draw game
                        await db.recordGame(
                            players[0].username,
                            players[1].username,
                            null,
                            true
                        );
                        
                        // Send updated stats to players
                        const player1Stats = await db.getUserStats(players[0].username);
                        const player2Stats = await db.getUserStats(players[1].username);
                        
                        const player1Socket = io.sockets.sockets.get(players[0].socketId);
                        const player2Socket = io.sockets.sockets.get(players[1].socketId);
                        
                        if (player1Socket) {
                            player1Socket.emit('userStats', player1Stats);
                        }
                        
                        if (player2Socket) {
                            player2Socket.emit('userStats', player2Stats);
                        }
                    }
                }
            } else {
                socket.emit('error', { message: result.message });
            }
        } catch (error) {
            console.error('Error making move:', error);
            socket.emit('error', { message: 'Failed to make move' });
        }
    });

    // Reset the game
    socket.on('resetGame', () => {
        try {
            const room = gameManager.getPlayerRoom(socket.id);
            if (!room) {
                socket.emit('error', { message: 'Player not in a room' });
                return;
            }
            
            const roomId = room.id;
            const result = gameManager.resetGame(roomId);
            
            if (result.success) {
                // Broadcast the reset to all players in the room
                io.to(roomId).emit('gameReset', {
                    roomState: result.roomState
                });
            } else {
                socket.emit('error', { message: result.message });
            }
        } catch (error) {
            console.error('Error resetting game:', error);
            socket.emit('error', { message: 'Failed to reset game' });
        }
    });

    // Get user stats
    socket.on('getUserStats', async ({ username }) => {
        try {
            if (!username) {
                socket.emit('error', { message: 'Username is required' });
                return;
            }
            
            const stats = await db.getUserStats(username);
            socket.emit('userStats', stats);
        } catch (error) {
            console.error('Error getting user stats:', error);
            socket.emit('error', { message: 'Failed to get user stats' });
        }
    });

    // Get leaderboard
    socket.on('getLeaderboard', async () => {
        try {
            const topPlayers = await db.getTopPlayers(10);
            socket.emit('leaderboard', topPlayers);
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            socket.emit('error', { message: 'Failed to get leaderboard' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        try {
            const result = gameManager.removePlayer(socket.id);
            
            if (result && result.roomId) {
                // Notify other players in the room
                socket.to(result.roomId).emit('playerDisconnected', {
                    roomState: result.room ? result.room.getRoomState() : null
                });
                
                console.log(`Player disconnected from room: ${result.roomId}`);
            }
            
            console.log(`Disconnected: ${socket.id}`);
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
