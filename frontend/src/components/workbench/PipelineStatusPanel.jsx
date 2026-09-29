import { useState } from 'react';
import {
  GitCommit,
  ShieldCheck,
  Cpu,
  Lock,
  Terminal,
  Loader2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const PIPELINE_STAGE_META_BASE = [
  {
    id: 'parse',
    name: 'Jocky DSL Parsing',
    icon: Terminal,
    desc: 'Lexer, parser & AST generation',
  },
  {
    id: 'semantic',
    name: 'Semantic Validation',
    icon: CheckCircle2,
    desc: 'Validate investigation semantics',
  },
  {
    id: 'capability',
    name: 'Capability Resolution',
    icon: ShieldCheck,
    desc: 'Resolve requested forensic capabilities',
  },
  {
    id: 'ir',
    name: 'Forensic IR Compilation',
    icon: GitCommit,
    desc: 'Generate normalized Forensic IR',
  },
  {
    id: 'obfuscator',
    name: 'Polymorphic Encryption',
    icon: Lock,
    desc: 'Encrypted .enc payload generation',
  },
  {
    id: 'runtime',
    name: 'Native C++ Runtime',
    icon: Cpu,
    desc: null,
  },
  {
    id: 'sealing',
    name: 'Evidence Sealing',
    icon: ShieldCheck,
    desc: 'SHA-256 cryptographic seal',
  },
  {
    id: 'stix',
    name: 'STIX 2.1 Generation',
    icon: GitCommit,
    desc: 'Threat intelligence bundle',
  },
];

export default function PipelineStatusPanel({
  cmiConnected,
  isOrchestrating,
  orchestrationResult,
  onTriggerOrchestration,
  pipelineStages = [],
  pipelineProgress = 0,
  currentActivity = '',
  targetPlatform = 'Linux',
}) {
  const [expanded, setExpanded] = useState(true);

  // Build stage metadata with a platform-aware runtime description
  const PIPELINE_STAGE_META = PIPELINE_STAGE_META_BASE.map(meta =>
    meta.id === 'runtime'
      ? { ...meta, desc: `${targetPlatform} Provider execution` }
      : meta
  );

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'PASSED';
      case 'running':
        return 'RUNNING';
      case 'failed':
        return 'FAILED';
      case 'blocked':
        return 'BLOCKED';
      default:
        return 'PENDING';
    }
  };

  const getStatusForStage = (stageId) => {
    const match = pipelineStages.find(s => s.id === stageId);
    return match ? match.status : 'idle';
  };

  const renderStageIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check size={11} />;
      case 'running':
        return <Loader2 size={11} className="spin" />;
      case 'failed':
        return <AlertTriangle size={11} />;
      case 'blocked':
        return <Circle size={9} />;
      default:
        return <Circle size={9} />;
    }
  };

  const getStageClass = (status) => {
    switch (status) {
      case 'completed': return 'stage-completed';
      case 'running': return 'stage-running';
      case 'failed': return 'stage-failed';
      case 'blocked': return 'stage-blocked';
      default: return 'stage-idle';
    }
  };

  const getStatusChar = (status) => {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '●';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  const progressBarFill = Math.min(pipelineProgress, 100);
  const progressBlocks = Math.floor(progressBarFill / 5);
  const progressEmpty = 20 - progressBlocks;
  const progressBar = '█'.repeat(progressBlocks) + '░'.repeat(progressEmpty);

  const hasResult = !!orchestrationResult && !isOrchestrating;
  const isSuccess = hasResult && orchestrationResult.success;

  // Extract data based on success vs failure payload structures
  const resultData = isSuccess ? orchestrationResult.data : null;
  const telemetry = resultData?.telemetry;

  return (
    <div className="panel-card pipeline-visual-card">
      <div className="panel-header">
        <div className="panel-title">
          <GitCommit size={14} />
          <span>INVESTIGATION PIPELINE</span>
        </div>
      </div>

      <div className="panel-body">
        {/* ─── Pipeline Checklist ─── */}
        <div className="pipeline-checklist font-mono">
          <div className="checklist-header">INVESTIGATION PIPELINE</div>
          {PIPELINE_STAGE_META.map((meta) => {
            const status = getStatusForStage(meta.id);
            return (
              <div key={meta.id} className={`checklist-row ${getStageClass(status)}`}>
                <span className="checklist-icon">
                  {renderStageIcon(status)}
                </span>
                <span className="checklist-char">{getStatusChar(status)}</span>
                <span className="checklist-name">{meta.name}</span>
                {status === 'running' && (
                  <span className="checklist-activity">…</span>
                )}
                {status === 'failed' && (
                  <span className="checklist-fail-tag">HALT</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Progress Bar ─── */}
        {(isOrchestrating || pipelineProgress > 0) && (
          <div className="execution-progress font-mono">
            <div className="progress-header">JOCKY EXECUTION</div>
            <div className="progress-bar-row">
              <span className="progress-bar-visual">[{progressBar}]</span>
              <span className="progress-pct">{pipelineProgress}%</span>
            </div>
            <div className="progress-activity">{currentActivity}</div>

            {/* Live telemetry during/after execution */}
            {telemetry && (
              <div className="live-telemetry">
                <div className="telemetry-row">
                  <span className="telem-key">Provider</span>
                  <span className="telem-val">{resultData?.target_platform?.toLowerCase() || 'linux'}-x86_64</span>
                </div>
                {telemetry.capabilities_used && telemetry.capabilities_used.length > 0 && (
                  <div className="telemetry-row">
                    <span className="telem-key">Capabilities</span>
                    <span className="telem-val">{telemetry.capabilities_used.join(', ')}</span>
                  </div>
                )}
                <div className="telemetry-row">
                  <span className="telem-key">Artifacts</span>
                  <span className="telem-val">{telemetry.evidence?.artifacts_count || 0} sealed</span>
                </div>
                <div className="telemetry-row">
                  <span className="telem-key">Integrity</span>
                  <span className="telem-val">SHA-256</span>
                </div>
                {telemetry.encrypted_payload_bytes > 0 && (
                  <div className="telemetry-row">
                    <span className="telem-key">Payload</span>
                    <span className="telem-val">{telemetry.encrypted_payload_bytes} bytes (.enc)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Console Log ─── */}
        <div className="pipeline-console font-mono">
          <button className="console-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>PIPELINE CONSOLE</span>
            <span className="console-route">POST /api/v1/orchestrate</span>
          </button>

          {expanded && (
            <div className="console-body">
              {isOrchestrating ? (
                <div className="console-line active">
                  <Loader2 size={11} className="spin" />
                  <span>[1/5] Sending orchestration request to CMI backend...</span>
                </div>
              ) : hasResult ? (
                <>
                  {/* Map over the actual stage outputs returned by the backend */}
                  {pipelineStages
                    .filter(s => s.status === 'completed' || s.status === 'failed')
                    .map((stage, i) => (
                      <div key={i} className={`console-line ${stage.status === 'failed' ? 'error' : 'success'}`}>
                        <span>[{stage.status === 'completed' ? '+' : '!'}] [{stage.id}] {stage.output || 'Execution finished'}</span>
                        {stage.duration !== undefined && (
                          <span className="muted" style={{ marginLeft: 'auto' }}>
                            {stage.duration}s
                          </span>
                        )}
                      </div>
                    ))}

                  {isSuccess ? (
                    <div className="console-line success highlight">
                      <span>[✔] Pipeline completed. Investigation ID: {resultData.investigation_id}</span>
                    </div>
                  ) : (
                    <>
                      <div className="console-line error highlight">
                        <span>[✗] Failed at stage: {orchestrationResult.stage}</span>
                      </div>
                      <div className="console-line error">
                        <span>[!] {orchestrationResult.error}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="console-line muted">
                    <span>[+] Pipeline ready. Backend: {cmiConnected ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                  {!cmiConnected && (
                    <div className="console-line warn">
                      <span>[!] Start backend: python -m uvicorn cmi.server:app --port 8000</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pipeline-visual-card {
          min-height: 200px;
        }

        .pipeline-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ─── Checklist ─── */
        .pipeline-checklist {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 0;
          margin-bottom: 10px;
        }

        .checklist-header {
          padding: 6px 12px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .checklist-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;  
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.25px;
          border: 1px solid transparent;
          border-bottom: 1px solid rgba(51, 51, 51, 0.4);
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .checklist-status-label {
          margin-left: auto;
          white-space: nowrap;
        }


        .checklist-row:last-child {
          border-bottom: none;
        }

        .checklist-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .checklist-char {
          width: 14px;
          text-align: center;
          font-size: 12px;
          flex-shrink: 0;
        }

        .checklist-name {
          flex: 1;
        }

        .checklist-activity {
          color: var(--status-warning);
          font-size: 10px;
          animation: blink 1s infinite;
        }

        .checklist-fail-tag {
          font-size: 9px;
          font-weight: 700;
          color: var(--status-error);
          background: rgba(211, 47, 47, 0.12);
          padding: 1px 6px;
          letter-spacing: 0.5px;
        }

        /* Stage status colors */
        .stage-completed .checklist-icon {
          color: var(--status-success);
        }
        .stage-completed .checklist-char {
          color: var(--status-success);
        }
        .stage-completed .checklist-name {
          color: var(--text-primary);
        }

        .stage-running {
          background: rgba(245, 124, 0, 0.06);
        }
        .stage-running .checklist-icon {
          color: var(--status-warning);
        }
        .stage-running .checklist-char {
          color: var(--status-warning);
        }
        .stage-running .checklist-name {
          color: var(--text-primary);
          font-weight: 600;
        }

        .stage-failed {
          background: rgba(211, 47, 47, 0.06);
        }
        .stage-failed .checklist-icon {
          color: var(--status-error);
        }
        .stage-failed .checklist-char {
          color: var(--status-error);
        }
        .stage-failed .checklist-name {
          color: var(--status-error);
        }

        .stage-idle .checklist-icon,
        .stage-blocked .checklist-icon {
          color: var(--text-muted);
        }
        .stage-idle .checklist-char,
        .stage-blocked .checklist-char {
          color: var(--text-muted);
        }
        .stage-idle .checklist-name,
        .stage-blocked .checklist-name {
          color: var(--text-muted);
        }

        /* ─── Progress Bar ─── */
        .execution-progress {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 0;
          margin-bottom: 10px;
        }

        .progress-header {
          padding: 6px 12px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .progress-bar-row {
          padding: 10px 12px 4px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-bar-visual {
          font-size: 14px;
          letter-spacing: 0px;
          color: var(--status-success);
          line-height: 1;
        }

        .progress-pct {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .progress-activity {
          padding: 4px 12px 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .live-telemetry {
          padding: 0 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-top: 1px solid var(--border-color);
          padding-top: 8px;
          margin-top: 4px;
        }

        .telemetry-row {
          display: flex;
          gap: 16px;
          font-size: 11px;
        }

        .telem-key {
          color: var(--text-muted);
          min-width: 100px;
          text-transform: capitalize;
        }

        .telem-val {
          color: var(--text-primary);
          font-weight: 500;
        }

        /* ─── Console ─── */
        .pipeline-console {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .console-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: var(--bg-secondary);
          border: none;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          text-align: left;
        }

        .console-toggle:hover {
          color: var(--text-primary);
        }

        .console-route {
          margin-left: auto;
          color: var(--text-muted);
          font-weight: 400;
        }

        .console-body {
          padding: 8px 10px;
          max-height: 160px;
          overflow-y: auto;
          font-size: 10.5px;
          line-height: 1.6;
        }

        .console-line {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 1px 0;
        }

        .console-line.active {
          color: var(--text-primary);
        }

        .console-line.success {
          color: var(--text-secondary);
        }

        .console-line.success.highlight {
          color: var(--status-success);
          font-weight: 600;
        }

        .console-line.error {
          color: var(--status-error);
        }

        .console-line.error.highlight {
          font-weight: 600;
        }

        .console-line.warn {
          color: var(--status-warning);
        }

        .console-line.muted {
          color: var(--text-muted);
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

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