import {
  BREATHING_PATTERNS,
  FOUR_DS_CHECKLIST,
  GROUNDING_54321_STEPS,
  URGE_SURFING_PROMPTS,
  calculateIntensityDelta,
  getIntensityLabel,
} from '../domain/craving';
import { createTestDatabase } from './helpers/test-db';
import { migrateDb } from '../db/migrations';
import {
  createCravingLog,
  getCravingLogs,
  getResistedCravingsCount,
  getRecentCravingLogs,
} from '../db/repositories/craving.repo';

describe('Craving Domain Logic', () => {
  it('calculates intensity delta correctly', () => {
    expect(calculateIntensityDelta(8, 3)).toBe(5);
    expect(calculateIntensityDelta(5, 5)).toBe(0);
    expect(calculateIntensityDelta(3, 7)).toBe(-4);
  });

  it('provides appropriate labels and advice for each intensity band', () => {
    const mild = getIntensityLabel(2);
    expect(mild.label).toBe('Mild Urge');
    expect(mild.colorType).toBe('success');

    const moderate = getIntensityLabel(5);
    expect(moderate.label).toBe('Moderate Urge');
    expect(moderate.colorType).toBe('warning');

    const intense = getIntensityLabel(8);
    expect(intense.label).toBe('Intense Craving');
    expect(intense.colorType).toBe('danger');

    const peak = getIntensityLabel(10);
    expect(peak.label).toBe('Peak Urge');
    expect(peak.colorType).toBe('danger');
  });

  it('defines valid 4-7-8 and Box breathing patterns', () => {
    const p478 = BREATHING_PATTERNS['4-7-8'];
    expect(p478.phases).toHaveLength(3);
    expect(p478.phases[0].name).toBe('Inhale');
    expect(p478.phases[0].durationSec).toBe(4);
    expect(p478.phases[1].name).toBe('Hold');
    expect(p478.phases[1].durationSec).toBe(7);
    expect(p478.phases[2].name).toBe('Exhale');
    expect(p478.phases[2].durationSec).toBe(8);
    expect(p478.totalCycleSec).toBe(19);

    const box = BREATHING_PATTERNS['box'];
    expect(box.phases).toHaveLength(4);
    expect(box.phases.every((p) => p.durationSec === 4)).toBe(true);
    expect(box.totalCycleSec).toBe(16);
  });

  it('includes 8 urge surfing prompts and 5-4-3-2-1 grounding steps', () => {
    expect(URGE_SURFING_PROMPTS.length).toBeGreaterThanOrEqual(8);
    expect(GROUNDING_54321_STEPS).toHaveLength(5);
    expect(GROUNDING_54321_STEPS[0].count).toBe(5);
    expect(GROUNDING_54321_STEPS[4].count).toBe(1);

    expect(FOUR_DS_CHECKLIST).toHaveLength(4);
    expect(FOUR_DS_CHECKLIST.map((i) => i.id)).toEqual([
      'delay',
      'deep_breath',
      'drink_water',
      'distract',
    ]);
  });
});

describe('Craving Repository & SQLite Persistence', () => {
  let db = createTestDatabase();

  beforeEach(async () => {
    db = createTestDatabase();
    await migrateDb(db);
  });

  it('creates and retrieves craving logs accurately', async () => {
    const started = 1700000000000;
    const log = await createCravingLog(db, {
      started_at: started,
      duration_sec: 180,
      intensity_before: 8,
      intensity_after: 2,
      outcome: 'resisted',
      trigger_id: 1,
      tool_used: 'urge_surf',
      note: 'Deep breathing helped ride the peak.',
    });

    expect(log.id).toBeGreaterThan(0);
    expect(log.outcome).toBe('resisted');
    expect(log.intensity_before).toBe(8);
    expect(log.intensity_after).toBe(2);

    const logs = await getCravingLogs(db);
    expect(logs).toHaveLength(1);
    expect(logs[0].tool_used).toBe('urge_surf');
    expect(logs[0].note).toBe('Deep breathing helped ride the peak.');
  });

  it('counts resisted cravings correctly', async () => {
    await createCravingLog(db, {
      started_at: 1000,
      outcome: 'resisted',
    });
    await createCravingLog(db, {
      started_at: 2000,
      outcome: 'smoked',
    });
    await createCravingLog(db, {
      started_at: 3000,
      outcome: 'resisted',
    });
    await createCravingLog(db, {
      started_at: 4000,
      outcome: 'abandoned',
    });

    const count = await getResistedCravingsCount(db);
    expect(count).toBe(2);

    const recents = await getRecentCravingLogs(db, 2);
    expect(recents).toHaveLength(2);
    expect(recents[0].started_at).toBe(4000); // Most recent first
  });
});
