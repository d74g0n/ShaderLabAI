import React, { useState, useEffect, useRef } from 'react';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  error?: string | null;
}

const Editor: React.FC<EditorProps> = ({ code, onChange, onRun, error }) => {
  const [lines, setLines] = useState(1);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines(code.split('\n').length);
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      onRun();
    }
  };

  const handleScroll = () => {
    if (textAreaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col border-t md:border-t-0 md:border-l bg-[var(--bg-app)] border-[var(--border-color)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--fg-secondary)] shrink-0">
        <div className="flex items-center gap-3">
          <span>GLSL FRAGMENT SHADER</span>
        </div>
        <span className="flex items-center gap-2">
           <kbd className="hidden md:inline-block px-2 py-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded text-[var(--fg-primary)]">Ctrl + Enter</kbd> 
           to 
           <button 
             type="button"
             onClick={(e) => {
               e.preventDefault();
               onRun();
             }}
             className="hover:text-[var(--accent)] hover:underline cursor-pointer focus:outline-none transition-colors"
             title="Click to compile"
           >
             compile
           </button>
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden flex">
        {/* Line Numbers */}
        <div 
          ref={lineNumbersRef}
          className="w-12 bg-[var(--bg-app)] text-right pr-3 pt-4 pb-4 text-[var(--fg-secondary)] select-none font-mono text-sm leading-6 border-r border-[var(--border-color)] overflow-hidden"
        >
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textAreaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 w-full h-full bg-[var(--bg-app)] text-[var(--fg-primary)] p-4 font-mono text-sm leading-6 resize-none focus:outline-none focus:ring-0 border-none overflow-y-auto"
        />
      </div>

      {/* Error Console */}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 max-h-40 overflow-y-auto bg-red-900/90 text-red-100 p-4 font-mono text-xs border-t border-red-700 backdrop-blur-sm z-10">
          <div className="font-bold mb-1">COMPILATION ERROR:</div>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
    </div>
  );
};

export default Editor;