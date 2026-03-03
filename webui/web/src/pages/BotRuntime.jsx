import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Play, Square, RotateCcw, UserPlus, Terminal as TerminalIcon, Power, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const BotRuntime = () => {
  const socket = useSocket();
  const [status, setStatus] = useState({ status: 'offline', pairingCode: null });
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          api.get('/api/bot/status'),
          api.get('/api/bot/logs')
        ]);
        setStatus(statusRes.data);
        setLogs(logsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('ui:bot-status', (data) => setStatus(data));
    socket.on('ui:bot-log', (data) => {
      setLogs((prev) => [...prev.slice(-999), data]);
    });

    return () => {
      socket.off('ui:bot-status');
      socket.off('ui:bot-log');
    };
  }, [socket]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runCommand = async (cmd) => {
    try {
      await api.post(`/api/bot/${cmd}`);
    } catch (err) {
      alert(`Action ${cmd} failed: ` + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 md:px-6 md:py-3 rounded-lg border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500 shadow-sm",
            status.status === 'online' 
              ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" 
              : "bg-red-500/10 text-red-500 ring-1 ring-red-500/20"
          )}>
            <Power size={20} className={clsx(status.status === 'online' && "animate-pulse")} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Bot Runtime</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={clsx("w-1.5 h-1.5 rounded-full", status.status === 'online' ? "bg-emerald-500" : "bg-red-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60">{status.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={() => runCommand('start')}
              disabled={status.status !== 'offline'}
              className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white disabled:opacity-30 rounded-lg transition-all active:scale-90"
              title="Start Bot"
            >
              <Play size={18} fill="currentColor" />
            </button>
            <button 
              onClick={() => runCommand('stop')}
              disabled={status.status === 'offline'}
              className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-30 rounded-lg transition-all active:scale-90"
              title="Stop Bot"
            >
              <Square size={18} fill="currentColor" />
            </button>
            <button 
              onClick={() => runCommand('restart')}
              className="p-2.5 bg-sky-500/10 text-sky-500 hover:bg-sky-500 hover:text-white rounded-lg transition-all active:scale-90"
              title="Restart Bot"
            >
              <RotateCcw size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 pb-2">
        {/* Left Side: Stats/Pairing */}
        <div className="lg:col-span-1 space-y-4 flex flex-col min-h-0">
          <div className="bg-[var(--bg-card)] p-5 rounded-lg border border-[var(--border-color)] shadow-sm flex flex-col h-full overflow-hidden">
            <h2 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2 opacity-60">
                <Info size={14} /> Details
            </h2>
            
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
              {status.pairingCode ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-accent/[0.03] border border-accent/10 rounded-lg text-center shadow-inner"
                >
                    <p className="text-[9px] text-accent font-black uppercase tracking-[0.2em] mb-3">Pairing Code</p>
                    <h1 className="text-3xl font-black text-accent tracking-[0.2em]">{status.pairingCode}</h1>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-4 leading-relaxed opacity-70">Masukkan kode ini di WhatsApp.</p>
                </motion.div>
              ) : (
                <div className="p-6 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-center opacity-40 flex flex-col items-center justify-center border-dashed">
                    <Power size={24} className="mb-2 text-[var(--text-secondary)] opacity-20" />
                    <p className="text-[9px] font-black uppercase tracking-wider">No Active Pairing</p>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-[var(--border-color)] space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">Memory</span>
                    <span className="text-[var(--text-primary)]">124 MB</span>
                </div>
                
                <button 
                  onClick={() => confirm('Hapus sesi dan login ulang?') && runCommand('relogin')}
                  className="w-full mt-4 flex items-center justify-center gap-2 p-3 text-[10px] font-black text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all active:scale-95 uppercase tracking-widest"
                >
                  <UserPlus size={14} /> Reset Session
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Terminal */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-[400px]">
          <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full ring-1 ring-white/5">
            <div className="bg-slate-800/30 px-6 py-3 border-b border-slate-800/50 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="h-4 w-px bg-slate-700/50 mx-1" />
                    <TerminalIcon size={14} className="text-slate-500" />
                    <span className="text-slate-500 font-black text-[9px] uppercase tracking-[0.25em]">TERMINAL</span>
                </div>
                <button 
                    onClick={() => setLogs([])}
                    className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-400 transition-all flex items-center gap-2 border border-slate-700/30"
                >
                    <RotateCcw size={10} /> Clear
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 font-mono text-[12px] leading-relaxed scrollbar-terminal bg-[#0b0f19]">
              <AnimatePresence initial={false}>
                {logs.length === 0 && (
                  <div className="text-slate-700 italic flex items-center gap-2 opacity-50">
                    <span className="w-1 h-4 bg-slate-800 animate-pulse" />
                    Waiting for stream...
                  </div>
                )}
                {logs.map((log, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 group py-0.5"
                  >
                    <span className="text-slate-700 flex-shrink-0 select-none opacity-40 group-hover:opacity-100 transition-opacity w-16 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <div className="flex-1">
                      <span className={clsx(
                          "break-all",
                          log.type === 'error' ? "text-red-400" : log.type === 'warn' ? "text-amber-400" : "text-emerald-400/80"
                      )}>
                          <span className="text-slate-800 mr-2 opacity-30 font-bold">❯</span>
                          {log.message}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logEndRef} />
            </div>

            <div className="bg-slate-900/90 px-6 py-2 border-t border-slate-800/50 flex items-center justify-between text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-500" /> LIVE</span>
                    <span className="opacity-30">|</span>
                    <span>BAILEYS V6.0</span>
                </div>
                <div className="opacity-40">UTF-8 STREAM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotRuntime;
