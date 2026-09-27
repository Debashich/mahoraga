import { Fragment } from 'react';
import { GitCommit, ArrowRight, ShieldCheck, FileText, Cpu, Lock, Terminal, Radio } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'source', name: 'Jocky Source', icon: Terminal, desc: 'DSL Script Authoring' },
  { id: 'compiler', name: 'Python Compiler', icon: Cpu, desc: 'AST & Semantic Validation' },
  { id: 'ir', name: 'Forensic IR', icon: FileText, desc: 'Contract JSON Generation' },
  { id: 'payload', name: 'Payload Encapsulation', icon: Lock, desc: 'Polymorphic .enc Packaging' },
  { id: 'runtime', name: 'Native C++ Runtime', icon: Cpu, desc: 'mahoraga-run Execution' },
  { id: 'provider', name: 'Native Provider', icon: Radio, desc: 'OS Dispatcher (Linux/Win)' },
  { id: 'evidence', name: 'Raw Evidence', icon: FileText, desc: 'Collected System Artifacts' },
  { id: 'sealing', name: 'Evidence Sealing', icon: ShieldCheck, desc: 'SHA-256 Custody Hash' },
  { id: 'stix', name: 'STIX 2.1', icon: GitCommit, desc: 'Threat Intelligence Bundle' },
];

export default function PipelineStatusPanel({ executionState, onTriggerOrchestration }) {
  return (
    <div className="panel-card pipeline-card">
      <div className="panel-header">
        <div className="panel-title">
          <GitCommit size={14} />
          <span>Mahoraga Pipeline Status & Execution Flow</span>
        </div>
        
        <div className="header-actions">
          <span className="badge badge-warning">BACKEND API: NOT CONNECTED (DEMO)</span>
          <button 
            className="btn btn-primary"
            onClick={onTriggerOrchestration}
          >
            Trigger Pipeline Pre-Flight
          </button>
        </div>
      </div>

      <div className="panel-body">
        {/* Pipeline Stage Flow */}
        <div className="pipeline-flow-container">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <Fragment key={stage.id}>
                <div className="pipeline-node">
                  <div className="node-icon-box">
                    <Icon size={14} />
                  </div>
                  <div className="node-info">
                    <span className="node-step">STAGE 0{idx + 1}</span>
                    <span className="node-name">{stage.name}</span>
                    <span className="node-desc">{stage.desc}</span>
                  </div>
                </div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className="pipeline-connector">
                    <ArrowRight size={12} className="text-muted" />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Execution Log Output */}
        <div className="execution-log-box">
          <div className="log-header">
            <span>PIPELINE CONSOLE LOGS</span>
            <span className="status-tag">Status: Pending API Connect</span>
          </div>
          <div className="log-content">
            {executionState ? (
              <pre>{executionState.logs}</pre>
            ) : (
              <div className="log-placeholder">
                <p>[+] Pipeline ready.</p>
                <p>[+] Target: Native Provider (Local Laboratory Context)</p>
                <p>[!] Note: CMI FastAPI Server is not connected on port 8000. Pipeline commands will run in preview/demo mode.</p>
                <p>[+] Click "Trigger Pipeline Pre-Flight" to initiate dry-run pass.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pipeline-card {
          min-height: 280px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pipeline-flow-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          overflow-x: auto;
          margin-bottom: 12px;
        }

        .pipeline-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 85px;
        }

        .node-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 0px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
          color: var(--text-primary);
        }

        .node-step {
          font-size: 8.5px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .node-name {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .node-desc {
          font-size: 8.5px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .pipeline-connector {
          display: flex;
          align-items: center;
          padding: 0 2px;
          color: var(--text-muted);
        }

        .execution-log-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .log-header {
          padding: 5px 10px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .log-content {
          padding: 10px;
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.5;
          max-height: 130px;
          overflow-y: auto;
        }

        .log-placeholder p {
          margin: 2px 0;
        }

        .text-muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
}
