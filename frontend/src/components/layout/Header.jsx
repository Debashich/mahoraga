import { Cpu, Server, Sliders, WifiOff, Wifi } from 'lucide-react';

export default function Header({ 
  activeRoute, 
  targetPlatform, 
  onPlatformChange, 
  preset, 
  onPresetChange, 
  cmiConnected 
}) {
  const pageTitles = {
    dashboard: 'System Dashboard & Pipeline Overview',
    workbench: 'Jocky Compiler & Investigation Workbench',
    evidence: 'Cryptographic Evidence Vault',
    detection: 'STIX 2.1 & PLTL Detection Engine',
    cmi: 'CMI Backend Configuration',
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="page-title">{pageTitles[activeRoute] || 'Mahoraga Workbench'}</h1>
        <div className="breadcrumb">
          <span>mahoraga</span> / <span className="current">{activeRoute}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Target Platform Selector */}
        <div className="header-control">
          <label className="control-label">
            <Cpu size={12} /> Platform:
          </label>
          <select 
            className="control-select"
            value={targetPlatform}
            onChange={(e) => onPlatformChange(e.target.value)}
          >
            <option value="Linux">Linux (x86_64)</option>
            <option value="Windows">Windows (x64)</option>
          </select>
        </div>

        {/* Preset Selector */}
        <div className="header-control">
          <label className="control-label">
            <Sliders size={12} /> Preset:
          </label>
          <select 
            className="control-select"
            value={preset}
            onChange={(e) => onPresetChange(e.target.value)}
          >
            <option value="fast">Fast Triage</option>
            <option value="balanced">Balanced Sweep</option>
            <option value="maximum">Maximum Scope</option>
            <option value="custom">Custom Operator</option>
          </select>
        </div>

        {/* CMI API Status Badge */}
        <div className="header-status">
          <div className={`cmi-badge badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{cmiConnected ? "CMI LIVE (CONNECTED)" : "CMI OFFLINE"}</span>
          </div>
        </div>

        {/* Provider Tag */}
        <div className="header-provider">
          <Server size={12} />
          <span>{targetPlatform === 'Linux' ? 'Linux Provider' : 'Windows Provider'}</span>
        </div>
      </div>

      <style>{`
        .app-header {
          height: var(--header-height);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 5;
        }

        .header-left {
          display: flex;
          flex-direction: column;
        }

        .page-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.5px;
        }

        .breadcrumb {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .breadcrumb .current {
          color: var(--text-primary);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-control {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-primary);
          padding: 3px 6px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .control-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-secondary);
        }

        .control-select {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 10.5px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .control-select option {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .cmi-badge {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .header-provider {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-secondary);
          padding: 3px 6px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
        }
      `}</style>
    </header>
  );
}
