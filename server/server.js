const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// ==========================================
// ⚙️ 서버 및 CORS 설정
// ==========================================
app.use(cors()); // 모든 도메인에서의 데이터 요청 허용 (CORS 필수 설정)

const server = http.createServer(app); // Express 인스턴스를 사용해 HTTP 서버 생성

// Socket.io 서버 생성 및 CORS 클라이언트 접근 권한 설정
const io = new Server(server, {
  cors: { 
    origin: "*",                 // 실제 서비스 시에는 특정 프론트엔드 주소로 제한하는 것이 좋습니다.
    methods: ["GET", "POST"]     // 허용할 HTTP 메서드 정의
  },
});

// ==========================================
// 💾 데이터 저장소 (In-Memory Database 역할)
// ==========================================
// 서버가 켜져 있는 동안 채팅방별 이전 메시지 데이터를 메모리에 보관합니다.
// 구조 예시: { "방이름": [ { room, author, message, time }, ... ] }
const roomHistory = {}; 


// ==========================================
// 🔌 Socket.io 실시간 이벤트 핸들링
// ==========================================
io.on("connection", (socket) => {
  // 클라이언트가 서버에 웹소켓으로 처음 연결되었을 때 실행됩니다.
  console.log(`[접속] 유저 연결: ${socket.id}`);

  /**
   * [1] 방 입장 이벤트 (join_room)
   * 클라이언트가 특정 방에 들어갈 때 호출됩니다.
   */
  socket.on("join_room", (room) => {
    socket.join(room); // Socket.io가 제공하는 가상 채널(Room)에 소켓 등록
    console.log(`[방 입장] ${socket.id} -> ${room}`);
    
    // 사용자가 방에 입장했을 때, 해당 방의 과거 메시지 기록이 있다면 순차적으로 전송
    if (roomHistory[room]) {
      roomHistory[room].forEach((msg) => {
        // 방 전체가 아닌 '입장한 본인(socket)'에게만 과거 기록을 한 통씩 보내줍니다.
        socket.emit("send_message", msg);
      });
    }
  });

  /**
   * [2] 방 퇴장 이벤트 (leave_room)
   * 클라이언트가 다른 방으로 이동하거나 채널 목록에서 방을 지울 때 호출됩니다.
   */
  socket.on("leave_room", (room) => {
    socket.leave(room); // 소켓을 가상 채널(Room)에서 제외시킴
    console.log(`[방 퇴장] ${socket.id} -> ${room}`);
  });

  /**
   * [3] 메시지 수신 및 방송 이벤트 (send_message)
   * 특정 클라이언트가 메시지를 보냈을 때 호출됩니다.
   */
  socket.on("send_message", (data) => {
    console.log(`[메시지] ${data.room} - ${data.author}: ${data.message}`);
    
    // 1. 메모리 저장소에 메시지 누적 기록
    if (!roomHistory[data.room]) {
      roomHistory[data.room] = []; // 해당 방의 기록 배열이 없다면 빈 배열로 초기화
    }
    roomHistory[data.room].push(data); // 배열에 메시지 데이터 객체 추가

    // 2. 해당 방(data.room) 안에 있는 '나를 포함한 모든 유저'에게 메시지 브로드캐스트
    // 프론트엔드 측에서 본인이 보낸 메시지를 화면에 직접 쌓아도 되지만,
    // 이 코드처럼 서버가 방 전체(io.to)에 뿌려주면 동기화 처리가 깔끔해집니다.
    io.to(data.room).emit("send_message", data);
  });

  /**
   * [4] 연결 종료 이벤트 (disconnect)
   * 브라우저 창을 닫거나 새로고침하여 소켓 연결이 끊어질 때 자동으로 실행됩니다.
   */
  socket.on("disconnect", () => {
    console.log(`[종료] 유저 연결 끊김: ${socket.id}`);
  });
});


// ==========================================
// 🚀 서버 구동
// ==========================================
const PORT = process.env.PORT || 3001; // Render 등 배포 환경의 포트 혹은 기본 3001 포트 사용

server.listen(PORT, () => {
  console.log(`서버 실행: ${PORT}`);
});