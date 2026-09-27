import { Activity, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export default function PreflightDiagnosticsPanel({ preflightResults, onRunCheck }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 size={13} />;
      case 'WARN':
        return <AlertTriangle size={13} />;
      case 'BLOCK':
      case 'FAIL':
        return <XCircle size={13} />;
      default:
        return <Info size={13} />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PASS': return 'badge-emerald';
      case 'WARN': return 'badge-amber';
      case 'BLOCK':
      case 'FAIL': return 'badge-crimson';
      default: return 'badge-cyan';
    }
  };

  return (
    <div className="panel-card diagnostics-card">
      <div className="panel-header">
        <div className="panel-title">
          <Activity size={14} />
          <span>Pre-Flight Compiler & Runtime Diagnostics</span>
        </div>
        <button className="btn btn-primary" onClick={onRunCheck}>
          Re-Run Pre-Flight
        </button>
      </div>

      <div className="panel-body">
        <div className="diag-intro">
          <span>
            Pre-flight diagnostics evaluate DSL syntax, AST node lowering, platform matrix compatibility, 
            and C++ native provider binary availability before executing the pipeline.
          </span>
        </div>

        <div className="diag-table">
          <div className="diag-table-header">
            <span>CHECK ITEM</span>
            <span>STATUS</span>
            <span>DIAGNOSTIC DETAIL</span>
          </div>

          {preflightResults && preflightResults.checks ? (
            preflightResults.checks.map((check, idx) => (
              <div key={idx} className="diag-row">
                <div className="check-name">
                  {getStatusIcon(check.status)}
                  <span>{check.name}</span>
                </div>
                <div>
                  <span className={`badge ${getStatusBadgeClass(check.status)}`}>
                    {check.status}
                  </span>
                </div>
                <div className="check-detail">{check.detail}</div>
              </div>
            ))
          ) : (
            <div className="empty-diag">
              <span>No pre-flight diagnostic run performed yet. Click "Re-Run Pre-Flight" above.</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .diagnostics-card {
          min-height: 220px;
        }

        .diag-intro {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 10px;
          line-height: 1.4;
        }

        .diag-table {
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .diag-table-header {
          display: grid;
          grid-template-columns: 200px 80px 1fr;
          gap: 10px;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .diag-row {
          display: grid;
          grid-template-columns: 200px 80px 1fr;
          gap: 10px;
          padding: 6px 10px;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          font-size: 10.5px;
        }

        .diag-row:last-child {
          border-bottom: none;
        }

        .check-name {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-primary);
          font-weight: 600;
        }

        .check-detail {
          color: var(--text-secondary);
          font-size: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-diag {
          padding: 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 10.5px;
        }
      `}</style>
    </div>
  );
}
