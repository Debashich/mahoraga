import { useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, CheckCircle2, ChevronRight, Circle, Clock3,
  Database, Download, ExternalLink, FolderLock, Network, Radar, Search, XCircle,
} from 'lucide-react';

import {
  getEvidenceVaultUrl,
  getStixBundleUrl,
  downloadInvestigationExport,
} from '../utils/cmiClient';

/* ========================================================================
   HELPERS
   ======================================================================== */

const PALETTE = [
  '#8b5cf6', '#22d3ee', '#22c55e', '#facc15',
  '#fb923c', '#f43f5e', '#ec4899', '#4f8cff',
];

const HEX64 = /^[a-f0-9]{64}$/i;
const asArray = (v) => (Array.isArray(v) ? v : []);
const isPass = (s) => s === 'success' || s === 'completed';
const irType = (op) => op?.type || op?.operation || 'unknown';

const stageColor = (i, status) =>
  status === 'failed' ? 'var(--status-error)' : PALETTE[i % PALETTE.length];

const colorMap = (labels) =>
  Object.fromEntries(labels.map((l, i) => [l, PALETTE[i % PALETTE.length]]));

const countBy = (items, pick) => {
  const counts = {};
  items.forEach((item) => {
    const key = pick(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

const fmtDuration = (seconds) => {
  const v = Number(seconds) || 0;
  if (v <= 0) return '0 ms';
  if (v < 1) return `${Math.round(v * 1000)} ms`;
  return `${v.toFixed(2)} s`;
};

const fmtPct = (value, total) => {
  if (!total) return '0%';
  const p = (value / total) * 100;
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`;
};

const fmtBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const fmtTimestamp = (data, telemetry) => {
  const raw = [data?.timestamp, data?.created_at, data?.started_at, telemetry?.timestamp].find(Boolean);
  if (!raw) return 'Not exposed by CMI';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleString();
};

const stageIcon = (status) => {
  if (isPass(status)) return [CheckCircle2, 'ok'];
  if (status === 'failed') return [XCircle, 'bad'];
  if (status === 'running') return [Activity, 'warn'];
  return [Circle, 'muted'];
};

/* ========================================================================
   UI COMPONENTS
   ======================================================================== */

function Empty({ text }) {
  return <div className="dp-empty">{text}</div>;
}

function Stat({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className="dp-stat">
      <div className="dp-stat-icon"><Icon size={17} /></div>
      <div className="dp-stat-body">
        <span>{label}</span>
        <strong className={tone || ''}>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

function SectionHead({ label, title, hint, children }) {
  return (
    <div className="dp-sec-head">
      <div>
        <div className="dp-label">{label}</div>
        {title && <h2>{title}</h2>}
        {hint && <p>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ShareBars({ data, total, colors }) {
  return (
    <div className="dp-share">
      {data.map((item) => (
        <div className="dp-share-row" key={item.label}>
          <div className="dp-share-head">
            <span className="dp-share-label" title={item.label}>
              <i style={{ background: colors[item.label] }} />
              {item.label}
            </span>
            <strong className="dp-share-value">
              <span>{item.value}</span>
              <em>{fmtPct(item.value, total)}</em>
            </strong>
          </div>
          <div className="dp-track">
            <div
              className="dp-fill"
              style={{
                width: `${Math.max((item.value / total) * 100, item.value > 0 ? 1.5 : 0)}%`,
                background: colors[item.label],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Meter({ label, value, total, note }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const state = total === 0 ? 'none' : value === total ? 'full' : 'partial';
  return (
    <div className="dp-meter">
      <div className="dp-meter-head">
        <span>{label}</span>
        <strong>{value} / {total}</strong>
      </div>
      <div className="dp-track">
        <div className={`dp-fill dp-meter-${state}`} style={{ width: `${pct}%` }} />
      </div>
      {note && <small>{note}</small>}
    </div>
  );
}

/** Sequential waterfall: position = when, width = how long. */
function Waterfall({ stages }) {
  if (!stages.length) return <Empty text="No pipeline telemetry returned." />;
  const total = stages.reduce((sum, s) => sum + s.duration, 0);
  if (!total) return <Empty text="Pipeline stages returned no measurable duration." />;

  let cursor = 0;
  const rows = stages.map((s) => {
    const start = cursor;
    cursor += s.duration;
    return { ...s, start };
  });

  return (
    <div className="dp-wf">
      <div className="dp-wf-row">
        <span />
        <div className="dp-wf-axis">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span
              key={t}
              style={{
                left: `${t * 100}%`,
                transform: t === 0 ? 'none' : t === 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {fmtDuration(total * t)}
            </span>
          ))}
        </div>
        <span />
      </div>

      {rows.map((stage, index) => {
        const [Icon, tone] = stageIcon(stage.status);
        return (
          <div className="dp-wf-row" key={`${stage.name}-${index}`}>
            <div className="dp-wf-name">
              <strong><Icon size={13} className={tone} />{stage.name}</strong>
              <small className="mono" title={stage.command || ''}>
                {stage.command || 'Command not reported'}
              </small>
            </div>
            <div className="dp-wf-track">
              <div
                className="dp-wf-bar"
                title={`${stage.name}: ${fmtDuration(stage.duration)}`}
                style={{
                  left: `${(stage.start / total) * 100}%`,
                  width: `${Math.max((stage.duration / total) * 100, 0.8)}%`,
                  background: stageColor(index, stage.status),
                }}
              />
            </div>
            <div className="dp-wf-val">
              <strong>{fmtDuration(stage.duration)}</strong>
              <small>{fmtPct(stage.duration, total)} of run</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================
   PAGE
   ======================================================================== */

export default function DashboardPage({ onNavigate, cmiConnected, lastResult }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const data =
    lastResult?.success === true && lastResult?.data && typeof lastResult.data === 'object'
      ? lastResult.data
      : null;

  const telemetry = data?.telemetry || {};
  const evidence = telemetry.evidence || {};
  const stix = telemetry.stix_bundle || {};

  const stages = asArray(data?.pipeline_stages).map((s) => ({
    name: s?.stage || s?.name || 'unknown',
    status: s?.status,
    duration: Number(s?.duration) || 0,
    command: s?.command,
  }));
  const irOps = asArray(telemetry.ir_operations);
  const capabilities = asArray(telemetry.capabilities_used).map(String);
  const objects = asArray(evidence.objects);

  /* pipeline */
  const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
  const passedStages = stages.filter((s) => isPass(s.status)).length;
  const failedStages = stages.filter((s) => s.status === 'failed').length;
  const slowest = stages.reduce((b, s) => (!b || s.duration > b.duration ? s : b), null);
  const payloadBytes = Number(telemetry.encrypted_payload_bytes || 0);

  /* compilation */
  const irData = countBy(irOps, irType);
  const irColors = colorMap(irData.map((d) => d.label));

  /* evidence */
  const artifactCount = Number(evidence.artifacts_count ?? objects.length);
  const hashes = objects.map((o) => o?.sha256).filter((h) => typeof h === 'string' && h);
  const validHashes = hashes.filter((h) => HEX64.test(h)).length;
  const uniqueHashes = new Set(hashes).size;
  const sharedHashes = hashes.length - uniqueHashes;

  /* STIX */
  const stixObjects = Number(stix.objects_count ?? 0);
  const findings = Number(stix.findings_count ?? 0);

  const investigationId = data?.investigation_id;
  const status = String(failedStages ? 'partial' : data?.status || 'completed').toUpperCase();

  const openUrl = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExport = async () => {
    if (!investigationId) return;
    setExporting(true);
    setExportError('');
    try {
      await downloadInvestigationExport(investigationId);
    } catch (error) {
      console.error('Failed to export investigation:', error);
      setExportError('Export failed. Check that the CMI backend is running.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dp">
      {/* ---------------- HEADER ---------------- */}
      <header className="dp-header">
        <nav className="dp-crumbs" aria-label="Breadcrumb">
          <strong>MAHORAGA</strong>
          <ChevronRight size={13} />
          <span>platform</span>
          <ChevronRight size={13} />
          <span className={cmiConnected ? 'ok' : 'bad'}>CMI</span>
          <ChevronRight size={13} />
          <button className="dp-crumb-link" onClick={() => onNavigate('workbench')}>Workbench</button>
        </nav>
        <div className="dp-header-right">
          <div className={`dp-conn ${cmiConnected ? 'ok' : 'bad'}`}>
            <span />
            CMI {cmiConnected ? 'connected' : 'offline'}
          </div>
          <button className="dp-btn dp-btn-primary" onClick={() => onNavigate('workbench')}>
            Open workbench <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ---------------- CURRENT INVESTIGATION ---------------- */}
      <section className="dp-sec">
        <SectionHead
          label="Current investigation"
          title={data ? investigationId : 'No investigation loaded'}
          hint={
            data
              ? 'Report generated from the most recent completed orchestration.'
              : 'Run an investigation from the workbench to populate this report.'
          }
        >
          {data && (
            <div className="dp-actions">
              <button className="dp-btn" onClick={handleExport} disabled={exporting}>
                <Download size={13} />{exporting ? 'Exporting…' : 'Export'}
              </button>
              <button className="dp-btn" onClick={() => openUrl(getEvidenceVaultUrl(investigationId))}>
                <FolderLock size={13} /> Evidence <ExternalLink size={11} />
              </button>
              <button className="dp-btn" onClick={() => openUrl(getStixBundleUrl(investigationId))}>
                <Radar size={13} /> STIX <ExternalLink size={11} />
              </button>
            </div>
          )}
        </SectionHead>

        {exportError && <div className="dp-note bad"><AlertCircle size={14} /> {exportError}</div>}

        {!data ? (
          <div className="dp-none">
            <div className="dp-none-icon"><Search size={24} /></div>
            <h3>No completed investigation</h3>
            <p>Run a Jocky investigation to generate compiler, runtime, evidence, and STIX telemetry.</p>
            <button className="dp-btn dp-btn-primary" onClick={() => onNavigate('workbench')}>
              Start investigation <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="dp-grid6">
            <Stat
              icon={failedStages ? AlertCircle : CheckCircle2}
              label="Status"
              value={status}
              tone={failedStages ? 'bad' : 'ok'}
              detail={`${passedStages}/${stages.length} stages passed`}
            />
            <Stat icon={Network} label="Target" value={data.target_platform || 'Unknown'} detail="Execution platform" />
            <Stat icon={Clock3} label="Pipeline time" value={totalDuration > 0 ? fmtDuration(totalDuration) : '—'} detail="Sum of stage durations" />
            <Stat icon={Database} label="Artifacts" value={artifactCount} detail="Sealed evidence" />
            <Stat icon={Radar} label="STIX objects" value={stixObjects} detail="Intelligence objects" />
            <Stat icon={Search} label="Findings" value={findings} tone={findings > 0 ? 'warn' : ''} detail="Detected indicators" />
          </div>
        )}
      </section>

      {data && (
        <>
          {/* ---------------- EXECUTION PIPELINE ---------------- */}
          <section className="dp-sec">
            <SectionHead
              label="Execution pipeline"
              title="Stage timeline"
              hint="Compiler, obfuscator, runtime, sealing and STIX. Each bar starts where the previous stage ended, so position is when and width is how long."
            />
            <div className="dp-card">
              <Waterfall stages={stages} />
              <div className="dp-summary">
                <div><span>Total time</span><strong>{fmtDuration(totalDuration)}</strong></div>
                <div>
                  <span>Slowest stage</span>
                  <strong>{slowest ? `${slowest.name} · ${fmtDuration(slowest.duration)}` : '—'}</strong>
                </div>
                <div><span>Passed</span><strong>{passedStages}/{stages.length}</strong></div>
                <div>
                  <span>Failed</span>
                  <strong className={failedStages ? 'bad' : 'ok'}>{failedStages}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- INVESTIGATION RESULTS ---------------- */}
          <section className="dp-sec">
            <SectionHead label="Investigation results" />
            <div className="dp-grid2">
              <div className="dp-card">
                <div className="dp-card-head"><div><h3>Input</h3></div></div>
                <dl className="dp-details">
                  <div><dt>Target</dt><dd>{data.target_platform || 'Not reported'}</dd></div>
                  <div><dt>Executed</dt><dd>{fmtTimestamp(data, telemetry)}</dd></div>
                  <div><dt>Payload</dt><dd>{fmtBytes(payloadBytes)} encrypted</dd></div>
                </dl>
                <div className="dp-sub">Capabilities ({capabilities.length})</div>
                {capabilities.length ? (
                  <div className="dp-chips">
                    {capabilities.map((c) => <span key={c}>{c}</span>)}
                  </div>
                ) : (
                  <Empty text="No capabilities reported." />
                )}
              </div>

              <div className="dp-card">
                <div className="dp-card-head"><div><h3>Compilation</h3></div></div>
                <dl className="dp-details">
                  <div><dt>Compiler</dt><dd>Jocky</dd></div>
                  <div><dt>Method</dt><dd>Lark AST + Forensic IR</dd></div>
                  <div><dt>IR operations</dt><dd>{irOps.length}</dd></div>
                </dl>
                <div className="dp-sub">Operation breakdown</div>
                {irOps.length ? (
                  <ShareBars data={irData} total={irOps.length} colors={irColors} />
                ) : (
                  <Empty text="No IR operations reported." />
                )}
              </div>
            </div>
          </section>

          {/* ---------------- EVIDENCE ---------------- */}
          <section className="dp-sec">
            <SectionHead label="Evidence" />
            <div className="dp-card">
              <div className="dp-grid3">
                <Stat icon={Database} label="Sealed artifacts" value={artifactCount} />
                <Stat
                  icon={validHashes === objects.length && objects.length ? CheckCircle2 : AlertCircle}
                  label="SHA-256 status"
                  value={objects.length ? `${validHashes}/${objects.length} valid` : 'No objects'}
                  tone={objects.length && validHashes === objects.length ? 'ok' : 'warn'}
                />
                <Stat icon={Search} label="Unique hashes" value={`${uniqueHashes}/${hashes.length}`} />
              </div>

              <div className="dp-sub">Artifact list</div>
              {objects.length ? (
                <div className="dp-table-wrap">
                  <table className="dp-table">
                    <thead>
                      <tr><th>Evidence ID</th><th>Type</th><th>Provider</th><th>SHA-256</th></tr>
                    </thead>
                    <tbody>
                      {objects.map((a, i) => (
                        <tr key={a.evidence_id || i}>
                          <td className="mono">{a.evidence_id || '—'}</td>
                          <td>{a.type || 'unknown'}</td>
                          <td>{a.provider || a.source || 'unknown'}</td>
                          <td className="mono dp-hash">{a.sha256 || 'Not reported'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="No individual evidence objects were returned." />
              )}
            </div>
          </section>

          {/* ---------------- INTELLIGENCE ---------------- */}
          <section className="dp-sec">
            <SectionHead label="Intelligence" />
            <div className="dp-card">
              <div className="dp-grid2">
                <Stat icon={Radar} label="STIX 2.1 objects" value={stixObjects} detail="Emitted by the detection engine" />
                <Stat icon={Search} label="Indicator findings" value={findings} tone={findings > 0 ? 'warn' : ''} detail="Detected indicators" />
              </div>
              <div className={`dp-note ${findings > 0 ? 'warn' : 'ok'}`}>
                {findings > 0 ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                {findings > 0
                  ? `${findings} indicator finding${findings === 1 ? '' : 's'} reported by the detection engine.`
                  : 'No indicator findings were reported by the detection engine.'}
              </div>
              <button className="dp-link" onClick={() => openUrl(getStixBundleUrl(investigationId))}>
                Open STIX bundle <ExternalLink size={11} />
              </button>
            </div>
          </section>

          {/* ---------------- INTEGRITY ---------------- */}
          <section className="dp-sec">
            <SectionHead label="Integrity" />
            <div className="dp-card">
              <div className="dp-integrity">
                <div className="dp-meters">
                  <Meter label="SHA-256 present" value={hashes.length} total={objects.length} />
                  <Meter label="Valid SHA-256 format (64 hex characters)" value={validHashes} total={objects.length} />
                  <Meter
                    label="Unique hashes"
                    value={uniqueHashes}
                    total={hashes.length}
                    note={sharedHashes > 0 ? `${sharedHashes} artifact${sharedHashes === 1 ? '' : 's'} share a hash with another (identical content).` : undefined}
                  />
                  {artifactCount > objects.length && (
                    <div className="dp-note warn">
                      <AlertCircle size={14} />
                      The backend reports {artifactCount} artifacts but returned {objects.length} objects; checks cover the returned objects only.
                    </div>
                  )}
                </div>
                <dl className="dp-details">
                  <div><dt>Manifest</dt><dd className="mono">{evidence.manifest_id || 'Not reported'}</dd></div>
                  <div><dt>Sealed file SHA-256</dt><dd className="mono">{evidence.file_sha256 || 'Not reported'}</dd></div>
                  <div><dt>Sealed evidence path</dt><dd className="mono">{evidence.file_path || 'Not reported'}</dd></div>
                  <div><dt>STIX bundle path</dt><dd className="mono">{stix.file_path || 'Not reported'}</dd></div>
                </dl>
              </div>
            </div>
          </section>

          {/* ---------------- RAW DATA / DEBUG ---------------- */}
          <section className="dp-sec">
            <SectionHead label="Raw data / debug" />
            <details className="dp-card dp-raw">
              <summary>Show raw investigation JSON</summary>
              <pre className="mono">{JSON.stringify(data, null, 2)}</pre>
            </details>
          </section>
        </>
      )}

      <style>{CSS}</style>
    </div>
  );
}

/* ========================================================================
   STYLES
   ======================================================================== */

const CSS = `
.dp { width:100%; display:flex; flex-direction:column; gap:28px; padding-bottom:48px; color:var(--text-primary); font-size:12px; line-height:1.5; }
.dp *, .dp *::before, .dp *::after { box-sizing:border-box; }
.dp h1, .dp h2, .dp h3, .dp p, .dp dl, .dp dd { margin:0; }
.dp .mono, .dp code { font-family:"JetBrains Mono","SFMono-Regular",Consolas,monospace; }
.dp .ok { color:var(--status-success); }
.dp .bad { color:var(--status-error); }
.dp .warn { color:var(--status-warning); }
.dp .muted { color:var(--text-muted); }

/* header */
.dp-header { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; padding:14px 18px; background:var(--bg-secondary); border:1px solid var(--border-color); }
.dp-crumbs { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-muted); }
.dp-crumbs strong { color:var(--text-primary); letter-spacing:.06em; }
.dp-crumbs svg { opacity:.6; }
.dp-crumb-link { padding:0; font:inherit; font-weight:700; color:var(--text-primary); background:none; border:0; cursor:pointer; }
.dp-crumb-link:hover { text-decoration:underline; }
.dp-header-right { display:flex; align-items:center; gap:12px; }
.dp-conn { display:flex; align-items:center; gap:7px; padding:6px 10px; font-size:11px; font-weight:700; border:1px solid var(--border-color); }
.dp-conn span { width:7px; height:7px; border-radius:50%; background:currentColor; }

/* buttons */
.dp-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:9px 14px; font:inherit; font-size:11px; font-weight:700; white-space:nowrap; cursor:pointer; color:var(--text-secondary); background:var(--bg-secondary); border:1px solid var(--border-color); transition:color .15s, border-color .15s, opacity .15s; }
.dp-btn:hover:not(:disabled) { color:var(--text-primary); border-color:var(--text-muted); }
.dp-btn:disabled { opacity:.5; cursor:progress; }
.dp-btn-primary { color:var(--bg-primary); background:var(--text-primary); border-color:var(--text-primary); }
.dp-btn-primary:hover:not(:disabled) { color:var(--bg-primary); opacity:.88; }
.dp-btn:focus-visible, .dp-link:focus-visible, .dp-crumb-link:focus-visible, .dp-raw summary:focus-visible { outline:2px solid var(--text-muted); outline-offset:2px; }
.dp-actions { display:flex; gap:8px; flex-wrap:wrap; }
.dp-link { display:inline-flex; align-items:center; gap:6px; margin-top:14px; padding:0; font:inherit; font-size:11px; font-weight:700; color:var(--text-secondary); background:none; border:0; cursor:pointer; }
.dp-link:hover { color:var(--text-primary); }

/* sections */
.dp-sec { display:flex; flex-direction:column; gap:14px; }
.dp-sec-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; }
.dp-sec-head h2 { font-size:17px; font-weight:750; margin:2px 0 4px; overflow-wrap:anywhere; }
.dp-sec-head p { font-size:11px; color:var(--text-muted); max-width:720px; }
.dp-label { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); }
.dp-sub { margin:20px 0 10px; font-size:11px; font-weight:700; color:var(--text-muted); }

/* grids */
.dp-grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.dp-grid3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.dp-grid6 { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; }

/* stat */
.dp-stat { min-width:0; display:flex; align-items:center; gap:12px; padding:15px; background:var(--bg-secondary); border:1px solid var(--border-color); }
.dp-card .dp-stat { background:var(--bg-primary); }
.dp-stat-icon { width:36px; height:36px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--text-muted); background:var(--bg-tertiary); border:1px solid var(--border-color); }
.dp-stat-body { min-width:0; }
.dp-stat-body span { display:block; font-size:11px; color:var(--text-muted); }
.dp-stat-body strong { display:block; font-size:15px; font-weight:750; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dp-stat-body small { display:block; font-size:10.5px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* empty / none */
.dp-empty { min-height:70px; display:flex; align-items:center; justify-content:center; text-align:center; font-size:11px; color:var(--text-muted); }
.dp-none { min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:40px; text-align:center; background:var(--bg-secondary); border:1px solid var(--border-color); }
.dp-none-icon { width:50px; height:50px; display:flex; align-items:center; justify-content:center; margin-bottom:6px; color:var(--text-muted); background:var(--bg-tertiary); border:1px solid var(--border-color); }
.dp-none h3 { font-size:14px; }
.dp-none p { max-width:480px; margin-bottom:10px; font-size:11.5px; color:var(--text-muted); }

/* cards */
.dp-card { min-width:0; padding:20px; background:var(--bg-secondary); border:1px solid var(--border-color); }
.dp-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:14px; }
.dp-card-head h3 { font-size:14px; font-weight:750; }

/* key/value */
.dp-details > div { display:grid; grid-template-columns:minmax(120px,1fr) 1.6fr; gap:18px; align-items:baseline; padding:10px 0; border-bottom:1px solid var(--border-color); }
.dp-details > div:last-child { border-bottom:0; }
.dp-details dt { font-size:11px; color:var(--text-muted); }
.dp-details dd { font-size:12px; font-weight:650; text-align:right; overflow-wrap:anywhere; }
.dp-details dd.mono { font-size:11px; font-weight:500; word-break:break-all; }

/* notes */
.dp-note { display:flex; align-items:flex-start; gap:8px; margin-top:14px; padding:10px 12px; font-size:11px; line-height:1.45; color:var(--text-secondary); background:var(--bg-primary); border:1px solid var(--border-color); border-left-width:3px; }
.dp-note svg { flex-shrink:0; margin-top:1px; }
.dp-note.ok { border-left-color:var(--status-success); }
.dp-note.ok svg { color:var(--status-success); }
.dp-note.warn { border-left-color:var(--status-warning); }
.dp-note.warn svg { color:var(--status-warning); }
.dp-note.bad { border-left-color:var(--status-error); color:var(--status-error); }
.dp-sec > .dp-note { margin-top:0; }

/* bars */
.dp-track { height:9px; overflow:hidden; background:var(--bg-primary); border:1px solid var(--border-color); }
.dp-fill { height:100%; }
.dp-share { display:flex; flex-direction:column; gap:14px; }
.dp-share-row { display:flex; flex-direction:column; gap:6px; }
.dp-share-head { display:flex; justify-content:space-between; gap:14px; align-items:baseline; }
.dp-share-label { display:flex; align-items:center; gap:8px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; color:var(--text-secondary); }
.dp-share-label i { width:9px; height:9px; flex-shrink:0; display:inline-block; }
.dp-share-head strong { display:flex; align-items:baseline; gap:8px; flex-shrink:0; font-size:11.5px; font-variant-numeric:tabular-nums; }
.dp-share-head strong > span { min-width:18px; text-align:right; }
.dp-share-head em { font-style:normal; font-weight:500; color:var(--text-muted); }

/* meters */
.dp-integrity { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:32px; align-items:start; }
.dp-meters { display:flex; flex-direction:column; gap:18px; }
.dp-meter { display:flex; flex-direction:column; gap:6px; }
.dp-meter-head { display:flex; justify-content:space-between; gap:12px; font-size:11.5px; }
.dp-meter-head span { color:var(--text-secondary); }
.dp-meter-head strong { font-variant-numeric:tabular-nums; }
.dp-meter small { font-size:10.5px; color:var(--text-muted); }
.dp-meter-full { background:var(--status-success); }
.dp-meter-partial { background:var(--status-warning); }
.dp-meter-none { background:var(--text-muted); }

/* waterfall */
.dp-wf { display:flex; flex-direction:column; gap:12px; }
.dp-wf-row { display:grid; grid-template-columns:minmax(150px,230px) minmax(0,1fr) 104px; gap:16px; align-items:center; }
.dp-wf-name { min-width:0; }
.dp-wf-name strong { display:flex; align-items:center; gap:7px; font-size:12px; }
.dp-wf-name small { display:block; margin-top:2px; font-size:10px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dp-wf-track { position:relative; height:22px; background-color:var(--bg-primary); background-image:linear-gradient(to right,var(--border-color) 1px,transparent 1px); background-size:25% 100%; border:1px solid var(--border-color); }
.dp-wf-bar { position:absolute; top:3px; bottom:3px; min-width:3px; }
.dp-wf-val { text-align:right; }
.dp-wf-val strong { display:block; font-size:12px; font-variant-numeric:tabular-nums; }
.dp-wf-val small { font-size:10px; color:var(--text-muted); }
.dp-wf-axis { position:relative; height:14px; font-size:10px; color:var(--text-muted); }
.dp-wf-axis span { position:absolute; top:0; white-space:nowrap; }
.dp-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:20px; padding-top:16px; border-top:1px solid var(--border-color); }
.dp-summary span { display:block; font-size:11px; color:var(--text-muted); }
.dp-summary strong { font-size:13px; overflow-wrap:anywhere; }

/* chips */
.dp-chips { display:flex; flex-wrap:wrap; gap:8px; }
.dp-chips span { padding:6px 10px; font-family:"JetBrains Mono",monospace; font-size:11px; color:var(--text-secondary); background:var(--bg-primary); border:1px solid var(--border-color); }

/* table */
.dp-table-wrap { width:100%; overflow-x:auto; }
.dp-table { width:100%; border-collapse:collapse; font-size:11px; }
.dp-table th { padding:10px; text-align:left; font-size:11px; font-weight:700; color:var(--text-muted); white-space:nowrap; background:var(--bg-primary); border-bottom:1px solid var(--border-color); }
.dp-table td { padding:10px; vertical-align:top; color:var(--text-secondary); border-bottom:1px solid var(--border-color); }
.dp-table tbody tr:last-child td { border-bottom:0; }
.dp-table td:first-child { color:var(--text-primary); font-weight:650; }
.dp-hash { max-width:380px; font-size:10.5px; word-break:break-all; }

/* raw */
.dp-raw summary { cursor:pointer; font-size:12px; font-weight:700; color:var(--text-secondary); }
.dp-raw[open] summary { margin-bottom:14px; }
.dp-raw pre { margin:0; max-height:480px; overflow:auto; padding:14px; font-size:11px; line-height:1.55; color:var(--text-secondary); background:var(--bg-primary); border:1px solid var(--border-color); }

/* responsive */
@media (max-width:1250px) { .dp-grid6 { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:1000px) { .dp-grid2, .dp-integrity { grid-template-columns:1fr; } .dp-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:760px) {
  .dp { gap:22px; }
  .dp-grid3, .dp-grid6 { grid-template-columns:1fr; }
  .dp-sec-head { flex-direction:column; align-items:flex-start; }
  .dp-wf-row { grid-template-columns:minmax(0,1fr) 96px; gap:8px 12px; }
  .dp-wf-row > .dp-wf-track { grid-column:1 / -1; grid-row:2; }
  .dp-wf-row > .dp-wf-axis { grid-column:1 / -1; }
  .dp-wf-row > span:first-child, .dp-wf-row > span:last-child { display:none; }
  .dp-details > div { grid-template-columns:1fr; gap:2px; }
  .dp-details dd { text-align:left; }
}
@media (max-width:500px) { .dp-card { padding:15px; } }
@media (prefers-reduced-motion:reduce) { .dp *, .dp *::before, .dp *::after { transition:none !important; } }
`;