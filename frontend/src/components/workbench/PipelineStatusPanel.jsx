import { GitCommit, ShieldCheck, FileText, Cpu, Lock, Terminal, Radio, Loader2, AlertTriangle } from 'lucide-react';

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
  const getStageStatus = (stageId, index) => {
    if (isOrchestrating) {
      return { 
        status: 'running', 
        label: 'RUNNING...', 
        colorClass: 'status-running', 
        badgeClass: 'badge-warning',
      };
    }

    if (!orchestrationResult) {
      return { 
        status: 'ready', 
        label: 'READY', 
        colorClass: 'status-ready', 
        badgeClass: 'badge-muted',
      };
    }

    if (orchestrationResult.success) {
      return { 
        status: 'completed', 
        label: 'COMPLETED', 
        colorClass: 'status-completed', 
        badgeClass: 'badge-emerald',
      };
    }

    // Execution failed
    const failedStageStr = String(orchestrationResult.stage || '').toLowerCase();
    let failedIdx = 4; // default to runtime (odin-run / executable_lookup)
    if (failedStageStr.includes('compiler')) {
      failedIdx = 1;
    } else if (failedStageStr.includes('sealing')) {
      failedIdx = 7;
    } else if (failedStageStr.includes('detection') || failedStageStr.includes('stix')) {
      failedIdx = 8;
    } else if (failedStageStr.includes('runtime') || failedStageStr.includes('odin-run') || failedStageStr.includes('executable_lookup')) {
      failedIdx = 4;
    }

    if (index < failedIdx) {
      return { 
        status: 'completed', 
        label: 'COMPLETED', 
        colorClass: 'status-completed', 
        badgeClass: 'badge-emerald',
      };
    } else if (index === failedIdx) {
      return { 
        status: 'failed', 
        label: 'FAILED HERE', 
        colorClass: 'status-failed', 
        badgeClass: 'badge-error',
      };
    } else {
      return { 
        status: 'blocked', 
        label: 'BLOCKED', 
        colorClass: 'status-blocked', 
        badgeClass: 'badge-muted',
      };
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
        {/* Vertical Pipeline Stage Flow */}
        <div className="vertical-pipeline-container font-mono">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const statusInfo = getStageStatus(stage.id, idx);
            const isLast = idx === PIPELINE_STAGES.length - 1;
            const isFailed = statusInfo.status === 'failed';

            return (
              <div 
                key={stage.id} 
                className={`pipeline-step-item ${isFailed ? 'step-item-failed' : ''}`}
              >
                {/* Timeline Column with Icon Node and Vertical Line */}
                <div className="step-timeline-col">
                  <div className={`step-node-icon ${statusInfo.colorClass}`}>
                    {statusInfo.status === 'running' ? (
                      <Loader2 size={12} className="spin" />
                    ) : statusInfo.status === 'failed' ? (
                      <AlertTriangle size={12} />
                    ) : (
                      <Icon size={12} />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`step-vertical-line line-${statusInfo.status}`} />
                  )}
                </div>

                {/* Content Column */}
                <div className="step-content-box">
                  <div className="step-header-row">
                    <div className="step-title-group">
                      <span className="step-num">STAGE 0{idx + 1}</span>
                      <span className="step-name">{stage.name}</span>
                      <span className="step-desc-inline">— {stage.desc}</span>
                    </div>
                    <span className={`badge ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {isFailed && (
                    <div className="failed-stage-notice">
                      <span>Execution halted: {orchestrationResult?.error || 'Native runtime error'}</span>
                    </div>
                  )}
                </div>
              </div>
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
          min-height: 440px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vertical-pipeline-container {
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 8px 12px;
          margin-bottom: 10px;
          gap: 0px;
        }

        .pipeline-step-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          position: relative;
          padding: 4px 6px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
        }

        .step-item-failed {
          background: rgba(255, 255, 255, 0.02);
        }

        .step-timeline-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 22px;
          min-width: 22px;
          position: relative;
          align-self: stretch;
        }

        .step-node-icon {
          width: 22px;
          height: 22px;
          border-radius: 0px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          z-index: 2;
        }

        .status-completed {
          background: rgba(56, 142, 60, 0.1);
          border-color: var(--status-success);
          color: var(--status-success);
        }

        .status-failed {
          background: rgba(211, 47, 47, 0.12);
          border-color: var(--status-error);
          color: var(--status-error);
        }

        .status-running {
          background: rgba(245, 124, 0, 0.15);
          border-color: var(--status-warning);
          color: var(--status-warning);
        }

        .status-ready, .status-blocked {
          background: var(--bg-secondary);
          border-color: var(--border-color);
          color: var(--text-muted);
        }

        .step-vertical-line {
          width: 1px;
          flex: 1;
          min-height: 14px;
          background: var(--border-color);
          margin-top: 1px;
          margin-bottom: -3px;
        }

        .line-completed {
          background: var(--status-success);
        }

        .line-running {
          background: var(--status-warning);
        }

        .step-content-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding-bottom: 2px;
        }

        .step-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .step-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .step-num {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.5px;
        }

        .step-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .step-desc-inline {
          font-size: 10px;
          color: var(--text-muted);
        }

        .failed-stage-notice {
          margin-top: 2px;
          font-size: 10px;
          color: var(--status-error);
          font-weight: 500;
        }

        .badge-muted {
          border-color: var(--border-color);
          color: var(--text-muted);
          background: var(--bg-secondary);
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


