const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'quiz.db');
        this.backupPath = path.join(__dirname, 'questions.json');
        this.db = null;
        this.init();
    }

    init() {
        try {
            console.log('Initializing database at:', this.dbPath);
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    return;
                }
                console.log('Connected to SQLite database');
                this.createTables();
            });
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }

    createTables() {
        this.db.serialize(() => {
            // Create users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    level INTEGER DEFAULT 1,
                    gems INTEGER DEFAULT 100,
                    score INTEGER DEFAULT 0,
                    completedLevels TEXT DEFAULT '[]',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating users table:', err);
                else console.log('Users table ready');
            });

            // Create questions table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    levelId INTEGER UNIQUE,
                    title TEXT NOT NULL,
                    description TEXT,
                    options TEXT NOT NULL,
                    correct TEXT NOT NULL,
                    category TEXT DEFAULT 'General',
                    difficulty TEXT DEFAULT 'medium',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating questions table:', err);
                else {
                    console.log('Questions table ready');
                    this.checkAndSeedQuestions();
                }
            });
        });
    }

    checkAndSeedQuestions() {
        this.db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
            if (err) {
                console.error('Error checking questions:', err);
                return;
            }
            if (row && row.count === 0) {
                console.log('Seeding default questions...');
                this.seedQuestions();
            }
        });
    }

    seedQuestions() {
        const defaultQuestions = [
            [1, "What is the capital of France?", "City of Love", JSON.stringify(["London", "Berlin", "Paris", "Madrid"]), "C", "Geography", "easy"],
            [2, "Which planet is known as the Red Planet?", "Named after Roman god of war", JSON.stringify(["Venus", "Mars", "Jupiter", "Saturn"]), "B", "Science", "easy"],
            [3, "Who painted the Mona Lisa?", "Renaissance artist", JSON.stringify(["Van Gogh", "Picasso", "Da Vinci", "Rembrandt"]), "C", "Art", "easy"],
            [4, "What is the largest ocean on Earth?", "Covers 30% of Earth", JSON.stringify(["Atlantic", "Indian", "Arctic", "Pacific"]), "D", "Geography", "easy"],
            [5, "In which year did World War II end?", "Global conflict", JSON.stringify(["1943", "1944", "1945", "1946"]), "C", "History", "medium"],
            [6, "What is the chemical symbol for gold?", "From Latin 'aurum'", JSON.stringify(["Go", "Gd", "Au", "Ag"]), "C", "Science", "easy"],
            [7, "Who wrote 'Romeo and Juliet'?", "English playwright", JSON.stringify(["Dickens", "Shakespeare", "Hemingway", "Tolkien"]), "B", "Art", "easy"],
            [8, "What is the fastest land animal?", "Can reach 70 mph", JSON.stringify(["Lion", "Cheetah", "Leopard", "Horse"]), "B", "General", "easy"],
            [9, "How many continents are there?", "Standard count", JSON.stringify(["5", "6", "7", "8"]), "C", "Geography", "easy"],
            [10, "What is the square root of 144?", "Basic math", JSON.stringify(["10", "11", "12", "13"]), "C", "Science", "easy"]
        ];

        const stmt = this.db.prepare(`
            INSERT INTO questions (levelId, title, description, options, correct, category, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        defaultQuestions.forEach(q => {
            stmt.run(q[0], q[1], q[2], q[3], q[4], q[5], q[6], (err) => {
                if (err) console.error('Error seeding question:', err);
            });
        });

        stmt.finalize();
        console.log('✅ Seeded 10 default questions');
    }

    // ===== USER METHODS =====
    getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                if (err) {
                    console.error('Error in getUserByUsername:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    createUser(username, password) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.run(
                "INSERT INTO users (username, password, level, gems, score, completedLevels) VALUES (?, ?, 1, 100, 0, '[]')",
                [username, password],
                function(err) {
                    if (err) {
                        console.error('Error in createUser:', err);
                        reject(err);
                    } else {
                        // Get the created user
                        this.db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    }
                }
            );
        });
    }

    updateUser(username, updates) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(updates), username];
            
            this.db.run(
                `UPDATE users SET ${fields} WHERE username = ?`,
                values,
                (err) => {
                    if (err) {
                        console.error('Error in updateUser:', err);
                        reject(err);
                    } else {
                        this.getUserByUsername(username).then(resolve).catch(reject);
                    }
                }
            );
        });
    }

    getAllUsers() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all("SELECT * FROM users ORDER BY score DESC", (err, rows) => {
                if (err) {
                    console.error('Error in getAllUsers:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    getUserCount() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(0);
                return;
            }
            this.db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (err) {
                    console.error('Error in getUserCount:', err);
                    resolve(0);
                } else {
                    resolve(row ? row.count : 0);
                }
            });
        });
    }

    // ===== QUESTION METHODS =====
    getAllQuestions() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all("SELECT * FROM questions ORDER BY levelId", (err, rows) => {
                if (err) {
                    console.error('Error in getAllQuestions:', err);
                    reject(err);
                } else {
                    const questions = rows.map(q => ({
                        ...q,
                        options: JSON.parse(q.options)
                    }));
                    resolve(questions);
                }
            });
        });
    }

    getQuestionById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.get("SELECT * FROM questions WHERE id = ? OR levelId = ?", [id, id], (err, row) => {
                if (err) {
                    console.error('Error in getQuestionById:', err);
                    reject(err);
                } else if (row) {
                    resolve({
                        ...row,
                        options: JSON.parse(row.options)
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    getQuestionCount() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(0);
                return;
            }
            this.db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
                if (err) {
                    console.error('Error in getQuestionCount:', err);
                    resolve(0);
                } else {
                    resolve(row ? row.count : 0);
                }
            });
        });
    }

    addQuestion(question) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.get("SELECT MAX(levelId) as maxId FROM questions", (err, row) => {
                if (err) {
                    console.error('Error getting max levelId:', err);
                    reject(err);
                    return;
                }
                
                const nextLevelId = (row && row.maxId ? row.maxId : 0) + 1;
                
                this.db.run(
                    `INSERT INTO questions (levelId, title, description, options, correct, category, difficulty)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        nextLevelId,
                        question.title,
                        question.description || '',
                        JSON.stringify(question.options),
                        question.correct,
                        question.category || 'General',
                        question.difficulty || 'medium'
                    ],
                    function(err) {
                        if (err) {
                            console.error('Error adding question:', err);
                            reject(err);
                        } else {
                            resolve({
                                id: this.lastID,
                                levelId: nextLevelId,
                                ...question
                            });
                        }
                    }
                );
            });
        });
    }
}

// Export a singleton instance
const dbInstance = new Database();
module.exports = dbInstance;
