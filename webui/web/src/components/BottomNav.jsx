import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
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
  Boxes,
  MessageSquare,
  Radio,
  Ticket,
  BarChart3,
  Shield,
  ShieldCheck,
  Ellipsis,
  X,
  Sun,
  Moon
} from 'lucide-react';

const primaryNavItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/runtime', label: 'Runtime', icon: Play },
  { path: '/servers', label: 'Servers', icon: Server },
];

const moreNavItems = [
  { path: '/commands', label: 'Commands', icon: Terminal },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/groups', label: 'Groups', icon: UsersRound },
  { path: '/transactions', label: 'Transactions', icon: Banknote },
  { path: '/catalog', label: 'Catalog', icon: Boxes },
  { path: '/send-message', label: 'Send Message', icon: MessageSquare },
  { path: '/broadcast', label: 'Broadcast', icon: Radio },
  { path: '/vouchers', label: 'Vouchers', icon: Ticket },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/audit-logs', label: 'Audit Logs', icon: Shield },
  { path: '/admins', label: 'Admins', icon: ShieldCheck },
  { path: '/settings', label: 'Settings', icon: Settings }
];

const BottomNav = () => {
  const { theme, toggleTheme } = useTheme();
  const [openMore, setOpenMore] = React.useState(false);

  return (
    <>
      {openMore && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenMore(false)}
            className="absolute inset-0 bg-black/35"
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-3 right-3 bottom-20 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-2xl"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">More Menu</p>
              <button
                type="button"
                onClick={() => setOpenMore(false)}
                className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-[56vh] overflow-y-auto pr-1 scrollbar-pretty">
              {moreNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpenMore(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-2 rounded-lg border p-2.5',
                    isActive
                      ? 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-[var(--border-color)] text-[var(--text-primary)]'
                  )}
                >
                  <item.icon size={16} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setOpenMore(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] p-2.5 text-[var(--text-primary)]"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span className="text-xs font-semibold">Theme</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)]/80 backdrop-blur-xl border-t border-[var(--border-color)] lg:hidden flex justify-around items-center h-16 px-4 pb-2 z-50 shadow-lg">
      {primaryNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => clsx(
            "flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 relative group",
            isActive ? "text-accent" : "text-[var(--text-secondary)]"
          )}
        >
          {({ isActive }) => (
            <>
              <div className={clsx(
                "p-1.5 rounded-lg transition-all duration-300 relative z-10",
                isActive ? "bg-accent/10" : "group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
              )}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={clsx(
                "text-[9px] font-bold mt-0.5 transition-all duration-300 tracking-wider relative z-10 uppercase",
                isActive ? "opacity-100 scale-100" : "opacity-50 scale-95"
              )}>
                {item.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-1 inset-y-1 bg-accent/[0.03] rounded-lg -z-0"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={() => setOpenMore((prev) => !prev)}
        className={clsx(
          'flex flex-col items-center justify-center flex-1 py-1 transition-all relative group active:scale-90',
          openMore ? 'text-accent' : 'text-[var(--text-secondary)]'
        )}
      >
        <div className={clsx(
          'p-1.5 rounded-lg transition-all',
          openMore ? 'bg-accent/10' : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
        )}>
          <Ellipsis size={20} />
        </div>
        <span className={clsx(
          'text-[9px] font-bold mt-0.5 transition-all duration-300 tracking-wider uppercase',
          openMore ? 'opacity-100 scale-100' : 'opacity-50 scale-95'
        )}>
          More
        </span>
      </button>

      <button 
        onClick={toggleTheme}
        className="flex flex-col items-center justify-center flex-1 py-1 transition-all relative group text-[var(--text-secondary)] active:scale-90"
      >
        <div className="p-1.5 rounded-lg transition-all group-hover:bg-slate-100 dark:group-hover:bg-slate-800">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </div>
        <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase opacity-40 scale-95">
          Mode
        </span>
      </button>
      </nav>
    </>
  );
};

export default BottomNav;
