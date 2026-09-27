import { Fragment } from 'react';
import { GitCommit, ArrowRight, ShieldCheck, FileText, Cpu, Lock, Terminal, Radio, Loader2 } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'source', name: 'Jocky Source', icon: Terminal, desc: 'DSL Script Authoring' },
  { id: 'compiler', name: 'Python Compiler', icon: Cpu, desc: 'AST & Semantic Validation' },
  { id: 'ir', name: 'Forensic IR', icon: FileText, desc: 'Contract JSON Lowering' },
  { id: 'payload', name: 'Payload Encapsulation', icon: Lock, desc: 'Polymorphic .enc Packaging' },
  { id: 'runtime', name: 'Native C++ Runtime', icon: Cpu, desc: './build/odin-run Execution' },
  { id: 'provider', name: 'Native Provider', icon: Radio, desc: 'OS Dispatcher (Linux/Win)' },
  { id: 'evidence', name: 'Raw Evidence', icon: FileText, desc: 'Collected System Artifacts' },
  { id: 'sealing', name: 'Evidence Sealing', icon: ShieldCheck, desc: 'SHA-256 Custody Hash' },
  { id: 'stix', name: 'STIX 2.1 Engine', icon: GitCommit, desc: 'Threat Intelligence Bundle' },
];

export default function PipelineStatusPanel({ 
  cmiConnected, 
  isOrchestrating, 
  orchestrationResult, 
  onTriggerOrchestration 
}) {
  const getStageStatus = (stageId) => {
    if (isOrchestrating) {
      return { label: 'RUNNING...', color: 'text-warning' };
    }
    if (!orchestrationResult) {
      return { label: 'READY', color: 'text-muted' };
    }
    if (orchestrationResult.success) {
      // Backend returns pipeline completed
      if (stageId === 'source' || stageId === 'compiler' || stageId === 'ir' || stageId === 'sealing' || stageId === 'stix' || stageId === 'runtime' || stageId === 'provider' || stageId === 'payload' || stageId === 'evidence') {
        return { label: 'COMPLETED', color: 'text-success' };
      }
      return { label: 'PASSED', color: 'text-success' };
    } else {
      // Execution failed
      const failedStage = String(orchestrationResult.stage || '');
      if (failedStage.toLowerCase().includes(stageId) || (stageId === 'runtime' && failedStage.includes('odin-run')) || (stageId === 'compiler' && failedStage.includes('compiler'))) {
        return { label: 'FAILED HERE', color: 'text-error' };
      }
      return { label: 'BLOCKED', color: 'text-muted' };
    }
  };

  return (
    <div className="panel-card pipeline-card">
      <div className="panel-header">
        <div className="panel-title">
          <GitCommit size={14} />
          <span>Mahoraga Pipeline Status & Execution Flow</span>
        </div>
        
        <div className="header-actions">
          <span className={`badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? 'CMI API: CONNECTED' : 'CMI API: OFFLINE'}
          </span>
          <button 
            className="btn btn-primary"
            onClick={onTriggerOrchestration}
            disabled={isOrchestrating}
          >
            {isOrchestrating ? <Loader2 size={12} className="spin" /> : <GitCommit size={12} />}
            {isOrchestrating ? 'Orchestrating...' : 'Run Investigation'}
          </button>
        </div>
      </div>

      <div className="panel-body">
        {/* Pipeline Stage Flow */}
        <div className="pipeline-flow-container font-mono">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const statusInfo = getStageStatus(stage.id);
            return (
              <Fragment key={stage.id}>
                <div className="pipeline-node">
                  <div className="node-icon-box">
                    <Icon size={14} />
                  </div>
                  <div className="node-info">
                    <span className="node-step">STAGE 0{idx + 1}</span>
                    <span className="node-name">{stage.name}</span>
                    <span className={`node-status ${statusInfo.color}`}>{statusInfo.label}</span>
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
        <div className="execution-log-box font-mono">
          <div className="log-header">
            <span>PIPELINE CONSOLE LOGS</span>
            <span className="status-tag">
              Target Route: POST /api/v1/orchestrate
            </span>
          </div>
          <div className="log-content">
            {isOrchestrating ? (
              <div className="log-loading">
                <Loader2 size={14} className="spin" />
                <span>[1/5] Sending orchestration request to CMI backend (POST /api/v1/orchestrate)...</span>
              </div>
            ) : orchestrationResult ? (
              orchestrationResult.success ? (
                <div className="log-success">
                  <p className="text-success">[+] Investigation Pipeline Completed Successfully!</p>
                  <p>[+] Status: {orchestrationResult.data.status}</p>
                  <p>[+] Investigation ID: {orchestrationResult.data.investigation_id}</p>
                  <p>[+] Target Platform: {orchestrationResult.data.target_platform}</p>
                  <p>[+] Sealed Evidence: {orchestrationResult.data.sealed_evidence}</p>
                  <p>[+] STIX Bundle: {orchestrationResult.data.stix_bundle}</p>
                </div>
              ) : (
                <div className="log-error">
                  <p className="text-error">[!] Backend Execution Failed (HTTP 500 / Process Error)</p>
                  <p>[!] Error: {orchestrationResult.error}</p>
                  {orchestrationResult.stage && <p>[!] Failed Stage Command: {JSON.stringify(orchestrationResult.stage)}</p>}
                  {orchestrationResult.investigationId && <p>[!] Investigation ID: {orchestrationResult.investigationId}</p>}
                </div>
              )
            ) : (
              <div className="log-placeholder">
                <p>[+] Pipeline ready.</p>
                <p>[+] Target CMI Backend: {cmiConnected ? 'ONLINE (http://localhost:8000)' : 'OFFLINE'}</p>
                {!cmiConnected && (
                  <p className="text-warning">[!] CMI backend is offline. Run backend server: python -m uvicorn cmi.server:app --port 8000</p>
                )}
                <p>[+] Click "Run Investigation" to execute DSL source against backend.</p>
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
          padding: 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          overflow-x: auto;
          margin-bottom: 10px;
        }

        .pipeline-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 85px;
        }

        .node-icon-box {
          width: 28px;
          height: 28px;
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
          font-size: 8px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .node-name {
          font-size: 9.5px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .node-status {
          font-size: 8.5px;
          font-weight: 700;
          margin-top: 1px;
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
          font-size: 10.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          max-height: 130px;
          overflow-y: auto;
        }

        .log-placeholder p, .log-success p, .log-error p {
          margin: 2px 0;
        }

        .log-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }

        .text-success { color: var(--status-success); font-weight: 600; }
        .text-error { color: var(--status-error); font-weight: 600; }
        .text-warning { color: var(--status-warning); font-weight: 600; }
        .text-muted { color: var(--text-muted); }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
