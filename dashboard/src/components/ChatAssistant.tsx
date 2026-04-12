import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, Send, X, Bot, User, Loader2, ChevronDown, Square, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:3001/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OllamaModel {
  name: string;
  size: number;
  parameterSize: string | null;
  family: string | null;
}

const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmStatus, setLlmStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch models and check status on mount
  useEffect(() => {
    const fetchModelsAndStatus = async () => {
      try {
        const resp = await axios.get(`${API_BASE_URL}/chat/status`);
        setLlmStatus(resp.data.status === 'online' ? 'online' : 'offline');
        if (resp.data.models && resp.data.models.length > 0) {
          setModels(resp.data.models);
          // Set default model if not already selected
          setSelectedModel(prev => prev || resp.data.model || resp.data.models[0].name);
        }
      } catch {
        setLlmStatus('offline');
      }
    };
    fetchModelsAndStatus();
    const interval = setInterval(fetchModelsAndStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close model picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    if (showModelPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelPicker]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        messages: newMessages,
        model: selectedModel,
      }, {
        signal: abortController.signal
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.content
      };
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request canceled', error.message);
        // Do not add an error message if the user manually canceled
      } else {
        console.error('Chat Error:', error);
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: "Sorry, I encountered an error while trying to process your request." 
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const formatModelName = (name: string) => {
    // "glm-4.7-flash:latest" → "glm-4.7-flash"
    return name.replace(/:latest$/, '');
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 ** 2)).toFixed(0)}MB`;
  };

  return (
    <div className={`fixed z-[100] ${isExpanded ? 'inset-0' : 'bottom-6 right-6'}`}>
      {/* Backdrop for expanded mode */}
      <AnimatePresence>
        {isExpanded && isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat panel wrapper — positions differ for compact vs expanded */}
      <div className={isExpanded ? 'absolute inset-0 flex items-center justify-center p-6 pointer-events-none' : 'flex flex-col items-end'}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className={`pointer-events-auto bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden ${
              isExpanded
                ? 'w-full h-full max-w-4xl max-h-[90vh]'
                : 'mb-4 w-[350px] md:w-[400px] h-[500px]'
            }`}
          >
            {/* Header */}
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl text-white">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">Health Assistant</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${llmStatus === 'online' ? 'text-green-500' : llmStatus === 'offline' ? 'text-red-400' : 'text-yellow-500'}`}>Local LLM • {llmStatus === 'checking' ? 'Connecting…' : llmStatus === 'online' ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(e => !e)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[#86868B] transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand to full screen'}
                >
                  {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[#86868B] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Model Picker */}
            {models.length > 0 && (
              <div className="px-4 pt-3 pb-1 relative" ref={modelPickerRef}>
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[11px] font-bold text-[#424245] dark:text-[#A1A1A6] w-full justify-between"
                >
                  <span className="truncate">{formatModelName(selectedModel)}</span>
                  <ChevronDown size={12} className={`text-[#86868B] shrink-0 transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showModelPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
                    >
                      {models.map((m) => (
                        <button
                          key={m.name}
                          onClick={() => {
                            setSelectedModel(m.name);
                            setShowModelPicker(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-blue-500/10 transition-colors flex items-center justify-between gap-2 ${
                            m.name === selectedModel ? 'bg-blue-500/10' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className={`text-[12px] font-bold truncate ${m.name === selectedModel ? 'text-blue-500' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>
                              {formatModelName(m.name)}
                            </div>
                            {m.family && (
                              <div className="text-[9px] text-tertiary font-medium uppercase tracking-wider mt-0.5">
                                {m.family}{m.parameterSize ? ` • ${m.parameterSize}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] text-tertiary font-medium shrink-0">
                            {formatSize(m.size)}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-tertiary">
                    <MessageSquare size={24} />
                  </div>
                  <p className="text-sm font-bold text-secondary">
                    How can I help you with your health data today?
                  </p>
                  <p className="text-[11px] text-tertiary mt-2">
                    Try: "What was my average sleep score this week?" or "How many steps did I do yesterday?"
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white shadow-lg rounded-tr-none' 
                      : 'bg-[#F2F2F7] dark:bg-black/40 text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm border border-black/5 dark:border-white/5 rounded-tl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5 opacity-60">
                      {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {msg.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                    </div>
                    <div className="font-medium leading-relaxed">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-black" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 last:mb-0" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 last:mb-0" {...props} />,
                            li: ({node, ...props}) => <li className="" {...props} />,
                            code: ({node, inline, ...props}: any) => 
                              inline ? <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono" {...props} />
                                     : <code className="block bg-black/10 dark:bg-white/10 p-2 rounded-xl text-[11px] font-mono overflow-x-auto mb-2 last:mb-0" {...props} />,
                            pre: ({node, ...props}) => <pre className="mb-2 last:mb-0 custom-scrollbar" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-lg font-black mb-2 mt-4 first:mt-0" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-black mb-2 mt-3 first:mt-0" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-black mb-2 mt-2 first:mt-0" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
                            table: ({node, ...props}) => <table className="w-full text-left border-collapse mb-2" {...props} />,
                            th: ({node, ...props}) => <th className="border-b-2 border-black/10 dark:border-white/10 pb-1 pr-2 font-bold" {...props} />,
                            td: ({node, ...props}) => <td className="border-b border-black/5 dark:border-white/5 py-1 pr-2" {...props} />
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-black/40 p-4 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/5 shadow-sm">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-[#F2F2F7] dark:bg-white/5 border-t border-black/5 dark:border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your stats..."
                  disabled={isLoading}
                  className="w-full bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] text-sm font-bold p-4 pr-12 rounded-2xl border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-[#86868B] disabled:opacity-50"
                />
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm hover:shadow-lg transition-all"
                    title="Stop generating"
                  >
                    <Square fill="currentColor" size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* FAB — hidden when expanded */}
      {!isExpanded && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-500/40 border-4 border-white dark:border-[#1C1C1E] relative group"
        >
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#1C1C1E] z-10 ${llmStatus === 'online' ? 'bg-green-500' : llmStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-500 animate-pulse'}`} />
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </motion.button>
      )}
    </div>
  );
};

export default ChatAssistant;
