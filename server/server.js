const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`[접속] 새로운 손님 방문: ${socket.id}`);

  // 변경포인트 1: 클라이언트가 "나 몇 번 방에 들어갈래요"라고 신호를 보낼 때
  socket.on('join_room', (room) => {
    socket.join(room); // Socket.io가 제공하는 마법의 방 가두기 기능!
    console.log(`[방 입장] 손님(${socket.id})이 [${room}번 방]에 들어갔습니다.`);
  });

  // 변경포인트 2: 메시지를 받았을 때
  socket.on('send_message', (data) => {
    console.log(`[메시지 수신] ${data.room}번 방의 ${data.author}: ${data.message}`);
    
    /* 핵심 튜닝: io.emit 대신 io.to(data.room).emit을 씁니다.
      이제 이 메시지는 전체 화면이 아니라, 딱 'data.room' 번호의 방에 들어와 있는 사람들에게만 배달됩니다!
    */
    io.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`[퇴장] 손님 나감: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[성공] 튜닝된 서버가 ${PORT}번 포트에서 돌아가는 중입니다!`);
});