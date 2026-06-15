import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Vercel 환경 변수 주소 (안 되면 직접 주소 문자열 입력)
const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 닉네임 입력 여부
  
  // 🔥 여러 방 관리를 위한 상태들
  const [currentRoom, setCurrentRoom] = useState("1"); // 현재 보고 있는 방 (기본 1번방)
  const [rooms] = useState(["1", "2", "3", "개발자방", "잡담방"]); // 개설된 방 목록
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);

  // 닉네임 등록하고 로비 입장
  const handleLogin = () => {
    if (username !== "") {
      setIsLoggedIn(true);
      // 로그인하자마자 기본으로 1번 방에 입장시킴
      socket.emit("join_room", "1");
    }
  };

  // 🔥 방 변경 함수 (이게 핵심입니다!)
  const switchRoom = (newRoom) => {
    if (newRoom === currentRoom) return; // 같은 방을 누르면 무시

    // 1. 기존 방에서 나간다고 서버에 알림
    socket.emit("leave_room", currentRoom);
    
    // 2. 새 방에 들어간다고 서버에 알림
    socket.emit("join_room", newRoom);
    
    // 3. 내가 보고 있는 방 상태를 바꾸고, 이전 방 채팅 기록은 청소
    setCurrentRoom(newRoom);
    setMessageList([]); 
  };

  // 메시지 전송 함수
  const sendMessage = async () => {
    if (message !== "") {
      const messageData = {
        room: currentRoom, // 현재 방 이름으로 전송
        author: username,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      await socket.emit("send_message", messageData);
      setMessage("");
    }
  };

  // 메시지 수신 대기
  useEffect(() => {
    socket.on("send_message", (data) => {
      // 중요: 서버에서 온 메시지가 '내가 지금 보고 있는 방'의 메시지일 때만 화면에 추가
      if (data.room === currentRoom) {
        setMessageList((list) => [...list, data]);
      }
    });

    return () => socket.off("send_message");
  }, [currentRoom]); // 보고 있는 방이 바뀔 때마다 수신 대기실 재설정

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
        // [화면 1] 닉네임 입력창
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>실시간 멀티룸 채팅창 🚀</h2>
          <input
            type="text"
            placeholder="사용할 닉네임을 입력하세요"
            style={{ padding: "10px", width: "250px", fontSize: "16px" }}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          />
          <button onClick={handleLogin} style={{ padding: "10px 20px", fontSize: "16px", marginLeft: "10px", cursor: "pointer" }}>
            입장하기
          </button>
        </div>
      ) : (
        // [화면 2] 메인 멀티 채팅방 UI (디스코드 스타일)
        <div>
          <h2 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>
            안녕하세요, <span style={{ color: "blue" }}>{username}</span>님!
          </h2>
          
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            {/* ⬅️ 왼쪽: 방 리스트 메뉴 바 */}
            <div style={{ width: "200px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
              <h3>💬 채널 목록</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {rooms.map((roomName) => (
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
                    # {roomName} 방
                  </button>
                ))}
              </div>
            </div>

            {/* ➡️ 오른쪽: 현재 선택된 방의 채팅창 */}
            <div style={{ flex: 1 }}>
              <h3>📌 현재 채널: {currentRoom} 번방</h3>
              <div style={{ border: "1px solid #ccc", height: "350px", overflowY: "auto", padding: "15px", marginBottom: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                {messageList.map((msg, index) => (
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