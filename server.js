
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

let rooms = {};

const questions = [
  {
    question: "What is the capital of France?",
    options: ["Paris", "London", "Berlin", "Madrid"],
    answer: "Paris"
  },
  {
    question: "2 + 2 = ?",
    options: ["3", "4", "5", "6"],
    answer: "4"
  },
  {
    question: "Who wrote Hamlet?",
    options: ["Shakespeare", "Hemingway", "Dickens", "Tolstoy"],
    answer: "Shakespeare"
  }
];

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", () => {
    const roomId = generateRoomId();

    rooms[roomId] = {
      playerA: socket.id,
      playerB: null,
      scoreA: 0,
      scoreB: 0,
      currentQuestion: null
    };

    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
  });

  socket.on("joinRoom", (roomId) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit("error", "Room does not exist.");
      return;
    }

    if (room.playerB) {
      socket.emit("error", "Room is full.");
      return;
    }

    room.playerB = socket.id;
    socket.join(roomId);

    socket.emit("roomJoined", { roomId });

    io.to(room.playerA).emit("startGame");
    io.to(room.playerB).emit("startGame");

    sendQuestion(roomId);
  });

  socket.on("answer", ({ roomId, choice }) => {
    const room = rooms[roomId];
    if (!room) return;

    const correct = room.currentQuestion.answer === choice;

    if (socket.id === room.playerA && correct) {
      room.scoreA++;
      io.to(room.playerA).emit("scoreUpdate", room.scoreA);
    }

    if (socket.id === room.playerB && correct) {
      room.scoreB++;
      io.to(room.playerB).emit("scoreUpdate", room.scoreB);
    }

    sendQuestion(roomId);
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      const room = rooms[roomId];

      if (room.playerA === socket.id) {
        io.to(roomId).emit("opponentStatus", false);
        delete rooms[roomId];
      }

      if (room.playerB === socket.id) {
        room.playerB = null;
        io.to(room.playerA).emit("opponentStatus", false);
      }
    }
  });
});

function sendQuestion(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const q = questions[Math.floor(Math.random() * questions.length)];
  room.currentQuestion = q;

  io.to(roomId).emit("newQuestion", {
    question: q.question,
    options: q.options
  });

  io.to(roomId).emit("opponentStatus", true);
}

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
