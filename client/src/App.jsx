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
    
    // 1. 서버에 새 방 참가 알림
    socket.emit("join_room", nextRoom);
    
    // 2. 채널 목록에 추가
    setChannelList((prev) => [...prev, nextRoom]);
    
    // 3. 현재 방을 새로 만든 방으로 전환
    setCurrentRoom(nextRoom);
    setNewRoomInput("");
  };

  const switchRoom = (targetRoom) => {
    if (targetRoom === currentRoom) return;
    // 방을 전환할 때 현재까지의 메시지 개수를 읽음으로 처리
    setLastRead((prev) => ({
      ...prev,
      [currentRoom]: roomMessages[currentRoom]?.length || 0,
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

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>자유 입장형 멀티 채팅방 🚀</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
            <input type="text" placeholder="닉네임" style={{ padding: "12px" }} onChange={(e) => setUsername(e.target.value)} />
            <input type="text" placeholder="입장할 방 이름" style={{ padding: "12px" }} onChange={(e) => setRoomInput(e.target.value)} />
            <button onClick={handleLogin} style={{ padding: "12px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>입장하기</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
            <h3>🚪 방 추가</h3>
            <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
              <input type="text" placeholder="방 이름" value={newRoomInput} style={{ width: "100px", padding: "8px" }} onChange={(e) => setNewRoomInput(e.target.value)} />
              <button onClick={handleAddNewRoom} style={{ padding: "8px", cursor: "pointer" }}>추가</button>
            </div>
            <h3>💬 채널 목록</h3>
            {channelList.map((roomName) => {
              const unread = (roomMessages[roomName]?.length || 0) - (lastRead[roomName] || 0);
              return (
                <div key={roomName} onClick={() => switchRoom(roomName)} style={{ padding: "10px", margin: "5px 0", cursor: "pointer", backgroundColor: currentRoom === roomName ? "#4A90E2" : "#eee", color: currentRoom === roomName ? "#fff" : "#000", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                  <span># {roomName} {unread > 0 && currentRoom !== roomName && `(${unread})`}</span>
                  <button onClick={(e) => handleLeaveRoom(roomName, e)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1 }}>
            <h3>현재 채널: {currentRoom}</h3>
            <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }}>
              {(roomMessages[currentRoom] || []).map((msg, i) => (
                <div key={i}><strong>{msg.author}:</strong> {msg.message}</div>
              ))}
            </div>
            <input type="text" value={message} style={{ width: "80%", padding: "10px" }} onChange={(e) => setMessage(e.target.value)} />
            <button onClick={sendMessage}>전송</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;