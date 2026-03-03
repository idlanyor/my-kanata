import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Banknote,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardFooter, FlashMessage, Input, Pill, Table, TableWrap, TBody, Td, THead, Th } from '../components/ui';

const Transactions = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [sendingInvoiceId, setSendingInvoiceId] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [flash, setFlash] = useState({ tone: 'info', message: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/data/transactions?page=${page}&search=${search}&source=${source}`);
      setData(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, source]);

  const sendInvoice = async (tx) => {
    setSendingInvoiceId(tx._id);
    setFlash({ tone: 'info', message: '' });
    try {
      const { data: res } = await api.post(`/api/bot/invoice/transaction/${tx._id}`);
      setFlash({ tone: 'success', message: res?.message || 'Invoice sent successfully.' });
    } catch (err) {
      setFlash({ tone: 'error', message: err?.response?.data?.error || 'Failed to send invoice.' });
    } finally {
      setSendingInvoiceId('');
    }
  };

  const runBackfillSource = async () => {
    setBackfilling(true);
    setFlash({ tone: 'info', message: '' });
    try {
      const { data: res } = await api.post('/api/data/transactions/backfill-source');
      setFlash({ tone: 'success', message: `${res?.message || 'Backfill selesai.'} Updated: ${res?.updated ?? 0}` });
      await fetchData();
    } catch (err) {
      setFlash({ tone: 'error', message: err?.response?.data?.error || 'Backfill source gagal.' });
    } finally {
      setBackfilling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Pill tone="success" className="flex items-center gap-1"><CheckCircle2 size={10} /> Success</Pill>;
      case 'pending':
        return <Pill tone="warning" className="flex items-center gap-1"><Clock size={10} /> Pending</Pill>;
      case 'failed':
        return <Pill tone="danger" className="flex items-center gap-1"><XCircle size={10} /> Failed</Pill>;
      default:
        return <Pill>{status}</Pill>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
            <Banknote size={20} />
          </div>
          <div>
            <h1 className="heading-primary">Transactions</h1>
            <p className="heading-secondary">Total {pagination.total} Records Found</p>
          </div>
        </div>

        <div className="relative group min-w-0 md:min-w-[280px] w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" size={14} />
          <Input
            type="text"
            placeholder="Search User or Reference..."
            className="pl-9 pr-4"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button onClick={runBackfillSource} disabled={backfilling}>
          {backfilling ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Backfill Source
        </Button>
      </div>

      <Card className="overflow-hidden">
        <FlashMessage tone={flash.tone} message={flash.message} className="m-4" />
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['finance', 'Finance'],
            ['store', 'Store'],
            ['smm', 'SMM'],
            ['general', 'General']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setSource(value); setPage(1); }}
              className={clsx(
                'px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border transition-colors',
                source === value
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <TableWrap>
          <Table>
            <THead>
              <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                <Th>User</Th>
                <Th>Type & Category</Th>
                <Th>Amount</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th className="text-right">Date</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </THead>
            <TBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr><Td colSpan="7" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">Loading transactions...</Td></tr>
                ) : data.length === 0 ? (
                  <tr><Td colSpan="7" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">No transactions found.</Td></tr>
                ) : data.map((tx) => (
                  <motion.tr
                    key={tx._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-accent/[0.02] transition-colors group"
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-accent">
                          <UserCircle size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{tx.userName || tx.userId.split('@')[0]}</span>
                          <code className="text-[9px] font-bold text-[var(--text-secondary)] opacity-50">{tx.userId.split('@')[0]}</code>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-[var(--text-primary)]">
                          {tx.type === 'income' ? <ArrowDownLeft size={14} className="text-emerald-500" /> : <ArrowUpRight size={14} className="text-red-500" />}
                          {tx.type}
                        </div>
                        {tx.category && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-accent/5 text-accent border border-accent/10 rounded-md w-fit">{tx.category}</span>
                        )}
                        {tx.product?.name && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-md w-fit">
                            {tx.product.name}
                          </span>
                        )}
                        {tx.source && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-md w-fit uppercase">
                            {tx.source}
                          </span>
                        )}
                        {(tx.serviceType || tx.billingCycle) && (
                          <span className="text-[9px] text-[var(--text-secondary)] opacity-70">
                            {(tx.serviceType || 'manual')} • {(tx.billingCycle || 'one_time')}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className={clsx('text-xs font-black', tx.type === 'income' ? 'text-emerald-500' : 'text-red-500')}>
                        {tx.type === 'income' ? '+' : '-'} Rp {new Intl.NumberFormat('id-ID').format(tx.amount)}
                      </span>
                    </Td>
                    <Td>
                      <p className="text-[10px] font-medium text-[var(--text-secondary)] max-w-[200px] truncate">{tx.description || '-'}</p>
                    </Td>
                    <Td>{getStatusBadge(tx.status || 'success')}</Td>
                    <Td className="text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-primary)]">
                          <Calendar size={12} className="opacity-40" />
                          {new Date(tx.date || tx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <span className="text-[9px] font-bold text-[var(--text-secondary)] opacity-40">
                          {new Date(tx.date || tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => sendInvoice(tx)}
                        disabled={sendingInvoiceId === tx._id}
                        className="inline-flex items-center gap-1.5"
                      >
                        {sendingInvoiceId === tx._id ? <RefreshCcw size={12} className="animate-spin" /> : null}
                        Invoice WA
                      </Button>
                    </Td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TBody>
          </Table>
        </TableWrap>

        <CardFooter className="px-6 py-3 flex items-center justify-between">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">Page {pagination.page} / {pagination.pages}</p>
          <div className="flex gap-2">
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5"><ChevronLeft size={16} /></Button>
            <Button disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="p-1.5"><ChevronRight size={16} /></Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Transactions;
