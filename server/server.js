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

const roomHistory = {}; // 메시지 기록 저장소

io.on("connection", (socket) => {
  console.log(`[접속] 유저 연결: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`[방 입장] ${socket.id} -> ${room}`);
    // 입장 시 과거 메시지 전송
    if (roomHistory[room]) {
      roomHistory[room].forEach((msg) => socket.emit("send_message", msg));
    }
  });

  socket.on("leave_room", (room) => {
    socket.leave(room);
    console.log(`[방 퇴장] ${socket.id} -> ${room}`);
  });

  socket.on("send_message", (data) => {
    console.log(`[메시지] ${data.room} - ${data.author}: ${data.message}`);
    
    // 1. 메모리 저장
    if (!roomHistory[data.room]) roomHistory[data.room] = [];
    roomHistory[data.room].push(data);

    // 2. 중요: 나를 포함한 방 전체에게 전송 (본인 화면은 프론트에서 이미 처리 중)
    // 중복 방지를 위해 클라이언트가 보낸 것은 서버가 다시 본인에게는 안 보내게 할 수도 있지만, 
    // 우선 깔끔하게 방 전체 전송으로 통일합니다.
    io.to(data.room).emit("send_message", data);
  });

  socket.on("disconnect", () => {
    console.log(`[종료] 유저 연결 끊김: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`서버 실행: ${PORT}`));