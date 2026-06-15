import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// [중요] Vercel 배포 시 환경 변수 인식이 불안정할 수 있으므로, 
// 안 될 때는 import.meta.env... 대신 "https://내서버.onrender.com" 주소를 직접 따옴표 안에 넣으셔도 됩니다!
const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);

  // 방 입장 함수
  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room); // 백엔드에 방 입장 신호 전송
      setShowChat(true);
    }
  };

  // 메시지 전송 함수
  const sendMessage = async () => {
    if (message !== "") {
      const messageData = {
        room: room,
        author: username,
        message: message,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      };

      // 백엔드가 대기 중인 'send_message' 이름으로 쏘기
      await socket.emit("send_message", messageData);
      
      // 내가 보낸 메시지도 내 화면 목록에 바로 추가
      //setMessageList((list) => [...list, messageData]); 서버에서 돌려주기 때문에 중복
      setMessage("");
    }
  };

  // 메시지 수신 대기 (useEffect)
  useEffect(() => {
    // 백엔드에서 'send_message'로 뿜어주는 데이터를 대기
    socket.on("send_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    // 컴포넌트가 꺼질 때 소켓 리스너를 해제하여 중복 수신 방지
    return () => socket.off("send_message");
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {!showChat ? (
        <div>
          <h3>입장할 방 정보 입력</h3>
          <input
            type="text"
            placeholder="이름을 입력하세요"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="방 번호를 입력하세요 (예: 1)"
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>방 입장하기</button>
        </div>
      ) : (
        <div>
          <h3>방 번호: {room} | 닉네임: {username}</h3>
          <div style={{ border: "1px solid #ccc", height: "300px", overflowY: "scroll", padding: "10px", marginBottom: "10px" }}>
            {messageList.map((msg, index) => (
              <div key={index} style={{ textAlign: msg.author === username ? "right" : "left", margin: "5px 0" }}>
                <span style={{ fontWeight: "bold" }}>{msg.author}:</span> {msg.message} 
                <span style={{ fontSize: "10px", color: "#888", marginLeft: "5px" }}>{msg.time}</span>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={message}
            placeholder="메시지를 입력하세요"
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>전송</button>
        </div>
      )}
    </div>
  );
}

export default App;