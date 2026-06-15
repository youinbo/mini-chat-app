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
  const [lastRead, setLastRead] = useState({});

  const handleLogin = () => {
    if (username.trim() !== "" && roomInput.trim() !== "") {
      const targetRoom = roomInput.trim();
      setIsLoggedIn(true);
      setCurrentRoom(targetRoom);
      setChannelList([targetRoom]);
      socket.emit("join_room", targetRoom);
    }
  };

  const handleAddNewRoom = () => {
    const nextRoom = newRoomInput.trim();
    if (nextRoom === "" || channelList.includes(nextRoom)) return;
    socket.emit("join_room", nextRoom);
    setChannelList((prev) => [...prev, nextRoom]);
    setCurrentRoom(nextRoom);
    setNewRoomInput("");
  };

  const switchRoom = (targetRoom) => {
    if (targetRoom === currentRoom) return;
    setLastRead((prev) => ({
      ...prev,
      [targetRoom]: roomMessages[targetRoom]?.length || 0
    }));
    setCurrentRoom(targetRoom);
  };

  const handleLeaveRoom = (roomToLeave, e) => {
    e.stopPropagation();
    socket.emit("leave_room", roomToLeave);
    const updatedChannels = channelList.filter((room) => room !== roomToLeave);
    setChannelList(updatedChannels);
    setRoomMessages((prev) => {
      const clone = { ...prev };
      delete clone[roomToLeave];
      return clone;
    });
    if (currentRoom === roomToLeave) {
      setCurrentRoom(updatedChannels.length > 0 ? updatedChannels[0] : "");
    }
  };

  const sendMessage = async () => {
    if (message.trim() !== "" && currentRoom !== "") {
      const messageData = {
        room: currentRoom,
        author: username,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      await socket.emit("send_message", messageData);
      setMessage("");
    }
  };

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      setRoomMessages((prev) => ({
        ...prev,
        [data.room]: [...(prev[data.room] || []), data]
      }));
    };
    socket.on("send_message", handleReceiveMessage);
    return () => socket.off("send_message", handleReceiveMessage);
  }, []);

  const currentMessageList = roomMessages[currentRoom] || [];

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>자유 입장형 멀티 채팅방 🚀</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
            <input type="text" placeholder="닉네임" style={{ padding: "12px" }} onChange={(e) => setUsername(e.target.value)} />
            <input type="text" placeholder="입장할 방 이름" style={{ padding: "12px" }} onChange={(e) => setRoomInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleLogin()} />
            <button onClick={handleLogin} style={{ padding: "12px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>입장하기</button>
          </div>
        </div>
      ) : (
        <div>
          <h2>안녕하세요, <span style={{ color: "blue" }}>{username}</span>님!</h2>
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
              <h3>💬 채널 목록</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {channelList.map((roomName) => {
                  const unread = (roomMessages[roomName]?.length || 0) - (lastRead[roomName] || 0);
                  return (
                    <div key={roomName} onClick={() => switchRoom(roomName)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: currentRoom === roomName ? "#4A90E2" : "#fff", color: currentRoom === roomName ? "#fff" : "#333" }}>
                      <span style={{ fontWeight: currentRoom === roomName ? "bold" : "normal" }}># {roomName} {unread > 0 && `(${unread})`}</span>
                      <button onClick={(e) => handleLeaveRoom(roomName, e)} style={{ background: "none", border: "none", color: currentRoom === roomName ? "#fff" : "#999", cursor: "pointer" }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h3>📌 현재 채널: {currentRoom}</h3>
              <div style={{ border: "1px solid #ccc", height: "350px", overflowY: "auto", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                {currentMessageList.map((msg, index) => (
                  <div key={index} style={{ textAlign: msg.author === username ? "right" : "left", margin: "10px 0" }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>{msg.author} ({msg.time})</div>
                    <span style={{ display: "inline-block", padding: "10px", borderRadius: "10px", backgroundColor: msg.author === username ? "#4A90E2" : "#E5E5EA", color: msg.author === username ? "#fff" : "#000" }}>{msg.message}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <input type="text" value={message} style={{ flex: 1, padding: "12px" }} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && sendMessage()} />
                <button onClick={sendMessage} style={{ padding: "0 20px", cursor: "pointer" }}>전송</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;