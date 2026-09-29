import { useEffect, useRef, useState } from 'react';

import {
  Code2,
  Play,
  PlusCircle,
  Check,
  Loader2,
  GitCommit,
  Monitor,
  ChevronDown,
  Upload,
} from 'lucide-react';

const CAPABILITY_OPTIONS = [
  {
    id: 'process_list',
    alias: 'procs',
    desc: 'Process execution & metadata',
  },
  {
    id: 'system_info',
    alias: 'sys',
    desc: 'Host identity & OS details',
  },
  {
    id: 'network_connections',
    alias: 'conns',
    desc: 'Sockets & network links',
  },
  {
    id: 'users',
    alias: 'local_users',
    desc: 'User accounts & privileges',
  },
  {
    id: 'auth_logs',
    alias: 'auth',
    desc: 'Login & authentication events',
  },
  {
    id: 'file_metadata',
    alias: 'files',
    desc: 'FileSystem evidence & hashes',
  },
  {
    id: 'memory_snapshot',
    alias: 'mem',
    desc: 'Process memory acquisition',
  },
  {
    id: 'driver_scan',
    alias: 'drivers',
    desc: 'Kernel driver module scan',
  },
];

export default function JockyEditorPanel({
  source,
  onChangeSource,
  onRunPreflight,
  onRunInvestigation,
  isOrchestrating,
}) {
  const [sourceMenu, setSourceMenu] = useState(null);

  const [demoFiles, setDemoFiles] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState('');

  const [githubUrl, setGithubUrl] = useState('');
  const [githubFiles, setGithubFiles] = useState([]);
  const [selectedGithubFile, setSelectedGithubFile] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);

  const [sourceStatus, setSourceStatus] = useState('');
  const [insertedFeedback, setInsertedFeedback] = useState('');

  const fileInputRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Demo source
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadDemoFiles = async () => {
      try {
        const response = await fetch('/api/v1/examples');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const files = Array.isArray(data.files)
          ? data.files
              .filter(
                (file) =>
                  typeof file === 'string' &&
                  file.toLowerCase().endsWith('.jocky')
              )
              .sort((a, b) => a.localeCompare(b))
          : [];

        if (!cancelled) {
          setDemoFiles(files);
          if (files.length > 0) {
            setSelectedDemo(files[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load Jocky examples:', error);
        if (!cancelled) {
          setDemoFiles([]);
        }
      }
    };

    loadDemoFiles();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadDemo = async (filename) => {
    if (!filename) return;

    try {
      setSourceStatus(`Loading ${filename}...`);

      const response = await fetch(
        `/api/v1/examples/${encodeURIComponent(filename)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      onChangeSource(data.source || '');
      setSelectedDemo(filename);
      setSourceStatus(`Loaded demo: ${filename}`);
      setSourceMenu(null);

      window.setTimeout(() => setSourceStatus(''), 2500);
    } catch (error) {
      console.error('Failed to load demo:', error);
      setSourceStatus(`Failed to load ${filename}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Device source
  // ---------------------------------------------------------------------------

  const handleDeviceFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.jocky')) {
      setSourceStatus('Please select a .jocky file.');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();

      onChangeSource(text);
      setSourceStatus(`Loaded from device: ${file.name}`);

      window.setTimeout(() => setSourceStatus(''), 2500);
    } catch (error) {
      console.error('Failed to read local Jocky file:', error);
      setSourceStatus(`Failed to read ${file.name}`);
    }

    event.target.value = '';
  };

  // ---------------------------------------------------------------------------
  // GitHub source
  // ---------------------------------------------------------------------------

  const parseGithubUrl = (url) => {
    try {
      const parsed = new URL(url.trim());

      if (parsed.hostname.toLowerCase() !== 'github.com') {
        return null;
      }

      const parts = parsed.pathname
        .replace(/^\/+|\/+$/g, '')
        .split('/');

      if (parts.length < 2) return null;

      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, '');

      if (!owner || !repo) return null;

      return { owner, repo };
    } catch {
      return null;
    }
  };

  const handleGithubImport = async () => {
    const repoInfo = parseGithubUrl(githubUrl);

    if (!repoInfo) {
      setSourceStatus('Enter a valid public GitHub repository URL.');
      return;
    }

    setGithubLoading(true);
    setGithubFiles([]);
    setSelectedGithubFile('');

    try {
      const repoResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`
      );

      if (!repoResponse.ok) {
        throw new Error(
          `Repository not found or GitHub API returned ${repoResponse.status}.`
        );
      }

      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch;

      const treeResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${encodeURIComponent(
          defaultBranch
        )}?recursive=1`
      );

      if (!treeResponse.ok) {
        throw new Error(
          `Could not read repository tree (${treeResponse.status}).`
        );
      }

      const treeData = await treeResponse.json();

      const files = Array.isArray(treeData.tree)
        ? treeData.tree
            .filter(
              (item) =>
                item.type === 'blob' &&
                typeof item.path === 'string' &&
                item.path.toLowerCase().endsWith('.jocky')
            )
            .map((item) => item.path)
            .sort((a, b) => a.localeCompare(b))
        : [];

      if (files.length === 0) {
        setSourceStatus('No .jocky files found in this repository.');
        return;
      }

      setGithubFiles(files);
      setSourceStatus(
        `Found ${files.length} Jocky file${files.length === 1 ? '' : 's'}.`
      );
    } catch (error) {
      console.error('GitHub import failed:', error);
      setSourceStatus(
        error.message || 'Failed to import GitHub repository.'
      );
    } finally {
      setGithubLoading(false);
    }
  };

  const handleLoadGithubFile = async (path) => {
    if (!path) return;

    const repoInfo = parseGithubUrl(githubUrl);

    if (!repoInfo) return;

    try {
      setSourceStatus(`Loading ${path}...`);

      const repoResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`
      );

      if (!repoResponse.ok) {
        throw new Error(
          `Repository metadata unavailable (${repoResponse.status}).`
        );
      }

      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch;

      const rawUrl =
        `https://raw.githubusercontent.com/` +
        `${repoInfo.owner}/${repoInfo.repo}/` +
        `${encodeURIComponent(defaultBranch)}/` +
        `${path
          .split('/')
          .map((part) => encodeURIComponent(part))
          .join('/')}`;

      const fileResponse = await fetch(rawUrl);

      if (!fileResponse.ok) {
        throw new Error(`Could not load ${path} (${fileResponse.status}).`);
      }

      const text = await fileResponse.text();

      onChangeSource(text);
      setSelectedGithubFile(path);
      setSourceStatus(`Loaded from GitHub: ${path}`);
      setSourceMenu(null);

      window.setTimeout(() => setSourceStatus(''), 2500);
    } catch (error) {
      console.error('Failed to load GitHub Jocky file:', error);
      setSourceStatus(error.message || `Failed to load ${path}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Capability insertion
  // ---------------------------------------------------------------------------

  const handleInsertCapability = (cap) => {
    const statement = `    collect ${cap.id} as ${cap.alias}\n`;

    if (source.includes(`collect ${cap.id}`)) {
      setInsertedFeedback(`Already collected: ${cap.id}`);

      window.setTimeout(() => {
        setInsertedFeedback('');
      }, 2000);

      return;
    }

    const match = source.match(/investigation\s+"[^"]+"\s*\{/);

    if (match) {
      const idx = match.index + match[0].length;

      const newSource =
        source.slice(0, idx) +
        '\n' +
        statement +
        source.slice(idx);

      onChangeSource(newSource);
    } else {
      onChangeSource(source + '\n' + statement);
    }

    setInsertedFeedback(`Inserted: collect ${cap.id}`);

    window.setTimeout(() => {
      setInsertedFeedback('');
    }, 2000);
  };

  const lineCount = source.split('\n').length;
  const charCount = source.length;

  return (
    <div className="panel-card jocky-editor-card">
      <div className="panel-header">
        <div className="panel-title">
          <Code2 size={14} />
          <span>Jocky DSL Editor</span>
        </div>

        
        <div className="editor-actions">
          
          {/* Demo */}
          <div className="source-menu">
            <button
              className="btn source-btn"
              onClick={() =>
                setSourceMenu(sourceMenu === 'demo' ? null : 'demo')
              }
              disabled={isOrchestrating}
              type="button"
            >
              <Code2 size={12} />
              Demo
              <ChevronDown size={11} />
            </button>

            {sourceMenu === 'demo' && (
              <div className="source-popover">
                <div className="popover-title">Jocky Demo Files</div>

                {demoFiles.length === 0 ? (
                  <div className="popover-empty">
                    No .jocky examples found.
                  </div>
                ) : (
                  demoFiles.map((file) => (
                    <button
                      key={file}
                      className={`source-option ${
                        selectedDemo === file ? 'active' : ''
                      }`}
                      onClick={() => handleLoadDemo(file)}
                      type="button"
                    >
                      <Code2 size={11} />
                      <span>{file}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Device */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jocky"
            onChange={handleDeviceFile}
            style={{ display: 'none' }}
          />

          <button
            className="btn source-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isOrchestrating}
            title="Load a .jocky file from this device"
            type="button"
          >
            <Monitor size={12} />
            Device
          </button>

          {/* GitHub */}
          <div className="source-menu">
            <button
              className="btn source-btn"
              onClick={() =>
                setSourceMenu(sourceMenu === 'github' ? null : 'github')
              }
              disabled={isOrchestrating}
              type="button"
            >
              <Code2 size={12} />
              GitHub
              <ChevronDown size={11} />
            </button>

            {sourceMenu === 'github' && (
              <div className="source-popover github-popover">
                <div className="popover-title">
                  Import Jocky from GitHub
                </div>

                <div className="github-input-row">
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    disabled={githubLoading}
                  />

                  <button
                    className="btn btn-primary"
                    onClick={handleGithubImport}
                    disabled={githubLoading}
                    type="button"
                  >
                    {githubLoading ? (
                      <Loader2 size={12} className="spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    Import
                  </button>
                </div>

                {githubFiles.length > 0 && (
                  <div className="github-file-list">
                    <div className="popover-subtitle">Jocky files found</div>

                    {githubFiles.map((file) => (
                      <button
                        key={file}
                        className={`source-option ${
                          selectedGithubFile === file ? 'active' : ''
                        }`}
                        onClick={() => handleLoadGithubFile(file)}
                        type="button"
                      >
                        <Code2 size={11} />
                        <span>{file}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pre-flight */}
          <button
            className="btn"
            onClick={onRunPreflight}
            disabled={isOrchestrating}
            type="button"
          >
            <Play size={12} />
            Pre-Flight
          </button>

          {/* Run */}
          <button
            className="btn btn-primary"
            onClick={onRunInvestigation}
            disabled={isOrchestrating}
            type="button"
          >
            {isOrchestrating ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <GitCommit size={12} />
            )}

            {isOrchestrating ? 'Running...' : 'Run Investigation'}
          </button>
        </div>
      </div>

      {sourceStatus && (
        <div className="source-status">
          <Check size={10} />
          <span>{sourceStatus}</span>
        </div>
      )}

      <div className="editor-quickbar">
        <span className="quickbar-label">INSERT CAPABILITY:</span>

        <div className="capability-chips">
          {CAPABILITY_OPTIONS.map((cap) => (
            <button
              key={cap.id}
              className="cap-chip"
              onClick={() => handleInsertCapability(cap)}
              title={cap.desc}
              disabled={isOrchestrating}
              type="button"
            >
              <PlusCircle size={10} />
              <span>{cap.id}</span>
            </button>
          ))}
        </div>

        {insertedFeedback && (
          <span className="feedback-tag">
            <Check size={10} />
            {insertedFeedback}
          </span>
        )}
      </div>

      <div className="editor-container">
        <div className="line-numbers">
          {Array.from({ length: lineCount }).map((_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>

        <textarea
          className="editor-textarea"
          value={source}
          onChange={(e) => onChangeSource(e.target.value)}
          placeholder="// Type Jocky DSL source code here..."
          spellCheck={false}
          readOnly={isOrchestrating}
        />
      </div>

      <div className="editor-footer">
        <span>
          Lines: {lineCount} | Chars: {charCount}
        </span>

        <span className="lang-tag">Syntax: Jocky DSL v1</span>
      </div>

      <style>{`
        .jocky-editor-card {
          height: 100%;
          min-height: 560px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: visible;
        }

        .editor-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .source-menu {
          position: relative;
        }

        .source-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .source-popover {
          position: absolute;
          top: calc(100% + 5px);
          right: 0;
          z-index: 1000;
          min-width: 230px;
          max-width: 360px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          padding: 6px;
        }

        .github-popover {
          width: 390px;
          max-width: min(390px, calc(100vw - 32px));
        }

        .popover-title {
          padding: 6px 7px;
          margin-bottom: 4px;
          color: var(--text-primary);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border-color);
        }

        .popover-subtitle {
          padding: 6px 7px 4px;
          color: var(--text-muted);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .popover-empty {
          padding: 10px 8px;
          color: var(--text-muted);
          font-size: 10px;
        }

        .source-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 10.5px;
          text-align: left;
          cursor: pointer;
        }

        .source-option:hover,
        .source-option.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .source-option span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .github-input-row {
          display: flex;
          gap: 5px;
          padding: 5px;
        }

        .github-input-row input {
          flex: 1;
          min-width: 0;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 6px 7px;
          font-size: 10px;
          outline: none;
        }

        .github-input-row input:focus {
          border-color: var(--accent);
        }

        .github-file-list {
          border-top: 1px solid var(--border-color);
          margin-top: 4px;
          padding-top: 2px;
          max-height: 220px;
          overflow-y: auto;
        }

        .source-status {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 9.5px;
          min-height: 22px;
        }

        .editor-quickbar {
          padding: 7px 10px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          flex-shrink: 0;
        }

        .quickbar-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .capability-chips {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .cap-chip {
          display: flex;
          align-items: center;
          gap: 3px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 3px 7px;
          border-radius: 0;
          font-size: 10px;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .cap-chip:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .cap-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .feedback-tag {
          font-size: 10px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
        }

        .editor-container {
          flex: 1 1 auto;
          min-height: 360px;
          display: flex;
          background: var(--bg-primary);
          font-size: 12.5px;
          line-height: 1.6;
          overflow: hidden;
          position: relative;
        }

        .line-numbers {
          padding: 12px 8px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          text-align: right;
          user-select: none;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-color);
          min-width: 38px;
          font-size: 11px;
          flex-shrink: 0;
        }

        .line-numbers span {
          height: 20px;
          line-height: 20px;
        }

        .editor-textarea {
          flex: 1 1 auto;
          width: 100%;
          min-width: 0;
          min-height: 100%;
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 12px 14px;
          font-size: 12.5px;
          line-height: 20px;
          resize: none;
          outline: none;
          white-space: pre;
          overflow-wrap: normal;
          overflow: auto;
          tab-size: 2;
        }

        .editor-textarea::selection {
          background: rgba(120, 120, 255, 0.22);
        }

        .editor-footer {
          padding: 5px 10px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 9.5px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .lang-tag {
          color: var(--text-secondary);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .jocky-editor-card {
            min-height: 500px;
          }

          .panel-header {
            align-items: flex-start;
          }

          .editor-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .github-popover {
            position: fixed;
            top: 64px;
            right: 16px;
            left: 16px;
            width: auto;
          }

          .source-popover {
            max-width: calc(100vw - 32px);
          }

          .editor-quickbar {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
