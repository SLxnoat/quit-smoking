import {
  DisclaimerSchema,
  HabitsSchema,
  QuitDateSchema,
  ReasonsSchema,
} from '../domain/validation';

describe('Onboarding Form Validation (Zod)', () => {
  describe('QuitDateSchema', () => {
    it('accepts valid epoch timestamps in the present or near past', () => {
      const now = Date.now();
      expect(QuitDateSchema.safeParse({ quitAt: now }).success).toBe(true);
      expect(QuitDateSchema.safeParse({ quitAt: now - 3 * 24 * 3600 * 1000 }).success).toBe(true);
    });

    it('rejects timestamps too far in the future (> 30 days)', () => {
      const future = Date.now() + 35 * 24 * 3600 * 1000;
      const result = QuitDateSchema.safeParse({ quitAt: future });
      expect(result.success).toBe(false);
    });

    it('rejects negative or non-integer timestamps', () => {
      expect(QuitDateSchema.safeParse({ quitAt: -100 }).success).toBe(false);
      expect(QuitDateSchema.safeParse({ quitAt: 12345.67 }).success).toBe(false);
    });
  });

  describe('HabitsSchema', () => {
    it('accepts realistic smoking habit data', () => {
      const valid = {
        cigsPerDay: 15,
        packSize: 20,
        packPrice: 12.5,
        currency: 'USD',
        yearsSmoked: 10,
      };
      expect(HabitsSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects 0 or negative cigarettes per day', () => {
      const invalid = {
        cigsPerDay: 0,
        packSize: 20,
        packPrice: 10,
        currency: '$',
      };
      const result = HabitsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects 0 or negative pack price', () => {
      const invalid = {
        cigsPerDay: 10,
        packSize: 20,
        packPrice: 0,
        currency: '$',
      };
      const result = HabitsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects empty currency string', () => {
      const invalid = {
        cigsPerDay: 10,
        packSize: 20,
        packPrice: 10,
        currency: '   ',
      };
      const result = HabitsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ReasonsSchema', () => {
    it('accepts array with at least one valid reason', () => {
      expect(ReasonsSchema.safeParse(['Save money for travel']).success).toBe(true);
      expect(
        ReasonsSchema.safeParse(['Better health', 'Live longer for my kids']).success
      ).toBe(true);
    });

    it('rejects empty array of reasons', () => {
      const result = ReasonsSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('rejects reasons with less than 2 characters', () => {
      const result = ReasonsSchema.safeParse(['a']);
      expect(result.success).toBe(false);
    });
  });

  describe('DisclaimerSchema', () => {
    it('accepts accepted: true', () => {
      expect(DisclaimerSchema.safeParse({ accepted: true }).success).toBe(true);
    });

    it('rejects accepted: false or missing', () => {
      expect(DisclaimerSchema.safeParse({ accepted: false }).success).toBe(false);
      expect(DisclaimerSchema.safeParse({}).success).toBe(false);
    });
  });
});
