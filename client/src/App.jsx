import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("https://your-server-address.onrender.com");

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

  const joinRoom = () => {
    socket.emit("join_room", room);
    alert(`${room} 방에 입장!`);
  };

  const sendMessage = () => {
    const data = { room, author: username, text: message, time: new Date().toLocaleTimeString() };
    socket.emit("send_message", data);
    setChatList((prev) => [...prev, data]);
    setMessage("");
  };

  return (
    <div>
      <input placeholder="닉네임" onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="방 이름" onChange={(e) => setRoom(e.target.value)} />
      <button onClick={joinRoom}>입장</button>
      
      <div style={{ height: "200px", border: "1px solid" }}>
        {chatList.map((m, i) => <div key={i}>{m.author}: {m.text}</div>)}
      </div>
      
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>전송</button>
    </div>
  );
}
export default App;