import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      // In dev, Vite proxies /socket.io to localhost:3000
      // In prod, it's the same origin
      const newSocket = io('/', {
          withCredentials: true
      });
      setSocket(newSocket);

      return () => newSocket.close();
    } else {
        if (socket) {
            socket.close();
            setSocket(null);
        }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
