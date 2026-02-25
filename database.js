const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'quiz.db');
        this.backupPath = path.join(__dirname, 'questions.json');
        this.db = new sqlite3.Database(this.dbPath);
        this.init();
    }

    init() {
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
            `);

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
            `);

            // Check if questions table is empty
            this.db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
                if (row && row.count === 0) {
                    this.seedQuestions();
                }
            });
        });
    }

    seedQuestions() {
        const defaultQuestions = [
            // General Knowledge (1-10)
            { levelId: 1, title: "What is the capital of France?", description: "A famous European city", options: JSON.stringify(["London", "Berlin", "Paris", "Madrid"]), correct: "C", category: "Geography", difficulty: "easy" },
            { levelId: 2, title: "Which planet is known as the Red Planet?", description: "Named after the Roman god of war", options: JSON.stringify(["Venus", "Mars", "Jupiter", "Saturn"]), correct: "B", category: "Science", difficulty: "easy" },
            { levelId: 3, title: "Who painted the Mona Lisa?", description: "Renaissance artist", options: JSON.stringify(["Van Gogh", "Picasso", "Da Vinci", "Rembrandt"]), correct: "C", category: "Art", difficulty: "easy" },
            { levelId: 4, title: "What is the largest ocean on Earth?", description: "Covers about 30% of Earth's surface", options: JSON.stringify(["Atlantic", "Indian", "Arctic", "Pacific"]), correct: "D", category: "Geography", difficulty: "easy" },
            { levelId: 5, title: "In which year did World War II end?", description: "A significant historical year", options: JSON.stringify(["1943", "1944", "1945", "1946"]), correct: "C", category: "History", difficulty: "medium" },
            { levelId: 6, title: "What is the chemical symbol for gold?", description: "From the Latin 'aurum'", options: JSON.stringify(["Go", "Gd", "Au", "Ag"]), correct: "C", category: "Science", difficulty: "easy" },
            { levelId: 7, title: "Who wrote 'Romeo and Juliet'?", description: "Famous English playwright", options: JSON.stringify(["Dickens", "Shakespeare", "Hemingway", "Tolkien"]), correct: "B", category: "Art", difficulty: "easy" },
            { levelId: 8, title: "What is the fastest land animal?", description: "Can reach speeds up to 70 mph", options: JSON.stringify(["Lion", "Cheetah", "Leopard", "Horse"]), correct: "B", category: "General", difficulty: "easy" },
            { levelId: 9, title: "How many continents are there?", description: "Standard geographical count", options: JSON.stringify(["5", "6", "7", "8"]), correct: "C", category: "Geography", difficulty: "easy" },
            { levelId: 10, title: "What is the square root of 144?", description: "Basic mathematics", options: JSON.stringify(["10", "11", "12", "13"]), correct: "C", category: "Science", difficulty: "easy" },
            
            // Science & Nature (11-20)
            { levelId: 11, title: "What is the hardest natural substance on Earth?", description: "Used in cutting tools", options: JSON.stringify(["Gold", "Iron", "Diamond", "Platinum"]), correct: "C", category: "Science", difficulty: "easy" },
            { levelId: 12, title: "What is the largest mammal?", description: "Lives in the ocean", options: JSON.stringify(["Elephant", "Blue Whale", "Giraffe", "Great White Shark"]), correct: "B", category: "Science", difficulty: "easy" },
            { levelId: 13, title: "How many bones are in the adult human body?", description: "Varies slightly between people", options: JSON.stringify(["206", "208", "210", "212"]), correct: "A", category: "Science", difficulty: "medium" },
            { levelId: 14, title: "What is the smallest prime number?", description: "The first prime number", options: JSON.stringify(["0", "1", "2", "3"]), correct: "C", category: "Science", difficulty: "easy" },
            { levelId: 15, title: "Which gas do plants absorb from the atmosphere?", description: "Essential for photosynthesis", options: JSON.stringify(["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"]), correct: "B", category: "Science", difficulty: "easy" },
            { levelId: 16, title: "What is the boiling point of water in Celsius?", description: "At sea level", options: JSON.stringify(["90°", "100°", "110°", "120°"]), correct: "B", category: "Science", difficulty: "easy" },
            { levelId: 17, title: "Which planet has the most moons?", description: "Gas giant with many satellites", options: JSON.stringify(["Jupiter", "Saturn", "Uranus", "Neptune"]), correct: "B", category: "Science", difficulty: "hard" },
            { levelId: 18, title: "What is the study of fungi called?", description: "Branch of biology", options: JSON.stringify(["Botany", "Zoology", "Mycology", "Ecology"]), correct: "C", category: "Science", difficulty: "medium" },
            { levelId: 19, title: "What is the atomic number of Oxygen?", description: "Its position in periodic table", options: JSON.stringify(["6", "7", "8", "9"]), correct: "C", category: "Science", difficulty: "medium" },
            { levelId: 20, title: "Which vitamin is produced by sunlight?", description: "Essential for bone health", options: JSON.stringify(["A", "B", "C", "D"]), correct: "D", category: "Science", difficulty: "easy" },
            
            // History (21-30)
            { levelId: 21, title: "Who was the first US President?", description: "Led the Continental Army", options: JSON.stringify(["Adams", "Jefferson", "Washington", "Lincoln"]), correct: "C", category: "History", difficulty: "easy" },
            { levelId: 22, title: "In which year did the Titanic sink?", description: "Famous maritime disaster", options: JSON.stringify(["1910", "1912", "1914", "1916"]), correct: "B", category: "History", difficulty: "medium" },
            { levelId: 23, title: "Who was the first man on the moon?", description: "Apollo 11 mission", options: JSON.stringify(["Aldrin", "Armstrong", "Collins", "Gagarin"]), correct: "B", category: "History", difficulty: "easy" },
            { levelId: 24, title: "What year did the Berlin Wall fall?", description: "End of Cold War era", options: JSON.stringify(["1987", "1988", "1989", "1990"]), correct: "C", category: "History", difficulty: "medium" },
            { levelId: 25, title: "Who was the first emperor of China?", description: "Unified China", options: JSON.stringify(["Han Wudi", "Qin Shi Huang", "Tang Taizong", "Song Taizu"]), correct: "B", category: "History", difficulty: "hard" },
            { levelId: 26, title: "The Magna Carta was signed in which year?", description: "Limited royal power", options: JSON.stringify(["1215", "1315", "1415", "1515"]), correct: "A", category: "History", difficulty: "hard" },
            { levelId: 27, title: "Who discovered penicillin?", description: "Nobel Prize in Medicine", options: JSON.stringify(["Fleming", "Pasteur", "Koch", "Lister"]), correct: "A", category: "History", difficulty: "medium" },
            { levelId: 28, title: "The Renaissance began in which country?", description: "Birthplace of many artists", options: JSON.stringify(["France", "Spain", "Italy", "England"]), correct: "C", category: "History", difficulty: "medium" },
            { levelId: 29, title: "Who was the first woman to win a Nobel Prize?", description: "Physics and Chemistry", options: JSON.stringify(["Curie", "Mayer", "Joliot-Curie", "Hodgkin"]), correct: "A", category: "History", difficulty: "hard" },
            { levelId: 30, title: "What year did the American Revolution begin?", description: "Shot heard round the world", options: JSON.stringify(["1774", "1775", "1776", "1777"]), correct: "B", category: "History", difficulty: "medium" },
            
            // Entertainment (31-40)
            { levelId: 31, title: "Which movie won the first Oscar for Best Picture?", description: "Silent film about aviation", options: JSON.stringify(["Wings", "Sunrise", "The Broadway Melody", "All Quiet on the Western Front"]), correct: "A", category: "Entertainment", difficulty: "hard" },
            { levelId: 32, title: "Who played Iron Man in the Marvel movies?", description: "Genius billionaire", options: JSON.stringify(["Evans", "Downey Jr.", "Hemsworth", "Holland"]), correct: "B", category: "Entertainment", difficulty: "easy" },
            { levelId: 33, title: "Which band performed 'Bohemian Rhapsody'?", description: "British rock band", options: JSON.stringify(["Led Zeppelin", "Pink Floyd", "Queen", "The Beatles"]), correct: "C", category: "Entertainment", difficulty: "easy" },
            { levelId: 34, title: "Who directed 'Jurassic Park'?", description: "Also directed 'E.T.'", options: JSON.stringify(["Spielberg", "Lucas", "Cameron", "Scorsese"]), correct: "A", category: "Entertainment", difficulty: "easy" },
            { levelId: 35, title: "Which TV show features the character 'Walter White'?", description: "Chemistry teacher turned drug lord", options: JSON.stringify(["The Wire", "Breaking Bad", "Mad Men", "Dexter"]), correct: "B", category: "Entertainment", difficulty: "easy" },
            { levelId: 36, title: "Who sang 'Thriller'?", description: "King of Pop", options: JSON.stringify(["Prince", "Jackson", "Madonna", "Bowie"]), correct: "B", category: "Entertainment", difficulty: "easy" },
            { levelId: 37, title: "Which Harry Potter book was the longest?", description: "Order of the Phoenix", options: JSON.stringify(["4th", "5th", "6th", "7th"]), correct: "B", category: "Entertainment", difficulty: "medium" },
            { levelId: 38, title: "Who played James Bond in 'Casino Royale'?", description: "First Bond of the 21st century", options: JSON.stringify(["Brosnan", "Craig", "Dalton", "Moore"]), correct: "B", category: "Entertainment", difficulty: "easy" },
            { levelId: 39, title: "What is the highest-grossing film of all time?", description: "As of 2024", options: JSON.stringify(["Avatar", "Avengers: Endgame", "Titanic", "Star Wars"]), correct: "A", category: "Entertainment", difficulty: "medium" },
            { levelId: 40, title: "Who created the character 'Sherlock Holmes'?", description: "Scottish author", options: JSON.stringify(["Dickens", "Doyle", "Christie", "Tolkien"]), correct: "B", category: "Entertainment", difficulty: "easy" },
            
            // Geography (41-50)
            { levelId: 41, title: "What is the longest river in the world?", description: "Flows through Egypt", options: JSON.stringify(["Amazon", "Nile", "Yangtze", "Mississippi"]), correct: "B", category: "Geography", difficulty: "medium" },
            { levelId: 42, title: "Which country has the most natural lakes?", description: "Known for maple syrup", options: JSON.stringify(["USA", "Russia", "Canada", "China"]), correct: "C", category: "Geography", difficulty: "hard" },
            { levelId: 43, title: "What is the smallest country in the world?", description: "Located in Rome", options: JSON.stringify(["Monaco", "Vatican City", "San Marino", "Malta"]), correct: "B", category: "Geography", difficulty: "easy" },
            { levelId: 44, title: "Mount Everest is located in which mountain range?", description: "Himalayas", options: JSON.stringify(["Andes", "Alps", "Rockies", "Himalayas"]), correct: "D", category: "Geography", difficulty: "easy" },
            { levelId: 45, title: "Which desert is the largest in the world?", description: "Sahara", options: JSON.stringify(["Sahara", "Arabian", "Gobi", "Kalahari"]), correct: "A", category: "Geography", difficulty: "easy" },
            { levelId: 46, title: "What is the capital of Japan?", description: "Tokyo", options: JSON.stringify(["Seoul", "Beijing", "Bangkok", "Tokyo"]), correct: "D", category: "Geography", difficulty: "easy" },
            { levelId: 47, title: "Which country is both in Europe and Asia?", description: "Transcontinental", options: JSON.stringify(["Russia", "Turkey", "Egypt", "Both A and B"]), correct: "D", category: "Geography", difficulty: "medium" },
            { levelId: 48, title: "What is the deepest ocean?", description: "Pacific", options: JSON.stringify(["Atlantic", "Indian", "Pacific", "Arctic"]), correct: "C", category: "Geography", difficulty: "easy" },
            { levelId: 49, title: "How many time zones does Russia have?", description: "Largest country", options: JSON.stringify(["9", "10", "11", "12"]), correct: "C", category: "Geography", difficulty: "hard" },
            { levelId: 50, title: "Which African country was formerly known as Abyssinia?", description: "Never colonized", options: JSON.stringify(["Egypt", "Ethiopia", "Sudan", "Kenya"]), correct: "B", category: "Geography", difficulty: "hard" }
        ];

        const stmt = this.db.prepare(`
            INSERT INTO questions (levelId, title, description, options, correct, category, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        defaultQuestions.forEach(q => {
            stmt.run(q.levelId, q.title, q.description, q.options, q.correct, q.category, q.difficulty);
        });

        stmt.finalize();
        console.log('✅ Seeded 50 default questions');
    }

    // ===== USER METHODS =====

    getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createUser(username, password) {
        return new Promise((resolve, reject) => {
            this.db.run(
                "INSERT INTO users (username, password, level, gems, score, completedLevels) VALUES (?, ?, 1, 100, 0, '[]')",
                [username, password],
                function(err) {
                    if (err) reject(err);
                    else {
                        resolve({
                            id: this.lastID,
                            username,
                            password,
                            level: 1,
                            gems: 100,
                            score: 0,
                            completedLevels: '[]'
                        });
                    }
                }
            );
        });
    }

    updateUser(username, updates) {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(updates), username];
            
            this.db.run(
                `UPDATE users SET ${fields} WHERE username = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else {
                        this.getUserByUsername(username).then(resolve);
                    }
                }
            );
        });
    }

    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM users ORDER BY score DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getUserCount() {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    // ===== QUESTION METHODS =====

    getAllQuestions() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM questions ORDER BY levelId", (err, rows) => {
                if (err) reject(err);
                else {
                    // Parse options JSON
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
            this.db.get("SELECT * FROM questions WHERE id = ? OR levelId = ?", [id, id], (err, row) => {
                if (err) reject(err);
                else if (row) {
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
            this.db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    addQuestion(question) {
        return new Promise((resolve, reject) => {
            // Get next levelId
            this.db.get("SELECT MAX(levelId) as maxId FROM questions", (err, row) => {
                const nextLevelId = (row.maxId || 0) + 1;
                
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
                        if (err) reject(err);
                        else {
                            resolve({
                                id: this.lastID,
                                levelId: nextLevelId,
                                ...question,
                                options: question.options
                            });
                        }
                    }
                );
            });
        });
    }

    updateQuestion(id, updates) {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(updates), id];
            
            this.db.run(
                `UPDATE questions SET ${fields} WHERE id = ? OR levelId = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else {
                        this.getQuestionById(id).then(resolve);
                    }
                }
            );
        });
    }

    deleteQuestion(id) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM questions WHERE id = ? OR levelId = ?", [id, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    getQuestionsByCategory() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT category, COUNT(*) as count FROM questions GROUP BY category", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getQuestionsByDifficulty() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT difficulty, COUNT(*) as count FROM questions GROUP BY difficulty", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ===== BACKUP & RESTORE =====

    backupToJSON() {
        return new Promise((resolve, reject) => {
            this.getAllQuestions().then(questions => {
                const backup = {
                    timestamp: new Date().toISOString(),
                    count: questions.length,
                    questions
                };
                
                // Save to file
                const fs = require('fs');
                fs.writeFileSync(this.backupPath, JSON.stringify(backup, null, 2));
                
                resolve(backup);
            }).catch(reject);
        });
    }

    restoreFromJSON(questions) {
        return new Promise((resolve, reject) => {
            // Clear existing questions
            this.db.run("DELETE FROM questions", (err) => {
                if (err) reject(err);
                
                // Reset autoincrement
                this.db.run("DELETE FROM sqlite_sequence WHERE name='questions'", () => {
                    // Insert restored questions
                    const stmt = this.db.prepare(`
                        INSERT INTO questions (levelId, title, description, options, correct, category, difficulty)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    questions.forEach(q => {
                        stmt.run(
                            q.levelId,
                            q.title,
                            q.description || '',
                            JSON.stringify(q.options),
                            q.correct,
                            q.category || 'General',
                            q.difficulty || 'medium'
                        );
                    });
                    
                    stmt.finalize();
                    resolve(questions.length);
                });
            });
        });
    }
}

module.exports = new Database();