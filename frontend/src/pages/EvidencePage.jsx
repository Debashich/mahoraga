import { useState } from 'react';
import { FolderLock, ShieldCheck, Download, FileJson, Lock, AlertTriangle } from 'lucide-react';

export default function EvidencePage({ lastResult, cmiConnected }) {
  const [activeTab, setActiveTab] = useState('sealed');

  const hasRealData = lastResult && lastResult.success && lastResult.data;
  const executionData = hasRealData ? lastResult.data : null;

  return (
    <div className="evidence-page">
      {/* Top Banner */}
      <div className="panel-card banner-card">
        <div className="banner-content">
          <FolderLock size={20} />
          <div>
            <h3>Cryptographic Evidence Vault & Chain-of-Custody</h3>
            <p>
              Preserves collected forensic artifacts through SHA-256 integrity hashing and tamper-proof sealing.
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <span className={`badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? 'CMI API: CONNECTED' : 'CMI API: OFFLINE'}
          </span>
          <button className="btn btn-primary" disabled={!hasRealData}>
            <Download size={12} /> Export Evidence Package
          </button>
        </div>
      </div>

      {/* Main Evidence Grid */}
      <div className="evidence-grid">
        {/* Left List of Evidence Bundles */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <FileJson size={14} />
              <span>Sealed Evidence Bundles</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="bundle-list">
              {hasRealData ? (
                <div className="bundle-item active">
                  <div className="bundle-top">
                    <span className="bundle-id">{executionData.investigation_id}</span>
                    <span className="badge badge-emerald">SEALED</span>
                  </div>
                  <div className="bundle-bottom">
                    <span>Target: {executionData.target_platform}</span>
                    <span>Status: {executionData.status}</span>
                  </div>
                </div>
              ) : (
                <div className="notice-box badge badge-warning">
                  <AlertTriangle size={13} />
                  <span>
                    No active sealed evidence in session. Run an investigation from the Workbench to generate evidence.
                  </span>
                </div>
              )}

              <div className="unexposed-notice">
                <span>Note: CMI server (`cmi/server.py`) exposes `/api/v1/orchestrate`, but does not provide a separate `GET /api/v1/evidence` bundle list API.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Evidence Inspector */}
        <div className="panel-card flex-2">
          <div className="panel-header">
            <div className="panel-tabs">
              <button 
                className={`tab-btn ${activeTab === 'sealed' ? 'active' : ''}`}
                onClick={() => setActiveTab('sealed')}
              >
                <ShieldCheck size={12} /> Sealed Artifacts & Hashes
              </button>
              <button 
                className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                onClick={() => setActiveTab('raw')}
              >
                <FileJson size={12} /> Raw CMI Execution Output
              </button>
            </div>
          </div>

          <div className="panel-body">
            {activeTab === 'sealed' ? (
              <div className="sealed-view">
                {hasRealData ? (
                  <>
                    <div className="custody-banner badge badge-emerald">
                      <Lock size={14} />
                      <div>
                        <span className="custody-title">Chain of Custody Status: VERIFIED</span>
                        <span className="custody-sub">
                          Sealed file generated: {executionData.sealed_evidence}
                        </span>
                      </div>
                    </div>

                    <div className="hash-table">
                      <div className="hash-table-header">
                        <span>INVESTIGATION ID</span>
                        <span>STATUS</span>
                        <span>SEALED EVIDENCE FILE PATH</span>
                      </div>
                      <div className="hash-row">
                        <span className="art-name">{executionData.investigation_id}</span>
                        <span className="art-count">{executionData.status}</span>
                        <span className="art-hash">{executionData.sealed_evidence}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state font-mono">
                    <p>[!] No evidence returned yet.</p>
                    <p>Go to Jocky Workbench and click "Execute POST /api/v1/orchestrate".</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="raw-view">
                {hasRealData ? (
                  <pre className="json-pre">{JSON.stringify(executionData, null, 2)}</pre>
                ) : (
                  <div className="empty-state font-mono">
                    <p>[!] No CMI response data recorded for current session.</p>
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
          gap: 8px;
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
          cursor: pointer;
        }

        .bundle-item.active {
          border-color: var(--accent);
          background: var(--bg-tertiary);
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

        .custody-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          margin-bottom: 12px;
          width: 100%;
        }

        .custody-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
        }

        .custody-sub {
          font-size: 9.5px;
          color: var(--text-secondary);
        }

        .hash-table {
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .hash-table-header {
          display: grid;
          grid-template-columns: 140px 70px 1fr;
          gap: 8px;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .hash-row {
          display: grid;
          grid-template-columns: 140px 70px 1fr;
          gap: 8px;
          padding: 6px 10px;
          border-bottom: 1px solid var(--border-color);
          font-size: 10.5px;
          align-items: center;
        }

        .art-name { color: var(--text-primary); font-weight: 600; }
        .art-count { color: var(--text-secondary); }
        .art-hash { color: var(--text-secondary); font-size: 9.5px; overflow: hidden; text-overflow: ellipsis; }

        .notice-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 10.5px;
          color: var(--text-secondary);
          margin-bottom: 10px;
          width: 100%;
        }

        .json-pre {
          background: var(--bg-primary);
          padding: 10px;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 10.5px;
          max-height: 280px;
          overflow-y: auto;
        }

        .empty-state {
          padding: 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
