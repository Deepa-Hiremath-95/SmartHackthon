import { useEffect, useReducer, useRef, useCallback } from 'react';
import { api } from '../services/api';
import {
  liveDataReducer,
  INITIAL_STATE,
} from './liveDataReducer';
import { LiveWebSocketMessage } from '../types/telemetry';

export function useLiveData() {
  const [state, dispatch] = useReducer(liveDataReducer, INITIAL_STATE);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(1000); // 1s initial backoff
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const freshnessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<number>(Date.now());
  const selectedConveyorRef = useRef<string>(state.selectedConveyorId);

  selectedConveyorRef.current = state.selectedConveyorId;

  // 1. Initial REST backfill
  const loadInitialData = useCallback(async (conveyorId: string) => {
    try {
      const [rootInfo, conveyors, joints, alerts, simStatus, passEvents] = await Promise.all([
        api.getRootInfo().catch(() => ({
          platform: 'NEXVION',
          environment: 'production',
          provenance: 'SIMULATED' as const,
          websocket_endpoint: '/ws/live',
          demo_banner_required: true,
          advisory_only_notice: 'Advisory only. NEXVION never starts or stops physical machinery.',
        })),
        api.getConveyors().catch(() => []),
        api.getConveyorJoints(conveyorId).catch(() => []),
        api.getAlerts('ACTIVE').catch(() => []),
        api.getSimStatus().catch(() => null),
        api.getPassEvents(undefined, 25).catch(() => []),
      ]);

        dispatch({
          type: 'INIT_REST_DATA',
          payload: {
            rootInfo,
            conveyors,
            joints,
            alerts,
            simStatus: simStatus || {
              run_id: 'init_run',
              lap: 0,
              current_lap: 0,
              speed_preset: '600x',
              paused: false,
              scenario_phase: 'HEALTHY',
              running: true,
              conveyor_id: conveyorId,
              time_acceleration: 600,
              belt_position_m: 0,
              target_joint: 'J04',
              critical_laps_held: 0,
              provenance: 'SIMULATED',
            },
            passEvents,
            conveyorId,
          },
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to backfill data from REST API';
      dispatch({ type: 'SET_ERROR', payload: msg });
    }
  }, []);

  // 2. Alert refresher
  const refetchAlerts = useCallback(async () => {
    try {
      const activeAlerts = await api.getAlerts('ACTIVE');
      dispatch({ type: 'UPDATE_ALERTS', payload: activeAlerts });
    } catch (e) {
      console.warn('Failed to refetch alerts:', e);
    }
  }, []);

  // 3. Sim status refresher
  const refetchSimStatus = useCallback(async () => {
    try {
      const status = await api.getSimStatus();
      dispatch({ type: 'UPDATE_SIM_STATUS', payload: status });
    } catch (e) {
      console.warn('Failed to refetch sim status:', e);
    }
  }, []);

  // 4. WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        // ignore
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;

    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Offline' });

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectDelayRef.current = 1000; // Reset backoff on success
        lastMessageTimestampRef.current = Date.now();
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Connected' });

        // Setup ping keepalive every 15s
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        lastMessageTimestampRef.current = Date.now();
        try {
          const data: LiveWebSocketMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'health_update': {
              dispatch({ type: 'WS_HEALTH_UPDATE', payload: data });
              // If joint is in abnormal condition, refresh alerts to capture new records
              if (data.health < 85) {
                refetchAlerts();
              }
              break;
            }
            case 'conveyor_summary': {
              dispatch({ type: 'WS_CONVEYOR_SUMMARY', payload: data });
              // Sync sim status when lap finishes
              refetchSimStatus();
              break;
            }
            case 'scenario_event': {
              dispatch({ type: 'WS_SCENARIO_EVENT', payload: data });
              refetchSimStatus();
              break;
            }
            case 'connection_ack': {
              dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Connected' });
              break;
            }
            default:
              break;
          }
        } catch (e) {
          console.warn('Error parsing incoming WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket error:', e);
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Offline' });
      };

      ws.onclose = () => {
        dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Offline' });
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Exponential backoff reconnect
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, 10000); // capped at 10s

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Offline' });
    }
  }, [refetchAlerts, refetchSimStatus]);

  // Initial mount: load REST & connect WS
  useEffect(() => {
    loadInitialData(state.selectedConveyorId);
    connectWebSocket();

    // 1-second interval to calculate freshness seconds and mark degraded/stale
    freshnessTimerRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastMessageTimestampRef.current) / 1000);
      const isStale = elapsedSec >= 10;
      dispatch({
        type: 'TICK_FRESHNESS',
        payload: { seconds: elapsedSec, isStale },
      });

      // Update connection state to Degraded if socket is open but idle > 10s
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        if (isStale) {
          dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Degraded' });
        } else {
          dispatch({ type: 'SET_CONNECTION_STATE', payload: 'Connected' });
        }
      }
    }, 1000);

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (freshnessTimerRef.current) clearInterval(freshnessTimerRef.current);
    };
  }, [loadInitialData, connectWebSocket, state.selectedConveyorId]);

  const setSelectedConveyor = useCallback((id: string) => {
    dispatch({ type: 'SET_SELECTED_CONVEYOR', payload: id });
    loadInitialData(id);
  }, [loadInitialData]);

  const dismissScenarioEvent = useCallback(() => {
    dispatch({ type: 'DISMISS_SCENARIO_EVENT' });
  }, []);

  const setDevMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_DEV_MODE', payload: enabled });
  }, []);

  const loadJointHistory = useCallback(async (jointCode: string) => {
    try {
      const history = await api.getJointHistory(jointCode);
      dispatch({
        type: 'SET_JOINT_HISTORY',
        payload: { jointCode, history },
      });
      return history;
    } catch (e) {
      console.warn(`Failed to load history for joint ${jointCode}:`, e);
      return [];
    }
  }, []);

  const runDemo = useCallback(async () => {
    await api.runDemo();
    await refetchSimStatus();
    await refetchAlerts();
  }, [refetchSimStatus, refetchAlerts]);

  return {
    state,
    setSelectedConveyor,
    loadJointHistory,
    refetchAlerts,
    refetchSimStatus,
    dismissScenarioEvent,
    setDevMode,
    runDemo,
  };
}
