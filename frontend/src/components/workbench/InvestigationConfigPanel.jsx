import { Sliders, ShieldCheck, Database, CheckSquare, Square } from 'lucide-react';

const ALL_CAPABILITIES = [
  { id: 'process_list', name: 'process_list', linux: true, windows: true, desc: 'Running processes & execution metadata' },
  { id: 'system_info', name: 'system_info', linux: true, windows: true, desc: 'Host identity & operating system info' },
  { id: 'network_connections', name: 'network_connections', linux: true, windows: true, desc: 'Active network sockets & connections' },
  { id: 'users', name: 'users', linux: true, windows: true, desc: 'Local user & account information' },
  { id: 'auth_logs', name: 'auth_logs', linux: true, windows: true, desc: 'Authentication & login records' },
  { id: 'file_metadata', name: 'file_metadata', linux: true, windows: true, desc: 'File metadata & filesystem evidence' },
  { id: 'memory_snapshot', name: 'memory_snapshot', linux: true, windows: true, desc: 'Memory acquisition capability (Requires Kernel Access)' },
  { id: 'driver_scan', name: 'driver_scan', linux: false, windows: true, desc: 'Loaded driver/kernel module info' },
  { id: 'kernel_callbacks', name: 'kernel_callbacks', linux: false, windows: false, desc: 'Kernel callback inspection (Requires Kernel Access)' },
  { id: 'registry_hives', name: 'registry_hives', linux: false, windows: true, desc: 'Registry hive collection' },
];

export default function InvestigationConfigPanel({
  investigationName,
  onNameChange,
  operatorId,
  onOperatorChange,
  preset,
  onPresetChange,
  targetPlatform,
  onPlatformChange,
  evidenceFormat,
  onFormatChange,
  sealIntegrity,
  onSealChange,
  activeCapabilities,
  onToggleCapability
}) {
  return (
    <div className="panel-card config-panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <Sliders size={14} />
          <span>Investigation Configuration</span>
        </div>
        <span className="badge badge-info">{preset.toUpperCase()} PRESET</span>
      </div>

      <div className="panel-body">
        {/* Preset Selector Buttons */}
        <div className="form-group">
          <label className="form-label">Investigation Preset</label>
          <div className="preset-grid">
            {['fast', 'balanced', 'maximum', 'custom'].map((p) => (
              <button
                key={p}
                className={`preset-btn ${preset === p ? 'active' : ''}`}
                onClick={() => onPresetChange(p)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Metadata Inputs */}
        <div className="config-row">
          <div className="form-group flex-1">
            <label className="form-label">Investigation Name</label>
            <input
              type="text"
              className="form-input"
              value={investigationName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div className="form-group flex-1">
            <label className="form-label">Operator ID</label>
            <input
              type="text"
              className="form-input"
              value={operatorId}
              onChange={(e) => onOperatorChange(e.target.value)}
            />
          </div>
        </div>

        {/* Platform & Format */}
        <div className="config-row">
          <div className="form-group flex-1">
            <label className="form-label">Target Platform</label>
            <select
              className="form-select"
              value={targetPlatform}
              onChange={(e) => onPlatformChange(e.target.value)}
            >
              <option value="Linux">Linux Provider (x86_64)</option>
              <option value="Windows">Windows Provider (x64)</option>
            </select>
          </div>

          <div className="form-group flex-1">
            <label className="form-label">Evidence Output Format</label>
            <select
              className="form-select"
              value={evidenceFormat}
              onChange={(e) => onFormatChange(e.target.value)}
            >
              <option value="Canonical + STIX">Canonical JSON + STIX 2.1</option>
              <option value="Canonical">Canonical JSON Only</option>
              <option value="STIX 2.1">STIX 2.1 Bundle Only</option>
            </select>
          </div>
        </div>

        {/* Integrity Seal Checkbox */}
        <div className="seal-toggle-box">
          <label className="checkbox-label" onClick={() => onSealChange(!sealIntegrity)}>
            {sealIntegrity ? (
              <CheckSquare size={14} />
            ) : (
              <Square size={14} />
            )}
            <div className="toggle-text">
              <span className="toggle-title">Cryptographic Evidence Sealing (SHA-256)</span>
              <span className="toggle-desc">Generate integrity hashes and chain-of-custody seal.</span>
            </div>
          </label>
        </div>

        {/* Capability Selection Matrix */}
        <div className="form-group mt-2">
          <div className="matrix-header">
            <label className="form-label">
              <Database size={11} /> Capability Selection Matrix
            </label>
            <span className="cap-count">
              {activeCapabilities.length} / {ALL_CAPABILITIES.length} Selected
            </span>
          </div>

          <div className="cap-matrix-list">
            {ALL_CAPABILITIES.map((cap) => {
              const isSelected = activeCapabilities.includes(cap.id);
              const supportedByPlatform = targetPlatform === 'Linux' ? cap.linux : cap.windows;
              return (
                <div
                  key={cap.id}
                  className={`cap-item ${isSelected ? 'selected' : ''} ${!supportedByPlatform ? 'unsupported' : ''}`}
                  onClick={() => onToggleCapability(cap.id)}
                >
                  <div className="cap-item-left">
                    {isSelected ? (
                      <ShieldCheck size={13} />
                    ) : (
                      <Square size={13} />
                    )}
                    <span className="cap-name">{cap.name}</span>
                  </div>

                  <div className="cap-item-right">
                    {!supportedByPlatform && (
                      <span className="tag-unsupported">NOT ON {targetPlatform.toUpperCase()}</span>
                    )}
                    <span className="cap-desc">{cap.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .config-panel-card {
          height: 100%;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
        }

        .preset-btn {
          padding: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .preset-btn:hover {
          color: var(--text-primary);
          border-color: var(--accent);
        }

        .preset-btn.active {
          background: var(--bg-tertiary);
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .config-row {
          display: flex;
          gap: 10px;
        }

        .flex-1 { flex: 1; }
        .mt-2 { margin-top: 8px; }

        .seal-toggle-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 8px 10px;
          margin-bottom: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .toggle-text {
          display: flex;
          flex-direction: column;
        }

        .toggle-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .toggle-desc {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .matrix-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .cap-count {
          font-size: 10px;
          color: var(--text-secondary);
        }

        .cap-matrix-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 200px;
          overflow-y: auto;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 4px;
        }

        .cap-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 6px;
          background: transparent;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .cap-item:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-color);
        }

        .cap-item.selected {
          background: var(--bg-tertiary);
        }

        .cap-item.unsupported {
          opacity: 0.5;
        }

        .cap-item-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cap-name {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .cap-item-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cap-desc {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .tag-unsupported {
          font-size: 8.5px;
          color: var(--status-warning);
          border: 1px solid var(--border-color);
          padding: 1px 3px;
        }
      `}</style>
    </div>
  );
}
