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
} from '../types/telemetry';

export interface JointHistoryPoint {
  lap: number;
  health: number;
  timestamp: string;
}

export interface LiveDataState {
  conveyors: Conveyor[];
  selectedConveyorId: string;
  joints: Record<string, Joint>;
  jointOrder: string[]; // joint codes in order of position_m
  jointHistory: Record<string, JointHistoryPoint[]>; // last 100 live health updates per joint
  conveyorSummary: ConveyorSummaryMessage | null;
  simStatus: SimStatus | null;
  alerts: Alert[];
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
  joints: {},
  jointOrder: [],
  jointHistory: {},
  conveyorSummary: null,
  simStatus: null,
  alerts: [],
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
      };
    }
  | { type: 'UPDATE_ALERTS'; payload: Alert[] }
  | { type: 'UPDATE_SIM_STATUS'; payload: SimStatus }
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

    case 'SET_SELECTED_CONVEYOR':
      return {
        ...state,
        selectedConveyorId: action.payload,
      };

    case 'INIT_REST_DATA': {
      const jointsMap: Record<string, Joint> = {};
      const sortedJoints = [...action.payload.joints].sort((a, b) => a.position_m - b.position_m);
      const jointOrder = sortedJoints.map((j) => j.joint_code);

      sortedJoints.forEach((j) => {
        jointsMap[j.joint_code] = j;
        // Also map under joint.id (e.g. CV01_J01) for robust lookups
        jointsMap[j.id] = j;
      });

      // Calculate initial conveyor summary from joints if not yet received via WS
      let initialSummary = state.conveyorSummary;
      if (!initialSummary && sortedJoints.length > 0) {
        const healths = sortedJoints.map((j) => j.health);
        const avg = healths.reduce((a, b) => a + b, 0) / healths.length;
        const worst = Math.min(...healths);
        const worstJoint = sortedJoints.find((j) => j.health === worst)?.joint_code || 'J01';
        // Formula per PRD 6.4: Conveyor risk index = 0.6 * mean + 0.4 * worst_joint
        const riskIdx = 0.6 * avg + 0.4 * worst;

        initialSummary = {
          type: 'conveyor_summary',
          ts: new Date().toISOString(),
          conveyor_id: action.payload.simStatus?.conveyor_id || 'CV-01',
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

      return {
        ...state,
        rootInfo: action.payload.rootInfo,
        conveyors: action.payload.conveyors,
        joints: jointsMap,
        jointOrder,
        alerts: action.payload.alerts,
        simStatus: action.payload.simStatus,
        latestPassEvents: action.payload.passEvents || [],
        conveyorSummary: initialSummary,
        loading: false,
        error: null,
      };
    }

    case 'UPDATE_ALERTS':
      return {
        ...state,
        alerts: action.payload,
      };

    case 'UPDATE_SIM_STATUS':
      return {
        ...state,
        simStatus: action.payload,
      };

    case 'WS_HEALTH_UPDATE': {
      const msg = action.payload;
      const code = msg.joint_id; // e.g. "J04"
      const existingJoint = state.joints[code] || state.joints[`CV01_${code}`];

      const updatedJoint: Joint = {
        id: existingJoint?.id || `CV01_${code}`,
        joint_code: code,
        belt_id: existingJoint?.belt_id || 'BELT-01',
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

      const updatedJoints = {
        ...state.joints,
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

      // Recalculate dynamic conveyor summary if no conveyor_summary message arrived recently
      const jointCodes = state.jointOrder;
      let newSummary = state.conveyorSummary;
      if (jointCodes.length > 0) {
        const allHealths = jointCodes.map((c) => updatedJoints[c]?.health ?? 100);
        const avg = allHealths.reduce((a, b) => a + b, 0) / allHealths.length;
        const worst = Math.min(...allHealths);
        const worstJoint = jointCodes[allHealths.indexOf(worst)] || 'J01';
        const riskIdx = 0.6 * avg + 0.4 * worst;

        newSummary = {
          type: 'conveyor_summary',
          ts: msg.ts,
          run_id: msg.run_id || state.conveyorSummary?.run_id,
          conveyor_id: msg.conveyor_id,
          average_health: Math.round(avg * 10) / 10,
          worst_joint_id: worstJoint,
          worst_joint_health: Math.round(worst * 10) / 10,
          conveyor_risk_index: Math.round(riskIdx * 10) / 10,
          active_alerts_count: state.conveyorSummary?.active_alerts_count ?? state.alerts.length,
          lap_no: msg.lap_no,
          speed_mps: state.conveyorSummary?.speed_mps ?? 2.45,
          provenance: msg.provenance,
        };
      }

      return {
        ...state,
        joints: updatedJoints,
        jointHistory: {
          ...state.jointHistory,
          [code]: updatedHist,
        },
        conveyorSummary: newSummary,
        latestHealthUpdate: msg,
        lastMessageTime: msg.ts,
        secondsSinceLastMessage: 0,
        isStale: false,
      };
    }

    case 'WS_CONVEYOR_SUMMARY': {
      const msg = action.payload;
      return {
        ...state,
        conveyorSummary: msg,
        lastMessageTime: msg.ts,
        secondsSinceLastMessage: 0,
        isStale: false,
      };
    }

    case 'WS_SCENARIO_EVENT': {
      const msg = action.payload;
      return {
        ...state,
        latestScenarioEvent: msg,
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
