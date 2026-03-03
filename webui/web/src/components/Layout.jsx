import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const Layout = () => {
  return (
    <div className="flex min-h-screen min-w-0 bg-[var(--bg-main)] text-[var(--text-primary)] font-sans transition-all duration-300 selection:bg-accent/20 selection:text-accent">
      <Sidebar />
      <BottomNav />
      <main className="flex-1 ml-0 lg:ml-72 p-4 md:p-8 pb-32 lg:pb-8 transition-all duration-300 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 min-w-0 space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
