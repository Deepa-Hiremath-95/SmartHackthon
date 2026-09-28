import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildApiUrl, getWebSocketUrl, getApiBaseUrl, API_V1_PREFIX, WS_PATH } from './api';

describe('API and WebSocket URL builders', () => {
  const originalEnv = import.meta.env.VITE_API_URL;

  afterEach(() => {
    (import.meta.env as any).VITE_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  describe('API_V1_PREFIX and WS_PATH constants', () => {
    it('matches backend configuration', () => {
      expect(API_V1_PREFIX).toBe('/api/v1');
      expect(WS_PATH).toBe('/ws/live');
    });
  });

  describe('getApiBaseUrl and buildApiUrl', () => {
    it('builds relative paths when VITE_API_URL is empty (local proxy mode)', () => {
      (import.meta.env as any).VITE_API_URL = '';
      expect(getApiBaseUrl()).toBe('');
      expect(buildApiUrl('/api/v1/info')).toBe('/api/v1/info');
      expect(buildApiUrl('api/v1/conveyors')).toBe('/api/v1/conveyors');
      expect(buildApiUrl('/conveyors')).toBe('/api/v1/conveyors');
    });

    it('prevents accidental duplicate /api/v1/api/v1 prefixes', () => {
      (import.meta.env as any).VITE_API_URL = '';
      expect(buildApiUrl('/api/v1/api/v1/conveyors')).toBe('/api/v1/conveyors');
    });

    it('attaches query parameters to relative paths', () => {
      (import.meta.env as any).VITE_API_URL = '';
      const url = buildApiUrl('/api/v1/alerts', { state: 'ACTIVE', limit: 50 });
      expect(url).toBe('/api/v1/alerts?state=ACTIVE&limit=50');
    });

    it('omits undefined or null query parameters', () => {
      (import.meta.env as any).VITE_API_URL = '';
      const url = buildApiUrl('/api/v1/pass-events', { joint_id: undefined, limit: 25 });
      expect(url).toBe('/api/v1/pass-events?limit=25');
    });

    it('builds absolute production URL when VITE_API_URL is set', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com';
      expect(getApiBaseUrl()).toBe('https://beltscanx-backend.onrender.com');
      expect(buildApiUrl('/api/v1/info')).toBe('https://beltscanx-backend.onrender.com/api/v1/info');
      expect(buildApiUrl('/api/v1/conveyors/CV-01')).toBe('https://beltscanx-backend.onrender.com/api/v1/conveyors/CV-01');
    });

    it('strips trailing slashes from VITE_API_URL when building paths', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com/';
      expect(getApiBaseUrl()).toBe('https://beltscanx-backend.onrender.com');
      expect(buildApiUrl('/api/v1/info')).toBe('https://beltscanx-backend.onrender.com/api/v1/info');
    });

    it('strips trailing /api/v1 from VITE_API_URL to prevent duplicate prefixes', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com/api/v1';
      expect(getApiBaseUrl()).toBe('https://beltscanx-backend.onrender.com');
      expect(buildApiUrl('/api/v1/info')).toBe('https://beltscanx-backend.onrender.com/api/v1/info');

      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com/api/v1/';
      expect(getApiBaseUrl()).toBe('https://beltscanx-backend.onrender.com');
      expect(buildApiUrl('/api/v1/info')).toBe('https://beltscanx-backend.onrender.com/api/v1/info');
    });

    it('combines production URL with query parameters', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com';
      const url = buildApiUrl('/api/v1/alerts', { state: 'ACTIVE', limit: 50 });
      expect(url).toBe('https://beltscanx-backend.onrender.com/api/v1/alerts?state=ACTIVE&limit=50');
    });
  });

  describe('getWebSocketUrl', () => {
    it('constructs wss:// URL when VITE_API_URL uses https', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com';
      expect(getWebSocketUrl('/ws/live')).toBe('wss://beltscanx-backend.onrender.com/ws/live');
      expect(getWebSocketUrl()).toBe('wss://beltscanx-backend.onrender.com/ws/live');
    });

    it('handles trailing slash on VITE_API_URL for WebSocket', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com/';
      expect(getWebSocketUrl('/ws/live')).toBe('wss://beltscanx-backend.onrender.com/ws/live');
    });

    it('handles VITE_API_URL configured with /api/v1 for WebSocket', () => {
      (import.meta.env as any).VITE_API_URL = 'https://beltscanx-backend.onrender.com/api/v1';
      expect(getWebSocketUrl('/ws/live')).toBe('wss://beltscanx-backend.onrender.com/ws/live');
    });

    it('constructs ws:// URL when VITE_API_URL uses http', () => {
      (import.meta.env as any).VITE_API_URL = 'http://127.0.0.1:8000';
      expect(getWebSocketUrl('/ws/live')).toBe('ws://127.0.0.1:8000/ws/live');
    });

    it('falls back to window.location with ws: on http local development', () => {
      (import.meta.env as any).VITE_API_URL = '';
      const url = getWebSocketUrl('/ws/live');
      expect(url).toMatch(/^ws:\/\//);
      expect(url).toContain('/ws/live');
    });
  });
});
