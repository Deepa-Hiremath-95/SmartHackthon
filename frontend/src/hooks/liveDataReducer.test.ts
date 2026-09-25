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

  it('isolates conveyor state when switching between CV-01 and CV-02', () => {
    // 1. Init CV-01
    let state = liveDataReducer(INITIAL_STATE, {
      type: 'INIT_REST_DATA',
      payload: {
        rootInfo: mockRootInfo,
        conveyors: [mockConveyor],
        joints: mockJoints,
        alerts: [],
        simStatus: mockSimStatus,
        conveyorId: 'CV-01',
      },
    });

    expect(state.selectedConveyorId).toBe('CV-01');
    expect(state.jointOrder).toEqual(['J01', 'J02']);

    // 2. Switch to CV-02 and init CV-02 joints
    state = liveDataReducer(state, {
      type: 'SET_SELECTED_CONVEYOR',
      payload: 'CV-02',
    });

    const mockCv2Joints: Joint[] = [
      {
        id: 'CV02_J25',
        joint_code: 'J25',
        belt_id: 'BELT-02',
        position_m: 0,
        splice_type: 'Overlap Step Splice',
        health: 98.0,
        state: 'HEALTHY',
        risk_score: 0.02,
        provenance: 'SIMULATED',
      },
    ];

    state = liveDataReducer(state, {
      type: 'INIT_REST_DATA',
      payload: {
        rootInfo: mockRootInfo,
        conveyors: [mockConveyor],
        joints: mockCv2Joints,
        alerts: [],
        simStatus: mockSimStatus,
        conveyorId: 'CV-02',
      },
    });

    expect(state.selectedConveyorId).toBe('CV-02');
    expect(state.joints['J25']).toBeDefined();
    expect(state.jointOrder).toEqual(['J25']);

    // 3. Receive CV-01 live health update while on CV-02
    state = liveDataReducer(state, {
      type: 'WS_HEALTH_UPDATE',
      payload: {
        type: 'health_update',
        ts: '2026-09-22T02:00:00Z',
        conveyor_id: 'CV-01',
        joint_id: 'J01',
        pass_event_id: 'pe_test_cv1',
        lap_no: 3,
        health: 88.0,
        state: 'HEALTHY',
        confidence: 0.9,
        risk: 0.12,
        rul: { status: 'UNAVAILABLE' },
        contributors: {},
        provenance: 'SIMULATED',
      },
    });

    // Active screen (CV-02) should still show J25
    expect(state.joints['J25']).toBeDefined();
    expect(state.jointOrder).toEqual(['J25']);

    // Background cache for CV-01 should have updated health
    expect(state.conveyorData['CV-01'].joints['J01'].health).toBe(88.0);

    // 4. Switch back to CV-01
    state = liveDataReducer(state, {
      type: 'SET_SELECTED_CONVEYOR',
      payload: 'CV-01',
    });
    expect(state.selectedConveyorId).toBe('CV-01');
    expect(state.joints['J01'].health).toBe(88.0);
    expect(state.jointOrder).toEqual(['J01', 'J02']);
  });

  it('handles SET_JOINT_HISTORY and merges history points chronologically without duplicates', () => {
    let state = liveDataReducer(INITIAL_STATE, {
      type: 'SET_JOINT_HISTORY',
      payload: {
        jointCode: 'J04',
        history: [
          {
            pass_event_id: 'pe_1',
            joint_id: 'J04',
            lap: 1,
            health: 95.0,
            state: 'HEALTHY',
            timestamp: '2026-09-22T00:01:00Z',
            provenance: 'SIMULATED',
          },
          {
            pass_event_id: 'pe_2',
            joint_id: 'J04',
            lap: 2,
            health: 91.0,
            state: 'HEALTHY',
            timestamp: '2026-09-22T00:02:00Z',
            provenance: 'SIMULATED',
          },
        ],
      },
    });

    expect(state.jointHistory['J04']).toHaveLength(2);
    expect(state.jointHistory['J04'][0].health).toBe(95.0);
    expect(state.jointHistory['J04'][1].health).toBe(91.0);

    // Merge another set of points (with one overlap)
    state = liveDataReducer(state, {
      type: 'SET_JOINT_HISTORY',
      payload: {
        jointCode: 'J04',
        history: [
          {
            pass_event_id: 'pe_2',
            joint_id: 'J04',
            lap: 2,
            health: 91.0,
            state: 'HEALTHY',
            timestamp: '2026-09-22T00:02:00Z',
            provenance: 'SIMULATED',
          },
          {
            pass_event_id: 'pe_3',
            joint_id: 'J04',
            lap: 3,
            health: 84.0,
            state: 'WATCH',
            timestamp: '2026-09-22T00:03:00Z',
            provenance: 'SIMULATED',
          },
        ],
      },
    });

    expect(state.jointHistory['J04']).toHaveLength(3);
    expect(state.jointHistory['J04'][2].health).toBe(84.0);
  });

  it('records state transitions and scenario events into dashboard-wide activityLog', () => {
    let state = liveDataReducer(INITIAL_STATE, {
      type: 'INIT_REST_DATA',
      payload: {
        rootInfo: mockRootInfo,
        conveyors: [mockConveyor],
        joints: mockJoints,
        alerts: [],
        simStatus: mockSimStatus,
      },
    });

    // J01 starts HEALTHY. Transition J01 to WATCH.
    state = liveDataReducer(state, {
      type: 'WS_HEALTH_UPDATE',
      payload: {
        type: 'health_update',
        ts: '2026-09-22T01:35:00Z',
        conveyor_id: 'CV-01',
        joint_id: 'J01',
        pass_event_id: 'pe_j1_watch',
        lap_no: 4,
        health: 82.0,
        state: 'WATCH',
        confidence: 0.92,
        risk: 0.25,
        rul: { status: 'DEMO', low_days: 6.0, high_days: 9.0 },
        contributors: {},
        provenance: 'SIMULATED',
      },
    });

    expect(state.activityLog.length).toBeGreaterThanOrEqual(1);
    const lastEvent = state.activityLog[0];
    expect(lastEvent.type).toBe('STATE_CHANGE');
    expect(lastEvent.jointCode).toBe('J01');
    expect(lastEvent.fromState).toBe('HEALTHY');
    expect(lastEvent.toState).toBe('WATCH');

    // Trigger scenario milestone
    state = liveDataReducer(state, {
      type: 'WS_SCENARIO_EVENT',
      payload: {
        type: 'scenario_event',
        ts: '2026-09-22T01:40:00Z',
        run_id: 'run_test_123',
        event: 'CRITICAL_HOLD_COMPLETED',
        scenario: 'splice_degradation',
        target_joint: 'J04',
        critical_laps_held: 3,
        action: 'RESETTING',
        provenance: 'SIMULATED',
      },
    });

    expect(state.activityLog[0].type).toBe('SCENARIO_EVENT');
    expect(state.activityLog[0].title).toContain('CRITICAL_HOLD_COMPLETED');
    expect(state.activityLog[0].jointCode).toBe('J04');
  });
});
