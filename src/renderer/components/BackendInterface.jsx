import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Settings, ExternalLink, Trash2, X, Loader2,
  Play, FileCode, Package, Plus, MessageSquare,
  ChevronRight, Save, History, Layout, ChevronDown, ChevronUp, Cpu,
  Edit2, Check
} from 'lucide-react';
import { callGemini, summarizeHistory } from '../services/gemini';
import CodeApproval from './CodeApproval';

const BackendInterface = ({ isDetached, onClose }) => {
  // Session Management
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('system_core_sessions');
      return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Main Chat', messages: [], summary: null }];
    } catch (e) {
      return [{ id: 'default', name: 'Main Chat', messages: [], summary: null }];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('active_session_id') || 'default');

  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(!apiKey);
  const [model, setModel] = useState(localStorage.getItem('gemini_model') || 'gemini-3.1-flash-lite-preview');
  const [debugLogs, setDebugLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(() => {
    const saved = localStorage.getItem('show_debug_logs');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [loading, setLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState(null);
  const [view, setView] = useState('chat'); // 'chat', 'files', 'sessions'
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editName, setEditName] = useState('');
  const chatEndRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages]);

  useEffect(() => {
    localStorage.setItem('system_core_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('active_session_id', activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('gemini_model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('show_debug_logs', JSON.stringify(showLogs));
  }, [showLogs]);

  const addLog = (msg) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-50));
  };

  const updateActiveSession = (updater) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updater(s) } : s));
  };

  const handleSend = async () => {
    if (!input.trim() || !apiKey) {
      if (!apiKey) setShowSettings(true);
      return;
    }

    const userPrompt = input;
    const userMsg = { role: 'user', content: userPrompt };

    updateActiveSession(s => ({ messages: [...s.messages, userMsg] }));
    setInput('');
    setLoading(true);
    addLog(`User: ${userPrompt}`);

    try {
      const frontend = await window.electronAPI.getSavedCode('frontend');
      const backend = await window.electronAPI.getSavedCode('backend');

      const responseText = await callGemini({
        prompt: userPrompt,
        history: activeSession.messages,
        apiKey,
        preferredModel: model,
        onLog: addLog,
        currentCode: { frontend, backend }
      });

      const assistantMsg = { role: 'assistant', content: responseText };
      updateActiveSession(s => ({ messages: [...s.messages, assistantMsg] }));

      const frontendMatch = responseText.match(/```(?:javascript|js|jsx)\n([\s\S]*?)```/);
      const backendMatch = responseText.match(/```(?:backend|node|main|node\.js)\n([\s\S]*?)```/);

      if (frontendMatch) {
        setPendingCode({ type: 'frontend', code: frontendMatch[1] });
      } else if (backendMatch) {
        setPendingCode({ type: 'backend', code: backendMatch[1] });
      }

    } catch (error) {
      addLog(`SYSTEM ERROR: ${error.message}`);
      updateActiveSession(s => ({ messages: [...s.messages, { role: 'assistant', content: `Error: ${error.message}` }] }));
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession = { id: newId, name: `Chat ${sessions.length + 1}`, messages: [], summary: null };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
    setView('chat');
    addLog('New session created.');
  };

  const deleteSession = (id) => {
    if (sessions.length === 1) {
       updateActiveSession(() => ({ messages: [], summary: null }));
       return;
    }
    if (confirm('Delete this session?')) {
      const nextSessions = sessions.filter(s => s.id !== id);
      setSessions(nextSessions);
      if (activeSessionId === id) setActiveSessionId(nextSessions[0].id);
      addLog('Session deleted.');
    }
  };

  const startRenaming = (id, name) => {
    setEditingSessionId(id);
    setEditName(name);
  };

  const submitRename = () => {
    if (!editName.trim()) return;
    setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, name: editName } : s));
    setEditingSessionId(null);
    addLog(`Session renamed to ${editName}`);
  };

  const compactSession = async () => {
    setLoading(true);
    addLog("Compacting session history...");
    const summary = await summarizeHistory(activeSession.messages, apiKey, model);
    if (summary) {
      updateActiveSession(s => ({
        summary,
        messages: [{ role: 'assistant', content: `CONTEXT SUMMARY: ${summary}` }]
      }));
      addLog("Session compacted successfully.");
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!pendingCode) return;
    addLog(`Applying ${pendingCode.type} changes...`);
    try {
      await window.electronAPI.saveCode(pendingCode);
      if (pendingCode.type === 'backend') {
        window.electronAPI.runBackend();
      } else {
        const event = new CustomEvent('frontend-code-updated', { detail: pendingCode.code });
        window.dispatchEvent(event);
      }
      addLog(`Successfully applied ${pendingCode.type} code.`);
    } catch (err) {
      addLog(`Error saving code: ${err.message}`);
    }
    setPendingCode(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white text-gray-800 overflow-hidden">
      {pendingCode && (
        <CodeApproval
          code={pendingCode.code}
          type={pendingCode.type}
          onApprove={handleApprove}
          onCancel={() => setPendingCode(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b bg-gray-50 flex-shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView(view === 'sessions' ? 'chat' : 'sessions')}
            className={`p-1.5 rounded-md transition-colors no-drag ${view === 'sessions' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <History size={18} />
          </button>
          <div className="h-4 w-px bg-gray-300 mx-1" />
          <h2 className="font-bold text-xs truncate max-w-[150px]">{activeSession.name}</h2>
          <div className="flex bg-gray-200 rounded p-0.5 text-[9px] font-black uppercase no-drag ml-2">
             <button onClick={() => setView('chat')} className={`px-2 py-0.5 rounded ${view === 'chat' ? 'bg-white shadow-xs' : 'text-gray-500'}`}>Chat</button>
             <button onClick={() => setView('files')} className={`px-2 py-0.5 rounded ${view === 'files' ? 'bg-white shadow-xs' : 'text-gray-500'}`}>System</button>
          </div>
        </div>

        <div className="flex items-center gap-2 no-drag">
          <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded hover:bg-gray-200 ${showSettings ? 'text-blue-600' : 'text-gray-400'}`}>
            <Settings size={16} />
          </button>
          {!isDetached && (
            <button onClick={() => window.electronAPI.openDetached()} className="p-1.5 hover:bg-gray-200 rounded text-gray-400">
              <ExternalLink size={16} />
            </button>
          )}
          {!isDetached && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded text-gray-400">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar / Sessions View */}
        {view === 'sessions' && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col border-r shadow-xl max-w-[280px] animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Conversations</span>
              <button onClick={createNewSession} className="p-1 hover:bg-blue-100 text-blue-600 rounded">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${s.id === activeSessionId ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => { setActiveSessionId(s.id); setView('chat'); }}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <MessageSquare size={14} className={s.id === activeSessionId ? 'text-blue-500' : 'text-gray-400'} />
                    {editingSessionId === s.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white border rounded px-1 text-xs w-full outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className={`text-xs truncate ${s.id === activeSessionId ? 'font-bold text-blue-700' : 'text-gray-600'}`}>{s.name}</span>
                    )}
                  </div>
                  <div className={`flex items-center ${editingSessionId === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {editingSessionId === s.id ? (
                      <button onClick={(e) => { e.stopPropagation(); submitRename(); }} className="p-1 text-green-600 hover:bg-green-100 rounded">
                        <Check size={12} />
                      </button>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); startRenaming(s.id, s.name); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          className="p-1 text-red-400 hover:text-red-600 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {showSettings && (
            <div className="p-4 border-b bg-blue-50/80 backdrop-blur flex-shrink-0 z-20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-800 uppercase">Gemini API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Key..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-800 uppercase">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="gemini-3.1-flash-lite-preview">3.1 Flash Lite</option>
                    <option value="gemini-3.1-pro-preview">3.1 Pro</option>
                    <option value="gemini-3-flash-preview">3 Flash</option>
                    <option value="gemini-2.5-flash">2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">2.5 Flash Lite</option>
                    <option value="gemini-2.0-flash-exp">2.0 Flash</option>
                    <option value="gemini-2.0-pro-exp-02-05">2.0 Pro</option>
                    <option value="gemini-2.0-flash-thinking-exp-01-21">2.0 Thinking</option>
                    <option value="gemini-1.5-pro">1.5 Pro</option>
                    <option value="gemini-1.5-flash">1.5 Flash</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {view === 'chat' ? (
              <>
                <div className="flex justify-center mb-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 rounded-full">
                    <Cpu size={10} className="text-green-600" />
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-tighter">System Context Loaded</span>
                  </div>
                </div>
                {activeSession.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-800'}`}>
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.content}</pre>
                    </div>
                  </div>
                ))}
                {activeSession.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-10">
                    <div className="p-4 bg-gray-50 rounded-full">
                       <Layout size={40} className="text-gray-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-500">Ready to build?</p>
                      <p className="text-xs text-gray-400 max-w-[200px] mt-1">History is specific to this chat, but modifications persist across the entire system.</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            ) : view === 'files' ? (
              <FileView addLog={addLog} onCompact={compactSession} canCompact={activeSession.messages.length > 5} />
            ) : null}
          </div>

          {/* Debug Log Mini-Window */}
          <div className={`flex-shrink-0 border-t bg-gray-900 transition-all duration-300 flex flex-col ${showLogs ? 'h-32' : 'h-8'}`}>
            <div
              className="flex justify-between items-center px-2 py-1.5 text-gray-600 uppercase font-bold text-[9px] cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => setShowLogs(!showLogs)}
            >
              <div className="flex items-center gap-2">
                {showLogs ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                <span>Debug Logs</span>
              </div>
              {showLogs && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDebugLogs([]); }}
                  className="hover:text-white transition-colors"
                >Clear</button>
              )}
            </div>
            {showLogs && (
              <div className="flex-1 overflow-y-auto p-2 font-mono text-[9px] text-gray-400">
                {debugLogs.map((log, i) => (
                  <div key={i} className={log.includes('SYSTEM ERROR') ? 'text-red-400' : log.includes('Success') ? 'text-green-400' : ''}>
                    {log}
                  </div>
                ))}
                {debugLogs.length === 0 && <div className="text-gray-700 italic">No logs yet...</div>}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Gemini to modify the app..."
                className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 no-drag resize-none bg-gray-50"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all no-drag disabled:opacity-50 shadow-lg active:scale-95"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FileView = ({ addLog, onCompact, canCompact }) => {
  const [files, setFiles] = useState([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const fileList = await window.electronAPI.getGeneratedFiles();
        setFiles(fileList || []);
      } catch (err) {
        addLog(`Error loading files: ${err.message}`);
      }
    };
    loadFiles();
  }, [addLog]);

  const handleBuild = async () => {
    setIsBuilding(true);
    addLog("Starting DMG build...");
    try {
      await window.electronAPI.buildDMG();
      addLog("Build successful! Check dist_electron.");
    } catch (err) {
      addLog(`Build failed: ${err}`);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCompact}
          disabled={!canCompact}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-dashed rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group disabled:opacity-50 disabled:hover:bg-gray-50"
        >
          <History size={20} className="text-gray-400 group-hover:text-blue-500 mb-2" />
          <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-700">COMPACT HISTORY</span>
        </button>
        <button
          onClick={handleBuild}
          disabled={isBuilding}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-dashed rounded-xl hover:bg-green-50 hover:border-green-200 transition-all group disabled:opacity-50"
        >
          {isBuilding ? <Loader2 size={20} className="animate-spin text-green-600 mb-2" /> : <Package size={20} className="text-gray-400 group-hover:text-green-500 mb-2" />}
          <span className="text-[10px] font-bold text-gray-500 group-hover:text-green-700">{isBuilding ? 'BUILDING...' : 'RELEASE DMG'}</span>
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Active Filesystem</h3>
        {files.map(file => (
          <div key={file.name} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${file.type === 'frontend' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                <FileCode size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">{file.name}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">{file.type}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const content = await window.electronAPI.getSavedCode(file.type);
                setViewingFile({ name: file.name, content });
              }}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ))}
      </div>

      {viewingFile && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <FileCode size={18} className="text-blue-400" />
                 <h3 className="font-bold text-sm text-gray-200">{viewingFile.name}</h3>
              </div>
              <button onClick={() => setViewingFile(null)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed">
               <pre className="text-blue-300">
                {viewingFile.content}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end">
               <button onClick={() => setViewingFile(null)} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500">CLOSE SOURCE</button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-10">
         <button
           onClick={async () => {
             if(confirm("DANGER: Wipe all data?")) {
               localStorage.clear();
               await window.electronAPI.resetApp();
               window.location.reload();
             }
           }}
           className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
         >Factory Reset System</button>
      </div>
    </div>
  );
};

export default BackendInterface;
