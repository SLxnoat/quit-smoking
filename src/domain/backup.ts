import { z } from 'zod';

export const BackupProfileSchema = z.object({
  id: z.literal(1).optional(),
  quit_at: z.number(),
  cigs_per_day: z.number().nonnegative(),
  pack_size: z.number().int().positive(),
  pack_price: z.number().nonnegative(),
  currency: z.string(),
  years_smoked: z.number().nullable().optional(),
  approach: z.string(),
  confidence: z.number().nullable().optional(),
  created_at: z.number(),
});

export const BackupReasonSchema = z.object({
  id: z.number().optional(),
  text: z.string().min(1),
  sort_order: z.number().optional(),
  created_at: z.number().optional(),
});

export const BackupTriggerSchema = z.object({
  id: z.number().optional(),
  key: z.string().nullable().optional(),
  label: z.string().min(1),
  is_custom: z.number().optional(),
  is_active: z.number().optional(),
  coping_plan: z.string().nullable().optional(),
});

export const BackupCravingLogSchema = z.object({
  id: z.number().optional(),
  started_at: z.number(),
  duration_sec: z.number().nullable().optional(),
  intensity_before: z.number().nullable().optional(),
  intensity_after: z.number().nullable().optional(),
  outcome: z.enum(['resisted', 'smoked', 'abandoned']),
  trigger_id: z.number().nullable().optional(),
  tool_used: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const BackupSlipSchema = z.object({
  id: z.number().optional(),
  occurred_at: z.number(),
  cigarettes: z.number().positive(),
  trigger_id: z.number().nullable().optional(),
  reflection: z.string().nullable().optional(),
  reset_streak: z.number().optional(),
  previous_quit_at: z.number().nullable().optional(),
});

export const BackupCheckinSchema = z.object({
  id: z.number().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().nullable().optional(),
  stress: z.number().nullable().optional(),
  confidence: z.number().nullable().optional(),
  sleep_quality: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  created_at: z.number(),
});

export const BackupThoughtRecordSchema = z.object({
  id: z.number().optional(),
  created_at: z.number(),
  situation: z.string().nullable().optional(),
  thought: z.string().nullable().optional(),
  emotion: z.string().nullable().optional(),
  reframe: z.string().nullable().optional(),
  belief_before: z.number().nullable().optional(),
  belief_after: z.number().nullable().optional(),
});

export const BackupGoalSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1),
  target_amount: z.number().nonnegative(),
  achieved_at: z.number().nullable().optional(),
});

export const BackupAchievementSchema = z.object({
  key: z.string().min(1),
  unlocked_at: z.number(),
});

export const BackupBookmarkSchema = z.object({
  content_id: z.string().min(1),
  created_at: z.number(),
});

export const BackupLessonCompletionSchema = z.object({
  lesson_id: z.string().min(1),
  completed_at: z.number(),
});

export const BackupSupportContactSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
});

export const BackupSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export const BackupDataSchema = z.object({
  profile: BackupProfileSchema.nullable(),
  reasons: z.array(BackupReasonSchema).default([]),
  triggers: z.array(BackupTriggerSchema).default([]),
  craving_logs: z.array(BackupCravingLogSchema).default([]),
  slips: z.array(BackupSlipSchema).default([]),
  checkins: z.array(BackupCheckinSchema).default([]),
  thought_records: z.array(BackupThoughtRecordSchema).default([]),
  goals: z.array(BackupGoalSchema).default([]),
  achievements: z.array(BackupAchievementSchema).default([]),
  bookmarks: z.array(BackupBookmarkSchema).default([]),
  lesson_completions: z.array(BackupLessonCompletionSchema).default([]),
  support_contacts: z.array(BackupSupportContactSchema).default([]),
  settings: z.array(BackupSettingSchema).default([]),
});

export const EmberBackupSchema = z.object({
  version: z.literal(1),
  app: z.literal('Ember'),
  appVersion: z.string().default('1.0.0'),
  exportedAt: z.number().int().positive(),
  data: BackupDataSchema,
});

export type EmberBackup = z.infer<typeof EmberBackupSchema>;
export type BackupData = z.infer<typeof BackupDataSchema>;

export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

/**
 * Validates and parses raw JSON string into a validated EmberBackup object.
 * Throws InvalidBackupError if the string is not valid JSON or fails schema validation.
 */
export function validateBackupJson(rawJson: string): EmberBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new InvalidBackupError('The provided file is not valid JSON.');
  }

  const result = EmberBackupSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .slice(0, 3)
      .join('; ');
    throw new InvalidBackupError(`Backup format is invalid: ${errorDetails}`);
  }

  return result.data;
}
