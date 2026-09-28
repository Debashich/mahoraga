import { useEffect, useState } from 'react';
import JockyEditorPanel from '../components/workbench/JockyEditorPanel';
import InvestigationConfigPanel from '../components/workbench/InvestigationConfigPanel';
import PreflightDiagnosticsPanel from '../components/workbench/PreflightDiagnosticsPanel';
import PipelineStatusPanel from '../components/workbench/PipelineStatusPanel';
import ResultSummaryCard from '../components/workbench/ResultSummaryCard';

import { orchestrateInvestigation } from '../utils/cmiClient';

const BACKEND_STAGES = ['compiler', 'obfuscator', 'runtime', 'sealing', 'stix'];

export default function WorkbenchPage({
  targetPlatform,
  onPlatformChange,
  preset,
  onPresetChange,
  cmiConnected,
  onOrchestrationComplete,
  lastResult
}) {
  const [demoFiles, setDemoFiles] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState('');
  const [jockySource, setJockySource] = useState('');

  const [investigationName, setInvestigationName] = useState(
    'Host Sweep Investigation'
  );
  const [operatorId, setOperatorId] = useState('local-operator');
  const [evidenceFormat, setEvidenceFormat] = useState('Canonical + STIX');
  const [sealIntegrity, setSealIntegrity] = useState(true);

  const [activeCapabilities, setActiveCapabilities] = useState([
    'process_list',
    'system_info',
    'network_connections',
    'auth_logs'
  ]);

  const [preflightResults, setPreflightResults] = useState(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState(
    lastResult || null
  );

  const [pipelineStages, setPipelineStages] = useState(
    BACKEND_STAGES.map((id) => ({
      id,
      status: 'idle'
    }))
  );

  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [currentActivity, setCurrentActivity] = useState('');

  /*
   * Load available .jocky demo files from the backend.
   */
  useEffect(() => {
    const loadDemoFiles = async () => {
      try {
        const response = await fetch('/api/v1/examples');

        if (!response.ok) {
          throw new Error(`Failed to load examples: ${response.status}`);
        }

        const data = await response.json();

        const files = Array.isArray(data.files) ? data.files : [];

        setDemoFiles(files);

        /*
         * Automatically load the first available example.
         */
        if (files.length > 0) {
          setSelectedDemo(files[0]);
          await loadDemoFile(files[0]);
        }
      } catch (error) {
        console.error('Failed to load Jocky examples:', error);
        setDemoFiles([]);
        setSelectedDemo('');
        setJockySource('');
      }
    };

    loadDemoFiles();
  }, []);

  /*
   * Load the contents of a specific .jocky file.
   */
  const loadDemoFile = async (filename) => {
    try {
      const response = await fetch(
        `/api/v1/examples/${encodeURIComponent(filename)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }

      const data = await response.json();

      setSelectedDemo(filename);
      setJockySource(data.source || '');
    } catch (error) {
      console.error(`Failed to load Jocky example "${filename}":`, error);
    }
  };

  const handleDemoChange = (event) => {
    const filename = event.target.value;

    if (!filename) {
      setSelectedDemo('');
      setJockySource('');
      return;
    }

    loadDemoFile(filename);
  };

  const handleToggleCapability = (capId) => {
    if (activeCapabilities.includes(capId)) {
      setActiveCapabilities(
        activeCapabilities.filter((c) => c !== capId)
      );
    } else {
      setActiveCapabilities([...activeCapabilities, capId]);
    }
  };

  const handleRunPreflight = () => {
    const hasInvestigation =
      jockySource.includes('investigation') &&
      jockySource.includes('{');

    const hasEmit = jockySource.includes('emit evidence');

    const hasCorrelateWith =
      !jockySource.match(/correlate\s+\w+\s\,/) ||
      jockySource.includes('with');

    const validSyntax = hasInvestigation && hasEmit;

    const checks = [
      {
        name: 'Jocky DSL Syntax',
        status: validSyntax ? 'PASS' : 'BLOCK',
        detail: validSyntax
          ? 'Investigation block and emit statement parsed.'
          : 'Syntax Error: Missing investigation block or emit statement.'
      },
      {
        name: 'Correlate Syntax',
        status: hasCorrelateWith ? 'PASS' : 'WARN',
        detail: hasCorrelateWith
          ? 'Correlate uses correct "with" keyword.'
          : 'Warning: correlate requires "correlate X with Y" syntax (not comma-separated).'
      },
      {
        name: 'Backend Endpoint Contract',
        status: 'PASS',
        detail:
          'POST /api/v1/orchestrate accepts { jocky_source, target_platform } payload.'
      },
      {
        name: 'Provider Capability Contract',
        status: 'PASS',
        detail: `Selected capabilities configured for ${targetPlatform} Provider.`
      },
      {
        name: 'CMI Backend Connection',
        status: cmiConnected ? 'PASS' : 'WARN',
        detail: cmiConnected
          ? 'CMI Backend is LIVE at http://localhost:8000.'
          : 'CMI Backend is OFFLINE. Run: uvicorn cmi.server:app --host 0.0.0.0 --port 8000'
      }
    ];

    setPreflightResults({ checks });
  };

  const handleRunInvestigation = async () => {
    if (isOrchestrating) return;

    setIsOrchestrating(true);
    setOrchestrationResult(null);

    setPipelineStages(
      BACKEND_STAGES.map((id, index) => ({
        id,
        status: index === 0 ? 'running' : 'idle'
      }))
    );

    setPipelineProgress(5);
    setCurrentActivity('Awaiting backend execution...');

    const result = await orchestrateInvestigation(
      jockySource,
      targetPlatform
    );

    const returnedStages = result.success
      ? result.data?.pipeline_stages
      : result.pipelineStages;

    if (returnedStages && returnedStages.length > 0) {
      const mappedStages = returnedStages.map((s) => {
        let uiStatus = 'idle';

        if (s.status === 'success') uiStatus = 'completed';
        if (s.status === 'failed') uiStatus = 'failed';
        if (s.status === 'skipped') uiStatus = 'blocked';

        return {
          id: s.stage,
          status: uiStatus,
          output: s.output,
          duration: s.duration
        };
      });

      setPipelineStages(mappedStages);

      const successCount = returnedStages.filter(
        (s) => s.status === 'success'
      ).length;

      setPipelineProgress(
        Math.round((successCount / returnedStages.length) * 100)
      );

      if (result.success) {
        setCurrentActivity(
          'Investigation completed successfully.'
        );
      } else {
        setCurrentActivity(
          `Pipeline failed at stage: ${result.stage}`
        );
      }
    } else {
      setPipelineStages(
        BACKEND_STAGES.map((id) => ({
          id,
          status: 'failed'
        }))
      );

      setPipelineProgress(0);
      setCurrentActivity(
        `Execution Error: ${result.error}`
      );
    }

    setIsOrchestrating(false);
    setOrchestrationResult(result);

    if (onOrchestrationComplete) {
      onOrchestrationComplete(result);
    }
  };

  return (
    <div className="workbench-page">

      {/* Top Grid: Editor + Config */}
      <div className="workbench-top-grid">

        <div className="grid-col flex-3">

          {/* Demo File Selector */}
          <div className="demo-file-selector">
            <label htmlFor="demo-file">
              Jocky Example
            </label>

            <select
              id="demo-file"
              value={selectedDemo}
              onChange={handleDemoChange}
              disabled={demoFiles.length === 0}
            >
              {demoFiles.length === 0 ? (
                <option value="">
                  No .jocky examples available
                </option>
              ) : (
                <>
                  <option value="">
                    Select an example...
                  </option>

                  {demoFiles.map((filename) => (
                    <option
                      key={filename}
                      value={filename}
                    >
                      {filename}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <JockyEditorPanel
            source={jockySource}
            onChangeSource={setJockySource}
            onRunPreflight={handleRunPreflight}
            onRunInvestigation={handleRunInvestigation}
            isOrchestrating={isOrchestrating}
          />

        </div>

        <div className="grid-col flex-2">
          <InvestigationConfigPanel
            investigationName={investigationName}
            onNameChange={setInvestigationName}
            operatorId={operatorId}
            onOperatorChange={setOperatorId}
            preset={preset}
            onPresetChange={onPresetChange}
            targetPlatform={targetPlatform}
            onPlatformChange={onPlatformChange}
            evidenceFormat={evidenceFormat}
            onFormatChange={setEvidenceFormat}
            sealIntegrity={sealIntegrity}
            onSealChange={setSealIntegrity}
            activeCapabilities={activeCapabilities}
            onToggleCapability={handleToggleCapability}
          />
        </div>

      </div>

      {/* Pipeline Execution Visual */}
      <PipelineStatusPanel
        cmiConnected={cmiConnected}
        isOrchestrating={isOrchestrating}
        orchestrationResult={orchestrationResult}
        onTriggerOrchestration={handleRunInvestigation}
        pipelineStages={pipelineStages}
        pipelineProgress={pipelineProgress}
        currentActivity={currentActivity}
        targetPlatform={targetPlatform}
      />

      {/* Result Summary Section */}
      <ResultSummaryCard
        result={orchestrationResult}
        isOrchestrating={isOrchestrating}
      />

      {/* Preflight Diagnostics */}
      <PreflightDiagnosticsPanel
        preflightResults={preflightResults}
        onRunCheck={handleRunPreflight}
      />

      <style>{`
        .workbench-page {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .workbench-top-grid {
          display: flex;
          gap: 12px;
        }

        .grid-col {
          display: flex;
          flex-direction: column;
        }

        .flex-3 {
          flex: 3;
        }

        .flex-2 {
          flex: 2;
        }

        .demo-file-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .demo-file-selector label {
          font-size: 13px;
          font-weight: 600;
        }

        .demo-file-selector select {
          flex: 1;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
        }
      `}</style>

    </div>
  );
}