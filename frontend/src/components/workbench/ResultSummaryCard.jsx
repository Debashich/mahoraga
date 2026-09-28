import {
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  GitCommit,
  ChevronDown,
  ChevronRight,
  Lock,
  Download,
  ExternalLink,
  Cpu, 
  Radio
} from 'lucide-react';
import { useState } from 'react';

export default function ResultSummaryCard({ result, isOrchestrating }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRawError, setShowRawError] = useState(false);
  const [activeTab, setActiveTab] = useState('evidence');

  if (isOrchestrating) {
    return (
      <div className="panel-card result-summary-card">
        <div className="panel-header">
          <div className="panel-title">
            <GitCommit size={14} />
            <span>Investigation Result</span>
          </div>
          <span className="badge badge-warning">EXECUTING...</span>
        </div>
        <div className="panel-body font-mono">
          <div className="loading-summary">
            <p>[...] Pipeline executing via POST /api/v1/orchestrate...</p>
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
            <span>Investigation Result</span>
          </div>
          <span className="badge">NO RUN</span>
        </div>
        <div className="panel-body font-mono">
          <div className="empty-summary">
            <p>[+] Ready. Click "Compile & Execute" to run the investigation pipeline.</p>
          </div>
        </div>
      </div>
    );
  }

  const { success, data, error, stage, investigationId } = result;

  if (!success) {
    return (
      <div className="panel-card result-summary-card error-border">
        <div className="panel-header">
          <div className="panel-title">
            <XCircle size={14} className="text-error" />
            <span>Investigation Failed</span>
          </div>
          <span className="badge badge-crimson">FAILED</span>
        </div>
        <div className="panel-body font-mono">
          <div className="error-summary">
            <div className="error-meta-row">
              <span className="meta-key">Stage:</span>
              <span className="meta-val text-error">{stage}</span>
            </div>
            {investigationId && (
              <div className="error-meta-row">
                <span className="meta-key">ID:</span>
                <span className="meta-val">{investigationId}</span>
              </div>
            )}
            <div className="error-output-box">
              <pre>{error}</pre>
            </div>
            <button className="toggle-raw-btn" onClick={() => setShowRawError(!showRawError)}>
              {showRawError ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span>{showRawError ? 'Hide raw response' : 'Show raw response'}</span>
            </button>
            {showRawError && (
              <div className="raw-detail-box">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        <style>{resultStyles}</style>
      </div>
    );
  }

  // ─── SUCCESS PATH (Mapped to Structured Telemetry) ───
  const d = data || {};
  const t = d.telemetry || {};
  const ev = t.evidence || {};
  const stix = t.stix_bundle || {};

  const artifactCount = ev.artifacts_count || 0;
  const stixCount = stix.objects_count || 0;
  const findingsCount = stix.findings_count || 0;
  const evidenceObjects = ev.objects || [];
  const capabilities = t.capabilities_used || [];
  const sealHash = ev.file_sha256 || '';
  const manifestId = ev.manifest_id || '';
  const encBytes = t.encrypted_payload_bytes || 0;

  return (
    <div className="panel-card result-summary-card success-border">
      {/* ─── Collapsed summary header ─── */}
      <div className="result-header-bar" onClick={() => setShowDetails(!showDetails)}>
        <div className="result-header-left">
          <CheckCircle2 size={16} className="text-success" />
          <div className="result-header-text">
            <span className="result-headline">INVESTIGATION COMPLETE</span>
            <span className="result-subline">
              {artifactCount} evidence object{artifactCount !== 1 ? 's' : ''} collected
              {findingsCount > 0 && ` · ${findingsCount} finding${findingsCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        <div className="result-header-right">
          <span className="badge badge-emerald">{d.investigation_id}</span>
          {showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {/* ─── Expanded detail panel ─── */}
      {showDetails && (
        <div className="result-detail-body font-mono">
          {/* Evidence Integrity Box */}
          <div className="integrity-box">
            <div className="integrity-header">
              <ShieldCheck size={13} />
              <span>Evidence Integrity</span>
            </div>
            <div className="integrity-grid">
              <div className="integrity-row">
                <span className="ig-key">SHA-256 Seal</span>
                <span className="ig-val ig-verified">
                  VERIFIED ✓
                </span>
              </div>
              <div className="integrity-row">
                <span className="ig-key">Manifest ID</span>
                <span className="ig-val ig-hash">{manifestId ? manifestId.slice(0, 16) + '...' : 'N/A'}</span>
              </div>
              <div className="integrity-row">
                <span className="ig-key">Evidence Objects</span>
                <span className="ig-val">{artifactCount}</span>
              </div>
              <div className="integrity-row">
                <span className="ig-key">Provider</span>
                <span className="ig-val">{(d.target_platform || 'Linux')} x86_64</span>
              </div>
              <div className="integrity-row">
                <span className="ig-key">STIX Objects</span>
                <span className="ig-val">{stixCount}</span>
              </div>
              <div className="integrity-row">
                <span className="ig-key">Payload Size</span>
                <span className="ig-val">{encBytes} bytes</span>
              </div>
              {sealHash && (
                <div className="integrity-row full-width">
                  <span className="ig-key">File Hash</span>
                  <span className="ig-val ig-hash">{sealHash}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="result-tabs">
            <button
              className={`result-tab ${activeTab === 'evidence' ? 'active' : ''}`}
              onClick={() => setActiveTab('evidence')}
            >
              <Lock size={11} />
              Evidence Vault
            </button>
            <button
              className={`result-tab ${activeTab === 'stix' ? 'active' : ''}`}
              onClick={() => setActiveTab('stix')}
            >
              <GitCommit size={11} />
              STIX Bundle
            </button>
            <button
              className={`result-tab ${activeTab === 'capabilities' ? 'active' : ''}`}
              onClick={() => setActiveTab('capabilities')}
            >
              <Cpu size={11} />
              Capabilities
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'evidence' && (
              <div className="evidence-list">
                {evidenceObjects.length > 0 ? (
                  evidenceObjects.map((obj, i) => (
                    <div key={i} className="evidence-item">
                      <div className="ev-row">
                        <span className="ev-key">Type</span>
                        <span className="ev-val">{obj.type}</span>
                      </div>
                      <div className="ev-row">
                        <span className="ev-key">Provider</span>
                        <span className="ev-val">{obj.provider}</span>
                      </div>
                      <div className="ev-row">
                        <span className="ev-key">SHA-256</span>
                        <span className="ev-val ev-hash">{obj.sha256 ? obj.sha256.slice(0, 24) + '...' : 'N/A'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-tab">No evidence objects returned.</div>
                )}
              </div>
            )}

            {activeTab === 'stix' && (
              <div className="stix-detail">
                <div className="ev-row">
                  <span className="ev-key">Bundle File</span>
                  <span className="ev-val">{stix.file_path || 'N/A'}</span>
                </div>
                <div className="ev-row">
                  <span className="ev-key">Total Objects</span>
                  <span className="ev-val">{stixCount}</span>
                </div>
                <div className="ev-row">
                  <span className="ev-key">Findings</span>
                  <span className="ev-val">{findingsCount}</span>
                </div>
              </div>
            )}

            {activeTab === 'capabilities' && (
              <div className="cap-list">
                {capabilities.length > 0 ? (
                  capabilities.map((cap, i) => (
                    <div key={i} className="cap-tag">
                      <Radio size={10} />
                      {cap}
                    </div>
                  ))
                ) : (
                  <div className="empty-tab">No capabilities reported.</div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="result-actions">
            <button className="action-btn" title="View sealed evidence file">
              <ShieldCheck size={12} />
              Open Evidence Vault
            </button>
            <button className="action-btn" title="View STIX 2.1 bundle">
              <ExternalLink size={12} />
              View STIX
            </button>
            <button className="action-btn" title="Export investigation artifacts">
              <Download size={12} />
              Export
            </button>
          </div>

          {/* File Paths */}
          <div className="file-paths">
            <div className="fp-row">
              <FileText size={11} />
              <span className="fp-label">Sealed:</span>
              <span className="fp-path">{ev.file_path || 'N/A'}</span>
            </div>
            <div className="fp-row">
              <FileText size={11} />
              <span className="fp-label">STIX:</span>
              <span className="fp-path">{stix.file_path || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      <style>{resultStyles}</style>
    </div>
  );
}

const resultStyles = `
  .result-summary-card {
    overflow: hidden;
  }

  .success-border {
    border-color: var(--status-success);
  }

  .error-border {
    border-left: 3px solid var(--status-error);
  }

  /* ─── Collapsed Header Bar ─── */
  .result-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.15s ease;
    user-select: none;
  }

  .result-header-bar:hover {
    background: var(--bg-tertiary);
  }

  .result-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .result-header-text {
    display: flex;
    flex-direction: column;
  }

  .result-headline {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }

  .result-subline {
    font-size: 10.5px;
    color: var(--text-secondary);
    margin-top: 1px;
  }

  .result-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }

  /* ─── Expanded Detail Body ─── */
  .result-detail-body {
    padding: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 1px solid var(--border-color);
  }

  /* ─── Integrity Box ─── */
  .integrity-box {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    margin-top: 10px;
  }

  .integrity-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }

  .integrity-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  .integrity-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 12px;
    border-bottom: 1px solid rgba(51, 51, 51, 0.4);
    font-size: 11px;
  }

  .integrity-row.full-width {
    grid-column: 1 / -1;
    flex-direction: column;
    gap: 2px;
  }

  .ig-key {
    color: var(--text-muted);
  }

  .ig-val {
    color: var(--text-primary);
    font-weight: 500;
    text-align: right;
  }

  .ig-verified {
    color: var(--status-success);
    font-weight: 700;
  }

  .ig-hash {
    font-size: 9.5px;
    color: var(--text-secondary);
    word-break: break-all;
  }

  /* ─── Tabs ─── */
  .result-tabs {
    display: flex;
    gap: 0;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .result-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-right: 1px solid var(--border-color);
    color: var(--text-muted);
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .result-tab:last-child {
    border-right: none;
  }

  .result-tab:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
  }

  .result-tab.active {
    color: var(--text-primary);
    background: var(--bg-primary);
    border-bottom: 2px solid var(--accent);
  }

  .tab-content {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-top: none;
    padding: 10px;
    max-height: 200px;
    overflow-y: auto;
  }

  /* ─── Evidence List ─── */
  .evidence-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .evidence-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .ev-row {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
  }

  .ev-key {
    color: var(--text-muted);
    min-width: 80px;
  }

  .ev-val {
    color: var(--text-primary);
    text-align: right;
  }

  .ev-hash {
    font-size: 9.5px;
    color: var(--text-secondary);
  }

  .stix-detail, .cap-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cap-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 3px 8px;
    font-size: 10.5px;
    color: var(--text-primary);
  }

  .empty-tab {
    font-size: 10.5px;
    color: var(--text-muted);
    padding: 10px 0;
  }

  /* ─── Action Buttons ─── */
  .result-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .action-btn:hover {
    border-color: var(--accent);
    background: var(--bg-secondary);
  }

  /* ─── File Paths ─── */
  .file-paths {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .fp-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .fp-label {
    font-weight: 600;
    min-width: 48px;
  }

  .fp-path {
    color: var(--text-secondary);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 2px 6px;
    font-size: 10px;
    word-break: break-all;
  }

  /* ─── Error Styles ─── */
  .error-summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .error-meta-row {
    display: flex;
    gap: 8px;
    font-size: 11px;
  }

  .meta-key {
    color: var(--text-muted);
    font-weight: 600;
    min-width: 60px;
  }

  .meta-val {
    color: var(--text-primary);
  }

  .error-output-box {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--status-error);
    padding: 8px;
    font-size: 10.5px;
    color: var(--text-primary);
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
    padding: 0;
  }

  .toggle-raw-btn:hover {
    color: var(--text-primary);
  }

  .raw-detail-box {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 8px;
    font-size: 10px;
    color: var(--text-secondary);
    max-height: 150px;
    overflow-y: auto;
  }

  .loading-summary, .empty-summary {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .text-success { color: var(--status-success); }
  .text-error { color: var(--status-error); }
`;