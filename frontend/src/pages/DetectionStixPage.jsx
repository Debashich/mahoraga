import { useState } from 'react';
import { Radar, GitCommit, FileCode, Cpu } from 'lucide-react';

export default function DetectionStixPage() {
  const [viewMode, setViewMode] = useState('objects');

  const mockStixBundle = {
    type: "bundle",
    id: "bundle--d740268a-2c81-4b10-a299-8d748a0f912e",
    spec_version: "2.1",
    objects: [
      {
        type: "identity",
        id: "identity--mahoraga-forensic-engine",
        name: "Mahoraga Threat Intelligence Engine",
        identity_class: "system"
      },
      {
        type: "indicator",
        id: "indicator--9f123a10-449e-4c12-88ef-90a421b8f101",
        name: "High-Frequency Process Spawn Correlation",
        pattern: "[process:name = 'mahoraga-run']",
        valid_from: "2026-09-27T12:45:00Z"
      },
      {
        type: "observed-data",
        id: "observed-data--550e8400-e29b-41d4-a716-446655440000",
        number_observed: 142,
        first_observed: "2026-09-27T12:45:00Z",
        last_observed: "2026-09-27T12:45:05Z"
      }
    ]
  };

  const pltlRules = [
    { name: 'RULE 01: Host Process Sweeping', formula: 'H (process_list -> F system_info)', status: 'MATCHED' },
    { name: 'RULE 02: Network Socket Correlation', formula: 'H (procs <-> conns)', status: 'MATCHED' },
    { name: 'RULE 03: Anomalous Privilege Escalation', formula: 'G (users.privilege == "root")', status: 'NO_MATCH' },
  ];

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
          <span className="badge badge-warning">BACKEND API: DEMO</span>
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
            <div className="rule-list">
              {pltlRules.map((rule, idx) => (
                <div key={idx} className="rule-card">
                  <div className="rule-top">
                    <span className="rule-name">{rule.name}</span>
                    <span className={`badge ${rule.status === 'MATCHED' ? 'badge-emerald' : 'badge-amber'}`}>
                      {rule.status}
                    </span>
                  </div>
                  <div className="rule-formula">{rule.formula}</div>
                </div>
              ))}
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
                <GitCommit size={12} /> STIX Domain Objects (SDOs)
              </button>
              <button 
                className={`tab-btn ${viewMode === 'json' ? 'active' : ''}`}
                onClick={() => setViewMode('json')}
              >
                <FileCode size={12} /> Raw STIX 2.1 JSON
              </button>
            </div>
          </div>

          <div className="panel-body">
            {viewMode === 'objects' ? (
              <div className="stix-objects-list">
                {mockStixBundle.objects.map((obj, idx) => (
                  <div key={idx} className="stix-obj-card">
                    <div className="obj-header">
                      <span className="badge badge-info">{obj.type.toUpperCase()}</span>
                      <span className="obj-id">{obj.id}</span>
                    </div>
                    <div className="obj-body">
                      {obj.name && <div><strong>Name:</strong> {obj.name}</div>}
                      {obj.pattern && <div><strong>Pattern:</strong> <code>{obj.pattern}</code></div>}
                      {obj.valid_from && <div><strong>Valid From:</strong> {obj.valid_from}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="json-pre">{JSON.stringify(mockStixBundle, null, 2)}</pre>
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

        .rule-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rule-card {
          padding: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .rule-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .rule-name {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .rule-formula {
          font-size: 9.5px;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 3px 6px;
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
      `}</style>
    </div>
  );
}
