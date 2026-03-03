import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Play,
  Terminal,
  Server,
  Users,
  UsersRound,
  Banknote,
  Settings,
  LogOut,
  Bot,
  Sun,
  Moon,
  Shield,
  Ticket,
  ShieldCheck,
  MessageSquare,
  Radio,
  BarChart3,
  Boxes
} from 'lucide-react';

const menuSections = [
  {
    label: 'Main Menu',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/runtime', label: 'Bot Runtime', icon: Play },
      { path: '/commands', label: 'Commands', icon: Terminal },
      { path: '/servers', label: 'Servers', icon: Server },
      { path: '/users', label: 'Users', icon: Users },
      { path: '/groups', label: 'Groups', icon: UsersRound },
      { path: '/transactions', label: 'Transactions', icon: Banknote },
      { path: '/catalog', label: 'Catalog', icon: Boxes },
    ]
  },
  {
    label: 'Messaging',
    items: [
      { path: '/send-message', label: 'Send Message', icon: MessageSquare },
      { path: '/broadcast', label: 'Broadcast', icon: Radio },
    ]
  },
  {
    label: 'Management',
    items: [
      { path: '/vouchers', label: 'Vouchers', icon: Ticket },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/audit-logs', label: 'Audit Logs', icon: Shield },
      { path: '/admins', label: 'Admins', icon: ShieldCheck },
      { path: '/settings', label: 'Settings', icon: Settings },
    ]
  }
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] text-[var(--sidebar-text)] flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300">
      <div className="flex flex-col h-full">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2 rounded-lg border border-accent/20">
              <Bot className="text-accent w-6 h-6" />
            </div>
            <span className="tracking-tight font-bold text-xl text-[var(--text-primary)]">
              MyBot<span className="text-accent">.</span>
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] transition-all active:scale-90 border border-[var(--border-color)]"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto scrollbar-pretty">
          {menuSections.map((section) => (
            <div key={section.label}>
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40">
                {section.label}
              </div>
              <div className="space-y-0.5 mt-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                      isActive
                        ? "bg-accent/10 text-accent font-bold shadow-sm shadow-accent/5"
                        : "hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-sm">{item.label}</span>
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-l-full shadow-lg" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--sidebar-border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3 mb-4 p-2.5 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
              <Users size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest leading-none mb-1 opacity-60">Admin</div>
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.jid?.split('@')[0] || 'Admin'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-white hover:bg-red-500 rounded-lg transition-all active:scale-95 border border-transparent hover:border-red-600 shadow-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
