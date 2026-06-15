const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// 1. 보안(CORS) 방어막 해제 - Vercel 배포 주소에서 접속할 수 있도록 허용합니다.
app.use(cors());

const server = http.createServer(app);

// 2. 소켓 서버 초기화 및 모든 오리진(Origin) 허용 설정
const io = new Server(server, {
  cors: {
    origin: "*", // 모든 주소에서의 접속을 허용하여 배포 시 CORS 에러를 원천 차단합니다.
    methods: ["GET", "POST"],
  },
});

// 메인 주소 접속 시 서버 상태 확인용 (브라우저로 접속했을 때 켜져있는지 확인용)
app.get("/", (req, res) => {
  res.send("<h1>채팅 백엔드 서버가 정상적으로 작동 중입니다!</h1>");
});

// 3. 소켓 통신 핵심 로직
io.on("connection", (socket) => {
  console.log(`[접속 성공] 유저가 연결되었습니다. ID: ${socket.id}`);

  // [기능 1] 리액트가 특정 방 번호를 들고 입장했을 때 처리
  socket.on("join_room", (room) => {
    socket.join(room); // 해당 소켓을 특정 '방(room)' 안으로 집어넣습니다.
    console.log(`[방 입장] 유저 ID [${socket.id}]가 [${room}]번 방에 들어갔습니다.`);
  });

  // [기능 2] 리액트에서 메시지를 보냈을 때 처리
  socket.on("send_message", (data) => {
    console.log(`[메시지 수신] ${data.room}번 방 - ${data.author}: ${data.message}`);
    
    // 중요: 해당 방번호(data.room)에 들어와 있는 모든 사람(나 포함)에게만 메시지를 배달합니다.
    io.to(data.room).emit("send_message", data);
  });

  // 유저가 창을 닫거나 접속을 끊었을 때
  socket.on("disconnect", () => {
    console.log(`[접속 종료] 유저 연결이 끊어졌습니다. ID: ${socket.id}`);
  });
});

// Render 배포 환경에서는 포트 번호를 환경 변수로 받아서 사용해야 합니다.
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 활기차게 달리는 중입니다!`);
});