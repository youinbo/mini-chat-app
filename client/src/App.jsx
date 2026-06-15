import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// 본인의 실제 서버 주소로 정확히 입력하세요 (예: https://chat-app-backend.onrender.com)
const socket = io("https://your-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);

  // 메시지 수신 (서버로부터 받으면 무조건 리스트에 추가)
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChatList((prev) => [...prev, data]);
    });
    // 클린업 (중복 이벤트 방지)
    return () => socket.off("receive_message");
  }, []);

  // 메시지 전송 (내가 보낸 메시지도 리스트에 즉시 추가)
  const sendMessage = () => {
    if (!username || !room || !message) return;
    
    const data = { 
      room, 
      author: username, 
      text: message, 
      time: new Date().toLocaleTimeString() 
    };
    
    socket.emit("send_message", data);
    setChatList((prev) => [...prev, data]);
    setMessage("");
  };

  // 방 입장 (서버에 알림)
  const joinRoom = () => {
    if (username && room) {
      socket.emit("join_room", room);
      alert(`${room}번 방에 입장했습니다.`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <input placeholder="닉네임" onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="방 번호" onChange={(e) => setRoom(e.target.value)} />
      <button onClick={joinRoom}>입장</button>

      <div style={{ height: "300px", border: "1px solid black", overflowY: "scroll", margin: "10px 0" }}>
        {chatList.map((data, index) => (
          <div key={index}>
            <b>{data.author}</b>: {data.text} <span>({data.time})</span>
          </div>
        ))}
      </div>

      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
      />
      <button onClick={sendMessage}>보내기</button>
    </div>
  );
}

export default App;