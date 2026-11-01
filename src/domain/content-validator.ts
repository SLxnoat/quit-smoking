import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const ContentItemTypeSchema = z.enum([
  'quote',
  'tip',
  'lesson',
  'article',
  'exercise',
  'slip_message',
  'milestone',
]);

export const ContentItemSchema = z
  .object({
    id: z.string().min(1, 'ID must not be empty'),
    type: ContentItemTypeSchema,
    category: z.string().min(1, 'Category must not be empty'),
    dayIndex: z.number().int().min(1).max(30).optional(),
    title: z.string().min(1, 'Title must not be empty'),
    body: z.string().min(1, 'Body must not be empty'),
    source: z.string().min(1, 'Source citation must not be empty'),
    reviewedBy: z.string().min(1, 'ReviewedBy must not be empty'),
    reviewedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'ReviewedAt must be in YYYY-MM-DD format'),
  })
  .superRefine((item, ctx) => {
    if (item.type === 'lesson') {
      if (item.dayIndex === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dayIndex is required for lesson type and must be between 1 and 30',
          path: ['dayIndex'],
        });
      }
      const wordCount = item.body.trim().split(/\s+/).length;
      if (wordCount > 130) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Lesson body must be <= 120 words (found ${wordCount} words)`,
          path: ['body'],
        });
      }
    }
  });

export const ContentFileSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.string().min(2),
  items: z.array(ContentItemSchema).min(1, 'Items array must not be empty'),
});

export interface ValidationResult {
  valid: boolean;
  filesCount: number;
  totalItemsCount: number;
  countsByType: Record<string, number>;
  errors: { file: string; issues: { message: string; path?: (string | number)[] }[] }[];
}

export function validateAllContent(contentDir?: string): ValidationResult {
  const targetDir =
    contentDir ?? path.resolve(__dirname, '../../src/db/seed/content');

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Content directory not found at: ${targetDir}`);
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No JSON content files found in ${targetDir}`);
  }

  const seenIds = new Map<string, string>(); // id -> filename
  const errors: { file: string; issues: { message: string; path?: (string | number)[] }[] }[] = [];
  let totalItemsCount = 0;
  const countsByType: Record<string, number> = {};

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    try {
      const rawText = fs.readFileSync(filePath, 'utf-8');
      const parsedJson = JSON.parse(rawText);

      const parseResult = ContentFileSchema.safeParse(parsedJson);
      if (!parseResult.success) {
        errors.push({
          file,
          issues: parseResult.error.issues.map((i) => ({
            message: i.message,
            path: i.path as (string | number)[],
          })),
        });
        continue;
      }

      for (const item of parseResult.data.items) {
        totalItemsCount++;
        countsByType[item.type] = (countsByType[item.type] || 0) + 1;

        if (seenIds.has(item.id)) {
          errors.push({
            file,
            issues: [
              {
                message: `Duplicate item ID "${item.id}" already defined in "${seenIds.get(item.id)}"`,
                path: [item.id],
              },
            ],
          });
        } else {
          seenIds.set(item.id, file);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({
        file,
        issues: [{ message: `Failed to read or parse JSON: ${msg}` }],
      });
    }
  }

  return {
    valid: errors.length === 0,
    filesCount: files.length,
    totalItemsCount,
    countsByType,
    errors,
  };
}
