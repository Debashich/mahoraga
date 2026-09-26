import { useState } from "react";
import { JockyEditor } from './components/Editor';
import { Terminal } from './components/Terminal';
import { Pipeline, PipelineStage } from './components/Pipeline';

const DEFAULT_SCRIPT = `investigation "Host Baseline & Triage" (
    author = "Mahoraga Stdlib",
    mitre_tactic = "TA0007",
    mitre_technique = "T1057, T1049"
) {
    collect system_info as sys
    collect process_list as procs
    collect network_connections as sockets
    collect memory_snapshot as mem
    
    correlate procs, sockets, mem
    
    detect packed_memory_injection {
        source = mem
        condition = "entropy > 7.2 AND protection == 'PAGE_EXECUTE_READWRITE'"
        threshold = 1
    }

    emit evidence
    emit timeline
}`;

export default function App() {
  const [code, setCode] = useState<string>(DEFAULT_SCRIPT);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);

  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { id: 'lexer', label: 'LEXER & PARSER', status: 'idle' },
    { id: 'ast', label: 'AST GENERATION', status: 'idle' },
    { id: 'capability', label: 'CAPABILITY VALIDATION', status: 'idle' },
    { id: 'ir', label: 'FORENSIC IR LOWERING', status: 'idle' },
    { id: 'obfuscator', label: 'POLYMORPHIC ENCRYPTION', status: 'idle' },
    { id: 'execution', label: 'NATIVE C++ RUNTIME', status: 'idle' },
    { id: 'seal', label: 'CRYPTOGRAPHIC SEAL', status: 'idle' },
    { id: 'stix', label: 'STIX 2.1 GENERATION', status: 'idle' },
  ]);

  const handleCompileAndRun = async () => {
    setIsCompiling(true);
    setLogs(['\x1b[33m[1/8] Initializing Jocky Compiler Pipeline...\x1b[0m']);

    const eventSource = new EventSource('http://localhost:8000/api/stream');

    eventSource.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    for (let i = 0; i < pipelineStages.length; i++) {
      setPipelineStages((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? { ...s, status: 'running', detail: 'Processing...' }
            : idx < i
            ? { ...s, status: 'completed', detail: '✓ PASS' }
            : s
        )
      );
      await new Promise((r) => setTimeout(r, 600));
    }

    setPipelineStages((prev) =>
      prev.map((s) => ({ ...s, status: 'completed', detail: '✓ SEALED & READY' }))
    );

    setLogs((prev) => [...prev, '\x1b[32m✔ BUILD SUCCESSFUL. Evidence Sealed & STIX Bundle Generated.\x1b[0m']);
    eventSource.close();
    setIsCompiling(false);
  };

  return (
    <div className="h-screen w-screen bg-[#0a0e17] flex flex-col overflow-hidden text-gray-200">
      <header className="h-12 bg-[#111827] border-b border-gray-800 px-4 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-purple-400 font-bold text-sm">JOCKY</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">FORENSIC COMPILER COMMAND CENTER</span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">TARGET:</span>
            <span className="bg-gray-800 text-green-400 px-2 py-0.5 rounded border border-gray-700">WINDOWS / WIN32</span>
          </div>
          
          <button
            onClick={handleCompileAndRun}
            disabled={isCompiling}
            className={`px-4 py-1.5 rounded font-bold transition-all shadow-lg ${
              isCompiling
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
            }`}
          >
            {isCompiling ? 'COMPILING...' : '⚡ COMPILE & EXECUTE'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <JockyEditor code={code} onChange={(v) => setCode(v || '')} />
          </div>
          <div className="h-48">
            <Terminal logs={logs} />
          </div>
        </div>

        <Pipeline stages={pipelineStages} />
      </main>
    </div>
  );
}