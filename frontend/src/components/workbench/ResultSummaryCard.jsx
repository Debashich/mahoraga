import { CheckCircle2, XCircle, AlertTriangle, FileText, ShieldCheck, GitCommit, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function ResultSummaryCard({ result, isOrchestrating }) {
  const [showRawError, setShowRawError] = useState(false);

  if (isOrchestrating) {
    return (
      <div className="panel-card result-summary-card">
        <div className="panel-header">
          <div className="panel-title">
            <GitCommit size={14} />
            <span>Investigation Execution Summary</span>
          </div>
          <span className="badge badge-warning">ORCHESTRATING...</span>
        </div>
        <div className="panel-body font-mono">
          <div className="loading-summary">
            <p>[...] Executing investigation via POST /api/v1/orchestrate...</p>
            <p>[...] Pipeline processing: Jocky DSL lowering → Encrypted payload → Native runtime → Evidence sealing → STIX generator</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel-card result-summary-card">
        <div className="panel-header">
          <div className="panel-title">
            <GitCommit size={14} />
            <span>Investigation Execution Summary</span>
          </div>
          <span className="badge">NO RUN RECORDED</span>
        </div>
        <div className="panel-body font-mono">
          <div className="empty-summary">
            <p>[+] Ready to execute investigation.</p>
            <p>[+] Click "Run Investigation" or "Execute POST /api/v1/orchestrate" to send DSL source to backend.</p>
          </div>
        </div>
      </div>
    );
  }

  const { success, data, error, stage, investigationId } = result;

  return (
    <div className={`panel-card result-summary-card ${success ? 'success-border' : 'error-border'}`}>
      <div className="panel-header">
        <div className="panel-title">
          {success ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-error" />}
          <span>Investigation Result Summary</span>
        </div>
        <span className={`badge ${success ? 'badge-emerald' : 'badge-crimson'}`}>
          {success ? 'STATUS: COMPLETED' : 'STATUS: FAILED'}
        </span>
      </div>

      <div className="panel-body font-mono">
        {success && data ? (
          <div className="result-details-grid">
            <div className="result-item">
              <span className="item-label">Investigation ID:</span>
              <span className="item-val highlight">{data.investigation_id}</span>
            </div>

            <div className="result-item">
              <span className="item-label">Execution Status:</span>
              <span className="item-val text-success">{data.status ? data.status.toUpperCase() : 'COMPLETED'}</span>
            </div>

            <div className="result-item">
              <span className="item-label">Target Platform:</span>
              <span className="item-val">{data.target_platform}</span>
            </div>

            <div className="result-item">
              <span className="item-label">Reported Operations:</span>
              <div className="ops-list">
                {Array.isArray(data.operations) && data.operations.length > 0 ? (
                  data.operations.map((op, idx) => (
                    <div key={idx} className="op-tag">
                      <span>{op.operation || 'operation'}</span>
                      <span className="badge badge-emerald">{op.status || 'completed'}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-muted">None reported</span>
                )}
              </div>
            </div>

            <div className="result-item full-width">
              <span className="item-label">
                <ShieldCheck size={12} /> Sealed Evidence File:
              </span>
              <span className="item-val path-val">{data.sealed_evidence || 'N/A'}</span>
            </div>

            <div className="result-item full-width">
              <span className="item-label">
                <FileText size={12} /> STIX 2.1 Bundle File:
              </span>
              <span className="item-val path-val">{data.stix_bundle || 'N/A'}</span>
            </div>
          </div>
        ) : (
          <div className="error-summary">
            <div className="error-header">
              <AlertTriangle size={14} className="text-error" />
              <span>Backend Execution Failure</span>
            </div>

            <div className="result-details-grid">
              {investigationId && (
                <div className="result-item">
                  <span className="item-label">Investigation ID:</span>
                  <span className="item-val">{investigationId}</span>
                </div>
              )}

              <div className="result-item full-width">
                <span className="item-label">Failed Pipeline Stage:</span>
                <span className="item-val text-error">
                  {typeof stage === 'object' ? JSON.stringify(stage) : String(stage)}
                </span>
              </div>

              <div className="result-item full-width">
                <span className="item-label">Error Output:</span>
                <div className="error-box">
                  <pre>{error}</pre>
                </div>
              </div>

              <div className="full-width">
                <button 
                  className="toggle-raw-btn"
                  onClick={() => setShowRawError(!showRawError)}
                >
                  {showRawError ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>{showRawError ? 'Hide Raw Detail Object' : 'Show Raw Backend Detail Object'}</span>
                </button>

                {showRawError && (
                  <div className="raw-detail-box">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .result-summary-card {
          margin-top: 4px;
        }

        .success-border {
          border-color: var(--status-success);
        }

        .error-border {
          border-left: 3px solid var(--status-error);
        }

        .loading-summary, .empty-summary {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .result-details-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .result-item {
          display: flex;
          gap: 10px;
          font-size: 11px;
          align-items: baseline;
        }

        .result-item.full-width {
          flex-direction: column;
          gap: 2px;
        }

        .item-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          min-width: 140px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .item-val {
          color: var(--text-primary);
          word-break: break-all;
        }

        .item-val.highlight {
          font-weight: 700;
          color: var(--text-primary);
        }

        .path-val {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          width: 100%;
          font-size: 10.5px;
        }

        .ops-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .op-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 2px 6px;
          font-size: 10px;
        }

        .error-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--status-error);
        }

        .error-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-left: 3px solid var(--status-error);
          padding: 8px;
          color: var(--text-primary);
          font-size: 10.5px;
          line-height: 1.4;
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .toggle-raw-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 10px;
          cursor: pointer;
          margin-top: 4px;
          padding: 0;
        }

        .toggle-raw-btn:hover {
          color: var(--text-primary);
        }

        .raw-detail-box {
          margin-top: 6px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 8px;
          font-size: 10px;
          color: var(--text-secondary);
          max-height: 150px;
          overflow-y: auto;
        }

        .text-success { color: var(--status-success); }
        .text-error { color: var(--status-error); }
        .text-muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
}
