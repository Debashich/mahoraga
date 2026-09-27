import { 
  ShieldCheck, 
  Terminal, 
  FolderLock, 
  Radar, 
  Activity, 
  Cpu, 
  ArrowRight,
  Server,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  const stats = [
    { label: 'JOCKY COMPILER', val: 'Active (Lark v1)', icon: Terminal },
    { label: 'NATIVE RUNTIME', val: 'mahoraga-run', icon: Cpu },
    { label: 'EVIDENCE SEALING', val: 'SHA-256 Custody', icon: FolderLock },
    { label: 'STIX ENGINE', val: 'STIX 2.1 & PLTL', icon: Radar },
  ];

  const recentInvestigations = [
    { id: 'NTRO-Sweep-A81F92', script: 'host_sweep.jocky', platform: 'Linux', status: 'COMPLETED', time: '10 mins ago' },
    { id: 'NTRO-Sweep-73B01C', script: 'hunt.jocky', platform: 'Linux', status: 'COMPLETED', time: '1 hour ago' },
    { id: 'NTRO-Sweep-42E9DF', script: 'process_inventory.jocky', platform: 'Windows', status: 'DEMO / PENDING', time: '3 hours ago' },
  ];

  return (
    <div className="dashboard-page">
      {/* Banner */}
      <div className="dashboard-banner panel-card">
        <div className="banner-left">
          <div className="banner-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2>Mahoraga Forensic Compiler & Investigation Framework</h2>
            <p>
              Cross-platform forensic compiler orchestrating Jocky DSL into platform-independent Forensic IR, 
              executing through native C++ providers, cryptographically sealing evidence, and generating STIX 2.1 bundles.
            </p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => onNavigate('workbench')}>
          Open Workbench <ArrowRight size={13} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="panel-card stat-card">
              <div className="stat-header">
                <span className="stat-label">{s.label}</span>
                <Icon size={16} />
              </div>
              <div className="stat-value">{s.val}</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Pipeline Architecture Card */}
        <div className="panel-card flex-2">
          <div className="panel-header">
            <div className="panel-title">
              <Activity size={14} />
              <span>Architectural Execution Pipeline</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="pipeline-flow-diagram">
              <div className="flow-step">
                <span className="step-num">01</span>
                <span className="step-title">Jocky DSL</span>
                <span className="step-sub">Source Script</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">02</span>
                <span className="step-title">Python Compiler</span>
                <span className="step-sub">Lark AST + MLIR</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">03</span>
                <span className="step-title">Forensic IR</span>
                <span className="step-sub">JSON Contract</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">04</span>
                <span className="step-title">Payload Encapsulation</span>
                <span className="step-sub">Polymorphic .enc</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">05</span>
                <span className="step-title">Native C++ Runtime</span>
                <span className="step-sub">mahoraga-run Dispatcher</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">06</span>
                <span className="step-title">Evidence Sealing</span>
                <span className="step-sub">SHA-256 Hashes</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-num">07</span>
                <span className="step-title">STIX 2.1 Engine</span>
                <span className="step-sub">Threat Bundle</span>
              </div>
            </div>

            <div className="api-notice-box badge badge-warning">
              <AlertCircle size={14} />
              <span>
                <strong>System Notice:</strong> Frontend running in standalone UI shell mode. 
                Connect CMI FastAPI backend (`cmi/server.py`) to trigger live binary execution.
              </span>
            </div>
          </div>
        </div>

        {/* Recent Runs Card */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <Server size={14} />
              <span>Recent Investigations</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="investigation-list">
              {recentInvestigations.map((inv) => (
                <div key={inv.id} className="inv-row">
                  <div className="inv-info">
                    <span className="inv-id">{inv.id}</span>
                    <span className="inv-script">{inv.script} ({inv.platform})</span>
                  </div>
                  <div className="inv-status">
                    <span className={`badge ${inv.status === 'COMPLETED' ? 'badge-emerald' : 'badge-amber'}`}>
                      {inv.status}
                    </span>
                    <span className="inv-time">{inv.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dashboard-banner {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 14px;
          max-width: 800px;
        }

        .banner-icon {
          width: 42px;
          height: 42px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--text-primary);
        }

        .banner-left h2 {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 2px;
          font-weight: 700;
        }

        .banner-left p {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .stat-card {
          padding: 10px 12px;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          color: var(--text-muted);
        }

        .stat-label {
          font-size: 9.5px;
          font-weight: 700;
        }

        .stat-value {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .dashboard-grid {
          display: flex;
          gap: 14px;
        }

        .flex-2 { flex: 2; }
        .flex-1 { flex: 1; }

        .pipeline-flow-diagram {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 12px;
          margin-bottom: 12px;
          overflow-x: auto;
        }

        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .step-num {
          font-size: 8.5px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .step-title {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 2px 0;
        }

        .step-sub {
          font-size: 8.5px;
          color: var(--text-muted);
        }

        .flow-arrow {
          color: var(--text-muted);
          font-size: 12px;
        }

        .api-notice-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 10.5px;
          color: var(--text-secondary);
        }

        .investigation-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .inv-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .inv-info {
          display: flex;
          flex-direction: column;
        }

        .inv-id {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .inv-script {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .inv-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .inv-time {
          font-size: 8.5px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
