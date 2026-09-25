import {
  Conveyor,
  Joint,
  PassEvent,
  Alert,
  SimStatus,
  RootInfo,
} from '../types/telemetry';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API Error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json();
}

export const api = {
  getRootInfo: async (): Promise<RootInfo> => {
    const res = await fetch('/');
    return handleResponse<RootInfo>(res);
  },

  getConveyors: async (): Promise<Conveyor[]> => {
    const res = await fetch('/api/v1/conveyors');
    return handleResponse<Conveyor[]>(res);
  },

  getConveyor: async (conveyorId: string): Promise<Conveyor> => {
    const res = await fetch(`/api/v1/conveyors/${encodeURIComponent(conveyorId)}`);
    return handleResponse<Conveyor>(res);
  },

  getConveyorJoints: async (conveyorId: string): Promise<Joint[]> => {
    const res = await fetch(`/api/v1/conveyors/${encodeURIComponent(conveyorId)}/joints`);
    return handleResponse<Joint[]>(res);
  },

  getJointHistory: async (jointId: string, limit: number = 100): Promise<import('../types/telemetry').JointHistoryItem[]> => {
    const url = new URL(`/api/v1/joints/${encodeURIComponent(jointId)}/history`, window.location.origin);
    url.searchParams.set('limit', limit.toString());
    const res = await fetch(url.pathname + url.search);
    return handleResponse<import('../types/telemetry').JointHistoryItem[]>(res);
  },

  getPassEvents: async (jointId?: string, limit: number = 50): Promise<PassEvent[]> => {
    const url = new URL('/api/v1/pass-events', window.location.origin);
    if (jointId) url.searchParams.set('joint_id', jointId);
    url.searchParams.set('limit', limit.toString());
    const res = await fetch(url.pathname + url.search);
    return handleResponse<PassEvent[]>(res);
  },

  getAlerts: async (state?: string, limit: number = 50): Promise<Alert[]> => {
    const url = new URL('/api/v1/alerts', window.location.origin);
    if (state) url.searchParams.set('state', state);
    url.searchParams.set('limit', limit.toString());
    const res = await fetch(url.pathname + url.search);
    return handleResponse<Alert[]>(res);
  },

  getSimStatus: async (): Promise<SimStatus> => {
    const res = await fetch('/api/v1/sim/status');
    return handleResponse<SimStatus>(res);
  },

  startSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch('/api/v1/sim/start', { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  stopSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch('/api/v1/sim/stop', { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  pauseSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch('/api/v1/sim/pause', { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  resumeSimulation: async (): Promise<{ status: string }> => {
    const res = await fetch('/api/v1/sim/resume', { method: 'POST' });
    return handleResponse<{ status: string }>(res);
  },

  resetSimulation: async (): Promise<{ status: string; current_lap: number }> => {
    const res = await fetch('/api/v1/sim/reset', { method: 'POST' });
    return handleResponse<{ status: string; current_lap: number }>(res);
  },

  setSimulationSpeed: async (preset: string): Promise<{ status: string; preset: string }> => {
    const res = await fetch(`/api/v1/sim/speed?preset=${encodeURIComponent(preset)}`, {
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
