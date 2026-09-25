export type Provenance = 'REAL_SITE' | 'REAL_LAB' | 'PUBLIC_PROXY' | 'SIMULATED';

export type RULStatus = 'UNAVAILABLE' | 'DEMO' | 'ESTIMATED' | 'VALIDATED';

export type HealthState = 'HEALTHY' | 'WATCH' | 'MAINTENANCE_REQUIRED' | 'CRITICAL';

export type Severity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';

export type AlertState = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SHELVED';

export type Modality = 'vision' | 'vibration' | 'thermal' | 'laser' | 'acoustic' | 'tension' | 'speed';

export interface RULPayload {
  status: RULStatus;
  reason?: string | null;
  low_days?: number | null;
  high_days?: number | null;
}

export interface ModalityContributor {
  score: number;
  confidence: number;
  quality: number;
  weight: number;
}

export interface HealthUpdateMessage {
  type: 'health_update';
  ts: string;
  run_id?: string;
  conveyor_id: string;
  joint_id: string;
  pass_event_id: string;
  lap_no: number;
  health: number;
  state: HealthState;
  confidence: number;
  risk: number;
  rul: RULPayload;
  contributors: Record<string, ModalityContributor>;
  provenance: Provenance;
}

export interface ConveyorSummaryMessage {
  type: 'conveyor_summary';
  ts: string;
  run_id?: string;
  conveyor_id: string;
  average_health: number;
  worst_joint_id: string;
  worst_joint_health: number;
  conveyor_risk_index: number;
  active_alerts_count: number;
  lap_no: number;
  speed_mps: number;
  provenance: Provenance;
}

export interface ScenarioEventMessage {
  type: 'scenario_event';
  ts: string;
  run_id: string;
  event: string;
  scenario: string;
  target_joint: string;
  critical_laps_held: number;
  action: string;
  provenance: Provenance;
}

export interface ConnectionAckMessage {
  type: 'connection_ack';
  message: string;
  endpoint: string;
  provenance: Provenance;
}

export type LiveWebSocketMessage =
  | HealthUpdateMessage
  | ConveyorSummaryMessage
  | ScenarioEventMessage
  | ConnectionAckMessage;

export interface Conveyor {
  id: string;
  name: string;
  mine_id: string;
  length_m: number;
  loop_length_m: number;
  speed_rating_mps: number;
  joint_count?: number;
  provenance: Provenance;
}

export interface Joint {
  id: string;
  joint_code: string;
  belt_id: string;
  position_m: number;
  splice_type: string;
  health: number;
  state: HealthState;
  risk_score: number;
  provenance: Provenance;
  last_pass_time?: string;
  rul?: RULPayload;
  contributors?: Record<string, ModalityContributor>;
}

export interface PassEvent {
  id: string;
  joint_id: string;
  station_id: string;
  lap_no: number;
  t_enter: string;
  t_exit: string;
  speed_mps: number;
  load_pct: number;
  provenance: Provenance;
}

export interface AlertEvidence {
  contributors?: Record<string, ModalityContributor>;
  abnormal_modalities?: string[];
  is_corroborated?: boolean;
  [key: string]: unknown;
}

export interface Alert {
  id: string;
  joint_id: string;
  pass_event_id: string;
  severity: Severity;
  state: AlertState;
  title: string;
  description: string | null;
  evidence: AlertEvidence;
  created_at: string;
  provenance: Provenance;
}

export interface SimStatus {
  run_id: string;
  lap: number;
  current_lap: number;
  speed_preset: string;
  paused: boolean;
  scenario_phase: string;
  running: boolean;
  conveyor_id: string;
  time_acceleration: number;
  belt_position_m: number;
  target_joint: string;
  critical_laps_held: number;
  provenance: Provenance;
}

export interface JointHistoryItem {
  pass_event_id: string;
  joint_id: string;
  lap: number;
  health: number;
  h_pass?: number;
  risk_score?: number;
  state: HealthState;
  confidence?: number;
  contributors?: Record<string, ModalityContributor>;
  rul?: RULPayload;
  timestamp: string;
  provenance: Provenance;
}

export type ActivityEventType = 'STATE_CHANGE' | 'SCENARIO_EVENT' | 'ALERT_TRIGGERED';

export interface ActivityLogEntry {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  jointCode?: string;
  title: string;
  description?: string;
  severity?: Severity;
  state?: HealthState;
  fromState?: HealthState;
  toState?: HealthState;
  health?: number;
  lap?: number;
  provenance: Provenance;
}

export interface RootInfo {
  platform: string;
  environment: string;
  provenance: Provenance;
  websocket_endpoint: string;
  demo_banner_required: boolean;
  advisory_only_notice: string;
}

export type ConnectionState = 'Connected' | 'Degraded' | 'Offline';

