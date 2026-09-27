import { useState } from 'react';
import { Code2, Play, FileCode, PlusCircle, Check } from 'lucide-react';

const JOCKY_EXAMPLES = {
  "host_sweep.jocky": `investigation "Host Sweep Investigation" {
    collect process_list as procs
    collect system_info as sys
    collect network_connections as conns
    collect auth_logs as auth

    correlate procs, sys
    correlate procs, conns

    emit evidence
}`,
  "hunt.jocky": `investigation "Threat Hunting Sweep" {
    collect process_list as procs
    collect file_metadata as files
    collect memory_snapshot as mem

    correlate procs, files

    emit evidence
}`,
  "process_inventory.jocky": `investigation "Process & User Audit" {
    collect process_list as procs
    collect users as local_users
    collect event_logs as events

    correlate procs, local_users

    emit evidence
}`,
};

const CAPABILITY_OPTIONS = [
  { id: 'process_list', alias: 'procs', desc: 'Process execution & metadata' },
  { id: 'system_info', alias: 'sys', desc: 'Host identity & OS details' },
  { id: 'network_connections', alias: 'conns', desc: 'Sockets & network links' },
  { id: 'users', alias: 'local_users', desc: 'User accounts & privileges' },
  { id: 'auth_logs', alias: 'auth', desc: 'Login & authentication events' },
  { id: 'file_metadata', alias: 'files', desc: 'FileSystem evidence & hashes' },
  { id: 'memory_snapshot', alias: 'mem', desc: 'Process memory acquisition' },
  { id: 'driver_scan', alias: 'drivers', desc: 'Kernel driver module scan' },
];

export default function JockyEditorPanel({ source, onChangeSource, onRunPreflight }) {
  const [selectedExample, setSelectedExample] = useState('host_sweep.jocky');
  const [insertedFeedback, setInsertedFeedback] = useState('');

  const handleLoadExample = (exampleKey) => {
    setSelectedExample(exampleKey);
    onChangeSource(JOCKY_EXAMPLES[exampleKey]);
  };

  const handleInsertCapability = (cap) => {
    const statement = `    collect ${cap.id} as ${cap.alias}\n`;
    if (source.includes(`collect ${cap.id}`)) {
      setInsertedFeedback(`Already collected: ${cap.id}`);
      setTimeout(() => setInsertedFeedback(''), 2000);
      return;
    }
    const match = source.match(/investigation\s+"[^"]+"\s*\{/);
    if (match) {
      const idx = match.index + match[0].length;
      const newSource = source.slice(0, idx) + '\n' + statement + source.slice(idx);
      onChangeSource(newSource);
    } else {
      onChangeSource(source + '\n' + statement);
    }
    setInsertedFeedback(`Inserted: collect ${cap.id}`);
    setTimeout(() => setInsertedFeedback(''), 2000);
  };

  const lineCount = source.split('\n').length;
  const charCount = source.length;

  return (
    <div className="panel-card jocky-editor-card">
      <div className="panel-header">
        <div className="panel-title">
          <Code2 size={14} />
          <span>Jocky DSL Editor</span>
        </div>
        
        <div className="editor-actions">
          <div className="example-selector">
            <FileCode size={12} />
            <select
              className="select-mini"
              value={selectedExample}
              onChange={(e) => handleLoadExample(e.target.value)}
            >
              <option value="host_sweep.jocky">host_sweep.jocky</option>
              <option value="hunt.jocky">hunt.jocky</option>
              <option value="process_inventory.jocky">process_inventory.jocky</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={onRunPreflight}>
            <Play size={12} /> Run Pre-Flight Check
          </button>
        </div>
      </div>

      <div className="editor-quickbar">
        <span className="quickbar-label">INSERT CAPABILITY:</span>
        <div className="capability-chips">
          {CAPABILITY_OPTIONS.map((cap) => (
            <button
              key={cap.id}
              className="cap-chip"
              onClick={() => handleInsertCapability(cap)}
              title={cap.desc}
            >
              <PlusCircle size={10} />
              <span>{cap.id}</span>
            </button>
          ))}
        </div>
        {insertedFeedback && (
          <span className="feedback-tag">
            <Check size={10} /> {insertedFeedback}
          </span>
        )}
      </div>

      <div className="editor-container">
        <div className="line-numbers">
          {Array.from({ length: lineCount }).map((_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>
        <textarea
          className="editor-textarea"
          value={source}
          onChange={(e) => onChangeSource(e.target.value)}
          placeholder="// Type Jocky DSL source code here..."
          spellCheck={false}
        />
      </div>

      <div className="editor-footer">
        <span>Lines: {lineCount} | Chars: {charCount}</span>
        <span className="lang-tag">Syntax: Jocky DSL v1</span>
      </div>

      <style>{`
        .jocky-editor-card {
          height: 100%;
          min-height: 400px;
        }

        .editor-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .example-selector {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 2px 6px;
        }

        .select-mini {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 10.5px;
          outline: none;
          cursor: pointer;
        }

        .select-mini option {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .editor-quickbar {
          padding: 6px 10px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
        }

        .quickbar-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .capability-chips {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .cap-chip {
          display: flex;
          align-items: center;
          gap: 3px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: 0px;
          font-size: 10px;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .cap-chip:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .feedback-tag {
          font-size: 10px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
        }

        .editor-container {
          flex: 1;
          display: flex;
          background: var(--bg-primary);
          font-size: 12.5px;
          line-height: 1.6;
          overflow: hidden;
          position: relative;
        }

        .line-numbers {
          padding: 10px 8px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          text-align: right;
          user-select: none;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-color);
          min-width: 36px;
          font-size: 11px;
        }

        .editor-textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 10px 12px;
          font-size: 12.5px;
          line-height: 1.6;
          resize: none;
          outline: none;
          white-space: pre;
          overflow-wrap: normal;
          overflow-x: auto;
        }

        .editor-footer {
          padding: 4px 10px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .lang-tag {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
