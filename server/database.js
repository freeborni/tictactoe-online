const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialize the database
const dbPath = path.join(dataDir, 'tictactoe.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
function initializeDatabase() {
    return new Promise((resolve, reject) => {
// Create users table
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
                reject(err);
                return;
            }
            
            // Create games table for history (optional)
            db.run(`
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_x TEXT NOT NULL,
                    player_o TEXT NOT NULL,
                    winner TEXT,
                    is_draw BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating games table:', err);
                    reject(err);
                    return;
                }
                
                console.log('Database initialized');
                resolve();
            });
        });
    });
}

// Get or create user
function getOrCreateUser(username) {
    return new Promise((resolve, reject) => {
        if (!username || username.trim() === '') {
            reject(new Error('Username cannot be empty'));
            return;
        }

        // Sanitize username
        username = username.trim().substring(0, 20);

        // Check if user exists
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                resolve(row);
                return;
            }

            // Create new user
            db.run('INSERT INTO users (username, wins, losses, draws) VALUES (?, 0, 0, 0)', [username], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve({
                    id: this.lastID,
                    username,
                    wins: 0,
                    losses: 0,
                    draws: 0
                });
            });
        });
    });
}

// Update user stats
function updateUserStats(username, didWin, isDraw = false) {
    return new Promise((resolve, reject) => {
        let query;
        
        if (isDraw) {
            query = 'UPDATE users SET draws = draws + 1 WHERE username = ?';
        } else {
            query = didWin 
                ? 'UPDATE users SET wins = wins + 1 WHERE username = ?'
                : 'UPDATE users SET losses = losses + 1 WHERE username = ?';
        }
            
        db.run(query, [username], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
}

// Update user stats for a draw
function updateUserDrawStats(username) {
    return updateUserStats(username, false, true);
}

// Record game result
function recordGame(playerX, playerO, winner, isDraw = false) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO games (player_x, player_o, winner, is_draw)
            VALUES (?, ?, ?, ?)
        `);
        
        stmt.run([playerX, playerO, winner || null, isDraw ? 1 : 0], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
        
        stmt.finalize();
    });
}

// Get top players by wins
function getTopPlayers(limit = 10) {
    return new Promise((resolve, reject) => {
        // First check if the 'draws' column exists
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Determine if draws column exists
            const hasDrawsColumn = columns && columns.some(col => col.name === 'draws');
            
            // Construct query based on column existence
            const query = hasDrawsColumn 
                ? `SELECT username, wins, losses, draws FROM users ORDER BY wins DESC LIMIT ?`
                : `SELECT username, wins, losses FROM users ORDER BY wins DESC LIMIT ?`;
            
            db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // If draws column doesn't exist, add default value
                if (!hasDrawsColumn) {
                    rows.forEach(row => {
                        row.draws = 0;
                    });
                }
                
                resolve(rows);
            });
        });
    });
}

// Get user stats
function getUserStats(username) {
    return new Promise((resolve, reject) => {
        // First check if the 'draws' column exists
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Determine if draws column exists
            const hasDrawsColumn = columns && columns.some(col => col.name === 'draws');
            
            // Construct query based on column existence
            const query = hasDrawsColumn 
                ? 'SELECT username, wins, losses, draws FROM users WHERE username = ?'
                : 'SELECT username, wins, losses FROM users WHERE username = ?';
            
            db.get(query, [username], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // If no user found, return null
                if (!row) {
                    resolve(null);
                    return;
                }
                
                // If draws column doesn't exist, add default value
                if (!hasDrawsColumn) {
                    row.draws = 0;
                }
                
                resolve(row);
            });
        });
    });
}

// Initialize the database on module load
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
});

module.exports = {
    getOrCreateUser,
    updateUserStats,
    updateUserDrawStats,
    recordGame,
    getTopPlayers,
    getUserStats
};
