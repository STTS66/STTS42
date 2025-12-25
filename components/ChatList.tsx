import React from 'react';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { ChatSession } from '../types';

interface ChatListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

const ChatList: React.FC<ChatListProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat,
  onDeleteSession 
}) => {
  // Sort sessions by lastUpdated descending
  const sortedSessions = [...sessions].sort((a, b) => b.lastUpdated - a.lastUpdated);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-72 flex-shrink-0">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 justify-center bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl border border-gray-700 transition-all shadow-sm hover:shadow-md group"
        >
          <Plus size={20} className="text-blue-400 group-hover:text-blue-300" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
        {sortedSessions.length === 0 ? (
            <div className="text-center text-gray-500 mt-10 text-sm">
                No saved chats.
            </div>
        ) : (
            sortedSessions.map((session) => (
            <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border border-transparent ${
                currentSessionId === session.id
                    ? 'bg-blue-900/20 border-blue-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={currentSessionId === session.id ? 'text-blue-400' : 'text-gray-500'} />
                <span className="truncate text-sm font-medium max-w-[140px]">
                    {session.title}
                </span>
                </div>
                <button
                onClick={(e) => onDeleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 text-gray-500 hover:text-red-400 rounded-md transition-all"
                title="Delete Chat"
                >
                <Trash2 size={14} />
                </button>
            </div>
            ))
        )}
      </div>
      
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600 text-center">
        Powered by Gemini 3 Flash
      </div>
    </div>
  );
};

export default ChatList;