import { useEffect, useState } from "react";
import { io } from "socket.io-client";

/**
 * [소켓 서버 연결 설정]
 * 배포된 Vercel 환경 변수(VITE_SERVER_URL)를 최우선으로 읽어오며, 
 * 만약 없을 경우 개발용이나 백업용 Render 서버 주소로 연결을 시도합니다.
 */
const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

function App() {
  // --- [1. 상태 관리 변수 영역 (State List)] ---
  const [username, setUsername] = useState("");         // 사용자가 사용할 유저 닉네임
  const [roomInput, setRoomInput] = useState("");       // 로그인 화면에서 최초로 입력할 방 이름
  const [isLoggedIn, setIsLoggedIn] = useState(false);   // 로그인 완료 여부 (true가 되면 채팅창 화면으로 전환)
  
  const [currentRoom, setCurrentRoom] = useState("");   // 사용자가 '현재 눈으로 보고 있는' 방 이름
  const [myRooms, setMyRooms] = useState([]);           // 사용자가 지금까지 직접 생성하거나 입장한 방 목록 (배열)
  const [newRoomInput, setNewRoomInput] = useState(""); // 채팅창 안에서 새롭게 추가할 방 이름 입력값
  const [message, setMessage] = useState("");           // 현재 키보드로 입력 중인 메시지 텍스트

  /**
   * 💡 [중요] 방별 대화 내역 보존을 위한 객체(Object) 주머니입니다.
   * 구조 예시:
   * {
   * "코딩방": [ { author: "철수", message: "안녕", time: "18:30" }, ... ],
   * "게임방": [ { author: "영희", message: "하이", time: "18:32" }, ... ]
   * }
   */
  const [roomMessages, setRoomMessages] = useState({});

  // --- [2. 기능 구현 함수 영역 (Functions)] ---

  /**
   * 🔓 [로그인 및 최초 방 입장 함수]
   * 로그인 화면에서 닉네임과 방 이름을 모두 입력하고 버튼을 누르면 실행됩니다.
   */
  const handleLogin = () => {
    // 공백 문자 제외하고 둘 다 정상적으로 입력되었는지 검사
    if (username.trim() !== "" && roomInput.trim() !== "") {
      const targetRoom = roomInput.trim();
      
      setIsLoggedIn(true);          // 로그인 상태를 완료로 변경 (UI 전환 트리거)
      setCurrentRoom(targetRoom);   // 현재 타겟팅할 방을 설정
      setMyRooms([targetRoom]);     // 참여 중인 방 목록 배열에 첫 방 등록
      
      // 📡 백엔드 서버에 "나 이 방 이름으로 입장할래"라고 신호(Event)를 보냄
      socket.emit("join_room", targetRoom);
    }
  };

  /**
   * ➕ [채팅방 내부에서 새로운 방 개설 및 이동 함수]
   * 사용자가 대화창 왼쪽 상단에서 새 방 이름을 치고 이동을 누르면 실행됩니다.
   */
  const handleAddNewRoom = () => {
    const nextRoom = newRoomInput.trim();
    
    // 빈칸이거나, 혹은 이미 내가 참여 중인 방 목록에 존재하는 이름이라면 처리를 무시(중단)합니다.
    if (nextRoom === "" || myRooms.includes(nextRoom)) return;

    // 📡 1. 백엔드에 "지금 보던 방(currentRoom)에서는 나갈게"라고 알림
    socket.emit("leave_room", currentRoom);
    
    // 📡 2. 백엔드에 "새로운 방(nextRoom)으로 들어갈게"라고 알림
    socket.emit("join_room", nextRoom);

    // 3. 내가 참여 중인 방 목록 배열의 뒤에 새 방 이름을 추가
    setMyRooms((prev) => [...prev, nextRoom]);
    
    // 4. 내가 현재 바라보는 방을 새 방으로 교체
    setCurrentRoom(nextRoom);
    
    // 5. 다음 입력을 위해 방 이름 입력창을 깨끗하게 비움
    setNewRoomInput("");
  };

  /**
   * 🔄 [참여 중인 채널 목록 간의 화면 전환 함수]
   * 왼쪽에 나열된 방 단추를 클릭할 때마다 실행됩니다.
   */
  const switchRoom = (targetRoom) => {
    // 만약 이미 내가 보고 있는 방을 또 클릭했다면 아무 작업도 하지 않고 종료합니다.
    if (targetRoom === currentRoom) return;

    // 📡 1. 현재 방의 소켓 룸 연결을 끊어달라고 서버에 요청
    socket.emit("leave_room", currentRoom);
    
    // 📡 2. 새로 클릭한 방의 소켓 룸으로 연결해 달라고 서버에 요청
    socket.emit("join_room", targetRoom);
    
    // 3. 리액트 화면이 새로운 방의 대화 내역을 그리도록 현재 방 상태를 업데이트
    setCurrentRoom(targetRoom);
  };

  /**
   * ❌ [방 나가기 및 메뉴 삭제 함수]
   * 채널 목록의 방 이름 옆에 있는 ✕ 버튼을 누르면 실행됩니다.
   */
  const handleLeaveRoom = (roomToLeave, e) => {
    // ⚠️ [중요] ✕ 버튼은 '방 단추' 내부에 있으므로, 클릭 시 부모의 switchRoom까지 실행되는 
    // 이벤트 버블링(이벤트 전파) 현상을 원천 차단합니다.
    e.stopPropagation(); 

    // 📡 1. 백엔드 서버에 해당 방의 소켓 통신망에서 완전히 나가겠다고 알림
    socket.emit("leave_room", roomToLeave);

    // 2. 참여 중인 방 목록 배열(myRooms)에서 방금 나간 방 이름만 쏙 뺀 새 배열을 만듭니다.
    const updatedRooms = myRooms.filter((room) => room !== roomToLeave);
    setMyRooms(updatedRooms);

    // 3. 내 컴퓨터 메모리에 보관 중이던 해당 방의 대화 기록 주머니(Key-Value pair)를 삭제하여 청소합니다.
    setRoomMessages((prev) => {
      const clone = { ...prev };
      delete clone[roomToLeave]; // 해당 방 이름의 key를 통째로 지움
      return clone;
    });

    // 4. [방어 코드] 만약 사용자가 '현재 하하호호 대화하던 방'에서 나가버린 경우의 처리
    if (currentRoom === roomToLeave) {
      if (updatedRooms.length > 0) {
        // 아직 탈퇴 안 하고 남은 방이 존재한다면, 그중 가장 첫 번째 방으로 자동 화면 전환시킵니다.
        setCurrentRoom(updatedRooms[0]);
        socket.emit("join_room", updatedRooms[0]);
      } else {
        // 참여 중인 방이 전멸했다면, 현재 보고 있는 방을 빈칸으로 만들어 대기 상태로 둡니다.
        setCurrentRoom("");
      }
    }
  };

  /**
   * ✉️ [메시지 전송 함수]
   * 입력창에 글을 쓰고 전송을 누르거나 엔터를 치면 실행됩니다.
   */
  const sendMessage = async () => {
    // 입력창이 비어있지 않고, 현재 들어와 있는 방이 확실히 존재할 때만 작동합니다.
    if (message.trim() !== "" && currentRoom !== "") {
      
      // 서버와 규격(Format)을 맞춘 전송용 데이터 데이터 가방 포장
      const messageData = {
        room: currentRoom,    // 배달될 방 이름
        author: username,    // 작성자 닉네임
        message: message,    // 본문 내용
        // 포맷팅된 현재 시간 (예: "오후 4:30" 또는 "16:30")
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      // 📡 백엔드 서버가 24시간 대기 중인 'send_message' 통로로 데이터 가방을 힘차게 던집니다!
      await socket.emit("send_message", messageData);
      
      // 메시지를 성공적으로 쐈으므로 키보드 입력창을 다시 빈칸으로 초기화합니다.
      setMessage("");
    }
  };

  // --- [3. 생명주기 및 실시간 이벤트 리스너 영역 (useEffect)] ---

  /**
   * 🎧 [전체 방 실시간 메시지 도청 장치]
   * 이 useEffect는 대괄호 배열(`[]`)이 비어있으므로 컴포넌트가 처음 켜질 때 딱 1번만 실행됩니다.
   * 사용자가 1번 방에 있든 5번 방에 있든, 서버에서 날아오는 "모든 방의 메시지 신호"를 놓치지 않고 수집합니다.
   */
  useEffect(() => {
    // 메시지 수신 시 처리할 내부 로직 콜백 함수 정의
    const handleReceiveMessage = (data) => {
      // 스프레드 연산자(...)를 사용해 기존 대화 데이터를 복사한 후 안전하게 새 데이터를 누적합니다.
      setRoomMessages((prev) => ({
        ...prev,
        // 데이터가 탄생한 방 이름(data.room) 주머니를 찾아가서 기존 배열 뒤에 새 메시지를 추가합니다.
        [data.room]: [...(prev[data.room] || []), data]
      }));
    };

    // 📡 서버가 'send_message' 이름으로 뿜어주는 이벤트 리스너(귀)를 활성화합니다.
    socket.on("send_message", handleReceiveMessage);

    // 🧹 [클린업 함수] 채팅창을 아예 끄거나 사이트를 나갈 때 소켓 리스너를 깔끔하게 철거하여
    // 메모리 누수 및 중복 리스너 등록 버그를 방지합니다.
    return () => {
      socket.off("send_message", handleReceiveMessage);
    };
  }, []);

  // --- [4. 데이터 가공 영역] ---
  // 객체 뭉치(roomMessages)에서 '내가 지금 눈으로 보고 있는 방(currentRoom)'의 대화 배열만 쏙 발라냅니다.
  // 아직 대화가 한 번도 없어서 데이터가 없다면 에러 방지를 위해 빈 배열(`[]`)을 기본값으로 줍니다.
  const currentMessageList = roomMessages[currentRoom] || [];


  // --- [5. 화면 렌더링 영역 (HTML/JSX UI)] ---
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      
      {/* 🔐 [조건부 렌더링 1] 로그인을 안 했다면 로그인창을, 했다면 채팅창을 보여줍니다. */}
      {!isLoggedIn ? (
        
        // ================= 로그인 화면 UI =================
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>자유 입장형 멀티 채팅방 🚀</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
            <input
              type="text"
              placeholder="사용할 닉네임"
              style={{ padding: "12px", fontSize: "16px" }}
              onChange={(e) => setUsername(e.target.value)} // 글자 칠 때마다 username 상태 업데이트
            />
            <input
              type="text"
              placeholder="입장할 방 이름 (예: 게임방)"
              style={{ padding: "12px", fontSize: "16px" }}
              onChange={(e) => setRoomInput(e.target.value)} // 글자 칠 때마다 roomInput 상태 업데이트
              onKeyPress={(e) => e.key === "Enter" && handleLogin()} // 방 이름 치고 엔터 누르면 바로 입장
            />
            <button onClick={handleLogin} style={{ padding: "12px", fontSize: "16px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
              채팅방 개설 및 입장
            </button>
          </div>
        </div>
      ) : (
        
        // ================= 메인 채팅창 화면 UI =================
        <div>
          {/* 상단 헤더 바 */}
          <h2 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>
            안녕하세요, <span style={{ color: "blue" }}>{username}</span>님!
          </h2>
          
          {/* 메인 레이아웃 (플렉스 박스로 가로 배치: 왼쪽 메뉴바 + 오른쪽 채팅창) */}
          <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
            
            {/* ⬅️ [좌측 영역]: 방 개설 기능 및 참여 중인 채널 리스트 메뉴 바 */}
            <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
              
              <h3 style={{ marginTop: 0 }}>🚪 새 방 들어가기</h3>
              <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder="방 이름 입력"
                  value={newRoomInput}
                  style={{ width: "120px", padding: "8px", fontSize: "13px" }}
                  onChange={(e) => setNewRoomInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddNewRoom()} // 타이핑 후 엔터 치면 새 방 입장
                />
                <button onClick={handleAddNewRoom} style={{ padding: "8px", fontSize: "12px", cursor: "pointer" }}>이동</button>
              </div>

              <h3>💬 참여 중인 채널</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* 자바스크립트 map 함수를 이용해 내가 들어간 방 목록 배열을 기반으로 버튼들을 반복 생성합니다. */}
                {myRooms.map((roomName) => (
                  <div
                    key={roomName}
                    onClick={() => switchRoom(roomName)} // 방 단추 영역 클릭 시 해당 방으로 화면 이동
                    style={{
                      display: "flex",
                      justifyContent: "space-between", // 방 이름은 왼쪽, X 버튼은 오른쪽에 강제 밀착 배치
                      alignItems: "center",
                      padding: "12px",
                      borderRadius: "5px",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                      // 내가 지금 보고 있는 방이라면 파란색 배경으로 하이라이트 효과를 줍니다.
                      backgroundColor: currentRoom === roomName ? "#4A90E2" : "#fff",
                      color: currentRoom === roomName ? "#fff" : "#333",
                    }}
                  >
                    {/* 방 이름 및 현재 쌓인 안 읽은(보관된) 메시지 숫자 표시 */}
                    <span style={{ flex: 1, fontWeight: currentRoom === roomName ? "bold" : "normal", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      # {roomName} {roomMessages[roomName]?.length > 0 && `(${roomMessages[roomName].length})`}
                    </span>
                    
                    {/* 방에서 완전히 이탈하고 목록에서 빼버리는 ✕ 버튼 */}
                    <button
                      onClick={(e) => handleLeaveRoom(roomName, e)} // 나가기 함수 호출
                      style={{
                        background: "none",
                        border: "none",
                        color: currentRoom === roomName ? "#fff" : "#999",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "12px",
                        marginLeft: "5px",
                        padding: "0 5px"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ➡️ [우측 영역]: 현재 선택된 방의 채팅 기록창 및 전송 폼 */}
            <div style={{ flex: 1 }}>
              <h3>📌 현재 채널: <span style={{ color: "#4A90E2" }}>{currentRoom || "선택된 방 없음"}</span></h3>
              
              {/* 스크롤 가능한 채팅 대화 타임라인 */}
              <div style={{ border: "1px solid #ccc", height: "350px", overflowY: "auto", padding: "15px", marginBottom: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                {/* 방을 다 나가서 선택된 방이 아무것도 없다면 안내 메시지를 출력합니다. */}
                {currentRoom === "" ? (
                  <div style={{ color: "#aaa", textAlign: "center", marginTop: "150px" }}>참여 중인 방이 없습니다. 왼쪽에서 새 방을 개설해 보세요!</div>
                ) : (
                  // 선택된 방이 있다면 대화 데이터 배열을 한 땀 한 땀 화면에 뿌립니다.
                  currentMessageList.map((msg, index) => (
                    <div key={index} style={{ textAlign: msg.author === username ? "right" : "left", margin: "10px 0" }}>
                      {/* 작성자 명과 시간 표시 */}
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>{msg.author} ({msg.time})</div>
                      {/* 말풍선 스타일 지정: 내가 쓴 건 파란색 오른쪽, 상대방이 쓴 건 회색 왼쪽 */}
                      <span style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        backgroundColor: msg.author === username ? "#4A90E2" : "#E5E5EA",
                        color: msg.author === username ? "#fff" : "#000",
                        maxWidth: "70%",
                        wordBreak: "break-all" // 긴 영문이나 링크 입력 시 말풍선 밖으로 삐져나가는 버그 방지
                      }}>
                        {msg.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
              
              {/* 하단 텍스트 입력창 및 전송 버튼 레이아웃 */}
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={message}
                  disabled={currentRoom === ""} // 보고 있는 방이 없다면 입력창을 비활성화(잠금)
                  placeholder={currentRoom === "" ? "방에 먼저 입장해 주세요" : `${currentRoom} 방에 메시지 보내기`}
                  style={{ flex: 1, padding: "12px", fontSize: "14px", borderRadius: "5px", border: "1px solid #ccc" }}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()} // 입력 중 엔터 키 누르면 즉시 발송
                />
                <button 
                  onClick={sendMessage} 
                  disabled={currentRoom === ""} // 보고 있는 방이 없다면 버튼 비활성화
                  style={{ 
                    padding: "0 20px", 
                    backgroundColor: currentRoom === "" ? "#ccc" : "#333", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: "5px", 
                    cursor: currentRoom === "" ? "default" : "pointer" 
                  }}
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