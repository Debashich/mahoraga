import { useState } from 'react';
import { Server, WifiOff, Wifi, RefreshCw, Database } from 'lucide-react';

export default function CmiConfigPage({ targetPlatform, onPlatformChange, cmiConnected, cmiStatusText, onRefreshHealth }) {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_CMI_API_URL || 'http://localhost:8000');
  const [runtimePath] = useState('build/mahoraga-run');
  const [testingStatus, setTestingStatus] = useState(null);

  const handleTestConnection = async () => {
    setTestingStatus('testing');
    if (onRefreshHealth) {
      await onRefreshHealth();
    }
    setTestingStatus('done');
  };

  return (
    <div className="cmi-page">
      {/* Top Banner */}
      <div className="panel-card banner-card">
        <div className="banner-content">
          <Server size={20} />
          <div>
            <h3>Central Management Interface (CMI) Backend Configuration</h3>
            <p>
              Manages REST endpoints for Jocky compilation, native binary execution, evidence sealing, and STIX orchestration.
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <div className={`badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>CMI SERVER STATUS: {cmiConnected ? 'LIVE (PORT 8000)' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      <div className="cmi-grid">
        {/* Settings Card */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <Server size={14} />
              <span>CMI REST API Connection Settings</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">FastAPI Backend Server URL (VITE_CMI_API_URL)</label>
              <input 
                type="text" 
                className="form-input" 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)}
              />
              <span className="field-hint">Configured in frontend/.env as VITE_CMI_API_URL</span>
            </div>

            <div className="form-group">
              <label className="form-label">Native Runtime Binary Path (Targeted by Backend)</label>
              <input 
                type="text" 
                className="form-input" 
                value={runtimePath} 
                readOnly
              />
              <span className="field-hint">Path used by backend for execution: build/mahoraga-run</span>
            </div>

            <div className="form-group">
              <label className="form-label">Active Provider Architecture</label>
              <select 
                className="form-select"
                value={targetPlatform}
                onChange={(e) => onPlatformChange(e.target.value)}
              >
                <option value="Linux">Linux Provider (LinuxProvider.cpp)</option>
                <option value="Windows">Windows Provider (WindowsProvider.cpp)</option>
              </select>
            </div>

            <div className="action-row">
              <button 
                className="btn btn-primary"
                onClick={handleTestConnection}
                disabled={testingStatus === 'testing'}
              >
                <RefreshCw size={12} className={testingStatus === 'testing' ? 'spin' : ''} />
                {testingStatus === 'testing' ? 'Testing Connection...' : 'Ping CMI Connection'}
              </button>
            </div>

            <div className={`test-result-box badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
              {cmiConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>
                {cmiConnected 
                  ? `Backend API connected successfully at ${apiUrl} (${cmiStatusText}).`
                  : `Backend API not reachable at ${apiUrl}. Run: python -m uvicorn cmi.server:app --port 8000`
                }
              </span>
            </div>
          </div>
        </div>

        {/* API Endpoint Reference Card */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <Database size={14} />
              <span>Discovered Backend Endpoint Registry</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="endpoint-list">
              <div className="endpoint-item">
                <div className="endpoint-top">
                  <span className="method post">POST</span>
                  <span className="path">/api/v1/orchestrate</span>
                  <span className="badge badge-emerald">EXPOSED</span>
                </div>
                <div className="endpoint-desc">
                  Accepts <code>{`{ jocky_source, target_platform }`}</code>. Runs Jocky Compiler $\rightarrow$ Payload Encapsulation $\rightarrow$ Native Runtime $\rightarrow$ Evidence Sealing $\rightarrow$ STIX 2.1 Engine.
                </div>
              </div>

              <div className="unexposed-list font-mono">
                <div className="unexposed-header">ENDPOINTS NOT EXPOSED BY CURRENT BACKEND (cmi/server.py):</div>
                <ul>
                  <li><code>GET /api/v1/capabilities</code> (Not exposed)</li>
                  <li><code>GET /api/v1/examples</code> (Not exposed)</li>
                  <li><code>POST /api/v1/compile</code> (Not exposed)</li>
                  <li><code>GET /api/v1/evidence</code> (Not exposed)</li>
                  <li><code>GET /api/v1/stix</code> (Not exposed)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cmi-page {
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

        .cmi-grid {
          display: flex;
          gap: 14px;
        }

        .flex-1 { flex: 1; }

        .field-hint {
          font-size: 9px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .action-row {
          margin-top: 12px;
        }

        .test-result-box {
          margin-top: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          width: 100%;
        }

        .endpoint-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .endpoint-item {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 8px;
        }

        .endpoint-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 3px;
        }

        .method {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 4px;
          border: 1px solid var(--border-color);
        }

        .method.post {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .path {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .endpoint-desc {
          font-size: 9.5px;
          color: var(--text-secondary);
        }

        .unexposed-list {
          font-size: 10px;
          color: var(--text-muted);
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 8px;
          margin-top: 8px;
        }

        .unexposed-header {
          font-weight: 700;
          margin-bottom: 4px;
          color: var(--text-secondary);
        }

        .unexposed-list ul {
          padding-left: 16px;
          margin: 0;
        }

        .unexposed-list li {
          margin: 2px 0;
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
