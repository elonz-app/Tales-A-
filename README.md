# A' - Real-Time Quiz Game with Invite System

## 🎮 Features
- **Invite System**: Create games and share invite codes
- **QR Code Generation**: Scan to join instantly
- **WhatsApp/Telegram Sharing**: One-click invite sharing
- **Real-time Gameplay**: Questions and answers in real-time
- **Player Roles**: Choose Player A or B
- **Online Status**: See when opponent is online/typing
- **Local Storage**: Save question history
- **Profile Pictures**: Upload custom avatars

## 🚀 Quick Start

### Backend (Railway)
1. Create a new Railway project
2. Connect your GitHub repository or upload files
3. Add environment variable: `PORT=3000`
4. Deploy and get your Railway URL

### Frontend (GitHub Pages)
1. Update `SOCKET_URL` in index.html with your Railway URL
2. Push to GitHub
3. Enable GitHub Pages in repository settings

## 📱 How to Play

### Creating a Game
1. Open the app
2. Click "Create Game"
3. Enter your name and choose player type
4. Share the invite code or QR code with a friend
5. Wait for them to join

### Joining a Game
1. Open the app
2. Click "Join Game"
3. Enter the invite code
4. Enter your name and choose available player
5. Start playing!

### Playing
- Ask questions to your opponent
- Answer questions they send
- Get points for correct answers
- See real-time typing indicators
- Track scores live

## 🔗 Invite Links
Share via:
- **Direct Link**: `https://yourgame.com?join=CODE`
- **WhatsApp**: One-click sharing
- **Telegram**: Instant sharing
- **QR Code**: Scan to join
- **Copy Code**: Manual sharing

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-game` | POST | Create new game room |
| `/api/join-game` | POST | Validate and join game |
| `/api/room/:code` | GET | Get room information |
| `/api/rooms` | GET | List active rooms |

## 🔧 Configuration

Update the Socket.io URL in index.html:
```javascript
const SOCKET_URL = 'https://your-railway-app.up.railway.app';