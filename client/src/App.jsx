import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoom, setCurrentRoom] = useState("");
  const [channelList, setChannelList] = useState([]);
  const [newRoomInput, setNewRoomInput] = useState("");
  const [message, setMessage] = useState("");
  const [roomMessages, setRoomMessages] = useState({});

  // 로그인 처리
  const handleLogin = () => {
    if (username.trim() && roomInput.trim()) {
      setIsLoggedIn(true);
      setCurrentRoom(roomInput.trim());
      setChannelList([roomInput.trim()]);
      socket.emit("join_room", roomInput.trim());
    }
  };

  // 방 추가/이동
  const handleAddNewRoom = () => {
    const nextRoom = newRoomInput.trim();
    if (!nextRoom || channelList.includes(nextRoom)) return;

    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", nextRoom);
    setChannelList((prev) => [...prev, nextRoom]);
    setCurrentRoom(nextRoom);
    setNewRoomInput("");
  };

  // 방 전환
  const switchRoom = (targetRoom) => {
    if (targetRoom === currentRoom) return;
    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", targetRoom);
    setCurrentRoom(targetRoom);
  };

  // 방 퇴장
  const handleLeaveRoom = (roomToLeave, e) => {
    e.stopPropagation();
    socket.emit("leave_room", roomToLeave);
    const updated = channelList.filter((r) => r !== roomToLeave);
    setChannelList(updated);
    setRoomMessages((prev) => {
      const copy = { ...prev };
      delete copy[roomToLeave];
      return copy;
    });
    if (currentRoom === roomToLeave) {
      setCurrentRoom(updated[0] || "");
      if (updated[0]) socket.emit("join_room", updated[0]);
    }
  };

  // 메시지 전송
  const sendMessage = () => {
    if (!message.trim() || !currentRoom) return;
    const data = {
      room: currentRoom,
      author: username,
      message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    //socket.emit("send_message", data);
    setMessage("");
  };

  // 소켓 수신
  useEffect(() => {
    const handleReceive = (data) => {
      setRoomMessages((prev) => ({
        ...prev,
        [data.room]: [...(prev[data.room] || []), data],
      }));
    };
    socket.on("send_message", handleReceive);
    return () => socket.off("send_message", handleReceive);
  }, []);

  const currentMessageList = roomMessages[currentRoom] || [];

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>로그인</h2>
          <input placeholder="닉네임" onChange={(e) => setUsername(e.target.value)} />
          <input placeholder="방 이름" onChange={(e) => setRoomInput(e.target.value)} />
          <button onClick={handleLogin}>입장</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ width: "200px" }}>
            <h3>채널 목록</h3>
            {channelList.map((room) => (
              <div 
                key={room} 
                onClick={() => switchRoom(room)}
                style={{ 
                  padding: "10px", 
                  backgroundColor: currentRoom === room ? "#ddd" : "#f4f4f4",
                  cursor: "pointer",
                  marginBottom: "5px"
                }}
              >
                # {room}
                <button onClick={(e) => handleLeaveRoom(room, e)}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <h3>{currentRoom}</h3>
            <div style={{ height: "300px", border: "1px solid #ccc", overflowY: "auto" }}>
              {currentMessageList.map((m, i) => (
                <div key={i}>
                  <b>{m.author}</b>: {m.message}
                </div>
              ))}
            </div>
            <input value={message} onChange={(e) => setMessage(e.target.value)} />
            <button onClick={sendMessage}>전송</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;