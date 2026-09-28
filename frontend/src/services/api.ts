import {
  Conveyor,
  Joint,
  PassEvent,
  Alert,
  SimStatus,
  RootInfo,
} from '../types/telemetry';

export const API_V1_PREFIX = '/api/v1';
export const WS_PATH = '/ws/live';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API Error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json();
}

/**
 * Resolves the base API origin URL from Vite environment variables.
 * In production (e.g. Vercel), this resolves to `import.meta.env.VITE_API_URL`.
 * Strips any trailing slashes and any trailing /api/v1 to prevent duplicate path segments (e.g. /api/v1/api/v1).
 * In local development, if VITE_API_URL is unset, it returns an empty string so requests fall back to relative paths ('/api/v1/...')
 * which are proxied to http://127.0.0.1:8000 by the Vite dev server proxy.
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  // Strip trailing /api/v1 if accidentally included in VITE_API_URL
  return raw.replace(new RegExp(`${API_V1_PREFIX}/?$`, 'i'), '');
}

export const API_BASE_URL: string = getApiBaseUrl();

/**
 * Builds a normalized API URL with optional query parameters.
 * Guarantees that:
 * 1. Path is prefixed with /api/v1 (avoiding duplicate /api/v1/api/v1).
 * 2. In production: resolves to https://<render-backend>/api/v1/...
 * 3. In local development: resolves to /api/v1/... (routed through Vite dev proxy).
 */
export function buildApiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Ensure path starts with API_V1_PREFIX
  if (!cleanPath.startsWith(API_V1_PREFIX)) {
    cleanPath = `${API_V1_PREFIX}${cleanPath}`;
  }

  // Deduplicate any repeated /api/v1 prefixes
  while (cleanPath.startsWith(`${API_V1_PREFIX}${API_V1_PREFIX}`)) {
    cleanPath = cleanPath.slice(API_V1_PREFIX.length);
  }

  const baseUrl = getApiBaseUrl();
  const fullPath = baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;

  if (!params) {
    return fullPath;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      searchParams.set(key, String(val));
    }
  });

  const queryString = searchParams.toString();
  if (!queryString) return fullPath;
  return `${fullPath}${fullPath.includes('?') ? '&' : '?'}${queryString}`;
}

/**
 * Constructs the WebSocket live stream URL.
 * - If VITE_API_URL is configured (e.g. https://beltscanx-backend.onrender.com):
 *   Derives wss:// from https: and connects directly to the backend host at WS_PATH (/ws/live).
 * - Otherwise (local development):
 *   Falls back to current browser origin/host (ws://localhost:5173/ws/live or wss://...)
 *   to leverage Vite's local dev server proxy (ws: true -> http://127.0.0.1:8000).
 */
export function getWebSocketUrl(endpoint: string = WS_PATH): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiUrl = (import.meta.env.VITE_API_URL || '').trim();

  if (apiUrl) {
    try {
      const urlStr = /^https?:\/\//i.test(apiUrl) ? apiUrl : `https://${apiUrl}`;
      const parsed = new URL(urlStr);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}${cleanEndpoint}`;
    } catch (e) {
      console.warn('Failed to parse VITE_API_URL for WebSocket URL, falling back to window.location:', e);
    }
  }

  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsProtocol = isSecure ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.host : '127.0.0.1:8000';
  return `${wsProtocol}//${host}${cleanEndpoint}`;
}

export const api = {
  getRootInfo: async (): Promise<RootInfo> => {
    const res = await fetch(buildApiUrl('/api/v1/info'));
    return handleResponse<RootInfo>(res);
  },

  getConveyors: async (): Promise<Conveyor[]> => {
    const res = await fetch(buildApiUrl('/api/v1/conveyors'));
    return handleResponse<Conveyor[]>(res);
  },

  getConveyor: async (conveyorId: string): Promise<Conveyor> => {
    const res = await fetch(buildApiUrl(`/api/v1/conveyors/${encodeURIComponent(conveyorId)}`));
    return handleResponse<Conveyor>(res);
  },

  getConveyorJoints: async (conveyorId: string): Promise<Joint[]> => {
    const res = await fetch(buildApiUrl(`/api/v1/conveyors/${encodeURIComponent(conveyorId)}/joints`));
    return handleResponse<Joint[]>(res);
  },

  getJointHistory: async (jointId: string, limit: number = 100): Promise<import('../types/telemetry').JointHistoryItem[]> => {
    const res = await fetch(buildApiUrl(`/api/v1/joints/${encodeURIComponent(jointId)}/history`, { limit }));
    return handleResponse<import('../types/telemetry').JointHistoryItem[]>(res);
  },

  getPassEvents: async (jointId?: string, limit: number = 50): Promise<PassEvent[]> => {
    const res = await fetch(buildApiUrl('/api/v1/pass-events', { joint_id: jointId, limit }));
    return handleResponse<PassEvent[]>(res);
  },

  getAlerts: async (state?: string, limit: number = 50): Promise<Alert[]> => {
    const res = await fetch(buildApiUrl('/api/v1/alerts', { state, limit }));
    return handleResponse<Alert[]>(res);
  },

  getSimStatus: async (): Promise<SimStatus> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/status'));
    return handleResponse<SimStatus>(res);
  },

  startSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/start'), { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  stopSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/stop'), { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  pauseSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/pause'), { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  resumeSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/resume'), { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  resetSimulation: async (): Promise<{ status: string; current_lap: number }> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/reset'), { method: 'POST' });
    return handleResponse<{ status: string; current_lap: number }>(res);
  },

  setSimulationSpeed: async (preset: string): Promise<{ status: string; preset: string }> => {
    const res = await fetch(buildApiUrl('/api/v1/sim/speed', { preset }), {
      method: 'POST',
    });
    return handleResponse<{ status: string; preset: string }>(res);
  },

  runDemo: async (): Promise<void> => {
    // 1. Reset simulation to lap 0
    await api.resetSimulation();
    // 2. Set to 600x fast simulation speed so degradation story unfolds smoothly
    await api.setSimulationSpeed('600x');
    // 3. Ensure it is running/resumed
    await api.resumeSimulation().catch(() => {});
  },
};
