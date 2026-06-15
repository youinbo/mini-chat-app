// import { useEffect, useState } from "react";
// import { io } from "socket.io-client";

// // 서버와의 소켓 연결을 설정합니다. (환경 변수 혹은 기본 서버 주소 사용)
// const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

// function App() {
//   // 로그인 및 유저 상태
//   const [username, setUsername] = useState("");
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
  
//   // 현재 방 정보 및 전체 방 목록 관리
//   const [currentRoom, setCurrentRoom] = useState("");
//   const [channelList, setChannelList] = useState([]);
//   const [newRoomInput, setNewRoomInput] = useState(""); // 새로 추가할 방 입력창
  
//   // 채팅 메시지 및 읽음 상태 관리
//   const [message, setMessage] = useState("");
//   const [roomMessages, setRoomMessages] = useState({}); // { 방이름: [메시지리스트] }
//   const [lastRead, setLastRead] = useState({}); // { 방이름: 마지막으로 읽은 메시지 개수 }

//   // 로그인 시 초기 방 설정
//   const handleLogin = () => {
//     if (username.trim() !== "" && newRoomInput.trim() !== "") {
//       const targetRoom = newRoomInput.trim();
//       setIsLoggedIn(true);
//       setCurrentRoom(targetRoom);
//       setChannelList([targetRoom]);
//       socket.emit("join_room", targetRoom);
//     }
//   };

//   // 새로운 방 추가 로직
//   const handleAddNewRoom = () => {
//     const nextRoom = newRoomInput.trim();
//     if (nextRoom === "" || channelList.includes(nextRoom)) return;
    
//     socket.emit("join_room", nextRoom); // 서버에 새 방 참가 알림
//     setChannelList((prev) => [...prev, nextRoom]); // UI 목록에 추가
//     setCurrentRoom(nextRoom); // 현재 보고 있는 방으로 전환
//     setNewRoomInput("");
//   };

//   // 방 전환 (클릭 시 읽음 처리 포함)
//   const switchRoom = (targetRoom) => {
//     if (targetRoom === currentRoom) return;
    
//     // 방을 이동할 때, 현재 그 방의 메시지 개수를 읽음(lastRead)으로 저장하여 괄호를 없앰
//     setLastRead((prev) => ({
//       ...prev,
//       [targetRoom]: roomMessages[targetRoom]?.length || 0
//     }));
//     setCurrentRoom(targetRoom);
//   };

//   // 방 나가기 로직
//   const handleLeaveRoom = (roomToLeave, e) => {
//     e.stopPropagation(); // 부모(switchRoom) 클릭 이벤트 방지
//     socket.emit("leave_room", roomToLeave); // 서버에 방 나가기 전달
    
//     const updatedChannels = channelList.filter((room) => room !== roomToLeave);
//     setChannelList(updatedChannels);
    
//     // 해당 방의 메시지 기록 삭제
//     setRoomMessages((prev) => {
//       const clone = { ...prev };
//       delete clone[roomToLeave];
//       return clone;
//     });

//     // 현재 보고 있던 방을 나갔다면 첫 번째 방으로 자동 전환
//     if (currentRoom === roomToLeave) {
//       setCurrentRoom(updatedChannels.length > 0 ? updatedChannels[0] : "");
//     }
//   };

//   // 메시지 전송 로직
//   const sendMessage = async () => {
//     if (message.trim() !== "" && currentRoom !== "") {
//       const messageData = {
//         room: currentRoom,
//         author: username,
//         message: message,
//         time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
//       };
//       await socket.emit("send_message", messageData);
//       setMessage(""); // 전송 후 입력창 비우기
//     }
//   };

//   // 메시지 수신 (컴포넌트 마운트 시 한 번만 실행)
//   useEffect(() => {
//     const handleReceiveMessage = (data) => {
//       setRoomMessages((prev) => ({
//         ...prev,
//         [data.room]: [...(prev[data.room] || []), data]
//       }));
//     };
//     socket.on("send_message", handleReceiveMessage);
//     return () => socket.off("send_message", handleReceiveMessage); // 클린업 함수
//   }, []);

//   return (
//     <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
//       {!isLoggedIn ? (
//         // 로그인 화면
//         <div style={{ textAlign: "center", marginTop: "100px" }}>
//           <h2>자유 입장형 멀티 채팅방 🚀</h2>
//           <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px", margin: "0 auto" }}>
//             <input type="text" placeholder="닉네임" style={{ padding: "12px" }} onChange={(e) => setUsername(e.target.value)} />
//             <input type="text" placeholder="입장할 방 이름" style={{ padding: "12px" }} onChange={(e) => setNewRoomInput(e.target.value)} />
//             <button onClick={handleLogin} style={{ padding: "12px", backgroundColor: "#4A90E2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>입장하기</button>
//           </div>
//         </div>
//       ) : (
//         // 채팅 화면
//         <div style={{ display: "flex", gap: "20px" }}>
//           <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
//             <h3>🚪 방 추가</h3>
//             <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
//               <input type="text" placeholder="방 이름" value={newRoomInput} style={{ width: "100px", padding: "8px" }} onChange={(e) => setNewRoomInput(e.target.value)} />
//               <button onClick={handleAddNewRoom} style={{ padding: "8px", cursor: "pointer" }}>추가</button>
//             </div>
            
//             <h3>💬 채널 목록</h3>
//             {channelList.map((roomName) => {
//               // 안 읽은 메시지 계산: 현재 전체 메시지 수 - 마지막으로 읽은 메시지 수
//               const unread = (roomMessages[roomName]?.length || 0) - (lastRead[roomName] || 0);
//               return (
//                 <div key={roomName} onClick={() => switchRoom(roomName)} style={{ padding: "10px", margin: "5px 0", cursor: "pointer", backgroundColor: currentRoom === roomName ? "#4A90E2" : "#eee", color: currentRoom === roomName ? "#fff" : "#000", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
//                   <span>
//                     # {roomName} 
//                     {/* 💡 내가 보고 있는 방이 아니고, 안 읽은 메시지가 있을 때만 괄호 표시 */}
//                     {unread > 0 && currentRoom !== roomName && ` (${unread})`}
//                   </span>
//                   <button onClick={(e) => handleLeaveRoom(roomName, e)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
//                 </div>
//               );
//             })}
//           </div>
          
//           <div style={{ flex: 1 }}>
//             <h3>현재 채널: {currentRoom}</h3>
//             <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px", backgroundColor: "#f9f9f9" }}>
//               {(roomMessages[currentRoom] || []).map((msg, i) => (
//                 <div key={i} style={{ marginBottom: "5px" }}>
//                   <strong>{msg.author}:</strong> {msg.message} <span style={{fontSize: "10px", color: "#888"}}>{msg.time}</span>
//                 </div>
//               ))}
//             </div>
//             <div style={{ marginTop: "10px" }}>
//               <input type="text" value={message} style={{ width: "70%", padding: "10px" }} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && sendMessage()} />
//               <button onClick={sendMessage} style={{ padding: "10px 20px", marginLeft: "10px" }}>전송</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-render-server-address.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [currentRoom, setCurrentRoom] = useState("");
  const [channelList, setChannelList] = useState([]);
  const [newRoomInput, setNewRoomInput] = useState("");
  
  const [message, setMessage] = useState("");
  const [roomMessages, setRoomMessages] = useState({});
  const [lastRead, setLastRead] = useState({});

  const handleLogin = () => {
    if (username.trim() !== "" && newRoomInput.trim() !== "") {
      const targetRoom = newRoomInput.trim();
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

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      {!isLoggedIn ? (
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
              onChange={(e) => setNewRoomInput(e.target.value)} 
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
        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ width: "220px", borderRight: "1px solid #ccc", paddingRight: "20px" }}>
            <h3>🚪 방 추가</h3>
            <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
              <input 
                type="text" 
                placeholder="방 이름" 
                value={newRoomInput} 
                style={{ width: "100px", padding: "8px" }} 
                onChange={(e) => setNewRoomInput(e.target.value)} 
              />
              <button onClick={handleAddNewRoom} style={{ padding: "8px", cursor: "pointer" }}>추가</button>
            </div>
            
            <h3>💬 채널 목록</h3>
            {channelList.map((roomName) => {
              const unread = (roomMessages[roomName]?.length || 0) - (lastRead[roomName] || 0);
              return (
                <div 
                  key={roomName} 
                  onClick={() => switchRoom(roomName)} 
                  style={{ 
                    padding: "10px", 
                    margin: "5px 0", 
                    cursor: "pointer", 
                    backgroundColor: currentRoom === roomName ? "#4A90E2" : "#eee", 
                    color: currentRoom === roomName ? "#fff" : "#000", 
                    borderRadius: "4px", 
                    display: "flex", 
                    justifyContent: "space-between" 
                  }}
                >
                  <span>
                    # {roomName} 
                    {unread > 0 && currentRoom !== roomName && ` (${unread})`}
                  </span>
                  <button 
                    onClick={(e) => handleLeaveRoom(roomName, e)} 
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          
          <div style={{ flex: 1 }}>
            <h3>현재 채널: {currentRoom}</h3>
            <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px", backgroundColor: "#f9f9f9" }}>
              {(roomMessages[currentRoom] || []).map((msg, i) => (
                <div key={i} style={{ marginBottom: "5px" }}>
                  <strong>{msg.author}:</strong> {msg.message} 
                  <span style={{ fontSize: "10px", color: "#888", marginLeft: "5px" }}>{msg.time}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "10px", display: "flex" }}>
              <input 
                type="text" 
                value={message} 
                style={{ flex: 1, padding: "10px" }} 
                onChange={(e) => setMessage(e.target.value)} 
                onKeyPress={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
              <button onClick={sendMessage} style={{ padding: "10px 20px", marginLeft: "10px" }}>전송</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;