import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

import DashboardPage from './pages/DashboardPage';
import WorkbenchPage from './pages/WorkbenchPage';
import EvidencePage from './pages/EvidencePage';
import DetectionStixPage from './pages/DetectionStixPage';
import CmiConfigPage from './pages/CmiConfigPage';

function App() {
  const [activeRoute, setActiveRoute] = useState('workbench');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [targetPlatform, setTargetPlatform] = useState('Linux');
  const [preset, setPreset] = useState('balanced');
  const [cmiConnected] = useState(false);

  const renderActivePage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveRoute} />;
      case 'workbench':
        return (
          <WorkbenchPage
            targetPlatform={targetPlatform}
            onPlatformChange={setTargetPlatform}
            preset={preset}
            onPresetChange={setPreset}
          />
        );
      case 'evidence':
        return <EvidencePage />;
      case 'detection':
        return <DetectionStixPage />;
      case 'cmi':
        return (
          <CmiConfigPage
            targetPlatform={targetPlatform}
            onPlatformChange={setTargetPlatform}
          />
        );
      default:
        return (
          <WorkbenchPage
            targetPlatform={targetPlatform}
            onPlatformChange={setTargetPlatform}
            preset={preset}
            onPresetChange={setPreset}
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

        <Footer currentStatus={`Route: ${activeRoute.toUpperCase()} | Platform: ${targetPlatform} | CMI API Standalone Demo Mode`} />
      </div>
    </div>
  );
}

export default App;
