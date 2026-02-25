const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ===== REST API ENDPOINTS =====

// Health check with error handling
app.get('/health', async (req, res) => {
    try {
        let questionCount = 0;
        let userCount = 0;
        
        try {
            questionCount = await db.getQuestionCount();
        } catch (e) {
            console.error('Error getting question count:', e);
        }
        
        try {
            userCount = await db.getUserCount();
        } catch (e) {
            console.error('Error getting user count:', e);
        }
        
        res.json({ 
            status: 'ok', 
            time: new Date().toISOString(),
            questions: questionCount,
            users: userCount,
            database: db.db ? 'connected' : 'disconnected'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.json({ 
            status: 'degraded', 
            time: new Date().toISOString(),
            questions: 0,
            users: 0,
            error: error.message
        });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Special admin login
    if (username === 'admin' && password === 'QuizMaster2024!') {
        const user = {
            id: 'admin',
            username: 'admin',
            level: 999,
            gems: 9999,
            score: 99999,
            completedLevels: [],
            isAdmin: true
        };
        return res.json({ success: true, user });
    }
    
    // Regular user login/registration
    let user = db.getUserByUsername(username);
    
    if (!user) {
        // Create new user
        user = db.createUser(username, password);
    } else {
        // Verify password (simple for demo)
        if (user.password !== password) {
            return res.json({ success: false, error: 'Invalid password' });
        }
    }
    
    // Remove password from response
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// Get all levels
app.get('/api/levels', (req, res) => {
    const levels = db.getAllQuestions();
    res.json(levels);
});

// Get specific level
app.get('/api/levels/:id', (req, res) => {
    const level = db.getQuestionById(parseInt(req.params.id));
    if (level) {
        res.json(level);
    } else {
        res.status(404).json({ error: 'Level not found' });
    }
});

// Update user progress
app.post('/api/progress', (req, res) => {
    const { username, levelId, completed, score, gems } = req.body;
    
    const user = db.getUserByUsername(username);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user progress
    const completedLevels = user.completedLevels ? JSON.parse(user.completedLevels) : [];
    if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
    }
    
    const updatedUser = db.updateUser(username, {
        level: user.level + 1,
        gems: user.gems + (gems || 0),
        score: user.score + (score || 0),
        completedLevels: JSON.stringify(completedLevels)
    });
    
    // Remove password from response
    const { password: _, ...safeUser } = updatedUser;
    res.json({ 
        success: true, 
        ...safeUser,
        completedLevels 
    });
});

// Admin: Add new question
app.post('/api/levels', (req, res) => {
    const { title, description, options, correct, category, difficulty } = req.body;
    
    const newQuestion = db.addQuestion({
        title,
        description,
        options,
        correct,
        category: category || 'General',
        difficulty: difficulty || 'medium'
    });
    
    // Notify all connected clients via socket
    io.emit('level-added', newQuestion);
    
    res.json({ success: true, question: newQuestion });
});

// Admin: Get all questions (with stats)
app.get('/api/admin/questions', (req, res) => {
    const questions = db.getAllQuestions();
    const stats = {
        total: questions.length,
        byCategory: db.getQuestionsByCategory(),
        byDifficulty: db.getQuestionsByDifficulty()
    };
    res.json({ questions, stats });
});

// Admin: Delete question
app.delete('/api/levels/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const success = db.deleteQuestion(id);
    if (success) {
        io.emit('level-deleted', id);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Question not found' });
    }
});

// Admin: Update question
app.put('/api/levels/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updated = db.updateQuestion(id, req.body);
    if (updated) {
        io.emit('level-updated', updated);
        res.json({ success: true, question: updated });
    } else {
        res.status(404).json({ error: 'Question not found' });
    }
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    const users = db.getAllUsers();
    const leaderboard = users
        .map(u => ({
            username: u.username,
            score: u.score,
            level: u.level,
            completedCount: u.completedLevels ? JSON.parse(u.completedLevels).length : 0
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    res.json(leaderboard);
});

// ===== SOCKET.IO CHAT =====
let onlineUsers = new Map(); // username -> socket.id
let messageHistory = [];
const MAX_MESSAGES = 100;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('join-chat', (username) => {
        onlineUsers.set(username, socket.id);
        socket.username = username;
        
        // Send message history to new user
        socket.emit('message-history', messageHistory.slice(-50));
        
        // Broadcast user joined
        io.emit('user-joined', { 
            username, 
            count: onlineUsers.size 
        });
        
        // Update online count for everyone
        io.emit('active-users', onlineUsers.size);
    });
    
    socket.on('send-message', (data) => {
        const message = {
            username: data.username,
            message: data.message,
            type: 'text',
            timestamp: new Date().toISOString()
        };
        
        messageHistory.push(message);
        if (messageHistory.length > MAX_MESSAGES) {
            messageHistory.shift();
        }
        
        io.emit('new-message', message);
    });
    
    socket.on('disconnect', () => {
        if (socket.username) {
            onlineUsers.delete(socket.username);
            io.emit('user-left', { 
                username: socket.username,
                count: onlineUsers.size 
            });
            io.emit('active-users', onlineUsers.size);
        }
        console.log('Client disconnected:', socket.id);
    });
});

// ===== BACKUP & RESTORE =====
app.post('/api/admin/backup', (req, res) => {
    const backup = db.backupToJSON();
    res.json(backup);
});

app.post('/api/admin/restore', (req, res) => {
    const { questions } = req.body;
    const restored = db.restoreFromJSON(questions);
    res.json({ success: true, count: restored });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: ${db.getQuestionCount()} questions, ${db.getUserCount()} users`);
    console.log(`🌍 Health check: http://localhost:${PORT}/health`);
});
// ===== LOGIN ENDPOINT - FIX THIS =====
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login attempt:', username); // Add this for debugging
        
        // Special admin login
        if (username === 'admin' && password === 'QuizMaster2024!') {
            const user = {
                id: 'admin',
                username: 'admin',
                level: 999,
                gems: 9999,
                score: 99999,
                completedLevels: [],
                isAdmin: true
            };
            return res.json({ success: true, user });
        }
        
        // Regular user login/registration
        let user = await db.getUserByUsername(username);
        
        if (!user) {
            // Create new user
            user = await db.createUser(username, password);
            console.log('New user created:', username);
        } else {
            // Verify password
            if (user.password !== password) {
                return res.json({ success: false, error: 'Invalid password' });
            }
        }
        
        // Remove password from response
        const { password: _, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
