import {
  Conveyor,
  Joint,
  Alert,
  SimStatus,
  RootInfo,
  ConnectionState,
  HealthUpdateMessage,
  ConveyorSummaryMessage,
  ScenarioEventMessage,
  PassEvent,
  ActivityLogEntry,
  JointHistoryItem,
} from '../types/telemetry';

export interface JointHistoryPoint {
  lap: number;
  health: number;
  timestamp: string;
}

export interface ConveyorStore {
  joints: Record<string, Joint>;
  jointOrder: string[];
  summary: ConveyorSummaryMessage | null;
}

export interface LiveDataState {
  conveyors: Conveyor[];
  selectedConveyorId: string;
  conveyorData: Record<string, ConveyorStore>;
  joints: Record<string, Joint>;
  jointOrder: string[]; // joint codes in order of position_m
  jointHistory: Record<string, JointHistoryPoint[]>; // last 100 live health updates per joint
  conveyorSummary: ConveyorSummaryMessage | null;
  simStatus: SimStatus | null;
  alerts: Alert[];
  activityLog: ActivityLogEntry[]; // dashboard-wide stream of state changes, scenario events, and alerts (newest first)
  latestPassEvents: PassEvent[];
  latestScenarioEvent: ScenarioEventMessage | null;
  dismissedScenarioEventTs: string | null;
  connectionState: ConnectionState;
  lastMessageTime: string | null;
  secondsSinceLastMessage: number;
  isStale: boolean; // >= 10s
  hasSimulatedData: boolean;
  rootInfo: RootInfo | null;
  latestHealthUpdate: HealthUpdateMessage | null;
  loading: boolean;
  error: string | null;
  devMode: boolean;
}

export const INITIAL_STATE: LiveDataState = {
  conveyors: [],
  selectedConveyorId: 'CV-01',
  conveyorData: {},
  joints: {},
  jointOrder: [],
  jointHistory: {},
  conveyorSummary: null,
  simStatus: null,
  alerts: [],
  activityLog: [],
  latestPassEvents: [],
  latestScenarioEvent: null,
  dismissedScenarioEventTs: null,
  connectionState: 'Offline',
  lastMessageTime: null,
  secondsSinceLastMessage: 0,
  isStale: false,
  hasSimulatedData: true,
  rootInfo: null,
  latestHealthUpdate: null,
  loading: true,
  error: null,
  devMode: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1',
};

export type LiveDataAction =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'TICK_FRESHNESS'; payload: { seconds: number; isStale: boolean } }
  | { type: 'SET_DEV_MODE'; payload: boolean }
  | { type: 'DISMISS_SCENARIO_EVENT' }
  | { type: 'SET_SELECTED_CONVEYOR'; payload: string }
  | {
      type: 'INIT_REST_DATA';
      payload: {
        rootInfo: RootInfo;
        conveyors: Conveyor[];
        joints: Joint[];
        alerts: Alert[];
        simStatus: SimStatus;
        passEvents?: PassEvent[];
        conveyorId?: string;
      };
    }
  | { type: 'UPDATE_ALERTS'; payload: Alert[] }
  | { type: 'UPDATE_SIM_STATUS'; payload: SimStatus }
  | { type: 'SET_JOINT_HISTORY'; payload: { jointCode: string; history: JointHistoryItem[] } }
  | { type: 'WS_HEALTH_UPDATE'; payload: HealthUpdateMessage }
  | { type: 'WS_CONVEYOR_SUMMARY'; payload: ConveyorSummaryMessage }
  | { type: 'WS_SCENARIO_EVENT'; payload: ScenarioEventMessage }
  | { type: 'SET_ERROR'; payload: string };

export function liveDataReducer(state: LiveDataState, action: LiveDataAction): LiveDataState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload,
      };

    case 'TICK_FRESHNESS':
      return {
        ...state,
        secondsSinceLastMessage: action.payload.seconds,
        isStale: action.payload.isStale,
      };

    case 'SET_DEV_MODE':
      return {
        ...state,
        devMode: action.payload,
      };

    case 'DISMISS_SCENARIO_EVENT':
      return {
        ...state,
        dismissedScenarioEventTs: state.latestScenarioEvent?.ts || null,
      };

    case 'SET_SELECTED_CONVEYOR': {
      const targetId = action.payload;
      const cached = state.conveyorData[targetId];
      return {
        ...state,
        selectedConveyorId: targetId,
        joints: cached ? cached.joints : state.joints,
        jointOrder: cached ? cached.jointOrder : state.jointOrder,
        conveyorSummary: cached ? cached.summary : state.conveyorSummary,
      };
    }

    case 'INIT_REST_DATA': {
      const targetConveyorId =
        action.payload.conveyorId ||
        state.selectedConveyorId ||
        action.payload.simStatus?.conveyor_id ||
        'CV-01';

      const jointsMap: Record<string, Joint> = {};
      const sortedJoints = [...action.payload.joints].sort((a, b) => a.position_m - b.position_m);
      const jointOrder = sortedJoints.map((j) => j.joint_code);

      sortedJoints.forEach((j) => {
        jointsMap[j.joint_code] = j;
        jointsMap[j.id] = j;
      });

      // Calculate initial conveyor summary from joints if not yet received via WS
      let initialSummary = state.conveyorData[targetConveyorId]?.summary || state.conveyorSummary;
      if (!initialSummary && sortedJoints.length > 0) {
        const healths = sortedJoints.map((j) => j.health);
        const avg = healths.reduce((a, b) => a + b, 0) / healths.length;
        const worst = Math.min(...healths);
        const worstJoint = sortedJoints.find((j) => j.health === worst)?.joint_code || 'J01';
        const riskIdx = 0.6 * avg + 0.4 * worst;

        initialSummary = {
          type: 'conveyor_summary',
          ts: new Date().toISOString(),
          conveyor_id: targetConveyorId,
          average_health: Math.round(avg * 10) / 10,
          worst_joint_id: worstJoint,
          worst_joint_health: Math.round(worst * 10) / 10,
          conveyor_risk_index: Math.round(riskIdx * 10) / 10,
          active_alerts_count: action.payload.alerts.length,
          lap_no: action.payload.simStatus?.lap || 0,
          speed_mps: 2.45,
          provenance: 'SIMULATED',
        };
      }

      const updatedConveyorData: Record<string, ConveyorStore> = {
        ...state.conveyorData,
        [targetConveyorId]: {
          joints: jointsMap,
          jointOrder,
          summary: initialSummary,
        },
      };

      const isCurrentConveyor = state.selectedConveyorId === targetConveyorId;

      // Seed initial activity log from active alerts if any
      const initialAlertLogs: ActivityLogEntry[] = action.payload.alerts.map((a) => ({
        id: `log_init_${a.id}`,
        type: 'ALERT_TRIGGERED',
        timestamp: a.created_at,
        jointCode: a.joint_id.replace(/^CV01_/, '').replace(/^CV02_/, ''),
        title: a.title,
        description: a.description || undefined,
        severity: a.severity,
        provenance: a.provenance,
      }));

      return {
        ...state,
        rootInfo: action.payload.rootInfo,
        conveyors: action.payload.conveyors,
        conveyorData: updatedConveyorData,
        joints: isCurrentConveyor ? jointsMap : state.joints,
        jointOrder: isCurrentConveyor ? jointOrder : state.jointOrder,
        alerts: action.payload.alerts,
        activityLog: initialAlertLogs.length > 0 ? initialAlertLogs : state.activityLog,
        simStatus: action.payload.simStatus,
        latestPassEvents: action.payload.passEvents || state.latestPassEvents,
        conveyorSummary: isCurrentConveyor ? initialSummary : state.conveyorSummary,
        loading: false,
        error: null,
      };
    }

    case 'UPDATE_ALERTS': {
      const incomingAlerts = action.payload;
      return {
        ...state,
        alerts: incomingAlerts,
      };
    }

    case 'UPDATE_SIM_STATUS':
      return {
        ...state,
        simStatus: action.payload,
      };

    case 'SET_JOINT_HISTORY': {
      const { jointCode, history } = action.payload;
      const mappedPoints: JointHistoryPoint[] = history.map((h) => ({
        lap: h.lap,
        health: Math.round(h.health * 10) / 10,
        timestamp: h.timestamp,
      }));

      const existingPoints = state.jointHistory[jointCode] || [];
      const seen = new Set<string>();
      const combined: JointHistoryPoint[] = [];

      [...mappedPoints, ...existingPoints].forEach((pt) => {
        const key = `${pt.lap}_${pt.timestamp}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(pt);
        }
      });

      combined.sort((a, b) => a.lap - b.lap);

      return {
        ...state,
        jointHistory: {
          ...state.jointHistory,
          [jointCode]: combined.slice(-100),
        },
      };
    }

    case 'WS_HEALTH_UPDATE': {
      const msg = action.payload;
      const targetCvId = msg.conveyor_id || 'CV-01';
      const code = msg.joint_id; // e.g. "J04"

      const existingCvStore = state.conveyorData[targetCvId] || {
        joints: state.joints,
        jointOrder: state.jointOrder,
        summary: state.conveyorSummary,
      };

      const existingJoint = existingCvStore.joints[code] || existingCvStore.joints[`${targetCvId.replace('-', '')}_${code}`] || state.joints[code];
      const previousState = existingJoint?.state || 'HEALTHY';
      const newState = msg.state;
      const stateChanged = existingJoint && previousState !== newState;

      const updatedJoint: Joint = {
        id: existingJoint?.id || `${targetCvId.replace('-', '')}_${code}`,
        joint_code: code,
        belt_id: existingJoint?.belt_id || (targetCvId === 'CV-02' ? 'BELT-02' : 'BELT-01'),
        position_m: existingJoint?.position_m || 0,
        splice_type: existingJoint?.splice_type || 'Finger Splice Hot Vulcanized',
        health: msg.health,
        state: msg.state,
        risk_score: msg.risk,
        provenance: msg.provenance,
        last_pass_time: msg.ts,
        rul: msg.rul,
        contributors: msg.contributors,
      };

      const updatedCvJoints = {
        ...existingCvStore.joints,
        [code]: updatedJoint,
        [updatedJoint.id]: updatedJoint,
      };

      // Append to memory history for this joint (max 100 points)
      const currentHist = state.jointHistory[code] || [];
      const newPoint: JointHistoryPoint = {
        lap: msg.lap_no,
        health: Math.round(msg.health * 10) / 10,
        timestamp: msg.ts,
      };
      const updatedHist = [...currentHist, newPoint].slice(-100);

      // Track state transition in dashboard-wide activity log
      let nextActivityLog = state.activityLog;
      if (stateChanged) {
        const severityMap: Record<string, import('../types/telemetry').Severity> = {
          HEALTHY: 'INFO',
          WATCH: 'WATCH',
          MAINTENANCE_REQUIRED: 'WARNING',
          CRITICAL: 'CRITICAL',
        };
        const stateChangeEntry: ActivityLogEntry = {
          id: `evt_state_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'STATE_CHANGE',
          timestamp: msg.ts,
          jointCode: code,
          title: `Joint ${code} State Change: ${previousState} → ${newState}`,
          description: `Health score moved to ${msg.health.toFixed(1)}% (Lap ${msg.lap_no}). Risk: ${msg.risk.toFixed(2)}.`,
          severity: severityMap[newState] || 'INFO',
          state: newState,
          fromState: previousState,
          toState: newState,
          health: msg.health,
          lap: msg.lap_no,
          provenance: msg.provenance,
        };
        nextActivityLog = [stateChangeEntry, ...state.activityLog].slice(0, 100);
      }

      // Recalculate dynamic conveyor summary for this conveyor
      const jointCodes = existingCvStore.jointOrder.length > 0 ? existingCvStore.jointOrder : state.jointOrder;
      let newSummary = existingCvStore.summary;
      if (jointCodes.length > 0) {
        const allHealths = jointCodes.map((c) => updatedCvJoints[c]?.health ?? 100);
        const avg = allHealths.reduce((a, b) => a + b, 0) / allHealths.length;
        const worst = Math.min(...allHealths);
        const worstJoint = jointCodes[allHealths.indexOf(worst)] || 'J01';
        const riskIdx = 0.6 * avg + 0.4 * worst;

        newSummary = {
          type: 'conveyor_summary',
          ts: msg.ts,
          run_id: msg.run_id || existingCvStore.summary?.run_id,
          conveyor_id: targetCvId,
          average_health: Math.round(avg * 10) / 10,
          worst_joint_id: worstJoint,
          worst_joint_health: Math.round(worst * 10) / 10,
          conveyor_risk_index: Math.round(riskIdx * 10) / 10,
          active_alerts_count: existingCvStore.summary?.active_alerts_count ?? state.alerts.length,
          lap_no: msg.lap_no,
          speed_mps: existingCvStore.summary?.speed_mps ?? 2.45,
          provenance: msg.provenance,
        };
      }

      const updatedCvStore: ConveyorStore = {
        joints: updatedCvJoints,
        jointOrder: jointCodes,
        summary: newSummary,
      };

      const isCurrentConveyor = state.selectedConveyorId === targetCvId;

      return {
        ...state,
        conveyorData: {
          ...state.conveyorData,
          [targetCvId]: updatedCvStore,
        },
        joints: isCurrentConveyor ? updatedCvJoints : state.joints,
        jointOrder: isCurrentConveyor ? jointCodes : state.jointOrder,
        jointHistory: {
          ...state.jointHistory,
          [code]: updatedHist,
        },
        activityLog: nextActivityLog,
        conveyorSummary: isCurrentConveyor ? newSummary : state.conveyorSummary,
        latestHealthUpdate: msg,
        lastMessageTime: msg.ts,
        secondsSinceLastMessage: 0,
        isStale: false,
      };
    }

    case 'WS_CONVEYOR_SUMMARY': {
      const msg = action.payload;
      const targetCvId = msg.conveyor_id || 'CV-01';
      const existingCvStore = state.conveyorData[targetCvId];

      const updatedConveyorData = {
        ...state.conveyorData,
        [targetCvId]: {
          joints: existingCvStore?.joints || state.joints,
          jointOrder: existingCvStore?.jointOrder || state.jointOrder,
          summary: msg,
        },
      };

      const isCurrentConveyor = state.selectedConveyorId === targetCvId;

      return {
        ...state,
        conveyorData: updatedConveyorData,
        conveyorSummary: isCurrentConveyor ? msg : state.conveyorSummary,
        lastMessageTime: msg.ts,
        secondsSinceLastMessage: 0,
        isStale: false,
      };
    }

    case 'WS_SCENARIO_EVENT': {
      const msg = action.payload;
      const scenarioLogEntry: ActivityLogEntry = {
        id: `evt_scen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'SCENARIO_EVENT',
        timestamp: msg.ts,
        jointCode: msg.target_joint,
        title: `Scenario Milestone: ${msg.event}`,
        description: `Target joint ${msg.target_joint} held Critical for ${msg.critical_laps_held} laps. Action: ${msg.action}.`,
        severity: 'CRITICAL',
        state: 'CRITICAL',
        lap: state.simStatus?.lap || 0,
        provenance: msg.provenance,
      };

      return {
        ...state,
        latestScenarioEvent: msg,
        activityLog: [scenarioLogEntry, ...state.activityLog].slice(0, 100),
        lastMessageTime: msg.ts,
        secondsSinceLastMessage: 0,
        isStale: false,
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    default:
      return state;
  }
}
