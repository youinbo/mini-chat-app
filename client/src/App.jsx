import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessageList((list) => [...list, data]);
    });
    return () => socket.off('receive_message');
  }, []);

  // 변경포인트 3: 로그인(입장)할 때 서버에 내 방 번호를 등록요청합니다.
  const joinRoom = () => {
    if (username !== '' && room !== '') {
      socket.emit('join_room', room); // "서버야, 나 이 방 번호로 넣어줘!" 라고 신호 보냄
      setIsLoggedIn(true);
    }
  };

  const sendMessage = async () => {
    if (message !== '') {
      const messageData = {
        room: room, // 내가 속한 방 번호를 함께 실어서 보냅니다.
        author: username,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      await socket.emit('send_message', messageData);
      setMessage('');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' }}>
      {!isLoggedIn ? (
        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>진짜 방 분리 채팅방</h2>
          <input type="text" placeholder="닉네임 입력..." onChange={(e) => setUsername(e.target.value)} style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
          <input type="text" placeholder="방 번호 입력 (예: 1 또는 2)..." onChange={(e) => setRoom(e.target.value)} style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }} />
          <button onClick={joinRoom} style={{ width: '100%', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>입장하기</button>
        </div>
      ) : (
        <div style={{ width: '400px', height: '600px', background: 'white', borderRadius: '10px', boxShadow: '0px 4px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#4CAF50', color: 'white', padding: '15px', borderRadius: '10px 10px 0 0', textAlign: 'center', fontWeight: 'bold' }}>
            방 번호: {room} (접속자: {username})
          </div>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
            {messageList.map((content, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: username === content.author ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>{content.author}</span>
                <div style={{ backgroundColor: username === content.author ? '#DCF8C6' : '#fff', padding: '10px', borderRadius: '10px', maxWidth: '70%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', wordBreak: 'break-all' }}>
                  {content.message}
                </div>
                <span style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{content.time}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #ddd', padding: '10px' }}>
            <input type="text" value={message} placeholder="메시지를 입력하세요..." onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px', marginRight: '10px' }} />
            <button onClick={sendMessage} style={{ padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>전송</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;