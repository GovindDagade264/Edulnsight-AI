import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PrivateMessage } from '../../types';
import { api } from '../../services/api';
import { X, Send, MessageCircle, Paperclip, CheckCheck, Trash2, Edit2, ShieldAlert } from 'lucide-react';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await api.messages.getConversations();
      setConversations(res.conversations);
      if (res.conversations.length > 0 && !activeContact) {
        openThread(res.conversations[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (contact: any) => {
    setActiveContact(contact);
    try {
      const res = await api.messages.getThread(contact.contact_id);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load thread', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContact || !newMessage.trim()) return;

    try {
      await api.messages.send({
        receiver_id: activeContact.contact_id,
        message: newMessage,
      });
      setNewMessage('');
      openThread(activeContact);
      loadConversations();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;
    try {
      await api.messages.edit(msgId, editContent);
      setEditingMsgId(null);
      setEditContent('');
      if (activeContact) openThread(activeContact);
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message? An audit log entry will be preserved.')) return;
    try {
      await api.messages.delete(msgId);
      if (activeContact) openThread(activeContact);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-plum-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-4xl h-[80vh] max-h-[750px] border border-violet-lavender/30 shadow-2xl flex flex-col bg-plum-900/95 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-violet-lavender/15 flex items-center justify-between bg-plum-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-brand/20 text-violet-lavender border border-violet-brand/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Messages
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full glass-pill text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Contacts Sidebar */}
          <div className="w-full sm:w-72 border-r border-violet-lavender/15 bg-plum-950/40 flex flex-col overflow-y-auto divide-y divide-violet-lavender/10">
            {conversations.map((c) => {
              const isSelected = activeContact?.contact_id === c.contact_id;
              return (
                <div
                  key={c.contact_id}
                  onClick={() => openThread(c)}
                  className={`p-3.5 cursor-pointer transition-all text-left ${
                    isSelected ? 'bg-violet-brand/20 border-l-4 border-l-violet-brand' : 'hover:bg-plum-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{c.full_name}</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-plum-800 text-violet-lavender">
                      {c.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{c.last_message || 'Start conversation...'}</p>
                </div>
              );
            })}
          </div>

          {/* Chat Pane */}
          <div className="flex-1 flex flex-col bg-plum-900/60 overflow-hidden">
            {activeContact ? (
              <>
                {/* Active contact bar */}
                <div className="p-3 border-b border-violet-lavender/15 bg-plum-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-deep to-violet-brand flex items-center justify-center font-bold text-xs text-white">
                      {activeContact.full_name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">{activeContact.full_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{activeContact.role} • {activeContact.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-plum-900 px-2 py-0.5 rounded-full border border-violet-lavender/10">
                    <ShieldAlert className="w-3 h-3 text-emerald-400" />
                    Encrypted Session
                  </span>
                </div>

                {/* Messages feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.map((m) => {
                    const isMe = m.sender_id === user?.id;

                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-0.5 px-1">
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.is_edited === 1 && <span className="italic text-slate-500">(edited)</span>}
                        </div>

                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs relative group leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-tr from-violet-deep to-violet-brand text-white shadow-violet-pill rounded-tr-none'
                              : 'bg-plum-950/90 border border-violet-lavender/20 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          {editingMsgId === m.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-plum-950 text-white p-1.5 rounded text-xs border border-white/30"
                              />
                              <div className="flex justify-end gap-2 text-[10px]">
                                <button onClick={() => setEditingMsgId(null)} className="underline">Cancel</button>
                                <button onClick={() => handleSaveEdit(m.id)} className="font-bold underline">Save</button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-line">{m.message}</p>
                          )}

                          {/* Quick Edit/Delete controls for sender */}
                          {isMe && !m.is_deleted && editingMsgId !== m.id && (
                            <div className="absolute -top-3 right-0 hidden group-hover:flex items-center gap-1 bg-plum-950 px-1.5 py-0.5 rounded-md border border-violet-lavender/30 text-[10px] shadow">
                              <button
                                onClick={() => {
                                  setEditingMsgId(m.id);
                                  setEditContent(m.message);
                                }}
                                title="Edit message"
                                className="text-slate-300 hover:text-white"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                title="Delete message"
                                className="text-rose-400 hover:text-rose-300"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Send Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-violet-lavender/15 bg-plum-950/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type private message..."
                    className="flex-1 bg-plum-900/90 border border-violet-lavender/20 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-brand"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="liquid-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-violet-pill disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Select a contact on the left to start private messaging.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
