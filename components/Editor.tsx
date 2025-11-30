import React, { useState, useEffect, useRef, useMemo } from 'react';

interface TabItem {
  id: string;
  label: string;
}

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  error?: string | null;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

const Editor: React.FC<EditorProps> = ({ 
  code, 
  onChange, 
  onRun, 
  error,
  tabs,
  activeTab,
  onTabChange
}) => {
  const [lines, setLines] = useState(1);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [highlightWord, setHighlightWord] = useState<string | null>(null);
  
  // History Management
  const historyRef = useRef<string[]>([]);
  const lastSnapshotTimeRef = useRef<number>(0);

  useEffect(() => {
    setLines(code.split('\n').length);
  }, [code]);

  // Clear history when switching tabs to avoid undoing into a different file
  useEffect(() => {
    historyRef.current = [];
  }, [activeTab]);

  // Helper to save history
  const snapshot = () => {
    const history = historyRef.current;
    // Don't save duplicate states at the tip
    if (history.length > 0 && history[history.length - 1] === code) return;
    
    history.push(code);
    if (history.length > 10) {
      history.shift();
    }
  };

  const getSelectedLinesRange = (textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    let lineStart = code.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = code.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = code.length;
    
    return { start, end, lineStart, lineEnd };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // --- UNDO (Ctrl+Z) ---
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      if (historyRef.current.length > 0) {
        const prevCode = historyRef.current.pop();
        if (prevCode !== undefined) {
          onChange(prevCode);
        }
      }
      return;
    }

    // --- COMPILE (Ctrl+Enter) ---
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      onRun();
      return;
    }

    // --- COMMENT / UNCOMMENT (Ctrl+K / Ctrl+Shift+K) ---
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      snapshot();
      
      const { lineStart, lineEnd, start, end } = getSelectedLinesRange(textarea);
      const selectedText = code.substring(lineStart, lineEnd);
      const lines = selectedText.split('\n');
      const isUncomment = e.shiftKey;

      const newLines = lines.map(line => {
        if (isUncomment) {
          return line.replace(/^\s*\/\/ ?/, ''); // Remove comment
        } else {
          return `// ${line}`; // Add comment
        }
      });
      
      const newText = newLines.join('\n');
      const diff = newText.length - selectedText.length;
      
      const newCode = code.substring(0, lineStart) + newText + code.substring(lineEnd);
      onChange(newCode);

      // Restore selection covering the modified block
      requestAnimationFrame(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = start; // Keep start roughly anchored
          textAreaRef.current.selectionEnd = end + diff; // Extend end by growth
        }
      });
      return;
    }

    // --- INDENT / UNINDENT (Tab / Shift+Tab) ---
    if (e.key === 'Tab') {
      e.preventDefault();
      snapshot();

      const { start, end } = getSelectedLinesRange(textarea);
      
      if (e.shiftKey) {
        // UNINDENT
        const { lineStart, lineEnd } = getSelectedLinesRange(textarea);
        const selectedText = code.substring(lineStart, lineEnd);
        const lines = selectedText.split('\n');
        
        const newLines = lines.map(line => line.replace(/^ {1,2}/, '')); // Remove up to 2 spaces
        const newText = newLines.join('\n');
        
        const newCode = code.substring(0, lineStart) + newText + code.substring(lineEnd);
        onChange(newCode);
        
        requestAnimationFrame(() => {
            if (textAreaRef.current) {
                textAreaRef.current.selectionStart = Math.max(lineStart, start - 2);
                textAreaRef.current.selectionEnd = Math.max(lineStart, end - (selectedText.length - newText.length));
            }
        });

      } else {
        // INDENT
        if (start === end) {
            const newValue = code.substring(0, start) + "  " + code.substring(end);
            onChange(newValue);
            requestAnimationFrame(() => {
                if (textAreaRef.current) {
                    textAreaRef.current.selectionStart = start + 2;
                    textAreaRef.current.selectionEnd = start + 2;
                }
            });
        } else {
            // Block Indent
            const { lineStart, lineEnd } = getSelectedLinesRange(textarea);
            const selectedText = code.substring(lineStart, lineEnd);
            const lines = selectedText.split('\n');
            
            const newLines = lines.map(line => "  " + line);
            const newText = newLines.join('\n');
            
            const newCode = code.substring(0, lineStart) + newText + code.substring(lineEnd);
            onChange(newCode);
            
            requestAnimationFrame(() => {
                if (textAreaRef.current) {
                    textAreaRef.current.selectionStart = start + 2;
                    textAreaRef.current.selectionEnd = end + (newText.length - selectedText.length);
                }
            });
        }
      }
      return;
    }

    // --- REGULAR TYPING SNAPSHOT ---
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        if (now - lastSnapshotTimeRef.current > 1000) {
            snapshot();
            lastSnapshotTimeRef.current = now;
        }
    }
  };

  const handleScroll = () => {
    if (textAreaRef.current) {
      const scrollTop = textAreaRef.current.scrollTop;
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = scrollTop;
      if (backdropRef.current) backdropRef.current.scrollTop = scrollTop;
    }
  };

  const handleSelect = () => {
    if (!textAreaRef.current) return;
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    
    if (start !== end) {
        const selectedText = code.substring(start, end);
        if (/^[a-zA-Z0-9_]+$/.test(selectedText)) {
            setHighlightWord(selectedText);
        } else {
            setHighlightWord(null);
        }
    } else {
        setHighlightWord(null);
    }
  };

  // Generate backdrop HTML for highlighting
  const backdropHtml = useMemo(() => {
    const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    if (!highlightWord) {
        return escapedCode + '\n';
    }

    const regex = new RegExp(`\\b(${highlightWord})\\b`, 'g');
    return escapedCode.replace(regex, '<span class="bg-white/20 rounded-[2px]">$1</span>') + '\n';
  }, [code, highlightWord]);

  return (
    <div className="relative w-full h-full flex flex-col border-t md:border-t-0 md:border-l bg-[var(--bg-app)] border-[var(--border-color)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-0 bg-[var(--bg-panel)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--fg-secondary)] shrink-0 z-20 h-10">
        <div className="flex items-center h-full">
          {tabs ? (
            <div className="flex h-full">
              {tabs.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    className={`h-full px-4 border-r border-[var(--border-color)] transition-colors hover:bg-[var(--bg-app)] ${activeTab === tab.id ? 'bg-[var(--bg-app)] text-[var(--fg-primary)] border-t-2 border-t-[var(--accent)]' : 'bg-transparent border-t-2 border-t-transparent'}`}
                 >
                    {tab.label}
                 </button>
              ))}
            </div>
          ) : (
            <span>GLSL FRAGMENT SHADER</span>
          )}
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
          className="w-12 bg-[var(--bg-app)] text-right pr-3 pt-4 pb-4 text-[var(--fg-secondary)] select-none font-mono text-sm leading-6 border-r border-[var(--border-color)] overflow-hidden shrink-0"
        >
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Editor Area */}
        <div className="relative flex-1 h-full w-full overflow-hidden bg-[var(--bg-app)]">
          {/* Backdrop (Highlights) */}
          <div 
            ref={backdropRef}
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-6 whitespace-pre-wrap break-words pointer-events-none text-transparent overflow-hidden"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            dangerouslySetInnerHTML={{ __html: backdropHtml }}
          />

          {/* Text Area */}
          <textarea
            ref={textAreaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onSelect={handleSelect}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full bg-transparent text-[var(--fg-primary)] p-4 font-mono text-sm leading-6 resize-none focus:outline-none focus:ring-0 border-none overflow-y-auto break-words z-10"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      </div>

      {/* Error Console */}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 max-h-40 overflow-y-auto bg-red-900/90 text-red-100 p-4 font-mono text-xs border-t border-red-700 backdrop-blur-sm z-30">
          <div className="font-bold mb-1">COMPILATION ERROR:</div>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
    </div>
  );
};

export default Editor;
