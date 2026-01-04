import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const rooms = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("JOIN_ROOM", ({ roomId }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        strokes: [],
        clients: new Set(),
      };
    }

    socket.join(roomId);
    socket.roomId = roomId;

    rooms[roomId].clients.add(socket.id);

    socket.emit("INIT_STROKES", rooms[roomId].strokes);
  });

  socket.on("DRAW_STROKE", (stroke) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].strokes.push(stroke);
    socket.to(roomId).emit("DRAW_STROKE", stroke);
  });

  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].clients.delete(socket.id);

    if (rooms[roomId].clients.size === 0) {
      delete rooms[roomId];
    }

    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
