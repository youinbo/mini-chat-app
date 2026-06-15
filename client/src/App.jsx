import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// 서버 주소 연결
const socket = io("https://your-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]); // 현재 방의 채팅 목록
  const [rooms, setRooms] = useState([]);      // 참여 중인 방 목록

  // 1. 메시지 수신 (실시간)
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChatList((prev) => [...prev, data]);
    });
    return () => socket.off("receive_message");
  }, []);

  // 2. 메시지 전송
  const sendMessage = () => {
    if (message === "") return;
    const data = { room, author: username, text: message, time: new Date().toLocaleTimeString() };
    socket.emit("send_message", data);
    setChatList((prev) => [...prev, data]);
    setMessage("");
  };

  // 3. 방 입장
  const joinRoom = () => {
    if (username && room) {
      socket.emit("join_room", room);
      setRooms([...new Set([...rooms, room])]); // 중복 제거하며 방 추가
    }
  };

  return (
    <div className="App">
      {/* 로그인 영역 */}
      <div>
        <input placeholder="이름" onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="방 이름" onChange={(e) => setRoom(e.target.value)} />
        <button onClick={joinRoom}>입장</button>
      </div>

      {/* 채팅 영역 */}
      <div>
        {chatList.map((msg, i) => (
          <div key={i}>{msg.author}: {msg.text}</div>
        ))}
      </div>

      {/* 입력 영역 */}
      <div>
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
}

export default App;