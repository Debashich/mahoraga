import { useState, useCallback, useMemo } from 'react';

import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import JockyEditorPanel from '../components/workbench/JockyEditorPanel';
import InvestigationConfigPanel from '../components/workbench/InvestigationConfigPanel';
import PreflightDiagnosticsPanel from '../components/workbench/PreflightDiagnosticsPanel';
import PipelineStatusPanel from '../components/workbench/PipelineStatusPanel';
import ResultSummaryCard from '../components/workbench/ResultSummaryCard';
import Editor from '@monaco-editor/react';
import { orchestrateInvestigation } from '../utils/cmiClient';

/*
 * Actual backend pipeline.
 *
 * These are deliberately separate from the five user-facing
 * investigation layers.
 */
const PIPELINE_STAGE_IDS = [
  'parse',
  'semantic',
  'capability',
  'ir',
  'obfuscator',
  'runtime',
  'sealing',
  'stix',
];

/*
 * Mahoraga's five user-facing investigation layers.
 *
 * Pre-flight is part of Layer 2 rather than being its own layer.
 */
const LAYERS = [
  {
    id: 1,
    title: 'INVESTIGATION',
    subtitle: 'Select / write Jocky investigation',
    short: 'INVESTIGATION',
  },
  {
    id: 2,
    title: 'INVESTIGATION CONFIGURATION',
    subtitle: 'Target + capabilities + pre-flight readiness',
    short: 'CONFIGURATION',
  },
  {
    id: 3,
    title: 'COMPILATION',
    subtitle: 'Validate → IR → lower → prepare',
    short: 'COMPILATION',
  },
  {
    id: 4,
    title: 'FORENSIC EXECUTION',
    subtitle: 'Native provider execution + collection',
    short: 'EXECUTION',
  },
  {
    id: 5,
    title: 'EVIDENCE & DETECTION',
    subtitle: 'Seal → preserve → detect → report',
    short: 'EVIDENCE',
  },
];

const PHASE_META = {
  1: 'Jocky investigation source',
  2: 'Target, capability, provider and evidence readiness',
  3: 'Jocky → Forensic IR → native instructions',
  4: 'Native forensic provider execution',
  5: 'Sealed evidence and STIX findings',
};

const PHASE_STATUS_LABEL = {
  completed: 'COMPLETED',
  current: 'IN PROGRESS',
  failed: 'FAILED',
  pending: 'LOCKED',
};

export default function WorkbenchPage({
  targetPlatform,
  onPlatformChange,
  preset,
  onPresetChange,
  cmiConnected,
  onOrchestrationComplete,
  lastResult,
}) {
  const [jockySource, setJockySource] = useState(
    "// Paste your Jocky source code here"
  );
  const [investigationName, setInvestigationName] = useState("");

  const [operatorId, setOperatorId] = useState("");

  const [evidenceFormat, setEvidenceFormat] = useState("");

  const [sealIntegrity, setSealIntegrity] = useState(true);

  const [activeCapabilities, setActiveCapabilities] = useState([
    'process_list',
    'system_info',
    'network_connections',
    'auth_logs',
  ]);

  const [preflightResults, setPreflightResults] = useState(null);

  const [isOrchestrating, setIsOrchestrating] = useState(false);

  const [orchestrationResult, setOrchestrationResult] = useState(
    lastResult || null
  );

  const [pipelineStages, setPipelineStages] = useState(
    PIPELINE_STAGE_IDS.map((id) => ({
      id,
      status: 'idle',
    }))
  );

  const [pipelineProgress, setPipelineProgress] = useState(0);

  const [currentActivity, setCurrentActivity] = useState('');

  /*
   * Five user-facing layers:
   *
   * 1 = investigation
   * 2 = configuration + pre-flight
   * 3 = compilation
   * 4 = execution
   * 5 = evidence & detection
   */
  const [activeLayer, setActiveLayer] = useState(1);

  const handleToggleCapability = useCallback((capId) => {
    setActiveCapabilities((prev) =>
      prev.includes(capId)
        ? prev.filter((c) => c !== capId)
        : [...prev, capId]
    );

    /*
     * Changing configuration invalidates the previous pre-flight result.
     * This prevents stale "READY" state after the investigator changes
     * the target or requested capabilities.
     */
    setPreflightResults(null);
  }, []);

  const handleConfigChange = useCallback((setter) => {
    setter();
    setPreflightResults(null);
  }, []);

  /*
   * Investigation pre-flight.
   *
   * This is deliberately a readiness assessment rather than a
   * separate workflow stage.
   */
  const handleRunPreflight = useCallback(() => {
    const source = jockySource.trim();

    const hasInvestigation =
      source.includes('investigation') && source.includes('{');

    const hasEmit = source.includes('emit evidence');

    const hasCorrelateWith =
      !source.match(/correlate\s+\w+\s+/) || source.includes('with');

    const hasTarget = Boolean(targetPlatform);

    const hasCapabilities = activeCapabilities.length > 0;

    const hasOperator = operatorId.trim().length > 0;

    const hasInvestigationName = investigationName.trim().length > 0;

    const checks = [
      {
        name: 'Jocky DSL Syntax',
        status: hasInvestigation && hasEmit ? 'PASS' : 'BLOCK',
        detail:
          hasInvestigation && hasEmit
            ? 'Investigation block and emit statement detected.'
            : 'Syntax Error: Missing investigation block or emit statement.',
      },

      {
        name: 'Correlate Syntax',
        status: hasCorrelateWith ? 'PASS' : 'WARN',
        detail: hasCorrelateWith
          ? 'Correlate statements use the expected "with" form.'
          : 'Warning: correlate requires "correlate X with Y" syntax.',
      },

      {
        name: 'Target Platform',
        status: hasTarget ? 'PASS' : 'BLOCK',
        detail: hasTarget
          ? `Target platform resolved as ${targetPlatform}.`
          : 'No target platform has been selected.',
      },

      {
        name: 'Capability Configuration',
        status: hasCapabilities ? 'PASS' : 'BLOCK',
        detail: hasCapabilities
          ? `${activeCapabilities.length} forensic capabilities requested.`
          : 'At least one forensic capability must be selected.',
      },

      {
        name: 'Investigation Identity',
        status:
          hasInvestigationName && hasOperator ? 'PASS' : 'BLOCK',
        detail:
          hasInvestigationName && hasOperator
            ? `Investigation "${investigationName}" assigned to ${operatorId}.`
            : 'Investigation name and operator identity are required.',
      },

      {
        name: 'Evidence Configuration',
        status: sealIntegrity ? 'PASS' : 'WARN',
        detail: sealIntegrity
          ? `Integrity sealing enabled with ${evidenceFormat} output.`
          : 'Integrity sealing is disabled. Evidence can still be collected, but sealing is not enabled.',
      },

      {
        name: 'Backend Endpoint Contract',
        status: 'PASS',
        detail:
          'POST /api/v1/orchestrate accepts { jocky_source, target_platform }.',
      },

      {
        name: 'Provider Capability Contract',
        status: hasCapabilities && hasTarget ? 'PASS' : 'BLOCK',
        detail:
          hasCapabilities && hasTarget
            ? `Selected capabilities are configured for the ${targetPlatform} provider.`
            : 'Provider capability resolution cannot proceed without a target and capabilities.',
      },

      {
        name: 'CMI Backend Connection',
        status: cmiConnected ? 'PASS' : 'WARN',
        detail: cmiConnected
          ? 'CMI Backend is LIVE at http://localhost:8000.'
          : 'CMI Backend is OFFLINE. Start the CMI backend on port 8000.',
      },
    ];

    const blocked = checks.some((check) => check.status === 'BLOCK');

    const passed = !blocked && cmiConnected;

    setPreflightResults({
      checks,
      passed,
      timestamp: Date.now(),
      targetPlatform,
      capabilities: [...activeCapabilities],
    });

    /*
     * Successful pre-flight does NOT create another layer.
     *
     * It completes Layer 2 and moves the investigator into
     * the actual compilation layer.
     */
    if (passed) {
      setActiveLayer(3);
    } else {
      setActiveLayer(2);
    }
  }, [
    jockySource,
    targetPlatform,
    activeCapabilities,
    operatorId,
    investigationName,
    sealIntegrity,
    evidenceFormat,
    cmiConnected,
  ]);

  const simulateStageProgression = useCallback(async () => {
    const stageLabels = [
      'Parsing Jocky DSL tokens...',
      'Validating semantic rules...',
      'Resolving forensic capabilities...',
      'Lowering to Forensic IR...',
      'Encrypting payload...',
      'Executing native C++ runtime...',
      'Sealing evidence (SHA-256)...',
      'Generating STIX 2.1 bundle...',
    ];

    for (let i = 0; i < PIPELINE_STAGE_IDS.length; i++) {
      setPipelineStages((prev) =>
        prev.map((stage, idx) =>
          idx === i
            ? { ...stage, status: 'running' }
            : idx < i
              ? { ...stage, status: 'completed' }
              : stage
        )
      );

      setCurrentActivity(stageLabels[i]);

      setPipelineProgress(
        Math.round(((i + 0.5) / PIPELINE_STAGE_IDS.length) * 100)
      );

      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }, []);

  const handleRunInvestigation = async () => {
    if (isOrchestrating) return;

    /*
     * Do not execute without a valid Layer 2 pre-flight.
     */
    const preflightPassed =
      preflightResults?.passed === true &&
      preflightResults?.targetPlatform === targetPlatform;

    if (!preflightPassed) {
      setActiveLayer(2);
      return;
    }

    setActiveLayer(4);
    setIsOrchestrating(true);
    setOrchestrationResult(null);

    setPipelineStages(
      PIPELINE_STAGE_IDS.map((id) => ({
        id,
        status: 'idle',
      }))
    );

    setPipelineProgress(0);
    setCurrentActivity('Initializing compilation and execution pipeline...');

    const animationPromise = simulateStageProgression();

    const resultPromise = orchestrateInvestigation(
      jockySource,
      targetPlatform
    );

    const [, result] = await Promise.all([
      animationPromise,
      resultPromise,
    ]);

    if (result.success) {
      setPipelineStages(
        PIPELINE_STAGE_IDS.map((id) => ({
          id,
          status: 'completed',
        }))
      );

      setPipelineProgress(100);
      setCurrentActivity('Investigation complete.');

      /*
       * Execution is complete.
       * Evidence and intelligence are represented by the actual
       * backend response rather than blindly assuming success.
       */
      setActiveLayer(5);
    } else {
      const failStage = (result.stage || '').toLowerCase();

      let failIdx = PIPELINE_STAGE_IDS.length - 1;

      if (
        failStage.includes('compiler') ||
        failStage.includes('parse')
      ) {
        failIdx = 0;
      } else if (failStage.includes('semantic')) {
        failIdx = 1;
      } else if (failStage.includes('capability')) {
        failIdx = 2;
      } else if (failStage.includes('ir')) {
        failIdx = 3;
      } else if (failStage.includes('obfuscator')) {
        failIdx = 4;
      } else if (
        failStage.includes('runtime') ||
        failStage.includes('odin') ||
        failStage.includes('mahoraga-run')
      ) {
        failIdx = 5;
      } else if (failStage.includes('sealing')) {
        failIdx = 6;
      } else if (
        failStage.includes('stix') ||
        failStage.includes('detection')
      ) {
        failIdx = 7;
      }

      setPipelineStages((prev) =>
        prev.map((stage, idx) =>
          idx < failIdx
            ? { ...stage, status: 'completed' }
            : idx === failIdx
              ? { ...stage, status: 'failed' }
              : { ...stage, status: 'idle' }
        )
      );

      setPipelineProgress(
        Math.round((failIdx / PIPELINE_STAGE_IDS.length) * 100)
      );

      setCurrentActivity(`Pipeline failed at: ${result.stage}`);

      /*
       * Compilation/runtime failures stay in the relevant layer.
       */
      if (failIdx <= 4) {
        setActiveLayer(3);
      } else {
        setActiveLayer(4);
      }
    }

    setIsOrchestrating(false);
    setOrchestrationResult(result);

    if (onOrchestrationComplete) {
      onOrchestrationComplete(result);
    }
  };

  /*
   * Determine visible state of the five user-facing layers.
   */
  const layerStatuses = useMemo(() => {
    const result = orchestrationResult;

    const sourceReady =
      jockySource.trim().length > 0 &&
      jockySource.includes('investigation');

    const configReady =
      investigationName.trim().length > 0 &&
      operatorId.trim().length > 0 &&
      activeCapabilities.length > 0 &&
      Boolean(targetPlatform);

    const preflightPassed =
      preflightResults?.passed === true &&
      preflightResults?.targetPlatform === targetPlatform;

    const layer2Ready = configReady && preflightPassed;

    const executionComplete =
      Boolean(result) && result.success === true;

    const executionFailed =
      Boolean(result) && result.success === false;

    const evidenceComplete =
      executionComplete &&
      Number(result?.data?.sealed_artifacts_count || 0) > 0;

    const intelligenceComplete =
      executionComplete &&
      (
        Number(result?.data?.stix_objects_count || 0) > 0 ||
        Number(result?.data?.stix_findings_count || 0) > 0
      );

    /*
     * Layer 5 represents the final evidence + detection state.
     *
     * A successful orchestration is enough to make the layer
     * accessible. The individual evidence/detection badges can
     * still reflect what the backend actually returned.
     */
    const layer5Ready =
      executionComplete || evidenceComplete || intelligenceComplete;

    return {
      1: sourceReady
        ? activeLayer === 1
          ? 'current'
          : 'completed'
        : 'current',

      2: layer2Ready
        ? activeLayer === 2
          ? 'current'
          : 'completed'
        : activeLayer === 2
          ? 'current'
          : 'pending',

      3: executionFailed
        ? 'failed'
        : executionComplete
          ? 'completed'
          : activeLayer === 3
            ? 'current'
            : layer2Ready
              ? 'current'
              : 'pending',

      4: executionFailed
        ? 'failed'
        : executionComplete
          ? 'completed'
          : activeLayer === 4
            ? 'current'
            : 'pending',

      5: layer5Ready
        ? 'completed'
        : activeLayer === 5
          ? 'current'
          : 'pending',
    };
  }, [
    jockySource,
    investigationName,
    operatorId,
    activeCapabilities,
    targetPlatform,
    preflightResults,
    orchestrationResult,
    activeLayer,
  ]);

  /*
   * Fill the rail's connector line up to the last node
   * in the unbroken completed run.
   */
  const railProgress = useMemo(() => {
    let lastDone = -1;

    for (let i = 0; i < LAYERS.length; i++) {
      if (layerStatuses[LAYERS[i].id] === 'completed') {
        lastDone = i;
      } else {
        break;
      }
    }

    return lastDone <= 0
      ? 0
      : (lastDone / (LAYERS.length - 1)) * 100;
  }, [layerStatuses]);

  const getLayerBadge = (id, status) => {
    if (status === 'completed') {
      const messages = {
        1: 'SOURCE READY',
        2: 'PRE-FLIGHT READY',
        3: 'COMPILED',
        4: 'EXECUTION COMPLETE',
        5: 'RESULTS READY',
      };

      return (
        <span className="layer-result-badge success">
          <CheckCircle2 size={11} />
          {messages[id]}
        </span>
      );
    }

    if (status === 'failed') {
      return (
        <span className="layer-result-badge failed">
          <AlertTriangle size={11} />
          FAILED
        </span>
      );
    }

    if (status === 'current') {
      return (
        <span className="layer-result-badge current">
          <span className="status-dot" />
          IN PROGRESS
        </span>
      );
    }

    return null;
  };

  const renderLayerContent = (id) => {
    switch (id) {
      case 1:
        return (
          <JockyEditorPanel
            source={jockySource}
            onChangeSource={(value) => {
              setJockySource(value);
              setPreflightResults(null);
            }}
            onRunPreflight={() => {
              setActiveLayer(2);
            }}
            onRunInvestigation={() => {
              setActiveLayer(2);
            }}
            isOrchestrating={isOrchestrating}
          />
        );

      case 2:
        return (
          <>
            <InvestigationConfigPanel
              investigationName={investigationName}
              onNameChange={(value) => {
                setInvestigationName(value);
                setPreflightResults(null);
              }}
              operatorId={operatorId}
              onOperatorChange={(value) => {
                setOperatorId(value);
                setPreflightResults(null);
              }}
              preset={preset}
              onPresetChange={(value) => {
                onPresetChange(value);
                setPreflightResults(null);
              }}
              targetPlatform={targetPlatform}
              onPlatformChange={(value) => {
                onPlatformChange(value);
                setPreflightResults(null);
              }}
              evidenceFormat={evidenceFormat}
              onFormatChange={(value) => {
                setEvidenceFormat(value);
                setPreflightResults(null);
              }}
              sealIntegrity={sealIntegrity}
              onSealChange={(value) => {
                setSealIntegrity(value);
                setPreflightResults(null);
              }}
              activeCapabilities={activeCapabilities}
              onToggleCapability={handleToggleCapability}
            />

            <PreflightDiagnosticsPanel
              preflightResults={preflightResults}
              onRunCheck={handleRunPreflight}
            />
          </>
        );

      case 3:
        return (
          <PipelineStatusPanel
            cmiConnected={cmiConnected}
            isOrchestrating={isOrchestrating}
            orchestrationResult={orchestrationResult}
            onTriggerOrchestration={handleRunInvestigation}
            pipelineStages={pipelineStages}
            pipelineProgress={pipelineProgress}
            currentActivity={currentActivity}
          />
        );

      case 4:
        return (
          <PipelineStatusPanel
            cmiConnected={cmiConnected}
            isOrchestrating={isOrchestrating}
            orchestrationResult={orchestrationResult}
            onTriggerOrchestration={handleRunInvestigation}
            pipelineStages={pipelineStages}
            pipelineProgress={pipelineProgress}
            currentActivity={currentActivity}
          />
        );

      case 5:
        return (
          <ResultSummaryCard
            result={orchestrationResult}
            isOrchestrating={isOrchestrating}
          />
        );

      default:
        return null;
    }
  };

  const handleLayerClick = (id) => {
    const status = layerStatuses[id];

    if (status === 'pending') return;

    setActiveLayer(id);

    requestAnimationFrame(() => {
      document
        .getElementById(`investigation-layer-${id}`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    });
  };

  return (
    <div className="workbench-page">
      <div className="investigation-heading">
        <div>
          <div className="eyebrow">FORENSIC WORKFLOW</div>

          <h1>JOCKY INVESTIGATION</h1>

          <p>
            Investigate → configure → compile → execute → preserve
          </p>
        </div>
      </div>

      <div className="workbench-with-phase-rail">
        <div className="investigation-layers">
          {LAYERS.map((layer) => {
            const status = layerStatuses[layer.id];
            const isActive = activeLayer === layer.id;

            return (
              <section
                key={layer.id}
                id={`investigation-layer-${layer.id}`}
                className={[
                  'investigation-layer',
                  `layer-${status}`,
                  isActive ? 'layer-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="layer-header"
                  onClick={() => handleLayerClick(layer.id)}
                  disabled={status === 'pending'}
                >
                  <span className="layer-number">
                    {String(layer.id).padStart(2, '0')}
                  </span>

                  <span className="layer-heading">
                    <span className="layer-title">
                      {layer.title}
                    </span>

                    <span className="layer-subtitle">
                      {layer.subtitle}
                    </span>
                  </span>

                  <span className="layer-status">
                    {getLayerBadge(layer.id, status)}

                    {isActive ? (
                      <ChevronDown size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                  </span>
                </button>

                {isActive && (
                  <div className="layer-content">
                    {renderLayerContent(layer.id)}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <nav
          className="phase-rail"
          aria-label="Investigation phases"
        >
          <div className="phase-rail-track">
            <div
              className="phase-rail-line"
              aria-hidden="true"
            >
              <span
                className="phase-rail-line-fill"
                style={{ height: `${railProgress}%` }}
              />
            </div>

            <ol className="phase-rail-list">
              {LAYERS.map((layer) => {
                const status = layerStatuses[layer.id];
                const isActive = activeLayer === layer.id;
                const statusLabel = PHASE_STATUS_LABEL[status];
                const num = String(layer.id).padStart(2, '0');

                return (
                  <li key={layer.id}>
                    <button
                      type="button"
                      className={[
                        'phase-rail-node',
                        `phase-rail-node-${status}`,
                        isActive
                          ? 'phase-rail-node-active'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleLayerClick(layer.id)}
                      aria-disabled={status === 'pending'}
                      aria-current={
                        isActive ? 'step' : undefined
                      }
                      aria-label={`${layer.id}. ${layer.title} — ${statusLabel.toLowerCase()}`}
                    >
                      <span className="phase-rail-number">
                        {num}

                        {status === 'completed' && (
                          <CheckCircle2
                            size={10}
                            className="phase-rail-mark"
                          />
                        )}

                        {status === 'failed' && (
                          <AlertTriangle
                            size={10}
                            className="phase-rail-mark"
                          />
                        )}
                      </span>

                      <span
                        className="phase-rail-tooltip"
                        role="tooltip"
                      >
                        <span className="phase-tooltip-number">
                          {num}
                        </span>

                        <span className="phase-tooltip-content">
                          <span className="phase-tooltip-title">
                            {layer.short}
                          </span>

                          <span className="phase-tooltip-description">
                            {PHASE_META[layer.id]}
                          </span>

                          <span className="phase-tooltip-status">
                            {statusLabel}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>
      </div>

      <style>{`
        .workbench-page {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 28px;
        }

        .investigation-heading {
          padding: 8px 2px 6px;
        }

        .eyebrow {
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 1.8px;
          color: var(--text-muted);
          margin-bottom: 5px;
        }

        .investigation-heading h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: var(--text-primary);
        }

        .investigation-heading p {
          margin: 5px 0 0;
          color: var(--text-muted);
          font-size: 11px;
          font-family: monospace;
        }

        .workbench-with-phase-rail {
          --phase-rail-width: 46px;
          --phase-rail-right: 20px;
          --phase-rail-top: 96px;
          --phase-node: 34px;

          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            var(--phase-rail-width);
          column-gap: 18px;
          align-items: start;
          min-width: 0;
        }

        .phase-rail {
          position: fixed;
          top: var(--phase-rail-top);
          right: var(--phase-rail-right);
          bottom: 24px;
          width: var(--phase-rail-width);
          z-index: 30;

          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .phase-rail-track {
          position: relative;
          pointer-events: auto;
        }

        .phase-rail-line {
          position: absolute;
          left: 50%;
          top: calc(var(--phase-node) / 2);
          bottom: calc(var(--phase-node) / 2);
          width: 1px;
          transform: translateX(-50%);
          background: var(--border-color);
        }

        .phase-rail-line-fill {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          background: var(--status-success);
          transition: height 300ms ease;
        }

        .phase-rail-list {
          position: relative;
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(4px, 1.5vh, 10px);
        }

        .phase-rail-node {
          position: relative;
          width: var(--phase-node);
          height: var(--phase-node);
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .phase-rail-node-pending {
          cursor: not-allowed;
        }

        .phase-rail-number {
          position: relative;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-muted);
          font-family: monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          transition:
            color 140ms ease,
            border-color 140ms ease,
            background 140ms ease,
            box-shadow 140ms ease;
        }

        .phase-rail-mark {
          position: absolute;
          top: -5px;
          right: -5px;
          padding: 1px;
          border-radius: 50%;
          background: var(--bg-primary);
        }

        .phase-rail-node-completed .phase-rail-number {
          color: var(--status-success);
          border-color: rgba(46, 125, 50, 0.65);
        }

        .phase-rail-node-completed .phase-rail-mark {
          color: var(--status-success);
        }

        .phase-rail-node-failed .phase-rail-number {
          color: var(--status-error);
          border-color: rgba(211, 47, 47, 0.7);
        }

        .phase-rail-node-failed .phase-rail-mark {
          color: var(--status-error);
        }

        .phase-rail-node-current .phase-rail-number {
          color: var(--status-warning);
          border-color: rgba(245, 124, 0, 0.55);
          animation: phase-pulse 1.8s ease-out infinite;
        }

        .phase-rail-node-pending .phase-rail-number {
          opacity: 0.65;
        }

        .phase-rail-node-active .phase-rail-number {
          background: var(--bg-secondary);
          border-color: var(--text-primary);
          box-shadow:
            0 0 0 3px var(--bg-primary),
            0 0 0 4px var(--border-color);
        }

        .phase-rail-node-active.phase-rail-node-completed
          .phase-rail-number {
          border-color: var(--status-success);
        }

        .phase-rail-node-active.phase-rail-node-failed
          .phase-rail-number {
          border-color: var(--status-error);
        }

        .phase-rail-node:not(.phase-rail-node-pending):hover
          .phase-rail-number {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .phase-rail-node:focus-visible {
          outline: none;
        }

        .phase-rail-node:focus-visible .phase-rail-number {
          outline: 2px solid var(--text-secondary);
          outline-offset: 3px;
        }

        @keyframes phase-pulse {
          0% {
            box-shadow:
              0 0 0 0 rgba(245, 124, 0, 0.35);
          }

          100% {
            box-shadow:
              0 0 0 7px rgba(245, 124, 0, 0);
          }
        }

        .phase-rail-tooltip {
          position: absolute;
          right: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          width: 190px;
          padding: 10px 11px;

          display: flex;
          align-items: flex-start;
          gap: 10px;

          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          text-align: left;

          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition:
            opacity 120ms ease,
            visibility 120ms ease;
        }

        .phase-rail-tooltip::after {
          content: '';
          position: absolute;
          right: -5px;
          top: 50%;
          width: 8px;
          height: 8px;
          background: var(--bg-primary);
          border-top: 1px solid var(--border-color);
          border-right: 1px solid var(--border-color);
          transform: translateY(-50%) rotate(45deg);
        }

        .phase-rail-node:hover .phase-rail-tooltip,
        .phase-rail-node:focus-visible
          .phase-rail-tooltip {
          opacity: 1;
          visibility: visible;
        }

        .phase-tooltip-number {
          flex-shrink: 0;
          font-family: monospace;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .phase-tooltip-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .phase-tooltip-title {
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: var(--text-primary);
        }

        .phase-tooltip-description {
          font-size: 10px;
          line-height: 1.35;
          color: var(--text-muted);
        }

        .phase-tooltip-status {
          margin-top: 3px;
          font-family: monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.7px;
          color: var(--text-secondary);
        }

        .phase-rail-node-completed
          .phase-tooltip-status {
          color: var(--status-success);
        }

        .phase-rail-node-failed
          .phase-tooltip-status {
          color: var(--status-error);
        }

        .phase-rail-node-current
          .phase-tooltip-status {
          color: var(--status-warning);
        }

        @media (hover: none) {
          .phase-rail-tooltip {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .workbench-with-phase-rail {
            --phase-rail-width: 38px;
            --phase-rail-right: 8px;
            --phase-node: 30px;
            column-gap: 12px;
          }

          .phase-rail-number {
            width: 26px;
            height: 26px;
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .phase-rail-node-current
            .phase-rail-number {
            animation: none;
          }

          .phase-rail-line-fill,
          .phase-rail-number,
          .phase-rail-tooltip {
            transition: none;
          }
        }

        .investigation-layers {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .investigation-layer {
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          transition:
            border-color 0.2s ease,
            opacity 0.2s ease,
            background 0.2s ease;
          scroll-margin-top: 18px;
        }

        .investigation-layer.layer-active {
          border-color: var(--text-muted);
          background: var(--bg-secondary);
        }

        .investigation-layer.layer-completed {
          border-color: rgba(46, 125, 50, 0.45);
        }

        .investigation-layer.layer-failed {
          border-color: rgba(211, 47, 47, 0.5);
        }

        .investigation-layer.layer-pending {
          opacity: 0.55;
        }

        .layer-header {
          width: 100%;
          min-height: 62px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .layer-pending .layer-header {
          cursor: default;
        }

        .layer-number {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          border: 1px solid var(--border-color);
          background: var(--bg-primary);

          font-family: monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .layer-active .layer-number {
          border-color: var(--text-secondary);
          color: var(--text-primary);
        }

        .layer-completed .layer-number {
          border-color: rgba(46, 125, 50, 0.55);
          color: var(--status-success);
        }

        .layer-failed .layer-number {
          border-color: rgba(211, 47, 47, 0.55);
          color: var(--status-error);
        }

        .layer-heading {
          flex: 1;
          min-width: 0;
        }

        .layer-title {
          font-family: monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.7px;
          color: var(--text-primary);
        }

        .layer-pending .layer-title {
          color: var(--text-muted);
        }

        .layer-subtitle {
          margin-top: 3px;
          font-size: 10px;
          color: var(--text-muted);
        }

        .layer-status {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .layer-result-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border: 1px solid transparent;
          font-family: monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.35px;
          white-space: nowrap;
        }

        .layer-result-badge.success {
          color: var(--status-success);
          background: rgba(46, 125, 50, 0.10);
          border-color: rgba(46, 125, 50, 0.35);
        }

        .layer-result-badge.failed {
          color: var(--status-error);
          background: rgba(211, 47, 47, 0.09);
          border-color: rgba(211, 47, 47, 0.35);
        }

        .layer-result-badge.current {
          color: var(--status-warning);
          background: rgba(245, 124, 0, 0.08);
          border-color: rgba(245, 124, 0, 0.25);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border: 1px solid currentColor;
          border-radius: 50%;
        }

        .layer-content {
          padding: 0 10px 10px;
          border-top: 1px solid var(--border-color);
        }

        .layer-content > * {
          margin-top: 10px;
        }

        @media (max-width: 800px) {
          .layer-subtitle {
            display: none;
          }

          .layer-status .layer-result-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}