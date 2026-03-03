import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BotRuntime from './pages/BotRuntime';
import Servers from './pages/Servers';
import Commands from './pages/Commands';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Groups from './pages/Groups';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import Vouchers from './pages/Vouchers';
import Admins from './pages/Admins';
import SendMessage from './pages/SendMessage';
import Broadcast from './pages/Broadcast';
import Analytics from './pages/Analytics';
import Catalog from './pages/Catalog';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Initializing Session...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="runtime" element={<BotRuntime />} />
              <Route path="servers" element={<Servers />} />
              <Route path="commands" element={<Commands />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:id" element={<UserDetail />} />
              <Route path="groups" element={<Groups />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="settings" element={<Settings />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="vouchers" element={<Vouchers />} />
              <Route path="admins" element={<Admins />} />
              <Route path="send-message" element={<SendMessage />} />
              <Route path="broadcast" element={<Broadcast />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="*" element={<div className="p-8 text-center text-slate-500">Page under development...</div>} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
