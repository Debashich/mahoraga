import { useEffect, useState } from 'react';
import {
  Radar,
  FileCode,
  Cpu,
  AlertTriangle,
  Info,
  XCircle,
  FileText,
  ShieldCheck,
  Search,
  Database,
  Clock3,
  ExternalLink,
  Copy,
  CheckCircle2,
} from 'lucide-react';

import { getStixBundleUrl } from '../utils/cmiClient';

/* ========================================================================
   HELPERS
   ======================================================================== */

const PALETTE = [
  '#8b5cf6', '#4f8cff', '#22c55e', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#64748b',
];

const asArray = (value) => (Array.isArray(value) ? value : []);
const isPass = (status) => status === 'success' || status === 'completed';

const fmtDuration = (seconds) => {
  const v = Number(seconds) || 0;
  if (v <= 0) return '0 ms';
  if (v < 1) return `${Math.round(v * 1000)} ms`;
  return `${v.toFixed(2)} s`;
};

const fmtPct = (value, total) => {
  if (!total) return '0%';
  const p = (value / total) * 100;
  if (p > 0 && p < 1) return '<1%';
  return `${Math.round(p)}%`;
};

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

const truncate = (text, max = 90) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** Best human-readable summary of an arbitrary STIX object. */
const summarize = (obj) => {
  const raw = obj?.name || obj?.pattern || obj?.description || obj?.value || '';
  return typeof raw === 'string' ? truncate(raw) : '';
};

const MAX_TABLE_ROWS = 100;

/* ========================================================================
   COMPONENTS
   ======================================================================== */

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="sx-metric">
      <div className="sx-metric-icon"><Icon size={17} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

/** Horizontal bars where 100% = whole population. */
function ShareBars({ data, total }) {
  return (
    <div className="sx-share">
      {data.map((item, i) => (
        <div className="sx-share-row" key={item.label}>
          <div className="sx-share-head">
            <span title={item.label}>
              <i style={{ background: PALETTE[i % PALETTE.length] }} />
              {item.label}
            </span>
            <strong>
              {item.value}
              <em>{fmtPct(item.value, total)}</em>
            </strong>
          </div>
          <div className="sx-track">
            <div
              style={{
                width: `${Math.max((item.value / total) * 100, item.value > 0 ? 1.5 : 0)}%`,
                background: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Sequential waterfall for the whole run with the STIX stage highlighted,
 * so it is obvious where (and how expensive) STIX generation is.
 */
function StageWaterfall({ stages }) {
  const total = stages.reduce((sum, s) => sum + s.duration, 0);
  if (!stages.length) return <div className="sx-small-empty">Pipeline telemetry unavailable.</div>;
  if (!total) return <div className="sx-small-empty">Stages returned no measurable duration.</div>;

  let cursor = 0;
  return (
    <div className="sx-wf">
      {stages.map((stage, index) => {
        const start = cursor;
        cursor += stage.duration;
        const failed = stage.status === 'failed';
        const isStix = /stix/i.test(stage.name);

        return (
          <div className="sx-wf-row" key={`${stage.name}-${index}`}>
            <strong className={isStix ? 'sx-wf-hit' : ''}>
              {failed ? <XCircle size={12} className="bad" /> : isPass(stage.status) ? <CheckCircle2 size={12} className="ok" /> : null}
              {stage.name}
            </strong>

            <div className="sx-wf-track">
              <div
                title={`${stage.name}: ${fmtDuration(stage.duration)}`}
                style={{
                  left: `${(start / total) * 100}%`,
                  width: `${Math.max((stage.duration / total) * 100, 0.8)}%`,
                  background: failed ? 'var(--status-error)' : isStix ? PALETTE[0] : 'var(--text-muted)',
                  opacity: isStix || failed ? 1 : 0.45,
                }}
              />
            </div>

            <span>{fmtDuration(stage.duration)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================
   PAGE
   ======================================================================== */

export default function DetectionStixPage({ lastResult, cmiConnected }) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bundle, setBundle] = useState({ state: 'idle', objects: [], error: '' });

  const hasResult = Boolean(lastResult);
  const isSuccess = Boolean(lastResult?.success && lastResult?.data);
  const isFailed = hasResult && !lastResult.success;

  const executionData = isSuccess ? lastResult.data : null;
  const telemetry = executionData?.telemetry || {};
  const stix = telemetry.stix_bundle || {};
  const evidence = telemetry.evidence || {};

  const investigationId = executionData?.investigation_id;
  const bundleUrl = isSuccess && investigationId ? getStixBundleUrl(investigationId) : null;

  /* Load the real bundle so we can chart what is actually inside it. */
  useEffect(() => {
    if (!bundleUrl) {
      setBundle({ state: 'idle', objects: [], error: '' });
      return undefined;
    }

    const controller = new AbortController();
    setBundle({ state: 'loading', objects: [], error: '' });

    fetch(bundleUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => {
        const objects = Array.isArray(json?.objects)
          ? json.objects
          : Array.isArray(json)
            ? json
            : null;
        if (!objects) throw new Error('Response is not a STIX bundle');
        setBundle({ state: 'ready', objects, error: '' });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setBundle({ state: 'error', objects: [], error: error.message });
      });

    return () => controller.abort();
  }, [bundleUrl]);

  const stages = asArray(executionData?.pipeline_stages).map((s) => ({
    name: s?.stage || s?.name || 'unknown',
    status: s?.status,
    duration: Number(s?.duration) || 0,
  }));
  const irOperations = asArray(telemetry.ir_operations);
  const capabilities = asArray(telemetry.capabilities_used).map(String);
  const evidenceObjects = asArray(evidence.objects);

  const stixObjects = Number(stix.objects_count ?? 0);
  const findings = Number(stix.findings_count ?? 0);
  const artifacts = Number(evidence.artifacts_count ?? evidenceObjects.length ?? 0);

  const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
  const passedStages = stages.filter((s) => isPass(s.status)).length;
  const failedStages = stages.filter((s) => s.status === 'failed').length;
  const stixStage = stages.find((s) => /stix/i.test(s.name));

  const otherObjects = Math.max(stixObjects - findings, 0);
  const barTotal = Math.max(stixObjects, findings);

  const bundleTypes = countBy(bundle.objects, (o) => o?.type);
  const countMismatch = bundle.state === 'ready' && bundle.objects.length !== stixObjects;

  const statusLabel = String(executionData?.status || 'completed').toUpperCase();
  const stixBundlePath = stix.file_path || executionData?.stix_bundle || null;

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="sx font-mono">
      {/* ---------------- HEADER ---------------- */}
      <div className="panel-card sx-banner">
        <div className="sx-banner-main">
          <div className="sx-hero-icon"><Radar size={22} /></div>
          <div>
            <h3>STIX 2.1 Detection &amp; Intelligence Engine</h3>
            <p>
              Threat-intelligence objects and detection results produced by
              the Mahoraga investigation pipeline.
            </p>
          </div>
        </div>

        <div className="sx-banner-actions">
          <span className={`badge ${cmiConnected ? 'badge-emerald' : 'badge-warning'}`}>
            {cmiConnected ? 'CMI API: CONNECTED' : 'CMI API: OFFLINE'}
          </span>
          <span className={`badge ${isSuccess ? 'badge-emerald' : isFailed ? 'badge-crimson' : 'badge'}`}>
            {isSuccess ? 'STIX OUTPUT AVAILABLE' : isFailed ? 'ORCHESTRATION FAILED' : 'NO RESULT'}
          </span>
        </div>
      </div>

      {/* ---------------- NO RESULT ---------------- */}
      {!hasResult && (
        <div className="panel-card sx-empty">
          <Info size={28} className="sx-muted" />
          <strong>No STIX investigation result available</strong>
          <span>Run an investigation from the Jocky workbench to generate STIX 2.1 output.</span>
        </div>
      )}

      {/* ---------------- FAILED ---------------- */}
      {isFailed && (
        <div className="panel-card sx-failed">
          <div className="sx-failed-banner">
            <XCircle size={18} />
            <div>
              <strong>STIX 2.1 output unavailable</strong>
              <span>The orchestration pipeline failed before STIX generation completed.</span>
            </div>
          </div>

          <div className="sx-kv2">
            <div>
              <span className="sx-label">Failed stage</span>
              <strong>{lastResult.stage || 'Unknown'}</strong>
            </div>
            <div>
              <span className="sx-label">Investigation</span>
              <strong className="sx-break">{lastResult.investigationId || '—'}</strong>
            </div>
          </div>

          <div className="sx-error-box">
            <span className="sx-label">Backend error</span>
            <pre>{lastResult.error || 'No backend error message reported.'}</pre>
          </div>
        </div>
      )}

      {/* ---------------- SUCCESS ---------------- */}
      {isSuccess && (
        <>
          <div className="sx-metrics">
            <Metric icon={Database} label="STIX objects" value={stixObjects} detail="Objects in the generated bundle" />
            <Metric icon={Search} label="Findings" value={findings} detail="Indicators flagged by detection" />
            <Metric icon={ShieldCheck} label="Evidence input" value={artifacts} detail="Sealed artifacts analysed" />
            <Metric
              icon={Clock3}
              label="STIX stage time"
              value={stixStage ? fmtDuration(stixStage.duration) : '—'}
              detail={stixStage && totalDuration ? `${fmtPct(stixStage.duration, totalDuration)} of pipeline` : 'Stage not reported'}
            />
          </div>

          <div className="sx-grid2">
            {/* ---- bundle contents ---- */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <Radar size={15} />
                  <span>Bundle contents</span>
                </div>
                <span className="sx-chip sx-chip-ok">
                  {bundle.state === 'ready' ? 'READ FROM BUNDLE' : 'FROM RESPONSE COUNTS'}
                </span>
              </div>

              <div className="sx-body">
                {bundle.state === 'loading' && (
                  <div className="sx-small-empty">Reading STIX bundle…</div>
                )}

                {bundle.state === 'ready' && (
                  bundleTypes.length ? (
                    <>
                      <span className="sx-label">Objects by STIX type</span>
                      <ShareBars data={bundleTypes} total={bundle.objects.length} />
                    </>
                  ) : (
                    <div className="sx-small-empty">The bundle contains no objects.</div>
                  )
                )}

                {(bundle.state === 'error' || bundle.state === 'idle') && (
                  barTotal > 0 ? (
                    <>
                      <span className="sx-label">Findings vs other objects</span>
                      <div className="sx-stack" role="img" aria-label={`${findings} findings, ${otherObjects} other objects`}>
                        {findings > 0 && (
                          <div style={{ width: `${(findings / barTotal) * 100}%`, background: 'var(--status-warning)' }} />
                        )}
                        {otherObjects > 0 && (
                          <div style={{ width: `${(otherObjects / barTotal) * 100}%`, background: PALETTE[1] }} />
                        )}
                      </div>
                      <div className="sx-stack-legend">
                        <span><i style={{ background: 'var(--status-warning)' }} />Findings <strong>{findings}</strong></span>
                        <span><i style={{ background: PALETTE[1] }} />Other objects <strong>{otherObjects}</strong></span>
                      </div>
                    </>
                  ) : (
                    <div className="sx-small-empty">The detection stage produced no STIX objects.</div>
                  )
                )}

                {bundle.state === 'error' && (
                  <div className="sx-note sx-note-warn">
                    <AlertTriangle size={14} />
                    <span>
                      Couldn’t read the bundle from the CMI API ({bundle.error}). The chart
                      above uses the aggregate counts from the orchestration response.
                    </span>
                  </div>
                )}

                {countMismatch && (
                  <div className="sx-note sx-note-warn">
                    <AlertTriangle size={14} />
                    <span>
                      The bundle holds {bundle.objects.length} objects but the response
                      reported {stixObjects}.
                    </span>
                  </div>
                )}

                <div className="sx-divider" />

                <span className="sx-label">Bundle path</span>
                <div className="sx-path">{stixBundlePath || 'Path not exposed'}</div>

                {bundleUrl && (
                  <button className="sx-link" onClick={() => window.open(bundleUrl, '_blank', 'noopener,noreferrer')}>
                    Open STIX bundle <ExternalLink size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* ---- detection result ---- */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <Cpu size={15} />
                  <span>Detection result</span>
                </div>
                <span className="sx-chip">{statusLabel}</span>
              </div>

              <div className="sx-body">
                <div className="sx-hero-number">
                  <strong className={findings > 0 ? 'warn' : ''}>{findings}</strong>
                  <div>
                    <b>{findings === 1 ? 'finding' : 'findings'}</b>
                    <span>reported by the detection engine across {stixObjects} STIX objects</span>
                  </div>
                </div>

                <div className={`sx-note ${findings > 0 ? 'sx-note-warn' : 'sx-note-ok'}`}>
                  {findings > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                  <span>
                    {findings > 0
                      ? 'Review the indicators in the STIX bundle before acting on them.'
                      : 'No indicators matched. This means the detection rules found nothing, not that the target is clean.'}
                  </span>
                </div>

                <div className="sx-kv2 sx-kv-flush">
                  <div><span className="sx-label">Capabilities</span><strong>{capabilities.length}</strong></div>
                  <div><span className="sx-label">IR operations</span><strong>{irOperations.length}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- objects table ---- */}
          {bundle.state === 'ready' && bundle.objects.length > 0 && (
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <FileText size={15} />
                  <span>STIX objects</span>
                </div>
                <span className="sx-chip">{bundle.objects.length}</span>
              </div>

              <div className="sx-table-wrap">
                <table className="sx-table">
                  <thead>
                    <tr><th>Type</th><th>ID</th><th>Summary</th></tr>
                  </thead>
                  <tbody>
                    {bundle.objects.slice(0, MAX_TABLE_ROWS).map((obj, index) => (
                      <tr key={obj?.id || index}>
                        <td>{obj?.type || 'unknown'}</td>
                        <td className="sx-break">{obj?.id || '—'}</td>
                        <td>{summarize(obj) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bundle.objects.length > MAX_TABLE_ROWS && (
                <div className="sx-foot">
                  Showing the first {MAX_TABLE_ROWS} of {bundle.objects.length}. Open the bundle for the full list.
                </div>
              )}
            </div>
          )}

          {/* ---- pipeline ---- */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <Clock3 size={15} />
                <span>Where STIX runs in the pipeline</span>
              </div>
              <span className="sx-chip">{fmtDuration(totalDuration)} total</span>
            </div>

            <div className="sx-pipeline">
              <StageWaterfall stages={stages} />

              {failedStages > 0 && (
                <div className="sx-note sx-note-bad">
                  <AlertTriangle size={14} />
                  <span>{failedStages} pipeline stage{failedStages === 1 ? '' : 's'} reported failure.</span>
                </div>
              )}
              <div className="sx-foot sx-foot-flush">
                {passedStages}/{stages.length} stages passed. Bars start where the previous
                stage ended; the STIX stage is highlighted.
              </div>
            </div>
          </div>

          {/* ---- context ---- */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <FileText size={15} />
                <span>Investigation context</span>
              </div>
            </div>

            <div className="sx-context">
              <div><span className="sx-label">Investigation ID</span><strong className="sx-break">{investigationId}</strong></div>
              <div><span className="sx-label">Target platform</span><strong>{executionData.target_platform || 'Not reported'}</strong></div>
              <div><span className="sx-label">Pipeline stages</span><strong>{passedStages} / {stages.length}</strong></div>
              <div><span className="sx-label">Pipeline time</span><strong>{fmtDuration(totalDuration)}</strong></div>
            </div>
          </div>

          {/* ---- raw response ---- */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <FileCode size={15} />
                <span>Raw orchestration response</span>
              </div>

              <div className="sx-tabs">
                <button className="sx-tab" onClick={copyJson}>
                  <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
                </button>
                <button className="sx-tab sx-tab-active" onClick={() => setShowJson((v) => !v)}>
                  <FileCode size={12} /> {showJson ? 'Hide JSON' : 'Show JSON'}
                </button>
              </div>
            </div>

            {showJson && (
              <div className="sx-raw">
                <pre>{JSON.stringify(lastResult, null, 2)}</pre>
              </div>
            )}
          </div>
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
.sx { display:flex; flex-direction:column; gap:18px; padding-bottom:32px; font-size:12px; line-height:1.5; }
.sx *, .sx *::before, .sx *::after { box-sizing:border-box; }
.sx .ok { color:var(--status-success); }
.sx .bad { color:var(--status-error); }
.sx .warn { color:var(--status-warning); }
.sx-muted { color:var(--text-muted); }
.sx-break { word-break:break-all; }
.sx-label { display:block; margin-bottom:5px; font-size:11px; font-weight:700; color:var(--text-muted); }

/* banner */
.sx-banner { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:18px 20px; }
.sx-banner-main { display:flex; align-items:center; gap:14px; min-width:0; }
.sx-hero-icon { width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--accent); background:var(--bg-primary); border:1px solid var(--border-color); }
.sx-banner h3 { margin:0 0 4px; font-size:16px; font-weight:700; color:var(--text-primary); }
.sx-banner p { margin:0; font-size:11.5px; color:var(--text-secondary); }
.sx-banner-actions { display:flex; gap:8px; flex-shrink:0; }

/* metrics */
.sx-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.sx-metric { display:flex; gap:12px; padding:17px; background:var(--bg-secondary); border:1px solid var(--border-color); }
.sx-metric-icon { width:36px; height:36px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--accent); background:var(--bg-primary); border:1px solid var(--border-color); }
.sx-metric > div:last-child { min-width:0; }
.sx-metric span { display:block; font-size:11px; color:var(--text-muted); }
.sx-metric strong { display:block; margin:2px 0; font-size:24px; line-height:1.1; color:var(--text-primary); }
.sx-metric small { font-size:10.5px; color:var(--text-secondary); }

.sx-grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.sx-body { padding:17px; }
.sx-divider { height:1px; margin:16px 0; background:var(--border-color); }

/* chips */
.sx-chip { padding:4px 8px; font-size:10px; font-weight:700; color:var(--text-secondary); border:1px solid var(--border-color); }
.sx-chip-ok { color:var(--status-success); border-color:var(--status-success); }

/* share bars */
.sx-share { display:flex; flex-direction:column; gap:14px; margin-top:6px; }
.sx-share-row { display:flex; flex-direction:column; gap:6px; }
.sx-share-head { display:flex; justify-content:space-between; gap:14px; align-items:baseline; }
.sx-share-head span { display:flex; align-items:center; gap:8px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; color:var(--text-secondary); }
.sx-share-head i, .sx-stack-legend i { width:9px; height:9px; flex-shrink:0; display:inline-block; }
.sx-share-head strong { font-size:11.5px; color:var(--text-primary); font-variant-numeric:tabular-nums; }
.sx-share-head em { margin-left:8px; font-style:normal; font-weight:500; color:var(--text-muted); }
.sx-track { height:9px; overflow:hidden; background:var(--bg-primary); border:1px solid var(--border-color); }
.sx-track > div { height:100%; }

/* stacked bar */
.sx-stack { display:flex; height:22px; margin-top:6px; overflow:hidden; background:var(--bg-primary); border:1px solid var(--border-color); }
.sx-stack > div { height:100%; }
.sx-stack-legend { display:flex; flex-wrap:wrap; gap:8px 22px; margin-top:12px; font-size:11.5px; color:var(--text-secondary); }
.sx-stack-legend span { display:inline-flex; align-items:center; gap:8px; }
.sx-stack-legend strong { color:var(--text-primary); }

/* path + link */
.sx-path { padding:9px 10px; font-size:11px; word-break:break-all; color:var(--text-primary); background:var(--bg-primary); border:1px solid var(--border-color); }
.sx-link { display:inline-flex; align-items:center; gap:6px; margin-top:14px; padding:0; font:inherit; font-size:11px; font-weight:700; color:var(--text-secondary); background:none; border:0; cursor:pointer; }
.sx-link:hover { color:var(--text-primary); }
.sx-link:focus-visible, .sx-tab:focus-visible { outline:2px solid var(--text-muted); outline-offset:2px; }

/* notes */
.sx-note { display:flex; align-items:flex-start; gap:9px; margin-top:14px; padding:10px 12px; font-size:11px; line-height:1.45; color:var(--text-secondary); background:var(--bg-primary); border:1px solid var(--border-color); border-left:3px solid var(--text-muted); }
.sx-note svg { flex-shrink:0; margin-top:1px; }
.sx-note-warn { border-left-color:var(--status-warning); }
.sx-note-warn svg { color:var(--status-warning); }
.sx-note-ok { border-left-color:var(--status-success); }
.sx-note-ok svg { color:var(--status-success); }
.sx-note-bad { border-left-color:var(--status-error); }
.sx-note-bad svg { color:var(--status-error); }

/* detection */
.sx-hero-number { display:flex; align-items:center; gap:18px; padding:16px; background:var(--bg-primary); border:1px solid var(--border-color); }
.sx-hero-number > strong { font-size:38px; line-height:1; color:var(--text-primary); }
.sx-hero-number b { display:block; font-size:13px; color:var(--text-primary); }
.sx-hero-number span { display:block; margin-top:2px; font-size:11px; color:var(--text-secondary); }
.sx-kv2 { display:grid; grid-template-columns:1fr 1fr; gap:1px; margin-top:12px; background:var(--border-color); }
.sx-kv2 > div { padding:12px; background:var(--bg-primary); }
.sx-kv2 strong { font-size:12px; color:var(--text-primary); }
.sx-kv-flush { margin-top:14px; }

/* table */
.sx-table-wrap { max-height:420px; overflow:auto; }
.sx-table { width:100%; border-collapse:collapse; font-size:11px; }
.sx-table th { position:sticky; top:0; padding:9px 12px; text-align:left; font-size:11px; font-weight:700; color:var(--text-muted); white-space:nowrap; background:var(--bg-primary); border-bottom:1px solid var(--border-color); }
.sx-table td { padding:9px 12px; vertical-align:top; color:var(--text-secondary); border-bottom:1px solid var(--border-color); }
.sx-table td:first-child { color:var(--text-primary); font-weight:650; white-space:nowrap; }
.sx-table tbody tr:last-child td { border-bottom:0; }
.sx-foot { padding:10px 14px; font-size:10.5px; color:var(--text-muted); border-top:1px solid var(--border-color); }
.sx-foot-flush { margin-top:14px; padding:12px 0 0; }

/* waterfall */
.sx-pipeline { padding:17px; }
.sx-wf { display:flex; flex-direction:column; gap:12px; }
.sx-wf-row { display:grid; grid-template-columns:130px minmax(0,1fr) 70px; gap:14px; align-items:center; }
.sx-wf-row > strong { display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--text-secondary); }
.sx-wf-row > strong.sx-wf-hit { color:var(--text-primary); }
.sx-wf-row > span { text-align:right; font-size:11px; color:var(--text-secondary); font-variant-numeric:tabular-nums; }
.sx-wf-track { position:relative; height:16px; background-color:var(--bg-primary); background-image:linear-gradient(to right,var(--border-color) 1px,transparent 1px); background-size:25% 100%; border:1px solid var(--border-color); }
.sx-wf-track > div { position:absolute; top:3px; bottom:3px; min-width:3px; }

/* context */
.sx-context { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1px; background:var(--border-color); border-top:1px solid var(--border-color); }
.sx-context > div { padding:14px 16px; min-width:0; background:var(--bg-secondary); }
.sx-context strong { font-size:12px; color:var(--text-primary); }

/* raw */
.sx-tabs { display:flex; gap:4px; }
.sx-tab { display:flex; align-items:center; gap:5px; padding:5px 9px; font:inherit; font-size:10.5px; font-weight:700; color:var(--text-muted); background:transparent; border:1px solid var(--border-color); cursor:pointer; }
.sx-tab:hover { color:var(--text-primary); }
.sx-tab-active { color:var(--text-primary); background:var(--bg-primary); }
.sx-raw { padding:14px; }
.sx-raw pre { margin:0; padding:14px; max-height:420px; overflow:auto; font-size:11px; line-height:1.5; white-space:pre-wrap; word-break:break-word; color:var(--text-secondary); background:var(--bg-primary); border:1px solid var(--border-color); }

/* states */
.sx-empty { min-height:230px; padding:35px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; font-size:11.5px; color:var(--text-muted); }
.sx-empty strong { font-size:13px; color:var(--text-primary); }
.sx-small-empty { padding:22px 10px; text-align:center; font-size:11px; color:var(--text-muted); }
.sx-failed { padding:17px; }
.sx-failed-banner { display:flex; align-items:center; gap:10px; padding:12px; color:var(--status-error); border:1px solid var(--border-color); border-left:3px solid var(--status-error); }
.sx-failed-banner strong { display:block; font-size:12px; color:var(--text-primary); }
.sx-failed-banner span { display:block; margin-top:2px; font-size:11px; color:var(--text-secondary); }
.sx-error-box { margin-top:12px; }
.sx-error-box pre { margin:0; padding:10px; max-height:180px; overflow:auto; font-size:11px; line-height:1.5; white-space:pre-wrap; word-break:break-word; color:var(--status-error); background:var(--bg-primary); border:1px solid var(--border-color); }

/* responsive */
@media (max-width:1100px) { .sx-metrics, .sx-context { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:800px) {
  .sx-banner { flex-direction:column; align-items:flex-start; }
  .sx-banner-actions { width:100%; flex-wrap:wrap; }
  .sx-grid2 { grid-template-columns:1fr; }
  .sx-wf-row { grid-template-columns:100px minmax(0,1fr) 60px; gap:10px; }
}
@media (max-width:600px) { .sx-metrics, .sx-context, .sx-kv2 { grid-template-columns:1fr; } }
`;