import { z } from 'zod';

export const QuitDateSchema = z.object({
  quitAt: z
    .number()
    .int()
    .min(0, 'Quit timestamp is invalid')
    .refine(
      (val) => val <= Date.now() + 30 * 24 * 60 * 60 * 1000,
      'Quit date cannot be more than 30 days in the future'
    ),
});

export const HabitsSchema = z.object({
  cigsPerDay: z
    .number()
    .min(1, 'At least 1 cigarette per day is required')
    .max(150, 'Please enter a number between 1 and 150'),
  packSize: z
    .number()
    .int('Pack size must be a whole number')
    .min(1, 'Pack size must be at least 1')
    .max(100, 'Pack size cannot exceed 100'),
  packPrice: z
    .number()
    .positive('Pack price must be greater than 0')
    .max(500, 'Pack price seems unusually high'),
  currency: z
    .string()
    .trim()
    .min(1, 'Currency symbol or code is required')
    .max(6, 'Currency code must be 6 characters or less'),
  yearsSmoked: z
    .number()
    .min(0, 'Years smoked cannot be negative')
    .max(80, 'Years smoked seems unusually high')
    .optional()
    .nullable(),
});

export const ReasonsSchema = z
  .array(z.string().trim().min(2, 'Reason must be at least 2 characters'))
  .min(1, 'Please select or add at least 1 personal reason for quitting');

export const DisclaimerSchema = z.object({
  accepted: z.literal(true),
});

export type QuitDateInput = z.infer<typeof QuitDateSchema>;
export type HabitsInput = z.infer<typeof HabitsSchema>;
export type ReasonsInput = z.infer<typeof ReasonsSchema>;
export type DisclaimerInput = z.infer<typeof DisclaimerSchema>;
