import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  logs: string[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#0a0e17',
        foreground: '#a9b1d6',
        cursor: '#7aa2f7',
      },
      fontFamily: 'Fira Code, monospace',
      fontSize: 12,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    term.writeln('\x1b[32m[JOCKY COMPILER CLI READY]\x1b[0m');

    return () => {
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current && logs.length > 0) {
      const latest = logs[logs.length - 1];
      xtermRef.current.writeln(latest);
    }
  }, [logs]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0e17] border-t border-gray-800">
      <div className="bg-[#111827] px-4 py-1.5 border-b border-gray-800 text-xs font-mono text-gray-400 flex justify-between">
        <span>COMPILER TERMINAL TELEMETRY</span>
        <span className="text-green-400">● LIVE STREAM</span>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
};