import { useState } from 'react';
import { Server, WifiOff, RefreshCw, Database } from 'lucide-react';

export default function CmiConfigPage({ targetPlatform, onPlatformChange }) {
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');
  const [runtimePath, setRuntimePath] = useState('build/mahoraga-run');
  const [testingStatus, setTestingStatus] = useState(null);

  const handleTestConnection = () => {
    setTestingStatus('testing');
    setTimeout(() => {
      setTestingStatus('not_connected');
    }, 1200);
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
          <div className="badge badge-warning">
            <WifiOff size={11} />
            <span>FASTAPI SERVER: NOT CONNECTED (DEMO MODE)</span>
          </div>
        </div>
      </div>

      <div className="cmi-grid">
        {/* Settings Card */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <Server size={14} />
              <span>CMI REST API Connection</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">FastAPI Backend Server URL</label>
              <input 
                type="text" 
                className="form-input" 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)}
              />
              <span className="field-hint">Default FastAPI server endpoint runs on cmi/server.py:8000</span>
            </div>

            <div className="form-group">
              <label className="form-label">Native Runtime Binary Location</label>
              <input 
                type="text" 
                className="form-input" 
                value={runtimePath} 
                onChange={(e) => setRuntimePath(e.target.value)}
              />
              <span className="field-hint">Path to compiled C++ runtime executable: build/mahoraga-run</span>
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
                {testingStatus === 'testing' ? 'Testing Connection...' : 'Test CMI Connection'}
              </button>
            </div>

            {testingStatus === 'not_connected' && (
              <div className="test-result-box badge badge-warning">
                <WifiOff size={13} />
                <span>Backend API not reachable at {apiUrl}. Start server with: <code>uvicorn cmi.server:app --port 8000</code></span>
              </div>
            )}
          </div>
        </div>

        {/* API Endpoint Reference Card */}
        <div className="panel-card flex-1">
          <div className="panel-header">
            <div className="panel-title">
              <Database size={14} />
              <span>CMI API Endpoint Registry</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="endpoint-list">
              <div className="endpoint-item">
                <div className="endpoint-top">
                  <span className="method post">POST</span>
                  <span className="path">/api/v1/orchestrate</span>
                </div>
                <div className="endpoint-desc">
                  Triggers end-to-end investigation pipeline (Compile $\rightarrow$ Encrypt $\rightarrow$ Native Execution $\rightarrow$ Seal $\rightarrow$ STIX).
                </div>
              </div>

              <div className="endpoint-item">
                <div className="endpoint-top">
                  <span className="method get">GET</span>
                  <span className="path">/api/v1/capabilities</span>
                </div>
                <div className="endpoint-desc">
                  Queries provider capability contract and supported collection operations.
                </div>
              </div>

              <div className="endpoint-item">
                <div className="endpoint-top">
                  <span className="method post">POST</span>
                  <span className="path">/api/v1/compile</span>
                </div>
                <div className="endpoint-desc">
                  Parses Jocky DSL source and lowers to JSON Forensic IR without native binary execution.
                </div>
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

        .method.get {
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
