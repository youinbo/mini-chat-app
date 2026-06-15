import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// 서버 주소 연결 (본인의 서버 주소로 변경하세요)
const socket = io("https://your-render-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChatList((prev) => [...prev, data]);
    });
    return () => socket.off("receive_message");
  }, []);

  const sendMessage = () => {
    if (message.trim() === "") return;
    const data = { author: username, text: message, time: new Date().toLocaleTimeString() };
    socket.emit("send_message", data);
    setChatList((prev) => [...prev, data]);
    setMessage("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>채팅방</h1>
      <input placeholder="이름" onChange={(e) => setUsername(e.target.value)} />
      <button onClick={() => socket.emit("join_room", room)}>입장</button>

      <div style={{ border: "1px solid #ccc", height: "300px", overflowY: "auto", margin: "10px 0" }}>
        {chatList.map((msg, i) => (
          <div key={i}><strong>{msg.author}:</strong> {msg.text}</div>
        ))}
      </div>

      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>전송</button>
    </div>
  );
}

export default App;