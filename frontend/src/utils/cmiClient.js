/**
 * Mahoraga CMI API Client
 * Interfaces with the existing Mahoraga FastAPI backend (cmi/server.py).
 * Uses same-origin proxied paths (/openapi.json, /api/v1/orchestrate) via Vite dev server.
 */

const API_BASE_URL = import.meta.env.VITE_CMI_API_URL || '';

/**
 * Checks backend health by pinging OpenAPI schema exposed by FastAPI.
 */
export async function checkCmiHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/openapi.json`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { connected: true, status: 'CONNECTED', url: API_BASE_URL || 'http://localhost:8000 (proxied)' };
    }
    return { connected: false, status: 'ERROR', error: `HTTP ${response.status}` };
  } catch {
    return { 
      connected: false, 
      status: 'OFFLINE', 
      error: 'Backend unavailable. Ensure cmi/server.py is running on port 8000.' 
    };
  }
}

/**
 * Calls POST /api/v1/orchestrate
 * @param {string} jockySource - The Jocky DSL source code
 * @param {string} targetPlatform - 'Linux' or 'Windows'
 */
export async function orchestrateInvestigation(jockySource, targetPlatform) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jocky_source: jockySource,
        target_platform: targetPlatform,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: data,
      };
    } else {
      // FastAPI HTTPException detail
      const errorDetail = data.detail || {};
      return {
        success: false,
        error: errorDetail.error_output || errorDetail.message || 'Orchestration execution failed',
        stage: errorDetail.stage || 'Unknown stage',
        investigationId: errorDetail.investigation_id || null,
        detail: errorDetail,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: `Network error connecting to CMI Backend: ${err.message}`,
      stage: 'network_connection',
    };
  }
}
