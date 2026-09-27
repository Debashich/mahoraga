import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

import DashboardPage from './pages/DashboardPage';
import WorkbenchPage from './pages/WorkbenchPage';
import EvidencePage from './pages/EvidencePage';
import DetectionStixPage from './pages/DetectionStixPage';
import CmiConfigPage from './pages/CmiConfigPage';

import { checkCmiHealth } from './utils/cmiClient';

function App() {
  const [activeRoute, setActiveRoute] = useState('workbench');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [targetPlatform, setTargetPlatform] = useState('Linux');
  const [preset, setPreset] = useState('balanced');
  const [cmiConnected, setCmiConnected] = useState(false);
  const [cmiStatusText, setCmiStatusText] = useState('CHECKING');
  const [lastOrchestrationResult, setLastOrchestrationResult] = useState(null);

  const refreshHealth = useCallback(async () => {
    const health = await checkCmiHealth();
    setCmiConnected(health.connected);
    setCmiStatusText(health.status);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      const health = await checkCmiHealth();
      if (isMounted) {
        setCmiConnected(health.connected);
        setCmiStatusText(health.status);
      }
    };
    runCheck();
    const interval = setInterval(runCheck, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      case 'workbench':
        return (
          <WorkbenchPage
            targetPlatform={targetPlatform}
            onPlatformChange={setTargetPlatform}
            preset={preset}
            onPresetChange={setPreset}
            cmiConnected={cmiConnected}
            onOrchestrationComplete={setLastOrchestrationResult}
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
            onPlatformChange={setTargetPlatform}
            cmiConnected={cmiConnected}
            cmiStatusText={cmiStatusText}
            onRefreshHealth={refreshHealth}
          />
        );
      default:
        return (
          <WorkbenchPage
            targetPlatform={targetPlatform}
            onPlatformChange={setTargetPlatform}
            preset={preset}
            onPresetChange={setPreset}
            cmiConnected={cmiConnected}
            onOrchestrationComplete={setLastOrchestrationResult}
            lastResult={lastOrchestrationResult}
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
          onPlatformChange={setTargetPlatform}
          preset={preset}
          onPresetChange={setPreset}
          cmiConnected={cmiConnected}
        />

        <main className="app-content">
          {renderActivePage()}
        </main>

        <Footer 
          currentStatus={`Route: ${activeRoute.toUpperCase()} | Platform: ${targetPlatform} | CMI API: ${cmiConnected ? 'LIVE (PORT 8000)' : 'OFFLINE'}`} 
        />
      </div>
    </div>
  );
}

export default App;
