import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// ==========================================
// 🌐 Socket.io 서버 연결
// ==========================================
// 환경 변수에 설정된 서버 주소를 우선 사용하고, 없다면 기본 주소로 연결합니다.
const socket = io(
  import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com"
);

function App() {
  // ==========================================
  // 📦 상태(State) 및 참조(Ref) 관리
  // ==========================================
  
  // 1. 사용자 정보 및 로그인 상태
  const [username, setUsername] = useState("");        // 사용자가 사용할 닉네임
  const [roomInput, setRoomInput] = useState("");      // 처음 입장할 때 입력하는 방 이름
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인(첫 입장) 완료 여부

  // 2. 채팅방(채널) 관리 상태
  const [currentRoom, setCurrentRoom] = useState("");  // 현재 사용자가 보고 있는(활성화된) 방
  const [channelList, setChannelList] = useState([]);  // 사용자가 현재 참여 중인 모든 방의 목록
  const [newRoomInput, setNewRoomInput] = useState("");// 로그인 후 추가로 입장할 방 이름 입력 필드

  // 3. 메시지 관리 상태
  const [message, setMessage] = useState("");          // 현재 입력창에 작성 중인 메시지
  const [roomMessages, setRoomMessages] = useState({});// 방별 메시지 기록 보관소 (구조: { "방이름": [메시지객체들] })

  // 4. 스크롤 제어를 위한 DOM 참조
  const chatEndRef = useRef(null); // 채팅창의 가장 아래쪽 요소를 가리켜 자동 스크롤에 사용됨


  // ==========================================
  // 🛠️ 주요 기능 핸들러 (Functions)
  // ==========================================

  /**
   * [1] 초기 로그인 및 첫 방 입장 처리
   * 닉네임과 방 이름을 모두 입력했을 때만 실행됩니다.
   */
  const handleLogin = () => {
    if (username.trim() !== "" && roomInput.trim() !== "") {
      const targetRoom = roomInput.trim();
      
      setIsLoggedIn(true);           // 로그인 상태로 전환하여 채팅 화면 표시
      setCurrentRoom(targetRoom);    // 현재 활성화된 방을 입력한 방으로 설정
      setChannelList([targetRoom]);  // 참여 중인 채널 목록에 첫 방 추가
      
      socket.emit("join_room", targetRoom); // 서버에 해당 방으로 입장하겠다는 이벤트 전송
    }
  };

  /**
   * [2] 새로운 방 추가 및 해당 방으로 이동
   * 이미 참여 중인 방이거나 빈 값이면 무시합니다.
   */
  const handleAddNewRoom = () => {
    const nextRoom = newRoomInput.trim();
    if (nextRoom === "" || channelList.includes(nextRoom)) return;

    // 기존에 보던 방에서 논리적으로 퇴장처리 하지는 않지만,
    // 필요에 따라 기존 방의 스트림을 끊고 새 방으로 연결할 때 사용합니다.
    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", nextRoom);

    setChannelList((prev) => [...prev, nextRoom]); // 채널 목록에 새 방 추가
    setCurrentRoom(nextRoom);                      // 화면을 새 방으로 전환
    setNewRoomInput("");                           // 입력 필드 초기화
  };

  /**
   * [3] 참여 중인 채널 목록에서 다른 방으로 포커스 전환
   */
  const switchRoom = (targetRoom) => {
    if (targetRoom === currentRoom) return; // 이미 보고 있는 방이면 무시
    
    // 이전 방에서 나가고 선택한 방으로 소켓 룸 변경
    socket.emit("leave_room", currentRoom);
    socket.emit("join_room", targetRoom);
    
    setCurrentRoom(targetRoom); // 현재 활성화된 방 상태 업데이트
  };

  /**
   * [4] 방 퇴장 (목록에서 삭제 및 화면 전환 로직)
   */
  const handleLeaveRoom = (roomToLeave, e) => {
    e.stopPropagation(); // 방 목록 클릭 이벤트(switchRoom)가 같이 실행되는 것을 방지 (이벤트 버블링 차단)
    
    socket.emit("leave_room", roomToLeave); // 서버에 퇴장 이벤트 전송

    // 1. 참여 중인 채널 목록에서 해당 방 제거
    const updatedChannels = channelList.filter((room) => room !== roomToLeave);
    setChannelList(updatedChannels);

    // 2. 해당 방의 메시지 기록 삭제 (메모리 관리)
    setRoomMessages((prev) => {
      const clone = { ...prev };
      delete clone[roomToLeave];
      return clone;
    });

    // 3. 만약 현재 보고 있던 방을 나갔다면, 다른 방으로 화면 자동 전환
    if (currentRoom === roomToLeave) {
      if (updatedChannels.length > 0) {
        // 남은 방이 있으면 가장 첫 번째 방으로 이동
        setCurrentRoom(updatedChannels[0]);
        socket.emit("join_room", updatedChannels[0]);
      } else {
        // 남은 방이 없으면 빈 화면 상태로 대기
        setCurrentRoom("");
      }
    }
  };

  /**
   * [5] 메시지를 서버로 전송
   */
  const sendMessage = async () => {
    if (message.trim() !== "" && currentRoom !== "") {
      // 서버로 보낼 메시지 데이터 구조 조립
      const messageData = {
        room: currentRoom,
        author: username,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      
      await socket.emit("send_message", messageData); // 서버로 메시지 발송
      setMessage(""); // 전송 후 입력창 초기화
    }
  };


  // ==========================================
  // 🔄 사이드 이펙트 (useEffect)
  // ==========================================

  /**
   * [6] 서버로부터 실시간 메시지 수신 (데이터 누적)
   * 컴포넌트 마운트 시 1회만 이벤트 리스너를 등록합니다.
   */
  useEffect(() => {
    const handleReceiveMessage = (data) => {
      // 수신된 메시지를 해당 방(data.room)의 메시지 배열에 추가
      setRoomMessages((prev) => ({
        ...prev,
        [data.room]: [...(prev[data.room] || []), data],
      }));
    };

    // 💡 중요: 리스너 중복 등록을 방지하기 위해 등록 전 기존 리스너를 제거합니다.
    socket.off("send_message");
    socket.on("send_message", handleReceiveMessage);

    // 컴포넌트 언마운트 시 메모리 누수를 막기 위해 리스너 제거
    return () => {
      socket.off("send_message", handleReceiveMessage);
    };
  }, []); // 의존성 배열을 비워두어 불필요한 재렌더링 방지

  /**
   * [7] 채팅창 자동 스크롤 처리
   * 메시지가 추가되거나, 방을 전환할 때마다 실행됩니다.
   */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages, currentRoom]);


  // ==========================================
  // 🎨 화면 렌더링 (JSX)
  // ==========================================
  
  // 현재 보고 있는 방의 메시지 목록 (없으면 빈 배열 반환)
  const currentMessageList = roomMessages[currentRoom] || [];

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      
      {!isLoggedIn ? (
        /* ----------------------------------
           UI: 1. 로그인 화면 
        ----------------------------------- */
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>자유 입장형 멀티 채팅방 🚀</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
            <input
              type="text"
              placeholder="닉네임"
              style={{ padding: "12px" }}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="text"
              placeholder="입장할 방 이름"
              style={{ padding: "12px" }}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              onClick={handleLogin}
              style={{ padding: "12px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
            >
              입장하기
            </button>
          </div>
        </div>

      ) : (
        /* ----------------------------------
           UI: 2. 메인 채팅 화면 
        ----------------------------------- */
        <div>
          <h2>안녕하세요, <span style={{ color: "blue" }}>{username}</span>님!</h2>
          
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            
            {/* 좌측 사이드바: 방 목록 및 추가 기능 */}
            <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
              
              {/* 새 방 들어가기 영역 */}
              <h3>🚪 새 방 들어가기</h3>
              <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder="방 이름"
                  value={newRoomInput}
                  style={{ width: "120px", padding: "8px" }}
                  onChange={(e) => setNewRoomInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddNewRoom()}
                />
                <button 
                  onClick={handleAddNewRoom} 
                  style={{ padding: "8px", cursor: "pointer" }}
                >
                  이동
                </button>
              </div>
              
              {/* 참여 중인 채널 목록 영역 */}
              <h3>💬 채널 목록</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {channelList.map((roomName) => (
                  <div
                    key={roomName}
                    onClick={() => switchRoom(roomName)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                      backgroundColor: currentRoom === roomName ? "#4A90E2" : "#fff",
                      color: currentRoom === roomName ? "#fff" : "#333",
                    }}
                  >
                    <span style={{ fontWeight: currentRoom === roomName ? "bold" : "normal" }}>
                      # {roomName}
                    </span>
                    <button
                      onClick={(e) => handleLeaveRoom(roomName, e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: currentRoom === roomName ? "#fff" : "#999",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 메인 영역: 메시지 출력 및 입력 */}
            <div style={{ flex: 1 }}>
              <h3>📌 현재 채널: {currentRoom}</h3>
              
              {/* 채팅 메시지 출력 창 */}
              <div style={{ border: "1px solid #ccc", height: "350px", overflowY: "auto", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                {currentMessageList.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      textAlign: msg.author === username ? "right" : "left", // 내가 쓴 글은 우측, 남이 쓴 글은 좌측 정렬
                      margin: "10px 0",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {msg.author} ({msg.time})
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "10px",
                        borderRadius: "10px",
                        backgroundColor: msg.author === username ? "#4A90E2" : "#E5E5EA", // 내 말풍선은 파란색, 남은 회색
                        color: msg.author === username ? "#fff" : "#000",
                      }}
                    >
                      {msg.message}
                    </span>
                  </div>
                ))}
                
                {/* 스크롤 하단 고정을 위한 빈 div 참조 */}
                <div ref={chatEndRef} />
              </div>
              
              {/* 메시지 입력 창 */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <input
                  type="text"
                  value={message}
                  style={{ flex: 1, padding: "12px" }}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button 
                  onClick={sendMessage} 
                  style={{ padding: "0 20px", cursor: "pointer" }}
                >
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