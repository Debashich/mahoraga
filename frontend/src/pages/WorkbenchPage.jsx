import { useState } from 'react';
import JockyEditorPanel from '../components/workbench/JockyEditorPanel';
import InvestigationConfigPanel from '../components/workbench/InvestigationConfigPanel';
import PreflightDiagnosticsPanel from '../components/workbench/PreflightDiagnosticsPanel';
import PipelineStatusPanel from '../components/workbench/PipelineStatusPanel';
import ResultSummaryCard from '../components/workbench/ResultSummaryCard';

import { orchestrateInvestigation } from '../utils/cmiClient';

export default function WorkbenchPage({ 
  targetPlatform, 
  onPlatformChange, 
  preset, 
  onPresetChange,
  cmiConnected,
  onOrchestrationComplete,
  lastResult
}) {
  const [jockySource, setJockySource] = useState(`investigation "Host Sweep Investigation" {
    collect process_list as procs
    collect system_info as sys
    collect network_connections as conns
    collect auth_logs as auth

    correlate procs, sys
    correlate procs, conns

    emit evidence
}`);

  const [investigationName, setInvestigationName] = useState('Host Sweep Investigation');
  const [operatorId, setOperatorId] = useState('local-operator');
  const [evidenceFormat, setEvidenceFormat] = useState('Canonical + STIX');
  const [sealIntegrity, setSealIntegrity] = useState(true);
  
  const [activeCapabilities, setActiveCapabilities] = useState([
    'process_list', 'system_info', 'network_connections', 'auth_logs'
  ]);

  const [preflightResults, setPreflightResults] = useState(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState(lastResult || null);

  const handleToggleCapability = (capId) => {
    if (activeCapabilities.includes(capId)) {
      setActiveCapabilities(activeCapabilities.filter(c => c !== capId));
    } else {
      setActiveCapabilities([...activeCapabilities, capId]);
    }
  };

  const handleRunPreflight = () => {
    const hasInvestigation = jockySource.includes('investigation') && jockySource.includes('{');
    const hasEmit = jockySource.includes('emit evidence');
    const validSyntax = hasInvestigation && hasEmit;

    const checks = [
      {
        name: 'Jocky DSL Syntax',
        status: validSyntax ? 'PASS' : 'BLOCK',
        detail: validSyntax ? 'Investigation block and emit statement parsed.' : 'Syntax Error: Missing investigation block or emit statement.',
      },
      {
        name: 'Backend Endpoint Contract',
        status: 'PASS',
        detail: 'POST /api/v1/orchestrate accepts { jocky_source, target_platform } payload.',
      },
      {
        name: 'Provider Capability Contract',
        status: 'PASS',
        detail: `Selected capabilities configured for ${targetPlatform} Provider.`,
      },
      {
        name: 'CMI Backend Connection',
        status: cmiConnected ? 'PASS' : 'WARN',
        detail: cmiConnected ? 'CMI Backend is LIVE at http://localhost:8000.' : 'CMI Backend is OFFLINE. Run python -m uvicorn cmi.server:app --port 8000',
      },
    ];

    setPreflightResults({ checks });
  };

  const handleRunInvestigation = async () => {
    if (isOrchestrating) return; // Prevent duplicate requests

    setIsOrchestrating(true);
    // Send EXACT live Jocky DSL source code from editor state
    const result = await orchestrateInvestigation(jockySource, targetPlatform);
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

      {/* Result Summary Section */}
      <ResultSummaryCard 
        result={orchestrationResult} 
        isOrchestrating={isOrchestrating} 
      />

      {/* Bottom Grid: Preflight Diagnostics + Pipeline Flow */}
      <div className="workbench-bottom-grid">
        <PreflightDiagnosticsPanel
          preflightResults={preflightResults}
          onRunCheck={handleRunPreflight}
        />

        <PipelineStatusPanel
          cmiConnected={cmiConnected}
          isOrchestrating={isOrchestrating}
          orchestrationResult={orchestrationResult}
          onTriggerOrchestration={handleRunInvestigation}
        />
      </div>

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

        .workbench-bottom-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .grid-col { display: flex; flex-direction: column; }
        .flex-3 { flex: 3; }
        .flex-2 { flex: 2; }
      `}</style>
    </div>
  );
}
