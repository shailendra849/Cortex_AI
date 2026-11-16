import { useEffect, useState } from 'react';
import {
  Plus,
  MessageSquare,
  LogOut,
  User,
  PenSquare,
  Menu,
  X,
  CoinsIcon,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../utils/axios';
import { setUserData } from '../redux/user.slice';
import { getConversations } from '../features/conversation.api';
import {
  setConversations,
  setSelectedConversation,
} from '../redux/conversation.slice';
import { getMessages } from '../features/message.api';
import { setArtifacts, setMessages } from '../redux/message.slice';
import BillingDrawer from './BillingDrawer';
import {
  loadSelectedConversationId,
  saveSelectedConversationId,
} from '../utils/conversationPersist';

export default function Sidebar() {
  const [hovered, setHovered] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { userData } = useSelector((state) => state.user);
  const { conversations, selectedConversation } = useSelector((state) => state.conversation);
  const dispatch = useDispatch();
  const [showBilling, setShowBilling] = useState(false);
  const logout = async () => {
    try {
      await api.get('/api/auth/logout');
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

  const openConversation = async (conversation) => {
    dispatch(setSelectedConversation(conversation));
    saveSelectedConversationId(conversation._id);
    const messages = await getMessages(conversation._id);
    dispatch(setMessages(messages));
    // Keep PDF panel closed until user clicks the attachment.
    dispatch(setArtifacts([]));
  };

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        dispatch(setConversations(Array.isArray(data) ? data : []));

        const savedId = loadSelectedConversationId();
        if (!savedId) return;

        const found = data.find((chat) => chat._id === savedId);
        if (found) {
          await openConversation(found);
        }
      } catch (error) {
        console.log(error);
      }
    };

    // /api/me returns session shape with `userId` (not Mongo `_id`).
    // Always fetch when logged in — same as before the restore fix.
    if (userData) {
      fetchConversations();
    }
  }, [userData]);

  const handleCreateConversation = () => {
    dispatch(setSelectedConversation(null));
    saveSelectedConversationId(null);
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setMobileOpen(false);
  };

  const handleSelectConversation = async (conversation) => {
    setMobileOpen(false);
    await openConversation(conversation);
  };

  const PanelIcon = () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );

  /* ── Collapsed rail — desktop only ── */
  const CollapsedRail = () => (
    <div className="hidden lg:flex flex-col items-center w-[56px] h-screen bg-zinc-950 border-r border-zinc-800 py-4 gap-1 shrink-0">
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
      >
        <PanelIcon />
      </button>

      <button
        onClick={handleCreateConversation}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer"
      >
        <Plus size={17} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-1">
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              title={chat.title}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 border-none cursor-pointer
                ${isActive ? 'bg-teal-500/15 text-teal-400' : 'bg-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
            >
              <MessageSquare size={15} />
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        {userData && (
          <div className="relative">
            {userData.avatar ? (
              <img
                src={userData.avatar}
                alt={userData.name}
                className="w-8 h-8 rounded-[8px] object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-[8px] bg-zinc-800 flex items-center justify-center">
                <User size={14} className="text-zinc-400" />
              </div>
            )}
            <span className="absolute -bottom-px -right-px w-2 h-2 bg-teal-500 rounded-full border-[1.5px] border-zinc-950 block" />
          </div>
        )}
      </div>
    </div>
  );

  /* ── Full sidebar content ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-800">
        <button
          onClick={() => setCollapsed(true)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <PanelIcon />
        </button>

        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <X size={15} />
        </button>

        <span className="text-[16px] font-semibold text-zinc-100 tracking-tight flex-1">
          CortexAI
        </span>

        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md tracking-wide uppercase">
          {userData?.plan ?? 'free'}
        </span>

        <button
          onClick={handleCreateConversation}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <PenSquare size={14} />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-4 pt-4 pb-1">
        <button
          onClick={handleCreateConversation}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-xl py-[10px] border-none cursor-pointer transition-colors duration-150"
        >
          <Plus size={15} />
          New Chat
        </button>
      </div>

      <p className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-600">
        {conversations.length === 0 ? 'Conversations' : 'Recents'}
      </p>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-[13px] text-zinc-500">No conversations yet</p>
            <p className="text-[11px] text-zinc-600 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          conversations.map((chat) => {
            const isActive = selectedConversation?._id === chat._id;
            const isHov = hovered === chat._id;
            return (
              <div
                key={chat._id}
                onClick={() => handleSelectConversation(chat)}
                onMouseEnter={() => setHovered(chat._id)}
                onMouseLeave={() => setHovered(null)}
                className={`relative flex items-center cursor-pointer mb-0.5 pl-3 pr-3 py-2.5 rounded-lg transition-colors duration-150
                  ${
                    isActive
                      ? 'bg-zinc-900 text-zinc-100'
                      : isHov
                        ? 'bg-zinc-900/70 text-zinc-200'
                        : 'bg-transparent text-zinc-400'
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-teal-500" />
                )}
                <p className={`text-[13px] font-medium truncate ${isActive ? 'text-zinc-100' : ''}`}>
                  {chat.title}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Divider */}
      <div className="mx-2.5 h-px bg-zinc-800" />

      {/* Footer */}
      <div className="px-3.5 py-3.5">
        {userData ? (
          <div className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 hover:bg-zinc-900 transition-colors duration-150">
            <div className="relative shrink-0">
              {!userData?.avatar || imageError ? (
                <div className="w-9 h-9 rounded-[10px] bg-zinc-800 flex items-center justify-center">
                  <User size={15} className="text-zinc-400" />
                </div>
              ) : (
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="w-9 h-9 rounded-[10px] object-cover border border-zinc-700"
                  onError={() => setImageError(true)}
                />
              )}
              <span className="absolute -bottom-px -right-px w-[9px] h-[9px] bg-teal-500 rounded-full border-2 border-zinc-950 block" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-zinc-100 truncate">{userData.name}</p>
              <p className="text-[11px] text-zinc-600 mt-px">{userData.plan || 'Free Plan'}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowBilling(true)}
                className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-zinc-500 cursor-pointer hover:bg-zinc-800 hover:text-zinc-300 transition-all duration-150"
              >
                <CoinsIcon size={16} />
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-zinc-500 cursor-pointer hover:bg-zinc-800 hover:text-zinc-300 transition-all duration-150"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-1">
            <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl py-[11px] cursor-pointer hover:bg-zinc-800 transition-colors duration-150">
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (collapsed) return <CollapsedRail />;

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors duration-150 cursor-pointer"
      >
        <Menu size={16} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        bg-zinc-950 border-r border-zinc-800
        transition-transform duration-250
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <SidebarContent />
      </div>

      <BillingDrawer open={showBilling} onClose={() => setShowBilling(false)} />
    </>
  );
}
