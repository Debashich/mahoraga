import { useState } from 'react';
import { FolderLock, ShieldCheck, FileJson, AlertTriangle, Info, HardDrive, XCircle } from 'lucide-react';

export default function EvidencePage({ lastResult, cmiConnected }) {
  const [activeTab, setActiveTab] = useState('summary');

  const hasResult = Boolean(lastResult);
  const isSuccess = hasResult && lastResult.success && lastResult.data;
  const isFailed = hasResult && !lastResult.success;
  const executionData = isSuccess ? lastResult.data : null;

  return (
    <div className="evidence-page font-mono">
      {/* Top Banner */}
      <div className="panel-card banner-card">
        <div className="banner-content">
          <FolderLock size={20} />
          <div>
            <h3>Cryptographic Evidence Vault & Path Inspector</h3>
            <p>
              Inspects sealed evidence file paths returned by backend orchestration runs.
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <span className={`badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? 'CMI API: CONNECTED' : 'CMI API: OFFLINE'}
          </span>
          <span className={`badge ${isSuccess ? 'badge-emerald' : isFailed ? 'badge-crimson' : 'badge'}`}>
            {isSuccess ? 'EVIDENCE AVAILABLE' : isFailed ? 'ORCHESTRATION FAILED' : 'NO RESULT'}
          </span>
        </div>
      </div>

      {/* Main Evidence Grid */}
      <div className="evidence-grid">
        {/* Left Bundle Registry Panel */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <FileJson size={14} />
              <span>Orchestration Result Session</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="bundle-list">
              {!hasResult && (
                <div className="notice-box badge badge-warning">
                  <Info size={13} />
                  <span>No investigation run recorded in current session. Run an investigation from the Workbench.</span>
                </div>
              )}

              {isFailed && (
                <div className="bundle-item failed">
                  <div className="bundle-top">
                    <span className="bundle-id">{lastResult.investigationId || 'Investigation Run'}</span>
                    <span className="badge badge-crimson">FAILED</span>
                  </div>
                  <div className="bundle-bottom">
                    <span className="text-error">Stage: {typeof lastResult.stage === 'string' ? lastResult.stage : 'Process Error'}</span>
                  </div>
                </div>
              )}

              {isSuccess && (
                <div className="bundle-item active">
                  <div className="bundle-top">
                    <span className="bundle-id">{executionData.investigation_id}</span>
                    <span className="badge badge-emerald">PATH RETURNED</span>
                  </div>
                  <div className="bundle-bottom">
                    <span>Target: {executionData.target_platform}</span>
                    <span>Status: {executionData.status}</span>
                  </div>
                </div>
              )}

              <div className="unexposed-notice">
                <span>Note: `cmi/server.py` exposes `POST /api/v1/orchestrate`, but does not provide a separate `GET /api/v1/evidence` history endpoint.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Evidence Inspector */}
        <div className="panel-card flex-2">
          <div className="panel-header">
            <div className="panel-tabs">
              <button 
                className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                <ShieldCheck size={12} /> Sealed Evidence Path
              </button>
              <button 
                className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                onClick={() => setActiveTab('raw')}
              >
                <FileJson size={12} /> Raw Orchestration Output
              </button>
            </div>
          </div>

          <div className="panel-body">
            {activeTab === 'summary' ? (
              <div className="summary-view">
                {!hasResult && (
                  <div className="empty-state">
                    <Info size={24} className="text-muted" />
                    <p>[+] No investigation result available.</p>
                    <p>[+] Go to Jocky Workbench and click "Run Investigation" to trigger backend pipeline.</p>
                  </div>
                )}

                {isFailed && (
                  <div className="failed-state">
                    <div className="failed-banner badge badge-crimson">
                      <XCircle size={14} />
                      <div>
                        <span className="failed-title">Evidence Output Unavailable</span>
                        <span className="failed-sub">The orchestration pipeline encountered an error during execution.</span>
                      </div>
                    </div>
                    <div className="error-details-box">
                      <p><strong>Failed Stage:</strong> {JSON.stringify(lastResult.stage)}</p>
                      <p><strong>Backend Error Output:</strong></p>
                      <pre className="error-pre">{lastResult.error}</pre>
                    </div>
                  </div>
                )}

                {isSuccess && (
                  <div className="success-state">
                    <div className="path-banner badge badge-emerald">
                      <HardDrive size={14} />
                      <div>
                        <span className="banner-title">Sealed Evidence File Path Returned</span>
                        <span className="banner-sub">Backend generated sealed evidence bundle on server filesystem.</span>
                      </div>
                    </div>

                    <div className="info-table">
                      <div className="info-row">
                        <span className="row-label">Investigation ID:</span>
                        <span className="row-val font-bold">{executionData.investigation_id}</span>
                      </div>

                      <div className="info-row">
                        <span className="row-label">Execution Status:</span>
                        <span className="row-val text-success">{executionData.status.toUpperCase()}</span>
                      </div>

                      <div className="info-row">
                        <span className="row-label">Target Platform:</span>
                        <span className="row-val">{executionData.target_platform}</span>
                      </div>

                      <div className="info-row full">
                        <span className="row-label">Sealed Evidence File Path:</span>
                        <span className="row-val path-box">{executionData.sealed_evidence}</span>
                      </div>

                      <div className="info-row full">
                        <span className="row-label">Source System Location:</span>
                        <span className="row-val text-muted">CMI Backend Filesystem (`{executionData.sealed_evidence}`)</span>
                      </div>
                    </div>

                    <div className="disclosure-box">
                      <AlertTriangle size={13} className="text-amber" />
                      <div>
                        <p><strong>API Availability & Integrity Disclosure:</strong></p>
                        <ul>
                          <li>Direct browser file download is <em>not exposed by current CMI API</em>.</li>
                          <li>SHA-256 digest strings, custody records, and file sizes are processed server-side by <code>evidence.sealing</code> module and are <em>not exposed by current CMI API response schema</em>.</li>
                          <li>The file path above is verified as returned by the backend orchestration response.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="raw-view">
                {hasResult ? (
                  <pre className="json-pre">{JSON.stringify(lastResult, null, 2)}</pre>
                ) : (
                  <div className="empty-state">
                    <p>[!] No backend response data recorded for current session.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .evidence-page {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .banner-card {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .banner-content h3 {
          font-size: 13.5px;
          color: var(--text-primary);
          font-weight: 700;
        }

        .banner-content p {
          font-size: 10.5px;
          color: var(--text-secondary);
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .evidence-grid {
          display: flex;
          gap: 14px;
        }

        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }

        .bundle-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bundle-item {
          padding: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .bundle-item.active {
          border-color: var(--accent);
          background: var(--bg-tertiary);
        }

        .bundle-item.failed {
          border-left: 3px solid var(--status-error);
        }

        .bundle-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }

        .bundle-id {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .bundle-bottom {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .unexposed-notice {
          font-size: 9.5px;
          color: var(--text-muted);
          margin-top: 8px;
          padding: 6px;
          border-top: 1px solid var(--border-color);
        }

        .panel-tabs {
          display: flex;
          gap: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }

        .tab-btn.active {
          color: var(--text-primary);
          border-bottom-color: var(--accent);
        }

        .path-banner, .failed-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          margin-bottom: 12px;
          width: 100%;
        }

        .banner-title, .failed-title {
          font-size: 11px;
          font-weight: 700;
          display: block;
        }

        .banner-sub, .failed-sub {
          font-size: 9.5px;
          color: var(--text-secondary);
        }

        .info-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 10px;
          margin-bottom: 12px;
        }

        .info-row {
          display: flex;
          gap: 10px;
          font-size: 10.5px;
          align-items: baseline;
        }

        .info-row.full {
          flex-direction: column;
          gap: 3px;
        }

        .row-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          min-width: 140px;
        }

        .row-val {
          color: var(--text-primary);
        }

        .path-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          width: 100%;
          word-break: break-all;
        }

        .disclosure-box {
          display: flex;
          gap: 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-left: 3px solid var(--status-warning);
          padding: 10px;
          font-size: 10px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .disclosure-box ul {
          padding-left: 16px;
          margin-top: 4px;
        }

        .notice-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 10px;
          color: var(--text-secondary);
          width: 100%;
        }

        .json-pre {
          background: var(--bg-primary);
          padding: 10px;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 10.5px;
          max-height: 300px;
          overflow-y: auto;
        }

        .empty-state {
          padding: 30px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .failed-state {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .error-details-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 10px;
          font-size: 10.5px;
        }

        .error-pre {
          color: var(--status-error);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 6px;
          margin-top: 4px;
          max-height: 150px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .text-success { color: var(--status-success); }
        .text-error { color: var(--status-error); }
        .text-amber { color: var(--status-warning); }
        .font-bold { font-weight: 700; }
      `}</style>
    </div>
  );
}
