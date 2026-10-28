import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AcademicTicket, TicketMessage, TicketStatus } from '../../types';
import { api } from '../../services/api';
import {
  X,
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  ArrowRight,
  Filter
} from 'lucide-react';

interface QueryTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  'Open': { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  'In Progress': { bg: 'bg-violet-brand/20', text: 'text-violet-lavender', border: 'border-violet-brand/40' },
  'Awaiting Student': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Resolved': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'Closed': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const ALL_STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Awaiting Student', 'Resolved', 'Closed'];

export const QueryTicketsModal: React.FC<QueryTicketsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<AcademicTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AcademicTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newReply, setNewReply] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Ticket Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Marks Query');
  const [newPriority, setNewPriority] = useState('MEDIUM');

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await api.tickets.list();
      setTickets(res.tickets);
      if (res.tickets.length > 0 && !selectedTicket) {
        loadTicketDetails(res.tickets[0].id);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const res = await api.tickets.get(ticketId);
      setSelectedTicket(res.ticket);
      setTicketMessages(res.messages);
    } catch (err) {
      console.error('Failed to load ticket messages', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newReply.trim()) return;

    try {
      await api.tickets.reply(selectedTicket.id, { message: newReply });
      setNewReply('');
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (err) {
      console.error('Failed to reply', err);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      await api.tickets.updateStatus(selectedTicket.id, {
        status: newStatus,
        reason: `Status transition to ${newStatus} by ${user?.full_name}`
      });
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    try {
      setLoading(true);
      const res = await api.tickets.create({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      });
      setIsCreating(false);
      setNewTitle('');
      setNewDesc('');
      await loadTickets();
      if (res.ticket_id) {
        loadTicketDetails(res.ticket_id);
      }
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTickets = statusFilter === 'ALL'
    ? tickets
    : tickets.filter(t => t.status === statusFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-plum-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-5xl h-[85vh] max-h-[800px] border border-violet-lavender/30 shadow-2xl flex flex-col bg-plum-900/95 overflow-hidden">
        {/* Concise Header */}
        <div className="p-4 sm:p-5 border-b border-violet-lavender/15 flex items-center justify-between bg-plum-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Academic Queries
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'student' && !isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="liquid-btn px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet-pill"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Query</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Tickets List & Filter */}
          <div className="w-full md:w-80 border-r border-violet-lavender/15 flex flex-col bg-plum-950/40">
            {/* Status Filter Bar */}
            <div className="p-2.5 border-b border-violet-lavender/10 flex items-center gap-1.5 overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  statusFilter === 'ALL' ? 'bg-violet-brand text-white shadow-violet-pill' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {ALL_STATUSES.map(stat => (
                <button
                  key={stat}
                  onClick={() => setStatusFilter(stat)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                    statusFilter === stat ? 'bg-violet-brand text-white shadow-violet-pill' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {stat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-violet-lavender/10">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const statusStyle = STATUS_COLORS[t.status] || STATUS_COLORS['Open'];

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setIsCreating(false);
                      loadTicketDetails(t.id);
                    }}
                    className={`p-3 cursor-pointer transition-all text-left ${
                      isSelected ? 'bg-violet-brand/15 border-l-4 border-l-violet-brand' : 'hover:bg-plum-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{t.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Content: View Thread or Create Form */}
          <div className="flex-1 flex flex-col bg-plum-900/60 overflow-hidden">
            {isCreating ? (
              /* Simplified Create Query Form */
              <div className="p-6 overflow-y-auto flex-1">
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="border-b border-violet-lavender/15 pb-2">
                    <h4 className="text-base font-bold text-white">New Academic Query</h4>
                  </div>

                  <form onSubmit={handleCreateTicket} className="space-y-4 text-left">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Query title"
                        className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
                        >
                          <option value="Marks Query">Marks Query</option>
                          <option value="Doubt Clearing">Doubt Clearing</option>
                          <option value="Attendance Discrepancy">Attendance</option>
                          <option value="Assignment Extension">Assignment</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                        <select
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value)}
                          className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-brand"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Question</label>
                      <textarea
                        rows={5}
                        required
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Ask an academic question..."
                        className="w-full bg-plum-950/90 border border-violet-lavender/25 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-violet-pill"
                      >
                        <span>{loading ? 'Submitting...' : 'Submit Query'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : selectedTicket ? (
              /* Ticket Thread View */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Thread Header with Status Transitions */}
                <div className="p-3.5 border-b border-violet-lavender/15 bg-plum-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        STATUS_COLORS[selectedTicket.status]?.bg || ''
                      } ${STATUS_COLORS[selectedTicket.status]?.text || ''} ${
                        STATUS_COLORS[selectedTicket.status]?.border || ''
                      }`}>
                        {selectedTicket.status}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{selectedTicket.category}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{selectedTicket.title}</h3>
                  </div>

                  {/* Teacher / Admin status transition dropdown */}
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                        className="bg-plum-900 border border-violet-lavender/30 rounded-lg py-1 px-2 text-xs text-white focus:outline-none focus:border-violet-brand font-semibold"
                      >
                        {ALL_STATUSES.map(stat => (
                          <option key={stat} value={stat}>{stat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {ticketMessages.map((msg) => {
                    const isSystem = msg.message.startsWith('[SYSTEM UPDATE]');
                    const isCurrentUser = msg.sender_user_id === user?.id;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center py-1">
                          <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-plum-950/90 text-violet-lavender border border-violet-lavender/15 inline-block">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-0.5 px-1">
                          <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                          <span>• {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                            isCurrentUser
                              ? 'bg-gradient-to-tr from-violet-deep to-violet-brand text-white shadow-violet-pill rounded-tr-none'
                              : 'bg-plum-950/90 border border-violet-lavender/20 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.message}</p>
                          {msg.attachment_name && (
                            <div className="mt-2 pt-1.5 border-t border-white/20 flex items-center gap-1.5 text-[11px] font-mono">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="underline">{msg.attachment_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Box with Clean Placeholder */}
                {selectedTicket.status !== 'Closed' ? (
                  <form onSubmit={handleSendReply} className="p-3 border-t border-violet-lavender/15 bg-plum-950/60 flex items-center gap-2">
                    <input
                      type="text"
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Ask an academic question or reply..."
                      className="flex-1 bg-plum-900/90 border border-violet-lavender/20 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand"
                    />
                    <button
                      type="submit"
                      disabled={!newReply.trim()}
                      className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet-pill disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-3 border-t border-violet-lavender/15 bg-plum-950/60 text-center text-xs text-slate-400">
                    Query resolved and marked Closed.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Select a query from the left panel to view the thread.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
