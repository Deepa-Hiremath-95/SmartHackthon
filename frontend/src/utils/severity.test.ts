import { describe, it, expect } from 'vitest';
import {
  classifyHealth,
  classifyState,
  classifySeverity,
  SEVERITY_CONFIGS,
} from './severity';

describe('classifyHealth boundary tests', () => {
  it('classifies health >= 85 as HEALTHY with green circle', () => {
    const res100 = classifyHealth(100);
    expect(res100.state).toBe('HEALTHY');
    expect(res100.shape).toBe('circle');
    expect(res100.label).toBe('Healthy');
    expect(res100.colorHex).toBe(SEVERITY_CONFIGS.HEALTHY.colorHex);

    const res85 = classifyHealth(85);
    expect(res85.state).toBe('HEALTHY');
    expect(res85.shape).toBe('circle');
  });

  it('classifies health 70 to 84.9 as WATCH with yellow triangle', () => {
    const res849 = classifyHealth(84.9);
    expect(res849.state).toBe('WATCH');
    expect(res849.shape).toBe('triangle');
    expect(res849.label).toBe('Watch');

    const res70 = classifyHealth(70);
    expect(res70.state).toBe('WATCH');
    expect(res70.shape).toBe('triangle');
  });

  it('classifies health 50 to 69.9 as MAINTENANCE_REQUIRED with orange diamond', () => {
    const res699 = classifyHealth(69.9);
    expect(res699.state).toBe('MAINTENANCE_REQUIRED');
    expect(res699.shape).toBe('diamond');
    expect(res699.label).toBe('Maintenance Required');

    const res50 = classifyHealth(50);
    expect(res50.state).toBe('MAINTENANCE_REQUIRED');
    expect(res50.shape).toBe('diamond');
  });

  it('classifies health < 50 as CRITICAL with red octagon', () => {
    const res499 = classifyHealth(49.9);
    expect(res499.state).toBe('CRITICAL');
    expect(res499.shape).toBe('octagon');
    expect(res499.label).toBe('Critical');

    const res0 = classifyHealth(0);
    expect(res0.state).toBe('CRITICAL');
    expect(res0.shape).toBe('octagon');
  });

  it('classifies null, undefined, or NaN as OFFLINE with grey hollow circle', () => {
    expect(classifyHealth(null).state).toBe('OFFLINE');
    expect(classifyHealth(null).shape).toBe('hollow-circle');
    expect(classifyHealth(undefined).state).toBe('OFFLINE');
    expect(classifyHealth(NaN).state).toBe('OFFLINE');
  });
});

describe('classifyState tests', () => {
  it('correctly maps enum strings to configs', () => {
    expect(classifyState('HEALTHY').shape).toBe('circle');
    expect(classifyState('WATCH').shape).toBe('triangle');
    expect(classifyState('MAINTENANCE_REQUIRED').shape).toBe('diamond');
    expect(classifyState('CRITICAL').shape).toBe('octagon');
    expect(classifyState('OFFLINE').shape).toBe('hollow-circle');
    expect(classifyState('UNKNOWN_STATE').shape).toBe('hollow-circle');
  });
});

describe('classifySeverity tests', () => {
  it('correctly maps alert severity levels', () => {
    expect(classifySeverity('CRITICAL').state).toBe('CRITICAL');
    expect(classifySeverity('WARNING').state).toBe('MAINTENANCE_REQUIRED');
    expect(classifySeverity('WATCH').state).toBe('WATCH');
    expect(classifySeverity('INFO').label).toBe('Info');
  });
});
