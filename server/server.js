const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.get("/", (req, res) => {
  res.send("<h1>멀티룸 채팅 백엔드 작동 중!</h1>");
});

io.on("connection", (socket) => {
  console.log(`[접속] 유저 연결: ${socket.id}`);

  // [변경] 방 입장 로직
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`[방 입장] 유저 [${socket.id}] -> [${room}번 방]`);
  });

  // 🔥 [추가] 방 퇴장 로직 (기존 방의 메시지를 더 이상 안 받도록 차단)
  socket.on("leave_room", (room) => {
    socket.leave(room);
    console.log(`[방 퇴장] 유저 [${socket.id}] -> [${room}번 방]에서 나감`);
  });

  // 메시지 전송 로직 (기존과 동일)
  socket.on("send_message", (data) => {
    console.log(`[메시지] ${data.room}방 - ${data.author}: ${data.message}`);
    io.to(data.room).emit("send_message", data);
  });

  socket.on("disconnect", () => {
    console.log(`[종료] 유저 연결 끊김: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`서버 작동 중: 포트 ${PORT}`));