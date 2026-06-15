import { useEffect, useState, useRef } from "react"; // [수정] useRef 추가
import { io } from "socket.io-client";

// 서버 주소 연결 (환경 변수 또는 기본 Render 주소)
const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

function App() {
  // --- 상태(State) 관리 ---
  const [username, setUsername] = useState("");      // 사용자 닉네임
  const [roomInput, setRoomInput] = useState("");    // 첫 입장 방 이름
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 상태

  const [currentRoom, setCurrentRoom] = useState(""); // 현재 보고 있는 방
  const [channelList, setChannelList] = useState([]); // 참여 중인 방 목록
  const [newRoomInput, setNewRoomInput] = useState(""); // 새 방 입력 필드
  const [message, setMessage] = useState("");         // 입력 중인 메시지
  const [roomMessages, setRoomMessages] = useState({}); // 방별 메시지 데이터 { roomName: [messages] }

  // [추가] 스크롤 위치 추적용 ref
  const chatEndRef = useRef(null);

  // 1. 초기 로그인 및 첫 방 입장
  const handleLogin = () => {
    if (username.trim() !== "" && roomInput.trim() !== "") {
      const targetRoom = roomInput.trim();
      setIsLoggedIn(true);
      setCurrentRoom(targetRoom);
      setChannelList([targetRoom]);
      socket.emit("join_room", targetRoom);
    }
  };

  // 2. 새로운 방 추가 및 해당 방으로 이동
  const handleAddNewRoom = () => {
    const nextRoom = newRoomInput.trim();
    if (nextRoom === "" || channelList.includes(nextRoom)) return;

    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", nextRoom);

    setChannelList((prev) => [...prev, nextRoom]);
    setCurrentRoom(nextRoom);
    setNewRoomInput("");
  };

  // 3. 기존 채널 목록에서 방 전환
  const switchRoom = (targetRoom) => {
    if (targetRoom === currentRoom) return;
    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", targetRoom);
    setCurrentRoom(targetRoom);
  };

  // 4. 방 퇴장 (목록 삭제 및 현재 방 전환 로직 포함)
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

    // 현재 방을 나갔다면 다른 방으로 자동 포커스
    if (currentRoom === roomToLeave) {
      if (updatedChannels.length > 0) {
        setCurrentRoom(updatedChannels[0]);
        socket.emit("join_room", updatedChannels[0]);
      } else {
        setCurrentRoom("");
      }
    }
  };

  // 5. 메시지 서버로 전송
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


  const currentMessageList = roomMessages[currentRoom] || [];

  // 6. 서버로부터 실시간 메시지 수신 (데이터 누적)
  useEffect(() => {
    // 1. 메시지 수신 함수
    const handleReceiveMessage = (data) => {
      setRoomMessages((prev) => ({
        ...prev,
        [data.room]: [...(prev[data.room] || []), data]
      }));
    };

    // 2. 등록 전 반드시 기존 리스너 제거 (이게 없으면 중복 수신됨)
    socket.off("send_message"); 
    socket.on("send_message", handleReceiveMessage);

    // 3. 컴포넌트 종료 시 리스너 제거
    return () => {
      socket.off("send_message", handleReceiveMessage);
    };
  }, []); // 빈 배열 유지 (방 전환 시 리렌더링되어도 리스너는 1개만 유지됨)

  // [추가] 채팅 자동 스크롤
  // useEffect(() => {
  //   setTimeout(() => {
  //     if (chatEndRef.current) {
  //       const parent = chatEndRef.current.parentElement;
  //       parent.scrollTop = parent.scrollHeight;
  //     }
  //   }, 100); // 0.1초 뒤에 실행
  // }, [roomMessages, currentRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [currentMessageList, currentRoom]);



  // --- 화면 렌더링 ---
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
        // 로그인 UI
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>자유 입장형 멀티 채팅방 🚀</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
            <input type="text" placeholder="닉네임" style={{ padding: "12px" }} onChange={(e) => setUsername(e.target.value)} />
            <input type="text" placeholder="입장할 방 이름" style={{ padding: "12px" }} onChange={(e) => setRoomInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleLogin()} />
            <button onClick={handleLogin} style={{ padding: "12px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>입장하기</button>
          </div>
        </div>
      ) : (
        // 메인 채팅 화면
        <div>
          <h2>안녕하세요, <span style={{ color: "blue" }}>{username}</span>님!</h2>
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            
            {/* 사이드바 영역 */}
            <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
              <h3>🚪 새 방 들어가기</h3>
              <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
                <input type="text" placeholder="방 이름" value={newRoomInput} style={{ width: "120px", padding: "8px" }} onChange={(e) => setNewRoomInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAddNewRoom()} />
                <button onClick={handleAddNewRoom} style={{ padding: "8px", cursor: "pointer" }}>이동</button>
              </div>
              
              <h3>💬 채널 목록</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {channelList.map((roomName) => (
                  <div key={roomName} onClick={() => switchRoom(roomName)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: currentRoom === roomName ? "#4A90E2" : "#fff", color: currentRoom === roomName ? "#fff" : "#333" }}>
                    <span style={{ fontWeight: currentRoom === roomName ? "bold" : "normal" }}># {roomName}</span>
                    <button onClick={(e) => handleLeaveRoom(roomName, e)} style={{ background: "none", border: "none", color: currentRoom === roomName ? "#fff" : "#999", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 메시지 영역 */}
            <div style={{ flex: 1 }}>
              <h3>📌 현재 채널: {currentRoom}</h3>
              <div style={{ border: "1px solid #ccc", height: "350px", overflowY: "auto", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                {currentMessageList.map((msg, index) => (
                  <div key={index} style={{ textAlign: msg.author === username ? "right" : "left", margin: "10px 0" }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>{msg.author} ({msg.time})</div>
                    <span style={{ display: "inline-block", padding: "10px", borderRadius: "10px", backgroundColor: msg.author === username ? "#4A90E2" : "#E5E5EA", color: msg.author === username ? "#fff" : "#000" }}>{msg.message}</span>
                  </div>
                ))}
                {/* [추가] 스크롤 위치 지점 */}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
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