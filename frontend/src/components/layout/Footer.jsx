import { Terminal, Shield, CheckCircle2 } from 'lucide-react';

export default function Footer({ currentStatus }) {
  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className="status-indicator">
          <Terminal size={11} />
          <span className="status-text">{currentStatus || 'Ready for investigation compile / pre-flight check'}</span>
        </div>
      </div>

      <div className="footer-right">
        <div className="footer-item">
          <Shield size={11} />
          <span>Integrity Seal Active</span>
        </div>
        <div className="footer-item border-left">
          <CheckCircle2 size={11} />
          <span>Mahoraga v1.0.0</span>
        </div>
      </div>

      <style>{`
        .app-footer {
          height: var(--footer-height);
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          font-size: 9.5px;
          color: var(--text-muted);
          z-index: 5;
        }

        .footer-left {
          display: flex;
          align-items: center;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-text {
          color: var(--text-secondary);
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .footer-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .border-left {
          border-left: 1px solid var(--border-color);
          padding-left: 10px;
        }
      `}</style>
    </footer>
  );
}
