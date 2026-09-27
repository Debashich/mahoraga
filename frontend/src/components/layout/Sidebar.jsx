import { 
  ShieldAlert, 
  Terminal, 
  FolderLock, 
  Radar, 
  Server, 
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeRoute, onNavigate, collapsed, onToggleCollapse }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, desc: 'Overview & Status' },
    { id: 'workbench', label: 'Jocky Workbench', icon: Terminal, desc: 'DSL Compiler & IDE' },
    { id: 'evidence', label: 'Evidence Vault', icon: FolderLock, desc: 'Sealing & Hashes' },
    { id: 'detection', label: 'STIX 2.1 Engine', icon: Radar, desc: 'PLTL Threat Hunting' },
    { id: 'cmi', label: 'CMI Backend', icon: Server, desc: 'API & Provider' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-logo">
          <ShieldAlert className="brand-icon" size={20} />
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">MAHORAGA</span>
              <span className="brand-tag">FORENSIC COMPILER</span>
            </div>
          )}
        </div>
        <button 
          className="collapse-btn" 
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-title">NAVIGATION</div>}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className="nav-icon" />
              {!collapsed && (
                <div className="nav-label-container">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.desc}</span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="system-health">
            <span className="health-dot" />
            <span className="health-text">PIPELINE READY</span>
          </div>
          <div className="cmi-status-mini">
            <span>CMI API: </span>
            <span className="text-warning">DEMO MODE</span>
          </div>
        </div>
      )}

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          transition: width 0.2s ease;
          z-index: 10;
          user-select: none;
        }

        .sidebar.collapsed {
          width: 56px;
        }

        .sidebar-header {
          height: var(--header-height);
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .brand-icon {
          color: var(--text-primary);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 2px;
          color: var(--text-primary);
        }

        .brand-tag {
          font-size: 8.5px;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }

        .collapse-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          cursor: pointer;
          padding: 3px;
          border-radius: 0px;
          display: flex;
          align-items: center;
        }

        .collapse-btn:hover {
          border-color: var(--accent);
          background: var(--bg-tertiary);
        }

        .sidebar-nav {
          flex: 1;
          padding: 10px 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .nav-section-title {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 1px;
          padding: 4px 6px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-color: var(--border-color);
        }

        .nav-item.active {
          background: var(--bg-tertiary);
          border-color: var(--border-color);
          border-left: 3px solid var(--accent);
          color: var(--text-primary);
        }

        .nav-icon {
          flex-shrink: 0;
        }

        .nav-label-container {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .nav-label {
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-desc {
          font-size: 9.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-footer {
          padding: 10px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
          font-size: 9.5px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .system-health {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
        }

        .health-dot {
          width: 6px;
          height: 6px;
          background: var(--status-success);
        }

        .cmi-status-mini {
          color: var(--text-muted);
        }

        .text-warning {
          color: var(--status-warning);
          font-weight: 600;
        }
      `}</style>
    </aside>
  );
}
