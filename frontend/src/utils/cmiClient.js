/**
 * Mahoraga CMI API Client
 * Interfaces with the Mahoraga FastAPI backend (cmi/server.py).
 * Uses same-origin proxied paths via Vite dev server proxy.
 */

const API_BASE_URL = import.meta.env.VITE_CMI_API_URL || '';

/**
 * Checks backend health by pinging /health endpoint.
 */
export async function checkCmiHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      return {
        connected: true,
        status: data.status || 'CONNECTED',
        url: API_BASE_URL || 'http://localhost:8000 (proxied)',
        hostOs: data.host_os || null,
      };
    }

    return {
      connected: false,
      status: 'ERROR',
      error: `HTTP ${response.status}`,
    };
  } catch {
    return {
      connected: false,
      status: 'OFFLINE',
      error: 'Backend unavailable. Ensure cmi/server.py is running on port 8000.',
    };
  }
}

/**
 * Calls POST /api/v1/orchestrate
 *
 * @param {string} jockySource
 * @param {string} targetPlatform
 * @returns {Promise<object>}
 */
export async function orchestrateInvestigation(
  jockySource,
  targetPlatform
) {
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
    }

    const errorDetail = data.detail || {};
    const pipelineStages = errorDetail.pipeline_stages || [];

    const failedStage = pipelineStages.find(
      (s) => s.status === 'failed'
    );

    const errorMessage =
      failedStage?.output ||
      errorDetail.message ||
      'Orchestration execution failed';

    return {
      success: false,
      error: errorMessage,
      stage: errorDetail.failed_stage || 'Unknown stage',
      investigationId: errorDetail.investigation_id || null,
      pipelineStages: pipelineStages,
      detail: errorDetail,
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error connecting to CMI Backend: ${err.message}`,
      stage: 'network_connection',
      pipelineStages: [],
    };
  }
}

/**
 * Builds the URL for the sealed evidence artifact.
 */
export function getEvidenceVaultUrl(investigationId) {
  if (!investigationId) return null;

  return `${API_BASE_URL}/api/v1/investigations/${encodeURIComponent(
    investigationId
  )}/evidence`;
}

/**
 * Builds the URL for the STIX 2.1 artifact.
 */
export function getStixBundleUrl(investigationId) {
  if (!investigationId) return null;

  return `${API_BASE_URL}/api/v1/investigations/${encodeURIComponent(
    investigationId
  )}/stix`;
}

/**
 * Downloads the complete investigation export ZIP.
 */
export async function downloadInvestigationExport(investigationId) {
  if (!investigationId) {
    throw new Error('Investigation ID is missing.');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/investigations/${encodeURIComponent(
      investigationId
    )}/export`
  );

  if (!response.ok) {
    let message = `Export failed (HTTP ${response.status})`;

    try {
      const data = await response.json();
      if (data?.detail) {
        message =
          typeof data.detail === 'string'
            ? data.detail
            : message;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${investigationId}_export.zip`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
}