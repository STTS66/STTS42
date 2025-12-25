import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Settings as SettingsIcon, Menu, Bot, Loader2, StopCircle } from 'lucide-react';
import { GenerateContentResponse, Chat } from '@google/genai';

import ChatList from './components/ChatList';
import MessageBubble from './components/MessageBubble';
import SettingsModal from './components/SettingsModal';
import { ChatSession, Message, AppSettings, ModelIds } from './types';
import { createChatSession, sendMessageStream, generateChatTitle } from './services/geminiService';

const STORAGE_KEY_SESSIONS = 'gemini_chat_sessions';
const STORAGE_KEY_SETTINGS = 'gemini_chat_settings';

const DEFAULT_SETTINGS: AppSettings = {
  systemInstruction: "You are a helpful and intelligent AI assistant powered by Google's Gemini models. Be concise, accurate, and use Markdown for formatting.",
  model: ModelIds.FLASH,
};

function App() {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Refs
  const chatInstanceRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load data on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);

    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }

    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    // If settings change, we should probably reset the chat instance to apply new instructions
    chatInstanceRef.current = null;
  }, [settings]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSessionId, sessions]); // Also scroll when switching sessions

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  // Initialize or retrieve chat instance
  const getChatInstance = async () => {
    if (!chatInstanceRef.current) {
        chatInstanceRef.current = createChatSession(settings.systemInstruction, settings.model);
        
        // If we are continuing an existing session, we need to "replay" history into the chat context
        // However, the SDK Chat object is stateful. Re-creating it wipes context.
        // For a robust implementation without assuming `history` param exists in the new SDK (as it wasn't in the prompt examples),
        // we will treat the visual history as separate from the model context if the user refreshes.
        // *Improvement*: To make context work across reloads, we would ideally pass history to createChatSession.
        // Since we can't rely on that API surface being available in this specific constrained prompt context, 
        // we will simply acknowledge that context is fresh on reload/session switch, 
        // OR we can send the history as a priming prompt (hacky).
        
        // *Best Effort*: We will just use the chat instance for the active session. 
        // If the user switches back to an old session, the model won't "remember" the previous context 
        // unless we replay it. For this demo, we will prioritize the "System Instructions" working perfectly.
        
        // If the current session has history, we *could* try to replay it silently, but that consumes tokens and quota.
        // Let's stick to: New Session = Fresh Context. Switching Session = Fresh Context (but history is visible).
        // This is a common pattern in simple LLM apps unless specific history hydration APIs are used.
    }
    return chatInstanceRef.current;
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    chatInstanceRef.current = null; // Reset chat instance for fresh context
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      chatInstanceRef.current = null;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    let sessionId = currentSessionId;
    let sessionList = sessions;

    // Create new session if none exists
    if (!sessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessionList = [newSession, ...sessions]; // Update local var for immediate use
      setSessions(sessionList);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
      chatInstanceRef.current = null; // Ensure fresh instance
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Optimistically update UI
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, messages: [...s.messages, userMessage], lastUpdated: Date.now() } 
        : s
    ));
    setInput('');
    setIsGenerating(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const chat = await getChatInstance();
      const streamResult = await sendMessageStream(chat, userMessage.content);

      // Create placeholder for AI response
      const botMessageId = crypto.randomUUID();
      const initialBotMessage: Message = {
        id: botMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
      };

      // Add bot message placeholder
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, initialBotMessage] } 
          : s
      ));

      let fullResponseText = '';

      for await (const chunk of streamResult) {
        // Fix: chunk.text is a property, not a function
        const chunkText = chunk.text;
        if (chunkText) {
            fullResponseText += chunkText;
            
            // Update the bot message content in real-time
            setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                const newMessages = [...s.messages];
                const lastMsgIndex = newMessages.findIndex(m => m.id === botMessageId);
                if (lastMsgIndex !== -1) {
                    newMessages[lastMsgIndex] = {
                        ...newMessages[lastMsgIndex],
                        content: fullResponseText
                    };
                }
                return { ...s, messages: newMessages };
            }));
        }
      }

      // Generate title if it's the first message interaction
      const currentSession = sessionList.find(s => s.id === sessionId);
      if (currentSession && currentSession.messages.length === 0) {
         generateChatTitle(userMessage.content).then(title => {
             setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
         });
      }

    } catch (error) {
      console.error("Generation error", error);
      // Add error message to chat
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        content: "Sorry, something went wrong. Please check your API key or connection.",
        timestamp: Date.now(),
      };
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
            ? { ...s, messages: [...s.messages, errorMessage] } 
            : s
        ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentSession = getCurrentSession();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar - Desktop */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} hidden md:block transition-all duration-300 ease-in-out overflow-hidden`}>
        <ChatList 
          sessions={sessions} 
          currentSessionId={currentSessionId} 
          onSelectSession={(id) => {
              setCurrentSessionId(id);
              chatInstanceRef.current = null; // Reset context on switch
          }}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-black/50" onClick={() => setIsSidebarOpen(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-3/4 bg-gray-900 z-30" onClick={e => e.stopPropagation()}>
                <ChatList 
                    sessions={sessions} 
                    currentSessionId={currentSessionId} 
                    onSelectSession={(id) => {
                        setCurrentSessionId(id);
                        chatInstanceRef.current = null;
                        setIsSidebarOpen(false);
                    }}
                    onNewChat={() => {
                        handleNewChat();
                        setIsSidebarOpen(false);
                    }}
                    onDeleteSession={handleDeleteSession}
                />
              </div>
          </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-gray-950">
        
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-lg text-gray-200 truncate">
              {currentSession?.title || 'Gemini Chat'}
            </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="System Instructions & Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
            {!currentSession || currentSession.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-900/20">
                        <Bot size={40} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">How can I help you today?</h2>
                    <p className="text-gray-400 max-w-md">
                        I'm using the <strong>{settings.model === ModelIds.FLASH ? 'Gemini 3 Flash' : 'Gemini 3 Pro'}</strong> model. 
                        Configure my behavior in settings.
                    </p>
                    {settings.systemInstruction.length > 0 && (
                        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg max-w-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Active System Instruction</p>
                            <p className="text-sm text-gray-300 italic line-clamp-3">"{settings.systemInstruction}"</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-4xl mx-auto pb-4">
                    {currentSession.messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isGenerating && (
                        <div className="flex justify-start w-full mb-6">
                           {/* The streaming content is updated in the last message, 
                               but if we wanted a loading indicator before first token: */}
                           {currentSession.messages[currentSession.messages.length - 1].role === 'user' && (
                               <div className="flex items-center gap-2 text-gray-500 ml-2">
                                   <Loader2 size={16} className="animate-spin" />
                                   <span className="text-sm">Thinking...</span>
                               </div>
                           )}
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            )}
        </main>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-950">
            <div className="max-w-4xl mx-auto relative">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Gemini..."
                    className="w-full bg-gray-900 text-white rounded-xl pl-4 pr-12 py-3.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none max-h-[200px] shadow-lg"
                    rows={1}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isGenerating}
                    className={`absolute right-2 bottom-2.5 p-2 rounded-lg transition-all duration-200 ${
                        input.trim() && !isGenerating
                            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md' 
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
            <div className="text-center mt-2">
                 <p className="text-[10px] text-gray-600">Gemini can make mistakes. Check important info.</p>
            </div>
        </div>

      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
      />
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;