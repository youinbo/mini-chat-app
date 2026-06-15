import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Vercel 환경 변수 주소 (안 되면 직접 주소 문자열 입력)
const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [roomInput, setRoomInput] = useState(""); // 처음 로그인할 때 칠 방 이름
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 여부
  
  const [currentRoom, setCurrentRoom] = useState(""); // 현재 보고 있는 방
  const [myRooms, setMyRooms] = useState([]); // 💡 내가 직접 타이핑해서 '입장한 적이 있는 방 목록'
  const [newRoomInput, setNewRoomInput] = useState(""); // 채팅방 내부에서 새로 추가할 방 이름
  const [message, setMessage] = useState("");

  // 💡 방별 대화 내역을 저장할 주머니 (방이 새로 추가될 때마다 동적으로 늘어납니다)
  const [roomMessages, setRoomMessages] = useState({});

  // 닉네임과 첫 방 이름을 치고 입장할 때
  const handleLogin = () => {
    if (username !== "" && roomInput !== "") {
      const targetRoom = roomInput.trim();
      setIsLoggedIn(true);
      setCurrentRoom(targetRoom);
      setMyRooms([targetRoom]); // 내가 입장한 방 목록에 추가
      
      socket.emit("join_room", targetRoom); // 백엔드 소켓 방 입장
    }
  };

  // 💡 채팅방 내부에서 새로운 방을 직접 쳐서 이동/개설할 때
  const handleAddNewRoom = () => {
    const nextRoom = newRoomInput.trim();
    if (nextRoom === "" || myRooms.includes(nextRoom)) return;

    // 1. 기존 방 퇴장 및 새 방 입장 소켓 신호
    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", nextRoom);

    // 2. 내가 들어간 방 목록에 새 방 추가하고, 보고 있는 방 전환
    setMyRooms((prev) => [...prev, nextRoom]);
    setCurrentRoom(nextRoom);
    setNewRoomInput(""); // 입력창 비우기
  };

  // 왼쪽 메뉴에서 기존에 들어갔던 방 목록을 클릭해서 오갈 때
  const switchRoom = (targetRoom) => {
    if (targetRoom === currentRoom) return;

    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", targetRoom);
    
    setCurrentRoom(targetRoom);
  };

  // 메시지 전송 함수
  const sendMessage = async () => {
    if (message !== "") {
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

  // 메시지 수신 대기 (모든 방의 신호를 상시 수집)
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

  // 현재 보고 있는 방의 메시지 긁어오기
  const currentMessageList = roomMessages[currentRoom] || [];

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
        // [화면 1] 로그인 & 방 이름 직접 입력창
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>자유 입장형 멀티 채팅방 🚀</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
            <input
              type="text"
              placeholder="사용할 닉네임"
              style={{ padding: "12px", fontSize: "16px" }}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="text"
              placeholder="입장할 방 이름 (예: 게임방)"
              style={{ padding: "12px", fontSize: "16px" }}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            <button onClick={handleLogin} style={{ padding: "12px", fontSize: "16px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
              채팅방 개설 및 입장
            </button>
          </div>
        </div>
      ) : (
        // [화면 2] 메인 채팅 UI
        <div>
          <h2 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>
            안녕하세요, <span style={{ color: "blue" }}>{username}</span>님!
          </h2>
          
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            {/* 왼쪽: 내가 들어간 방 리스트 및 새 방 입장 창 */}
            <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
              
              {/* ➕ 새 방 직접 쳐서 들어가기 기능 */}
              <h3 style={{ marginTop: 0 }}>🚪 새 방 들어가기</h3>
              <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder="방 이름 입력"
                  value={newRoomInput}
                  style={{ width: "120px", padding: "8px", fontSize: "13px" }}
                  onChange={(e) => setNewRoomInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddNewRoom()}
                />
                <button onClick={handleAddNewRoom} style={{ padding: "8px", fontSize: "12px", cursor: "pointer" }}>이동</button>
              </div>

              <h3>💬 참여 중인 채널</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {myRooms.map((roomName) => (
                  <button
                    key={roomName}
                    onClick={() => switchRoom(roomName)}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      borderRadius: "5px",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                      backgroundColor: currentRoom === roomName ? "#4A90E2" : "#fff",
                      color: currentRoom === roomName ? "#fff" : "#333",
                      fontWeight: currentRoom === roomName ? "bold" : "normal",
                    }}
                  >
                    # {roomName} {roomMessages[roomName]?.length > 0 && `(${roomMessages[roomName].length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* 오른쪽: 채팅창 리스트 */}
            <div style={{ flex: 1 }}>
              <h3>📌 현재 채널: <span style={{ color: "#4A90E2" }}>{currentRoom}</span></h3>
              <div style={{ border: "1px solid #ccc", height: "350px", overflowY: "auto", padding: "15px", marginBottom: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                {currentMessageList.map((msg, index) => (
                  <div key={index} style={{ textAlign: msg.author === username ? "right" : "left", margin: "10px 0" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>{msg.author} ({msg.time})</div>
                    <span style={{
                      display: "inline-block",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: msg.author === username ? "#4A90E2" : "#E5E5EA",
                      color: msg.author === username ? "#fff" : "#000",
                      maxWidth: "70%",
                      wordBreak: "break-all"
                    }}>
                      {msg.message}
                    </span>
                  </div>
                ))}
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={message}
                  placeholder={`${currentRoom} 방에 메시지 보내기`}
                  style={{ flex: 1, padding: "12px", fontSize: "14px", borderRadius: "5px", border: "1px solid #ccc" }}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} style={{ padding: "0 20px", backgroundColor: "#333", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                  전송
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;