import { describe, it, expect } from 'vitest';
import { liveDataReducer, INITIAL_STATE } from './liveDataReducer';
import { Joint, Conveyor, SimStatus, RootInfo, HealthUpdateMessage } from '../types/telemetry';

describe('liveDataReducer tests', () => {
  const mockConveyor: Conveyor = {
    id: 'CV-01',
    name: 'CV-01 Overland Mainline',
    mine_id: 'MINE-01',
    length_m: 2400,
    loop_length_m: 4800,
    speed_rating_mps: 2.45,
    joint_count: 2,
    provenance: 'SIMULATED',
  };

  const mockJoints: Joint[] = [
    {
      id: 'CV01_J01',
      joint_code: 'J01',
      belt_id: 'BELT-01',
      position_m: 0,
      splice_type: 'Finger Splice Hot Vulcanized',
      health: 95.0,
      state: 'HEALTHY',
      risk_score: 0.05,
      provenance: 'SIMULATED',
    },
    {
      id: 'CV01_J02',
      joint_code: 'J02',
      belt_id: 'BELT-01',
      position_m: 200,
      splice_type: 'Finger Splice Hot Vulcanized',
      health: 45.0, // Critical
      state: 'CRITICAL',
      risk_score: 0.55,
      provenance: 'SIMULATED',
    },
  ];

  const mockSimStatus: SimStatus = {
    run_id: 'run_test_123',
    lap: 1,
    current_lap: 1,
    speed_preset: '600x',
    paused: false,
    scenario_phase: 'HEALTHY',
    running: true,
    conveyor_id: 'CV-01',
    time_acceleration: 600,
    belt_position_m: 150.0,
    target_joint: 'J04',
    critical_laps_held: 0,
    provenance: 'SIMULATED',
  };

  const mockRootInfo: RootInfo = {
    platform: 'NEXVION',
    environment: 'development',
    provenance: 'SIMULATED',
    websocket_endpoint: '/ws/live',
    demo_banner_required: true,
    advisory_only_notice: 'Advisory only. NEXVION never starts or stops physical machinery.',
  };

  it('correctly initializes state and calculates Conveyor Risk Index (0.6*avg + 0.4*worst)', () => {
    const action = {
      type: 'INIT_REST_DATA' as const,
      payload: {
        rootInfo: mockRootInfo,
        conveyors: [mockConveyor],
        joints: mockJoints,
        alerts: [],
        simStatus: mockSimStatus,
      },
    };

    const nextState = liveDataReducer(INITIAL_STATE, action);
    expect(nextState.loading).toBe(false);
    expect(nextState.conveyors.length).toBe(1);
    expect(nextState.joints['J01'].health).toBe(95.0);
    expect(nextState.joints['J02'].health).toBe(45.0);

    // Avg: (95 + 45) / 2 = 70.0
    // Worst: 45.0
    // Risk Index: 0.6 * 70.0 + 0.4 * 45.0 = 42.0 + 18.0 = 60.0
    expect(nextState.conveyorSummary?.average_health).toBe(70.0);
    expect(nextState.conveyorSummary?.worst_joint_health).toBe(45.0);
    expect(nextState.conveyorSummary?.worst_joint_id).toBe('J02');
    expect(nextState.conveyorSummary?.conveyor_risk_index).toBe(60.0);
  });

  it('processes WS_HEALTH_UPDATE, updates joint, records memory history, and resets staleness', () => {
    // Start with initialized state
    const initState = liveDataReducer(INITIAL_STATE, {
      type: 'INIT_REST_DATA',
      payload: {
        rootInfo: mockRootInfo,
        conveyors: [mockConveyor],
        joints: mockJoints,
        alerts: [],
        simStatus: mockSimStatus,
      },
    });

    const updateMsg: HealthUpdateMessage = {
      type: 'health_update',
      ts: '2026-09-22T01:30:00Z',
      conveyor_id: 'CV-01',
      joint_id: 'J02',
      pass_event_id: 'pe_test_999',
      lap_no: 2,
      health: 40.0,
      state: 'CRITICAL',
      confidence: 0.95,
      risk: 0.60,
      rul: { status: 'DEMO', low_days: 5, high_days: 8 },
      contributors: {
        vision: { score: 0.8, confidence: 0.9, quality: 1.0, weight: 0.35 },
      },
      provenance: 'SIMULATED',
    };

    const nextState = liveDataReducer(initState, {
      type: 'WS_HEALTH_UPDATE',
      payload: updateMsg,
    });

    expect(nextState.joints['J02'].health).toBe(40.0);
    expect(nextState.joints['J02'].rul?.status).toBe('DEMO');
    expect(nextState.jointHistory['J02']).toHaveLength(1);
    expect(nextState.jointHistory['J02'][0].health).toBe(40.0);
    expect(nextState.jointHistory['J02'][0].lap).toBe(2);
    expect(nextState.secondsSinceLastMessage).toBe(0);
    expect(nextState.isStale).toBe(false);
  });

  it('handles TICK_FRESHNESS and staleness threshold >= 10s', () => {
    const staleState = liveDataReducer(INITIAL_STATE, {
      type: 'TICK_FRESHNESS',
      payload: { seconds: 12, isStale: true },
    });
    expect(staleState.secondsSinceLastMessage).toBe(12);
    expect(staleState.isStale).toBe(true);

    const freshState = liveDataReducer(staleState, {
      type: 'TICK_FRESHNESS',
      payload: { seconds: 2, isStale: false },
    });
    expect(freshState.secondsSinceLastMessage).toBe(2);
    expect(freshState.isStale).toBe(false);
  });
});
