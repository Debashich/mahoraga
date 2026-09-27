import { useState } from 'react';
import { Radar, GitCommit, FileCode, Cpu, AlertTriangle } from 'lucide-react';

export default function DetectionStixPage({ lastResult, cmiConnected }) {
  const [viewMode, setViewMode] = useState('objects');

  const hasRealData = lastResult && lastResult.success && lastResult.data;
  const executionData = hasRealData ? lastResult.data : null;

  return (
    <div className="stix-page">
      {/* Top Banner */}
      <div className="panel-card banner-card">
        <div className="banner-content">
          <Radar size={20} />
          <div>
            <h3>STIX 2.1 Threat Intelligence & PLTL Detection Engine</h3>
            <p>
              Processes sealed forensic evidence to evaluate Temporal Logic (PLTL) rules and generate standardized STIX 2.1 bundles.
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <span className="badge badge-info">STIX 2.1 SPECIFICATION</span>
          <span className={`badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? 'CMI API: CONNECTED' : 'CMI API: OFFLINE'}
          </span>
        </div>
      </div>

      <div className="stix-grid">
        {/* PLTL Logic Rules Evaluation */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <Cpu size={14} />
              <span>PLTL Temporal Rule Evaluation</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="unexposed-box badge badge-warning">
              <AlertTriangle size={13} />
              <span>
                PLTL rule query endpoint not exposed by current CMI API. Rules are processed internally during backend execution.
              </span>
            </div>
          </div>
        </div>

        {/* STIX 2.1 Objects & Raw JSON Viewer */}
        <div className="panel-card flex-2">
          <div className="panel-header">
            <div className="panel-tabs">
              <button 
                className={`tab-btn ${viewMode === 'objects' ? 'active' : ''}`}
                onClick={() => setViewMode('objects')}
              >
                <GitCommit size={12} /> STIX 2.1 Bundle Details
              </button>
              <button 
                className={`tab-btn ${viewMode === 'json' ? 'active' : ''}`}
                onClick={() => setViewMode('json')}
              >
                <FileCode size={12} /> Raw CMI Result JSON
              </button>
            </div>
          </div>

          <div className="panel-body">
            {viewMode === 'objects' ? (
              <div className="stix-objects-list font-mono">
                {hasRealData ? (
                  <div className="stix-obj-card">
                    <div className="obj-header">
                      <span className="badge badge-info">STIX BUNDLE</span>
                      <span className="obj-id">{executionData.stix_bundle}</span>
                    </div>
                    <div className="obj-body">
                      <div><strong>Investigation ID:</strong> {executionData.investigation_id}</div>
                      <div><strong>Target Platform:</strong> {executionData.target_platform}</div>
                      <div><strong>Status:</strong> {executionData.status}</div>
                      <div><strong>STIX File Path:</strong> {executionData.stix_bundle}</div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state font-mono">
                    <p>[!] No STIX bundle generated in current session.</p>
                    <p>Run an investigation from the Workbench (POST /api/v1/orchestrate) to generate a STIX 2.1 bundle.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="raw-view font-mono">
                {hasRealData ? (
                  <pre className="json-pre">{JSON.stringify(executionData, null, 2)}</pre>
                ) : (
                  <div className="empty-state">
                    <p>[!] No CMI result data recorded.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .stix-page {
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
          gap: 6px;
        }

        .stix-grid {
          display: flex;
          gap: 14px;
        }

        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }

        .unexposed-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 10.5px;
          color: var(--text-secondary);
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

        .stix-objects-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stix-obj-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 8px 10px;
        }

        .obj-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .obj-id {
          font-size: 10px;
          color: var(--text-muted);
        }

        .obj-body {
          font-size: 10.5px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 2px;
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
