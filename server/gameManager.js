const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./gameRoom');

class GameManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map(); // Maps socketId to roomId
    }

    // Create a new game room
    createRoom() {
        const roomId = uuidv4().substring(0, 6).toUpperCase(); // Short, readable ID
        const room = new GameRoom(roomId);
        this.rooms.set(roomId, room);
        return roomId;
    }

    // Get a room by ID
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    // Add a player to a room
    addPlayerToRoom(roomId, playerId, socketId, username) {
        const room = this.getRoom(roomId);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        if (room.isFull()) {
            return { success: false, message: 'Room is full' };
        }

        const success = room.addPlayer(playerId, socketId, username);
        if (success) {
            this.playerRooms.set(socketId, roomId);
            return { 
                success: true, 
                room: room.getRoomState(),
                player: room.getPlayerBySocketId(socketId)
            };
        }

        return { success: false, message: 'Failed to add player to room' };
    }

    // Remove a player from their room
    removePlayer(socketId) {
        const roomId = this.playerRooms.get(socketId);
        if (!roomId) {
            return false;
        }

        const room = this.getRoom(roomId);
        if (!room) {
            this.playerRooms.delete(socketId);
            return false;
        }

        room.removePlayer(socketId);
        this.playerRooms.delete(socketId);

        // Clean up empty rooms
        if (room.isEmpty()) {
            this.rooms.delete(roomId);
        }

        return { roomId, room };
    }

    // Get the room a player is in
    getPlayerRoom(socketId) {
        const roomId = this.playerRooms.get(socketId);
        if (!roomId) {
            return null;
        }
        return this.getRoom(roomId);
    }

    // Make a move in a game
    makeMove(socketId, cellIndex) {
        const room = this.getPlayerRoom(socketId);
        if (!room) {
            return { success: false, message: 'Player not in a room' };
        }

        const result = room.makeMove(socketId, cellIndex);
        if (!result) {
            return { success: false, message: 'Invalid move' };
        }

        return {
            success: true,
            roomState: room.getRoomState(),
            result: result.result
        };
    }

    // Reset a game
    resetGame(roomId) {
        const room = this.getRoom(roomId);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        const result = room.resetGame();
        return {
            success: true,
            roomState: room.getRoomState()
        };
    }

    // Clean up inactive rooms (could be called periodically)
    cleanupInactiveRooms() {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.isEmpty()) {
                this.rooms.delete(roomId);
            }
        }
    }
}

module.exports = GameManager;
