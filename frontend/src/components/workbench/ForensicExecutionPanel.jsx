import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Cpu,
  Loader2,
  Lock,
  Play,
  SkipForward,
} from 'lucide-react';

import { base64ToBytes, sha256Hex } from './CompilationPipelinePanel';
import { orchestrateInvestigation } from '../../utils/cmiClient';

const KNOWN_CAPABILITIES = [
  'process_list',
  'system_info',
  'network_connections',
  'users',
  'auth_logs',
];

const STEPS = [
  {
    id: 'load',
    title: 'Load Prepared Artifact',
    description: 'Bring the Step 03 runtime envelope into the execution session.',
    skippable: false,
  },
  {
    id: 'verify',
    title: 'Verify Integrity',
    description: 'Recompute the SHA-256 manifest hash when integrity is enabled.',
    skippable: true,
  },
  {
    id: 'memory',
    title: 'Load Into Memory',
    description: 'Materialize the prepared runtime bytes in a temporary memory buffer.',
    skippable: false,
  },
  {
    id: 'decrypt',
    title: 'Decrypt In Memory',
    description: 'Decrypt the runtime envelope in memory when encryption was enabled.',
    skippable: true,
  },
  {
    id: 'deserialize',
    title: 'Deserialize / Validate Runtime IR',
    description: 'Recover and validate the serialized investigation manifest.',
    skippable: false,
  },
  {
    id: 'provider',
    title: 'Resolve Native Provider',
    description: 'Confirm the configured target/provider before authoritative execution.',
    skippable: false,
  },
  {
    id: 'execute',
    title: 'Execute Forensic Providers',
    description: 'Invoke the existing CMI backend for the authoritative native investigation run.',
    skippable: false,
  },
  {
    id: 'release',
    title: 'Release Runtime Buffer',
    description: 'Zeroize temporary client-side runtime bytes and close the staged session.',
    skippable: false,
  },
];

const makeSteps = () =>
  STEPS.map((step) => ({
    ...step,
    status: 'idle',
    detail: '',
    output: null,
  }));

const makeId = (prefix) => {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid.slice(0, 12)}`;
};

const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const shortHash = (value) =>
  value ? `${value.slice(0, 16)}…${value.slice(-10)}` : '—';

const timestamp = () => new Date().toLocaleString();

function OutputGrid({ rows }) {
  return (
    <div className="execution-output-box">
      <div className="execution-output-label">OUTPUT / PROOF</div>
      <div className="execution-output-grid">
        {rows.map(([label, value], index) => (
          <div className="execution-output-row" key={`${label}-${index}`}>
            <span className="execution-output-key">{label}</span>
            <span className="execution-output-value">{value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeProof({ title, value }) {
  if (!value) return null;
  return (
    <div className="execution-proof-box">
      <div className="execution-proof-title">{title}</div>
      <code>{value}</code>
    </div>
  );
}

function ResultOutput({ result }) {
  if (!result) return null;

  const data = result.data || {};
  const evidence = data.evidence || {};
  const stix = data.stix_bundle || {};
  const stages = Array.isArray(result.pipeline_stages)
    ? result.pipeline_stages
    : [];

  const stageSummary = stages.length
    ? stages
        .map((stage) => `${stage.stage}:${String(stage.status || '').toUpperCase()}`)
        .join(' · ')
    : 'Backend stage telemetry unavailable';

  return (
    <div className="execution-result-stack">
      <OutputGrid
        rows={[
          ['CMI status', result.success ? 'COMPLETED' : 'FAILED'],
          ['Investigation ID', data.investigation_id || '—'],
          ['Target platform', data.target_platform || '—'],
          ['Artifacts sealed', data.sealed_artifacts_count ?? evidence.artifacts_count ?? '—'],
          ['STIX objects', data.stix_objects_count ?? stix.objects_count ?? '—'],
          ['STIX findings', data.stix_findings_count ?? stix.findings_count ?? '—'],
          ['Evidence SHA-256', evidence.file_sha256 ? shortHash(evidence.file_sha256) : '—'],
          ['Backend stages', stageSummary],
        ]}
      />

      {evidence.file_path && (
        <CodeProof title="SEALED EVIDENCE FILE" value={evidence.file_path} />
      )}
      {stix.file_path && <CodeProof title="STIX BUNDLE" value={stix.file_path} />}
    </div>
  );
}

export default function ForensicExecutionPanel({
  compiledArtifact,
  cmiConnected,
  targetPlatform,
  onExecutionComplete,
}) {
  const [expanded, setExpanded] = useState(true);
  const [steps, setSteps] = useState(makeSteps);
  const [runningStep, setRunningStep] = useState(null);
  const [runtimeBytes, setRuntimeBytes] = useState(null);
  const [plainBytes, setPlainBytes] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [executionSessionId, setExecutionSessionId] = useState(null);
  const [bufferId, setBufferId] = useState(null);

  const encrypted = !!compiledArtifact?.encrypted;
  const integrityEnabled = compiledArtifact?.protection?.hash === 'SHA-256';

  const artifactIdentity =
    compiledArtifact?.sourceHash || compiledArtifact?.manifest?.created_at || null;

  useEffect(() => {
    setSteps(makeSteps());
    setRunningStep(null);
    setRuntimeBytes(null);
    setPlainBytes(null);
    setManifest(null);
    setResult(null);
    setError('');
    setExecutionSessionId(null);
    setBufferId(null);
  }, [artifactIdentity]);

  const nextAction = useMemo(
    () => steps.find((step) => step.status === 'idle' || step.status === 'failed'),
    [steps]
  );

  const updateStep = useCallback((stepId, patch) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, ...patch } : step
      )
    );
  }, []);

  const skipStep = useCallback(
    (stepId) => {
      if (runningStep) return;
      const step = steps.find((item) => item.id === stepId);
      if (!step?.skippable || step.id !== nextAction?.id) return;

      const detail =
        stepId === 'verify'
          ? 'Integrity verification skipped by operator; no SHA-256 proof was produced.'
          : stepId === 'decrypt'
            ? 'Decryption skipped by operator. This is valid only when the next validation can consume the currently loaded bytes.'
            : 'Skipped by operator.';

      updateStep(stepId, {
        status: 'skipped',
        detail,
        output: {
          type: 'skip',
          rows:
            stepId === 'verify'
              ? [
                  ['Protection profile', integrityEnabled ? 'SHA-256 enabled' : 'DISABLED'],
                  ['Operator action', 'SKIPPED'],
                  ['Proof status', 'NOT GENERATED'],
                ]
              : [
                  ['Encryption profile', encrypted ? 'AES-256-GCM' : 'DISABLED'],
                  ['Operator action', 'SKIPPED'],
                  ['Reason', 'Client-side decryption gate bypassed'],
                ],
        },
      });
    },
    [encrypted, integrityEnabled, nextAction?.id, runningStep, steps, updateStep]
  );

  const runStep = useCallback(
    async (stepId) => {
      if (runningStep || !compiledArtifact) return;

      setRunningStep(stepId);
      setError('');
      updateStep(stepId, { status: 'running', detail: '', output: null });

      try {
        switch (stepId) {
          case 'load': {
            if (!compiledArtifact.manifest) {
              throw new Error('No compiled runtime manifest is available.');
            }

            const sessionId = makeId('exec');
            const sourceBytes = compiledArtifact.encrypted?.ciphertext
              ? base64ToBytes(compiledArtifact.encrypted.ciphertext)
              : new TextEncoder().encode(JSON.stringify(compiledArtifact.manifest));

            const runtimeHash = await sha256Hex(sourceBytes);
            const artifactId = `artifact-${runtimeHash.slice(0, 16)}`;

            setExecutionSessionId(sessionId);
            setRuntimeBytes(sourceBytes);

            updateStep(stepId, {
              status: 'completed',
              detail: `${formatBytes(sourceBytes.byteLength)} loaded into execution session ${sessionId}.`,
              output: {
                rows: [
                  ['Session ID', sessionId],
                  ['Artifact ID', artifactId],
                  ['Payload format', encrypted ? 'Encrypted runtime envelope' : 'Canonical JSON manifest'],
                  ['Payload bytes', `${sourceBytes.byteLength} B (${formatBytes(sourceBytes.byteLength)})`],
                  ['Payload SHA-256', shortHash(runtimeHash)],
                  ['Protection', encrypted ? 'AES-256-GCM' : 'PLAINTEXT'],
                  ['Loaded at', timestamp()],
                ],
                proofs: [['PAYLOAD SHA-256', runtimeHash]],
              },
            });
            break;
          }

          case 'verify': {
            if (!integrityEnabled) {
              updateStep(stepId, {
                status: 'skipped',
                detail: 'Integrity hashing was disabled in Step 03.',
                output: {
                  rows: [
                    ['Configured protection', 'SHA-256 DISABLED'],
                    ['Verification', 'SKIPPED'],
                    ['Proof', 'Not applicable'],
                  ],
                },
              });
              break;
            }

            if (!compiledArtifact.manifest) {
              throw new Error('Manifest unavailable for integrity verification.');
            }

            const bytes = new TextEncoder().encode(
              JSON.stringify(compiledArtifact.manifest)
            );
            const computedHash = await sha256Hex(bytes);
            const expectedHash = compiledArtifact.sourceHash || '';
            const matches = computedHash === expectedHash;

            if (!matches) {
              throw new Error('SHA-256 verification failed for the prepared manifest.');
            }

            updateStep(stepId, {
              status: 'completed',
              detail: 'Prepared manifest hash verified.',
              output: {
                rows: [
                  ['Algorithm', 'SHA-256'],
                  ['Expected manifest hash', shortHash(expectedHash)],
                  ['Computed manifest hash', shortHash(computedHash)],
                  ['Comparison', 'MATCH'],
                  ['Verification', 'PASS'],
                  ['Verified at', timestamp()],
                ],
                proofs: [
                  ['EXPECTED', expectedHash],
                  ['COMPUTED', computedHash],
                ],
              },
            });
            break;
          }

          case 'memory': {
            if (!runtimeBytes) {
              throw new Error('Runtime bytes are not loaded.');
            }

            const copy = new Uint8Array(runtimeBytes);
            const newBufferId = makeId('buf');
            const bufferHash = await sha256Hex(copy);

            setBufferId(newBufferId);
            setRuntimeBytes(copy);

            updateStep(stepId, {
              status: 'completed',
              detail: `${copy.byteLength} byte(s) resident in temporary buffer ${newBufferId}.`,
              output: {
                rows: [
                  ['Buffer ID', newBufferId],
                  ['Bytes resident', `${copy.byteLength} B (${formatBytes(copy.byteLength)})`],
                  ['Buffer state', 'ACTIVE'],
                  ['Buffer role', 'Temporary execution buffer'],
                  ['Buffer SHA-256', shortHash(bufferHash)],
                  ['Loaded at', timestamp()],
                ],
                proofs: [['BUFFER CONTENT SHA-256', bufferHash]],
              },
            });
            break;
          }

          case 'decrypt': {
            if (!encrypted) {
              updateStep(stepId, {
                status: 'skipped',
                detail: 'Prepared artifact is unencrypted; decryption is not applicable.',
                output: {
                  rows: [
                    ['Encryption profile', 'DISABLED'],
                    ['Action', 'SKIPPED'],
                    ['Reason', 'Runtime bytes are already plaintext'],
                  ],
                },
              });
              break;
            }

            const envelope = compiledArtifact.encrypted;
            if (!envelope || !runtimeBytes) {
              throw new Error('Encrypted runtime envelope is unavailable.');
            }

            const key = await crypto.subtle.importKey(
              'raw',
              base64ToBytes(envelope.key),
              { name: 'AES-GCM' },
              false,
              ['decrypt']
            );

            const plaintext = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
              key,
              runtimeBytes
            );

            const decrypted = new Uint8Array(plaintext);
            const plaintextHash = await sha256Hex(decrypted);

            setPlainBytes(decrypted);
            updateStep(stepId, {
              status: 'completed',
              detail: `${decrypted.byteLength} decrypted byte(s) authenticated in memory.`,
              output: {
                rows: [
                  ['Algorithm', envelope.algorithm || 'AES-256-GCM'],
                  ['Ciphertext bytes', `${runtimeBytes.byteLength} B`],
                  ['Plaintext bytes', `${decrypted.byteLength} B`],
                  ['IV length', `${base64ToBytes(envelope.iv).byteLength} B`],
                  ['Authentication', 'PASS'],
                  ['Plaintext SHA-256', shortHash(plaintextHash)],
                  ['Key material', 'Held in client runtime; not displayed'],
                ],
                proofs: [['PLAINTEXT SHA-256', plaintextHash]],
              },
            });
            break;
          }

          case 'deserialize': {
            const bytes = encrypted ? plainBytes : runtimeBytes;

            if (!bytes) {
              throw new Error('No runtime bytes are available for deserialization.');
            }

            const decoded = new TextDecoder().decode(bytes);
            const parsed = JSON.parse(decoded);
            if (
              !parsed ||
              parsed.kind !== 'mahoraga-workbench-runtime-manifest' ||
              !parsed.source
            ) {
              throw new Error('Runtime manifest validation failed.');
            }

            const manifestHash = await sha256Hex(
              new TextEncoder().encode(JSON.stringify(parsed))
            );
            const manifestId = `manifest-${manifestHash.slice(0, 16)}`;
            const capabilities = Array.isArray(parsed.capabilities)
              ? parsed.capabilities
              : [];

            setManifest(parsed);
            updateStep(stepId, {
              status: 'completed',
              detail: `Manifest ${manifestId} accepted for ${parsed.target_platform}.`,
              output: {
                rows: [
                  ['Manifest ID', manifestId],
                  ['Schema version', parsed.schema_version ?? '—'],
                  ['Kind', parsed.kind],
                  ['Target platform', parsed.target_platform || '—'],
                  ['Capabilities', `${capabilities.length}`],
                  ['Source length', `${parsed.source.length} characters`],
                  ['Manifest validation', 'PASS'],
                ],
                proofs: [['SERIALIZED MANIFEST SHA-256', manifestHash]],
              },
            });
            break;
          }

          case 'provider': {
            if (!manifest) {
              throw new Error('Deserialize the runtime manifest first.');
            }

            if (manifest.target_platform !== targetPlatform) {
              throw new Error(
                `Target mismatch: artifact=${manifest.target_platform}, selected=${targetPlatform}.`
              );
            }

            const requested = Array.isArray(manifest.capabilities)
              ? manifest.capabilities
              : [];
            const resolved = requested.filter((capability) =>
              KNOWN_CAPABILITIES.includes(capability)
            );
            const unresolved = requested.filter(
              (capability) => !KNOWN_CAPABILITIES.includes(capability)
            );

            if (unresolved.length > 0) {
              throw new Error(
                `Provider capability resolution failed: ${unresolved.join(', ')}`
              );
            }

            updateStep(stepId, {
              status: 'completed',
              detail: `${resolved.length}/${requested.length} capability(ies) resolved for ${targetPlatform}.`,
              output: {
                rows: [
                  ['Target platform', targetPlatform],
                  ['Provider route', 'Native forensic provider'],
                  ['Requested capabilities', `${requested.length}`],
                  ['Resolved capabilities', `${resolved.length}`],
                  ['Unresolved capabilities', '0'],
                  ['Resolution', 'PASS'],
                ],
                capabilityList: resolved,
              },
            });
            break;
          }

          case 'execute': {
            if (!cmiConnected) {
              throw new Error('CMI backend is offline. Start cmi.server on port 8000.');
            }

            if (!manifest?.source) {
              throw new Error('Validated investigation source is unavailable.');
            }

            const executionResult = await orchestrateInvestigation(
              manifest.source,
              targetPlatform
            );

            setResult(executionResult);

            if (!executionResult.success) {
              updateStep(stepId, {
                status: 'failed',
                detail: `${executionResult.stage || 'CMI'}: ${executionResult.error || 'Execution failed.'}`,
                output: {
                  rows: [
                    ['CMI status', 'FAILED'],
                    ['Failed stage', executionResult.stage || '—'],
                    ['Error', executionResult.error || 'Unknown backend error'],
                    ['Returned at', timestamp()],
                  ],
                },
              });
              throw new Error(
                `${executionResult.stage || 'CMI'}: ${executionResult.error || 'Execution failed.'}`
              );
            }

            updateStep(stepId, {
              status: 'completed',
              detail: `CMI returned investigation ${executionResult.data?.investigation_id || 'completed'}.`,
              output: { result: executionResult },
            });
            break;
          }

          case 'release': {
            const releasedBytes = (runtimeBytes?.byteLength || 0) + (plainBytes?.byteLength || 0);
            const releasedBufferId = bufferId || '—';

            if (runtimeBytes) runtimeBytes.fill(0);
            if (plainBytes) plainBytes.fill(0);

            setRuntimeBytes(null);
            setPlainBytes(null);

            updateStep(stepId, {
              status: 'completed',
              detail: 'Temporary client-side runtime buffers cleared and staged session closed.',
              output: {
                rows: [
                  ['Buffer ID', releasedBufferId],
                  ['Bytes cleared', `${releasedBytes} B (${formatBytes(releasedBytes)})`],
                  ['Runtime buffer', 'RELEASED'],
                  ['Plaintext buffer', 'RELEASED'],
                  ['Session', executionSessionId || '—'],
                  ['Release mode', 'Best-effort client-side zeroization'],
                  ['Released at', timestamp()],
                ],
              },
            });

            if (result) {
              onExecutionComplete?.(result);
            }
            break;
          }

          default:
            break;
        }
      } catch (stepError) {
        const message =
          stepError instanceof Error ? stepError.message : String(stepError);

        const currentStep = steps.find((step) => step.id === stepId);
        if (currentStep?.status !== 'failed') {
          updateStep(stepId, {
            status: 'failed',
            detail: message,
            output: {
              rows: [
                ['Status', 'FAILED'],
                ['Error', message],
                ['Timestamp', timestamp()],
              ],
            },
          });
        }
        setError(message);
      } finally {
        setRunningStep(null);
      }
    }, [
      bufferId,
      cmiConnected,
      compiledArtifact,
      encrypted,
      executionSessionId,
      integrityEnabled,
      manifest,
      onExecutionComplete,
      plainBytes,
      result,
      runningStep,
      runtimeBytes,
      steps,
      targetPlatform,
      updateStep,
    ]
  );

  const completed = steps.find((step) => step.id === 'release')?.status === 'completed';

  return (
    <div className="panel-card staged-pipeline-card">
      <div className="panel-header">
        <div className="panel-title">
          <Cpu size={14} />
          <span>FORENSIC EXECUTION</span>
        </div>

        <div className="staged-header-right">
          <span className={`badge ${completed ? 'badge-emerald' : 'badge-warning'}`}>
            {completed ? 'EXECUTION COMPLETE' : compiledArtifact ? 'READY' : 'LOCKED'}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setExpanded((value) => !value)}
            aria-label="Toggle execution details"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="panel-body font-mono">
          <div className="execution-summary-strip">
            <div>
              <span className="strip-key">TARGET</span>
              <span className="strip-value">{targetPlatform}</span>
            </div>
            <div>
              <span className="strip-key">ENVELOPE</span>
              <span className="strip-value">{encrypted ? 'AES-256-GCM' : 'PLAINTEXT'}</span>
            </div>
            <div>
              <span className="strip-key">CMI</span>
              <span className="strip-value">{cmiConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary compact-btn"
              onClick={() => nextAction && runStep(nextAction.id)}
              disabled={!nextAction || runningStep || !compiledArtifact}
            >
              {runningStep ? <Loader2 size={11} className="spin" /> : <Play size={11} />}
              {runningStep ? 'WORKING…' : nextAction?.status === 'failed' ? 'RETRY STEP' : 'RUN NEXT'}
            </button>
          </div>

          <div className="execution-session-strip">
            <span>SESSION</span>
            <code>{executionSessionId || 'Not started'}</code>
            <span>BUFFER</span>
            <code>{bufferId || 'Not allocated'}</code>
          </div>

          <div className="staged-steps">
            {steps.map((step, index) => {
              const isActive = runningStep === step.id;
              const isNext = nextAction?.id === step.id;
              const terminalState = ['completed', 'skipped'].includes(step.status);

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
                      <Lock size={10} />
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
                                : isNext
                                  ? 'NEXT'
                                  : 'WAITING'}
                      </span>
                    </div>
                    <div className="staged-description">{step.description}</div>
                    {step.detail && <div className="staged-detail">{step.detail}</div>}

                    {step.output?.rows && <OutputGrid rows={step.output.rows} />}

                    {step.output?.proofs?.map(([label, value]) => (
                      <CodeProof key={label} title={label} value={value} />
                    ))}

                    {Array.isArray(step.output?.capabilityList) && (
                      <div className="capability-proof">
                        <div className="execution-proof-title">RESOLVED CAPABILITIES</div>
                        <div className="capability-chip-list">
                          {step.output.capabilityList.map((capability) => (
                            <span className="capability-chip" key={capability}>
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {step.output?.result && <ResultOutput result={step.output.result} />}
                  </div>

                  {!terminalState && (
                    <div className="staged-actions">
                      <button
                        type="button"
                        className="step-action"
                        onClick={() => runStep(step.id)}
                        disabled={!isNext || runningStep || !compiledArtifact}
                      >
                        {step.status === 'failed' ? 'RETRY' : 'RUN'}
                      </button>

                      {step.skippable && (
                        <button
                          type="button"
                          className="step-action muted-action"
                          onClick={() => skipStep(step.id)}
                          disabled={!isNext || runningStep}
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

          <div className="staged-note">
            Provider execution uses the existing CMI backend contract. Steps 01–06 produce local execution evidence from the prepared artifact; Step 07 is the authoritative backend run; Step 08 closes the client-side staging session. Backend compilation, native provider collection, evidence sealing and STIX generation remain authoritative server-side outputs.
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
        .execution-summary-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          margin-bottom: 7px;
        }
        .execution-summary-strip > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .strip-key,
        .execution-session-strip > span {
          color: var(--text-muted);
          font-size: 8px;
          letter-spacing: .75px;
        }
        .strip-value {
          color: var(--text-primary);
          font-size: 9.5px;
          font-weight: 600;
        }
        .execution-session-strip {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          padding: 7px 10px;
          margin-bottom: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
        }
        .execution-session-strip code {
          color: var(--text-secondary);
          font-size: 8.5px;
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
          align-items: start;
          padding: 10px;
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
          padding-top: 2px;
        }
        .staged-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          padding-top: 1px;
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
          margin-top: 3px;
          color: var(--text-muted);
          font-size: 8.5px;
          line-height: 1.4;
        }
        .staged-detail {
          color: var(--text-secondary);
        }
        .staged-actions {
          display: flex;
          gap: 4px;
          padding-top: 1px;
        }
        .step-action {
          padding: 4px 7px;
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
        .staged-skipped .staged-icon,
        .staged-skipped .staged-status {
          color: var(--text-muted);
        }
        .staged-failed .staged-icon,
        .staged-failed .staged-status {
          color: var(--status-error);
        }
        .execution-output-box,
        .capability-proof,
        .execution-proof-box {
          margin-top: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }
        .execution-output-label,
        .execution-proof-title {
          padding: 6px 8px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .7px;
        }
        .execution-output-grid {
          display: grid;
          grid-template-columns: minmax(130px, .55fr) minmax(0, 1.45fr);
        }
        .execution-output-row {
          display: contents;
        }
        .execution-output-key,
        .execution-output-value {
          padding: 5px 8px;
          border-bottom: 1px solid rgba(51, 51, 51, .35);
          font-size: 8.5px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .execution-output-key {
          color: var(--text-muted);
        }
        .execution-output-value {
          color: var(--text-secondary);
        }
        .execution-output-row:last-child .execution-output-key,
        .execution-output-row:last-child .execution-output-value {
          border-bottom: none;
        }
        .execution-proof-box code {
          display: block;
          padding: 7px 8px;
          color: var(--text-secondary);
          font-size: 8px;
          line-height: 1.45;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .capability-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding: 7px 8px;
        }
        .capability-chip {
          padding: 3px 6px;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          background: var(--bg-primary);
          font-size: 8px;
        }
        .execution-result-stack {
          margin-top: 8px;
        }
        .staged-error {
          margin-top: 8px;
          padding: 8px 10px;
          border: 1px solid rgba(180, 70, 70, .4);
          background: rgba(120, 30, 30, .08);
          color: var(--status-error);
          font-size: 8.5px;
          line-height: 1.4;
        }
        .staged-note {
          margin-top: 8px;
          color: var(--text-muted);
          font-size: 8px;
          line-height: 1.45;
        }
        @media (max-width: 720px) {
          .execution-summary-strip {
            grid-template-columns: 1fr 1fr;
          }
          .execution-summary-strip .compact-btn {
            grid-column: 1 / -1;
          }
          .staged-step {
            grid-template-columns: 24px 22px minmax(0, 1fr);
          }
          .staged-actions {
            grid-column: 3;
            padding-top: 5px;
          }
        }
      `}</style>
    </div>
  );
}
