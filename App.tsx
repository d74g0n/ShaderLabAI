import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, RefreshCw, Layers, Terminal, Sparkles, Image as ImageIcon, Send, AlertCircle, Maximize2, Minimize2, Palette, ChevronDown, Upload } from 'lucide-react';
import ShaderCanvas from './components/ShaderCanvas';
import Editor from './components/Editor';
import { DEFAULT_SHADER, Tab, TextureChannel } from './types';
import { generateShader, debugShader } from './services/geminiService';
import { THEMES } from './themes';

// Default texture for testing
const DEFAULT_TEXTURES = [
  "https://picsum.photos/512/512",
  "https://picsum.photos/512/512?grayscale",
  "https://picsum.photos/512/512?blur"
];

function App() {
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [activeCode, setActiveCode] = useState(DEFAULT_SHADER); // Code actually running in shader
  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.EDITOR);
  
  // Channels State
  const [channels, setChannels] = useState<string[]>(["", "", "", ""]);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Theme State
  const [currentThemeKey, setCurrentThemeKey] = useState<string>("dieselpunk");
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Fullscreen State
  const previewRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      previewRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleCompile = useCallback(() => {
    setActiveCode(code);
    setError(null); // Clear previous errors, canvas will set new ones if any
  }, [code]);

  const handleShaderError = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const handleChannelChange = (index: number, url: string) => {
    const newChannels = [...channels];
    newChannels[index] = url;
    setChannels(newChannels);
  };

  const handleFileUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        handleChannelChange(index, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiResponse(null);
    try {
      const generated = await generateShader(aiPrompt);
      setCode(generated);
      setActiveCode(generated);
      setAiPrompt("");
      setActiveTab(Tab.EDITOR);
    } catch (e) {
      setAiResponse("Error generating shader. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiDebug = async () => {
    if (!error) return;
    setIsAiLoading(true);
    try {
      const fixed = await debugShader(activeCode, error);
      setCode(fixed);
      setActiveCode(fixed);
      setActiveTab(Tab.EDITOR);
    } catch (e) {
      setError("AI Debugging failed. " + String(e));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Construct CSS variables based on current theme
  const theme = THEMES[currentThemeKey];
  const themeStyles = {
    "--bg-app": theme.colors.bgApp,
    "--bg-panel": theme.colors.bgPanel,
    "--fg-primary": theme.colors.fgPrimary,
    "--fg-secondary": theme.colors.fgSecondary,
    "--border-color": theme.colors.border,
    "--accent": theme.colors.accent,
    "--accent-hover": theme.colors.accentHover,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300" style={themeStyles}>
      {/* Header */}
      <header className="h-14 bg-[var(--bg-panel)] border-b border-[var(--border-color)] flex items-center justify-between px-4 shrink-0 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent)] text-[var(--bg-app)]">
            <Sparkles size={18} />
          </div>
          <h1 className="font-bold text-lg text-[var(--fg-primary)] hidden sm:block">d74g0n ShaderLab AI</h1>
        </div>

        <div className="flex items-center gap-2 bg-[var(--bg-app)] rounded-lg p-1 border border-[var(--border-color)]">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 hover:bg-[var(--bg-panel)] rounded-md text-[var(--fg-secondary)] transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
          <span className="text-xs font-mono text-[var(--fg-secondary)] w-16 text-center">{time.toFixed(2)}s</span>
          <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
          <button
             onClick={handleCompile}
             className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-app)] rounded text-xs font-bold transition-colors"
          >
             <Play size={12} fill="currentColor" /> Run
          </button>
        </div>

        <div className="flex gap-2 items-center">
           {/* Theme Dropdown */}
           <div className="relative">
             <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-app)] transition-colors border border-transparent hover:border-[var(--border-color)] text-xs font-medium"
             >
                <Palette size={14} />
                <span className="hidden xl:inline">{theme.name}</span>
                <ChevronDown size={12} />
             </button>
             
             {isThemeOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setIsThemeOpen(false)} />
                 <div className="absolute top-full right-0 mt-2 w-56 max-h-[80vh] overflow-y-auto bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 py-2">
                    {Object.entries(THEMES).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => { setCurrentThemeKey(key); setIsThemeOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-[var(--bg-app)] ${currentThemeKey === key ? 'text-[var(--accent)] font-bold' : 'text-[var(--fg-primary)]'}`}
                      >
                        <div className="w-3 h-3 rounded-full border border-[var(--border-color)]" style={{ background: t.colors.accent }} />
                        {t.name}
                      </button>
                    ))}
                 </div>
               </>
             )}
           </div>

           <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

           <button 
             onClick={() => setActiveTab(Tab.EDITOR)}
             className={`p-2 rounded-md transition-colors ${activeTab === Tab.EDITOR ? 'bg-[var(--bg-app)] text-[var(--fg-primary)]' : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'}`}
             title="Code Editor"
           >
             <Terminal size={20} />
           </button>
           <button 
             onClick={() => setActiveTab(Tab.CHANNELS)}
             className={`p-2 rounded-md transition-colors ${activeTab === Tab.CHANNELS ? 'bg-[var(--bg-app)] text-[var(--fg-primary)]' : 'text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]'}`}
             title="Input Channels"
           >
             <Layers size={20} />
           </button>
           <button 
             onClick={() => setActiveTab(Tab.AI_ASSISTANT)}
             className={`p-2 rounded-md transition-colors ${activeTab === Tab.AI_ASSISTANT ? 'bg-[var(--bg-app)] text-[var(--accent)]' : 'text-[var(--fg-secondary)] hover:text-[var(--accent)]'}`}
             title="AI Assistant"
           >
             <Sparkles size={20} />
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[var(--bg-app)]">
        {/* Left: Preview */}
        <div 
          ref={previewRef}
          className="w-full md:w-1/2 lg:w-3/5 h-[50vh] md:h-full relative bg-black group"
        >
           <ShaderCanvas 
             fragCode={activeCode} 
             isPlaying={isPlaying} 
             channels={channels}
             onTimeUpdate={setTime}
             onError={handleShaderError}
           />
           
           {/* Floating Info */}
           <div className="absolute top-4 left-4 pointer-events-none z-10">
              <div className="text-xs text-white/50 font-mono">
                {Math.round(1000 / 16)} FPS
              </div>
           </div>

           {/* Fullscreen Button */}
           <button
              onClick={toggleFullscreen}
              className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white rounded-lg backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 z-10"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
           >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
           </button>
        </div>

        {/* Right: Tools/Editor */}
        <div className="w-full md:w-1/2 lg:w-2/5 h-[50vh] md:h-full flex flex-col bg-[var(--bg-app)] border-l border-[var(--border-color)]">
           
           {/* Editor Tab */}
           <div className={`flex-1 flex flex-col ${activeTab === Tab.EDITOR ? 'block' : 'hidden'} overflow-hidden`}>
             <Editor 
               code={code} 
               onChange={setCode} 
               onRun={handleCompile}
               error={error}
             />
             {error && (
               <div className="bg-[var(--bg-panel)] p-2 border-t border-[var(--border-color)] flex justify-end shrink-0">
                  <button 
                    onClick={handleAiDebug}
                    disabled={isAiLoading}
                    className="flex items-center gap-2 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded text-xs transition-colors"
                  >
                    {isAiLoading ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14} />}
                    Fix with AI
                  </button>
               </div>
             )}
           </div>

           {/* Channels Tab */}
           <div className={`flex-1 p-6 overflow-y-auto ${activeTab === Tab.CHANNELS ? 'block' : 'hidden'}`}>
              <h2 className="text-sm font-bold text-[var(--fg-primary)] mb-4 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} /> iChannels Inputs
              </h2>
              <div className="space-y-6">
                {[0, 1, 2, 3].map((id) => (
                  <div key={id} className="space-y-2">
                    <label className="text-xs text-[var(--fg-secondary)] font-mono block">iChannel{id}</label>
                    <div className="flex gap-2">
                      <div className="w-16 h-16 bg-black rounded border border-[var(--border-color)] overflow-hidden shrink-0 flex items-center justify-center">
                         {channels[id] ? (
                           <img src={channels[id]} alt={`ch${id}`} className="w-full h-full object-cover" />
                         ) : (
                           <ImageIcon size={24} className="text-[var(--fg-secondary)]" />
                         )}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <input 
                          type="text" 
                          placeholder="https://... (Image URL)"
                          value={channels[id]}
                          onChange={(e) => handleChannelChange(id, e.target.value)}
                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded px-3 py-2 text-xs text-[var(--fg-primary)] placeholder-[var(--fg-secondary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <div className="flex gap-2 flex-wrap">
                           {DEFAULT_TEXTURES.map((tex, i) => (
                             <button 
                               key={i}
                               onClick={() => handleChannelChange(id, tex)}
                               className="px-2 py-1 bg-[var(--bg-panel)] hover:bg-[var(--bg-app)] rounded text-[10px] text-[var(--fg-secondary)] border border-[var(--border-color)] transition-colors"
                             >
                               Sample {i+1}
                             </button>
                           ))}
                           <label className="px-2 py-1 bg-[var(--bg-panel)] hover:bg-[var(--bg-app)] rounded text-[10px] text-[var(--fg-secondary)] border border-[var(--border-color)] transition-colors cursor-pointer flex items-center gap-1">
                              <Upload size={10} /> Upload
                              <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/png,image/jpeg,image/jpg"
                                  onChange={(e) => handleFileUpload(id, e)}
                              />
                           </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           {/* AI Assistant Tab */}
           <div className={`flex-1 flex flex-col ${activeTab === Tab.AI_ASSISTANT ? 'block' : 'hidden'}`}>
              <div className="flex-1 p-6 overflow-y-auto">
                 <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-12 h-12 bg-[var(--bg-panel)] rounded-full flex items-center justify-center border border-[var(--border-color)]">
                       <Sparkles className="text-[var(--accent)]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-[var(--fg-primary)] font-semibold">AI Shader Generator</h3>
                      <p className="text-[var(--fg-secondary)] text-sm mt-1 max-w-xs mx-auto">
                        Describe what you want to see, and Gemini will generate the GLSL code for you.
                      </p>
                    </div>
                 </div>
              </div>
              
              {aiResponse && (
                <div className="px-6 py-2 text-red-400 text-xs bg-red-900/10 border-t border-red-900/20">
                  {aiResponse}
                </div>
              )}

              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
                <div className="relative">
                   <textarea
                     value={aiPrompt}
                     onChange={(e) => setAiPrompt(e.target.value)}
                     placeholder="E.g., A rotating cube made of neon lights..."
                     className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-4 pr-12 py-3 text-sm text-[var(--fg-primary)] placeholder-[var(--fg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none h-24 transition-all"
                   />
                   <button 
                     onClick={handleAiGenerate}
                     disabled={isAiLoading || !aiPrompt}
                     className="absolute bottom-3 right-3 p-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--bg-app)] rounded-md transition-colors"
                   >
                     {isAiLoading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                   </button>
                </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}

export default App;