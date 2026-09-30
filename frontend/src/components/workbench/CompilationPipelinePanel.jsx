import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Play,
  SkipForward,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

const KNOWN_CAPABILITIES = new Set([
  'process_list',
  'system_info',
  'network_connections',
  'users',
  'auth_logs',
]);

const BASE_STEPS = [
  {
    id: 'parse',
    title: 'Parse Jocky Source',
    description: 'Check investigation structure, braces and required evidence emission.',
    icon: Terminal,
    skippable: false,
  },
  {
    id: 'semantic',
    title: 'Semantic Validation',
    description: 'Resolve correlate references and basic investigation consistency.',
    icon: Check,
    skippable: false,
  },
  {
    id: 'capability',
    title: 'Capability Resolution',
    description: 'Resolve the configured read-only forensic capabilities.',
    icon: ShieldCheck,
    skippable: false,
  },
  {
    id: 'manifest',
    title: 'Build Runtime Manifest',
    description: 'Create the immutable workbench execution manifest.',
    icon: Fingerprint,
    skippable: false,
  },
  {
    id: 'hash',
    title: 'Apply Integrity Hash',
    description: 'SHA-256 the manifest before it enters the runtime workflow.',
    icon: Fingerprint,
    skippable: true,
  },
  {
    id: 'encrypt',
    title: 'Encrypt Runtime Envelope',
    description: 'Optional AES-256-GCM protection for the prepared runtime envelope.',
    icon: Lock,
    skippable: true,
  },
  {
    id: 'prepare',
    title: 'Prepare Runtime Artifact',
    description: 'Freeze the artifact so Step 04 can consume it deterministically.',
    icon: KeyRound,
    skippable: false,
  },
];

const toHex = (bytes) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(digest));
}

async function aesEncrypt(bytes) {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    bytes
  );

  return {
    algorithm: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    key: bytesToBase64(keyBytes),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export { base64ToBytes, bytesToBase64, sha256Hex };

export default function CompilationPipelinePanel({
  source,
  targetPlatform,
  activeCapabilities = [],
  preflightPassed,
  onReady,
  onStateChange,
}) {
  const [expanded, setExpanded] = useState(true);
  const [steps, setSteps] = useState(
    BASE_STEPS.map((step) => ({ ...step, status: 'idle', detail: '' }))
  );
  const [runningStep, setRunningStep] = useState(null);
  const [hashEnabled, setHashEnabled] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [artifact, setArtifact] = useState(null);
  const [error, setError] = useState('');

  const selectedCapabilities = useMemo(
    () => activeCapabilities.filter((cap) => KNOWN_CAPABILITIES.has(cap)),
    [activeCapabilities]
  );

  const updateStep = useCallback((stepId, patch) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, ...patch } : step
      )
    );
  }, []);

  const getFirstPending = useCallback(
    () => steps.find((step) => step.status === 'idle'),
    [steps]
  );

  const resetFrom = useCallback((index) => {
    setSteps((prev) =>
      prev.map((step, stepIndex) =>
        stepIndex >= index
          ? { ...BASE_STEPS[stepIndex], status: 'idle', detail: '' }
          : step
      )
    );
    setArtifact(null);
    setError('');
    onReady?.(null);
  }, [onReady]);

  const runStep = useCallback(
    async (stepId) => {
      if (runningStep) return;
      setError('');
      setRunningStep(stepId);
      updateStep(stepId, { status: 'running' });

      try {
        if (!preflightPassed) {
          throw new Error('Run the Step 02 pre-flight checks successfully first.');
        }

        const sourceText = source?.trim() || '';
        if (!sourceText) {
          throw new Error('Jocky source is empty.');
        }

        switch (stepId) {
          case 'parse': {
            const block = /(?:investigate|investigation)\s+(?:"[^"]+"|[A-Za-z0-9_-]+)\s*\{[\s\S]*\}/i.test(sourceText);
            const emitsEvidence = /\bemit\s+evidence\b/i.test(sourceText);
            if (!block || !emitsEvidence) {
              throw new Error('Expected an investigation block and "emit evidence".');
            }
            updateStep(stepId, {
              status: 'completed',
              detail: 'Source structure accepted; evidence emission is present.',
            });
            break;
          }

          case 'semantic': {
            const collections = [
              ...sourceText.matchAll(/\bcollect\s+([A-Za-z0-9_]+)/gi),
            ].map((match) => match[1]);
            const aliases = new Set(
              [...sourceText.matchAll(/\bcollect\s+([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)/gi)].map(
                (match) => match[2]
              )
            );
            const references = [
              ...sourceText.matchAll(/\bcorrelate\s+([A-Za-z0-9_]+)\s+with\s+([A-Za-z0-9_]+)/gi),
            ];
            const unresolved = references.flatMap((match) =>
              [match[1], match[2]].filter((value) => !aliases.has(value))
            );

            if (unresolved.length > 0) {
              throw new Error(
                `Unresolved correlate reference(s): ${[...new Set(unresolved)].join(', ')}`
              );
            }

            updateStep(stepId, {
              status: 'completed',
              detail: `${collections.length} collection operation(s); semantic references resolved.`,
            });
            break;
          }

          case 'capability': {
            if (selectedCapabilities.length === 0) {
              throw new Error('Select at least one supported forensic capability.');
            }

            updateStep(stepId, {
              status: 'completed',
              detail: `${selectedCapabilities.length} configured capability(ies) resolved for ${targetPlatform}.`,
            });
            break;
          }

          case 'manifest': {
            const manifest = {
              schema_version: 1,
              kind: 'mahoraga-workbench-runtime-manifest',
              target_platform: targetPlatform,
              capabilities: selectedCapabilities,
              source: sourceText,
              created_at: new Date().toISOString(),
            };
            const bytes = new TextEncoder().encode(JSON.stringify(manifest));

            setArtifact((prev) => ({
              ...(prev || {}),
              manifest,
              manifestBytes: bytes,
            }));

            updateStep(stepId, {
              status: 'completed',
              detail: `${bytes.byteLength} bytes prepared in canonical JSON form.`,
            });
            break;
          }

          case 'hash': {
            if (!hashEnabled) {
              updateStep(stepId, {
                status: 'skipped',
                detail: 'Integrity hash disabled by operator.',
              });
              break;
            }

            const current = steps.find((step) => step.id === 'manifest');
            if (current?.status !== 'completed') {
              throw new Error('Build the runtime manifest before hashing it.');
            }

            const bytes = artifact?.manifestBytes;
            if (!bytes) {
              throw new Error('Prepared manifest bytes are unavailable.');
            }

            const hash = await sha256Hex(bytes);
            setArtifact((prev) => ({ ...(prev || {}), sourceHash: hash }));
            updateStep(stepId, {
              status: 'completed',
              detail: `SHA-256 ${hash.slice(0, 20)}…`,
            });
            break;
          }

          case 'encrypt': {
            if (!encryptionEnabled) {
              updateStep(stepId, {
                status: 'skipped',
                detail: 'Encryption disabled by operator.',
              });
              break;
            }

            const bytes = artifact?.manifestBytes;
            if (!bytes) {
              throw new Error('Prepared manifest bytes are unavailable.');
            }

            const encrypted = await aesEncrypt(bytes);
            setArtifact((prev) => ({ ...(prev || {}), encrypted }));
            updateStep(stepId, {
              status: 'completed',
              detail: `${encrypted.algorithm} runtime envelope created in memory.`,
            });
            break;
          }

          case 'prepare': {
            const current = artifact || {};
            if (!current.manifest) {
              throw new Error('Runtime manifest is not ready.');
            }

            const prepared = {
              ...current,
              protection: {
                hash: hashEnabled ? 'SHA-256' : 'DISABLED',
                encryption: encryptionEnabled ? 'AES-256-GCM' : 'DISABLED',
              },
            };

            setArtifact(prepared);
            updateStep(stepId, {
              status: 'completed',
              detail: 'Artifact locked for Step 04 execution.',
            });

            onReady?.(prepared);
            onStateChange?.(steps);
            break;
          }

          default:
            break;
        }
      } catch (stepError) {
        const message = stepError instanceof Error ? stepError.message : String(stepError);
        updateStep(stepId, { status: 'failed', detail: message });
        setError(message);
      } finally {
        setRunningStep(null);
      }
    }, [
      activeCapabilities,
      artifact,
      encryptionEnabled,
      hashEnabled,
      onReady,
      onStateChange,
      preflightPassed,
      runningStep,
      selectedCapabilities,
      source,
      steps,
      targetPlatform,
      updateStep,
    ]
  );

  const skipStep = (stepId) => {
    if (runningStep) return;
    const step = steps.find((item) => item.id === stepId);
    if (!step?.skippable) return;

    if (stepId === 'hash') {
      setHashEnabled(false);
    }
    if (stepId === 'encrypt') {
      setEncryptionEnabled(false);
    }

    updateStep(stepId, {
      status: 'skipped',
      detail: 'Skipped by operator.',
    });
  };

  const compiled = steps.find((step) => step.id === 'prepare')?.status === 'completed';
  const firstPending = getFirstPending();

  return (
    <div className="panel-card staged-pipeline-card">
      <div className="panel-header">
        <div className="panel-title">
          <Terminal size={14} />
          <span>COMPILATION</span>
        </div>

        <div className="staged-header-right">
          <span className={`badge ${compiled ? 'badge-emerald' : 'badge-warning'}`}>
            {compiled ? 'ARTIFACT READY' : preflightPassed ? 'READY' : 'LOCKED'}
          </span>
          <button
            className="icon-button"
            onClick={() => setExpanded((value) => !value)}
            aria-label="Toggle compilation details"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="panel-body font-mono">
          <div className="staged-toolbar">
            <div>
              <span className="toolbar-label">PROTECTION PROFILE</span>
              <span className="toolbar-value">
                {hashEnabled ? 'SHA-256' : 'NO HASH'} · {encryptionEnabled ? 'AES-256-GCM' : 'NO ENCRYPTION'}
              </span>
            </div>
            <button
              className="btn btn-primary compact-btn"
              onClick={() => firstPending && runStep(firstPending.id)}
              disabled={!firstPending || runningStep || !preflightPassed}
            >
              {runningStep ? <Loader2 size={11} className="spin" /> : <Play size={11} />}
              {runningStep ? 'WORKING…' : 'RUN NEXT'}
            </button>
          </div>

          <div className="protection-controls">
            <label className="protection-option">
              <input
                type="checkbox"
                checked={hashEnabled}
                disabled={steps.find((step) => step.id === 'hash')?.status !== 'idle'}
                onChange={(event) => {
                  setHashEnabled(event.target.checked);
                  if (!event.target.checked) {
                    resetFrom(4);
                  }
                }}
              />
              <Fingerprint size={12} />
              <span>SHA-256 integrity</span>
            </label>

            <label className="protection-option">
              <input
                type="checkbox"
                checked={encryptionEnabled}
                disabled={steps.find((step) => step.id === 'encrypt')?.status !== 'idle'}
                onChange={(event) => {
                  setEncryptionEnabled(event.target.checked);
                  if (!event.target.checked) {
                    resetFrom(5);
                  }
                }}
              />
              <Lock size={12} />
              <span>AES-256-GCM envelope</span>
            </label>
          </div>

          <div className="staged-steps">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = runningStep === step.id;
              const isFirstPending = firstPending?.id === step.id;
              const terminalState = ['completed', 'skipped', 'failed'].includes(step.status);

              return (
                <div
                  key={step.id}
                  className={`staged-step staged-${step.status}`}
                >
                  <div className="staged-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="staged-icon">
                    {isActive ? (
                      <Loader2 size={11} className="spin" />
                    ) : step.status === 'completed' ? (
                      <Check size={11} />
                    ) : step.status === 'skipped' ? (
                      <SkipForward size={11} />
                    ) : step.status === 'failed' ? (
                      <Circle size={9} />
                    ) : (
                      <Icon size={11} />
                    )}
                  </div>

                  <div className="staged-main">
                    <div className="staged-title-row">
                      <span className="staged-title">{step.title}</span>
                      <span className="staged-status">
                        {isActive
                          ? 'RUNNING'
                          : step.status === 'completed'
                            ? 'DONE'
                            : step.status === 'skipped'
                              ? 'SKIPPED'
                              : step.status === 'failed'
                                ? 'FAILED'
                                : isFirstPending
                                  ? 'NEXT'
                                  : 'WAITING'}
                      </span>
                    </div>
                    <div className="staged-description">{step.description}</div>
                    {step.detail && <div className="staged-detail">{step.detail}</div>}
                  </div>

                  {!terminalState && (
                    <div className="staged-actions">
                      <button
                        className="step-action"
                        onClick={() => runStep(step.id)}
                        disabled={!isFirstPending || runningStep || !preflightPassed}
                      >
                        RUN
                      </button>

                      {step.skippable && (
                        <button
                          className="step-action muted-action"
                          onClick={() => skipStep(step.id)}
                          disabled={!isFirstPending || runningStep}
                        >
                          SKIP
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && <div className="staged-error">[!] {error}</div>}

          {artifact?.sourceHash && (
            <div className="staged-artifact">
              <span>ARTIFACT SHA-256</span>
              <code>{artifact.sourceHash}</code>
            </div>
          )}

          <div className="staged-note">
            These steps are the Workbench-controlled preparation flow. The existing CMI compiler remains the authoritative backend compiler when Step 04 invokes native provider execution.
          </div>
        </div>
      )}

      <style>{`
        .staged-pipeline-card {
          overflow: hidden;
        }
        .staged-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          cursor: pointer;
        }
        .icon-button:hover {
          color: var(--text-primary);
          border-color: var(--accent);
        }
        .compact-btn {
          min-height: 26px;
          padding: 4px 10px;
          font-size: 9px;
        }
        .staged-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          margin-bottom: 8px;
        }
        .toolbar-label {
          display: block;
          color: var(--text-muted);
          font-size: 8px;
          letter-spacing: .8px;
        }
        .toolbar-value {
          display: block;
          margin-top: 2px;
          color: var(--text-primary);
          font-size: 10px;
          font-weight: 600;
        }
        .protection-controls {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .protection-option {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 9.5px;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .protection-option input {
          accent-color: var(--accent);
        }
        .staged-steps {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
        }
        .staged-step {
          display: grid;
          grid-template-columns: 24px 22px minmax(0, 1fr) auto;
          gap: 7px;
          align-items: center;
          padding: 8px 10px;
          border-bottom: 1px solid rgba(51, 51, 51, .4);
          background: var(--bg-primary);
        }
        .staged-step:last-child {
          border-bottom: none;
        }
        .staged-index {
          color: var(--text-muted);
          font-size: 8px;
          text-align: right;
        }
        .staged-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .staged-main {
          min-width: 0;
        }
        .staged-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .staged-title {
          color: var(--text-primary);
          font-size: 10.5px;
          font-weight: 600;
        }
        .staged-status {
          margin-left: auto;
          color: var(--text-muted);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .55px;
        }
        .staged-description,
        .staged-detail {
          margin-top: 2px;
          color: var(--text-muted);
          font-size: 8.5px;
          line-height: 1.35;
        }
        .staged-detail {
          color: var(--text-secondary);
        }
        .staged-actions {
          display: flex;
          gap: 4px;
        }
        .step-action {
          padding: 3px 7px;
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .step-action:hover:not(:disabled) {
          color: var(--text-primary);
          border-color: var(--accent);
        }
        .step-action:disabled {
          opacity: .35;
          cursor: not-allowed;
        }
        .muted-action {
          color: var(--text-muted);
        }
        .staged-completed .staged-icon,
        .staged-completed .staged-status {
          color: var(--status-success);
        }
        .staged-skipped {
          background: rgba(128, 128, 128, .04);
        }
        .staged-skipped .staged-icon {
          color: var(--text-muted);
        }
        .staged-failed {
          background: rgba(211, 47, 47, .06);
        }
        .staged-failed .staged-icon,
        .staged-failed .staged-status,
        .staged-error {
          color: var(--status-error);
        }
        .staged-running {
          background: rgba(245, 124, 0, .06);
        }
        .staged-running .staged-icon,
        .staged-running .staged-status {
          color: var(--status-warning);
        }
        .staged-artifact {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
          padding: 7px 9px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }
        .staged-artifact span {
          color: var(--text-muted);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .7px;
        }
        .staged-artifact code {
          color: var(--text-secondary);
          font-size: 8px;
          word-break: break-all;
        }
        .staged-error {
          margin-top: 8px;
          padding: 7px 9px;
          border-left: 2px solid var(--status-error);
          background: rgba(211, 47, 47, .06);
          font-size: 9px;
        }
        .staged-note {
          margin-top: 8px;
          padding: 7px 9px;
          border-left: 2px solid var(--border-color);
          color: var(--text-muted);
          background: var(--bg-secondary);
          font-size: 8.5px;
          line-height: 1.45;
        }
        @media (max-width: 680px) {
          .staged-step {
            grid-template-columns: 22px 20px minmax(0, 1fr);
          }
          .staged-actions {
            grid-column: 3;
            justify-content: flex-start;
            margin-top: 4px;
          }
          .staged-status {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
