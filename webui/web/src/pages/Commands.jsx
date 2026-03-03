import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Terminal,
  Search,
  Filter,
  ShieldCheck,
  UserCog,
  Clock,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Input, Pill } from '../components/ui';

const normalizeSearchText = (value = '') => value.toLowerCase().replace(/^\./, '').trim();

const Commands = () => {
  const [commands, setCommands] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const { data } = await api.get('/api/commands');
        setCommands(data);
      } catch (err) {
        console.error('Failed to fetch commands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCommands();
  }, []);

  const categories = ['All', ...new Set(commands.map((cmd) => cmd.category))];

  const filteredCommands = useMemo(() => {
    const query = normalizeSearchText(search);
    const terms = query.split(/\s+/).filter(Boolean);

    return commands
      .filter((cmd) => categoryFilter === 'All' || cmd.category === categoryFilter)
      .map((cmd) => {
        const name = (cmd.name || '').toLowerCase();
        const aliases = (cmd.aliases || []).map((alias) => alias.toLowerCase());
        const description = (cmd.description || '').toLowerCase();
        const category = (cmd.category || '').toLowerCase();
        const haystack = [name, ...aliases, description, category].join(' ');

        if (terms.length === 0) {
          return { cmd, score: 0 };
        }

        let score = 0;
        for (const term of terms) {
          if (name === term) score += 120;
          else if (aliases.includes(term)) score += 110;
          else if (name.startsWith(term)) score += 80;
          else if (aliases.some((alias) => alias.startsWith(term))) score += 70;
          else if (name.includes(term)) score += 50;
          else if (aliases.some((alias) => alias.includes(term))) score += 40;
          else if (description.includes(term)) score += 20;
          else if (category.includes(term)) score += 15;
          else return null;
        }

        if (haystack.includes(query)) {
          score += 10;
        }

        return { cmd, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.cmd.name.localeCompare(b.cmd.name))
      .map((item) => item.cmd);
  }, [commands, search, categoryFilter]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-4 animate-pulse">
        <div className="h-16 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-12 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 pb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 md:px-6 md:py-4 rounded-lg border border-[var(--border-color)] shadow-sm sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg-card)]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20 shadow-sm">
            <Terminal size={20} />
          </div>
          <div>
            <h1 className="heading-primary">Commands</h1>
            <p className="heading-secondary">{commands.length} Total</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:max-w-lg">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" size={14} />
            <Input
              type="text"
              placeholder="Search command, alias, category..."
              className="pl-9 pr-4"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative group min-w-0 sm:min-w-[140px] w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" size={14} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm appearance-none cursor-pointer font-semibold"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-[var(--bg-main)]/50 border-b border-[var(--border-color)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          <div className="col-span-3">Command</div>
          <div className="col-span-5">Description</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-right">Requirement</div>
        </div>

        <div className="divide-y divide-[var(--border-color)]">
          <AnimatePresence mode="popLayout">
            {filteredCommands.map((cmd) => (
              <motion.div
                key={cmd.name}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-3 px-4 lg:px-6 py-3 items-center hover:bg-accent/[0.02] transition-colors"
              >
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--bg-main)] rounded-lg flex items-center justify-center text-[var(--text-primary)] font-bold text-xs border border-[var(--border-color)]">
                      {cmd.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">.{cmd.name}</h3>
                      {cmd.aliases.length > 0 && (
                        <p className="text-[9px] text-[var(--text-secondary)] truncate opacity-60">{cmd.aliases.join(', ')}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1 lg:line-clamp-2">{cmd.description || 'No description.'}</p>
                </div>

                <div className="lg:col-span-2">
                  <Pill>{cmd.category}</Pill>
                </div>

                <div className="lg:col-span-2 flex gap-1.5 justify-start lg:justify-end">
                  {cmd.adminOnly && <ShieldCheck size={14} className="text-amber-500" title="Admin Only" />}
                  {cmd.ownerOnly && <UserCog size={14} className="text-red-500" title="Owner Only" />}
                  {cmd.cooldown > 0 && (
                    <span className="text-[9px] font-bold text-sky-500 flex items-center gap-1"><Clock size={10} /> {cmd.cooldown}s</span>
                  )}
                  {!cmd.adminOnly && !cmd.ownerOnly && cmd.cooldown === 0 && (
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] opacity-30">PUBLIC</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredCommands.length === 0 && (
            <div className="px-6 py-8 text-center text-xs text-[var(--text-secondary)]">
              No command matched your search.
            </div>
          )}
        </div>
      </Card>

      <div className="px-6 py-3 bg-accent/5 rounded-lg border border-accent/10 flex items-center gap-3">
        <Info size={14} className="text-accent" />
        <p className="text-[10px] text-accent/80 font-medium">Prefix <span className="font-bold">. (titik)</span>. Beberapa fitur memerlukan akses khusus.</p>
      </div>
    </div>
  );
};

export default Commands;
