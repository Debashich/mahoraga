import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

import DashboardPage from './pages/DashboardPage';
import WorkbenchPage from './pages/WorkbenchPage';
import EvidencePage from './pages/EvidencePage';
import DetectionStixPage from './pages/DetectionStixPage';
import CmiConfigPage from './pages/CmiConfigPage';

import { checkCmiHealth } from './utils/cmiClient';

/**
 * Map any OS string ('windows', 'WIN32', 'Windows_NT', 'Linux x86_64',
 * 'ubuntu', ...) to the canonical value the UI uses: 'Windows' | 'Linux'.
 * Returns null when the string is not recognised (e.g. darwin).
 */
export function normalizePlatform(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return null;
  if (/^win/.test(v) || v.includes('windows')) return 'Windows';
  if (/linux|ubuntu|debian|fedora|centos|rhel|alpine/.test(v)) return 'Linux';
  return null;
}

function App() {
  const [activeRoute, setActiveRoute] = useState('workbench');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Target platform is the OS where the forensic CMI/provider runs.
  // Do not detect this from the browser's user-agent: the backend reports it.
  const [targetPlatform, setTargetPlatform] = useState('Linux');

  const [preset, setPreset] = useState('balanced');
  const [cmiConnected, setCmiConnected] = useState(false);
  const [cmiStatusText, setCmiStatusText] = useState('CHECKING');
  const [lastOrchestrationResult, setLastOrchestrationResult] = useState(null);

  // Investigation phase tracker state
  const [investigationPhases, setInvestigationPhases] = useState(null);

  // Backend OS is applied once, and never over a manual user choice
  const platformTouched = useRef(false);
  const platformSynced = useRef(false);

  // Every platform change goes through here so the value is always canonical
  const handlePlatformChange = useCallback((next) => {
    platformTouched.current = true;
    setTargetPlatform(normalizePlatform(next) ?? next);
  }, []);

  const applyHealth = useCallback((health) => {
    setCmiConnected(health.connected);
    setCmiStatusText(health.status);

    if (platformTouched.current || platformSynced.current) return;

    // Accept whichever field the backend /health response uses
    const reported = normalizePlatform(
      health.platform ??
        health.os ??
        health.system?.platform ??
        health.data?.platform
    );

    if (reported) {
      platformSynced.current = true;
      setTargetPlatform(reported);
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    applyHealth(await checkCmiHealth());
  }, [applyHealth]);

  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      const health = await checkCmiHealth();

      if (isMounted) {
        applyHealth(health);
      }
    };

    runCheck();

    const interval = setInterval(runCheck, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [applyHealth]);

  const renderActivePage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setActiveRoute}
            cmiConnected={cmiConnected}
            lastResult={lastOrchestrationResult}
          />
        );

      case 'evidence':
        return (
          <EvidencePage
            lastResult={lastOrchestrationResult}
            cmiConnected={cmiConnected}
          />
        );

      case 'detection':
        return (
          <DetectionStixPage
            lastResult={lastOrchestrationResult}
            cmiConnected={cmiConnected}
          />
        );

      case 'cmi':
        return (
          <CmiConfigPage
            targetPlatform={targetPlatform}
            onPlatformChange={handlePlatformChange}
            cmiConnected={cmiConnected}
            cmiStatusText={cmiStatusText}
            onRefreshHealth={refreshHealth}
          />
        );

      case 'workbench':
      default:
        return (
          <WorkbenchPage
            targetPlatform={targetPlatform}
            onPlatformChange={handlePlatformChange}
            preset={preset}
            onPresetChange={setPreset}
            cmiConnected={cmiConnected}
            onOrchestrationComplete={setLastOrchestrationResult}
            lastResult={lastOrchestrationResult}
            onInvestigationPhasesChange={setInvestigationPhases}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        cmiConnected={cmiConnected}
      />

      <div className="app-main-wrapper">
        <Header
          activeRoute={activeRoute}
          targetPlatform={targetPlatform}
          onPlatformChange={handlePlatformChange}
          preset={preset}
          onPresetChange={setPreset}
          cmiConnected={cmiConnected}
        />

        <main className="app-content">{renderActivePage()}</main>

        <Footer
          currentStatus={`Route: ${activeRoute.toUpperCase()} | Platform: ${targetPlatform} | CMI API: ${
            cmiConnected ? 'LIVE (PORT 8000)' : 'OFFLINE'
          }`}
          investigationPhases={investigationPhases}
        />
      </div>
    </div>
  );
}

export default App;