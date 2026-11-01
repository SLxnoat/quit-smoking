import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.resolve(__dirname, '../src/db/seed/content');

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

export function validateAllContent(contentDir = CONTENT_DIR) {
  if (!fs.existsSync(contentDir)) {
    throw new Error(`Content directory not found at: ${contentDir}`);
  }

  const files = fs
    .readdirSync(contentDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No JSON content files found in ${contentDir}`);
  }

  const seenIds = new Map(); // id -> filename
  const errors = [];
  let totalItemsCount = 0;
  const countsByType = {};

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    try {
      const rawText = fs.readFileSync(filePath, 'utf-8');
      const parsedJson = JSON.parse(rawText);

      const parseResult = ContentFileSchema.safeParse(parsedJson);
      if (!parseResult.success) {
        errors.push({
          file,
          issues: parseResult.error.issues,
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
    } catch (err) {
      errors.push({
        file,
        issues: [{ message: `Failed to read or parse JSON: ${err.message}` }],
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

// CLI runner
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔍 Validating bundled content files in src/db/seed/content...');
  try {
    const result = validateAllContent();
    if (!result.valid) {
      console.error('\n❌ Content validation failed with errors:');
      for (const err of result.errors) {
        console.error(`\n📄 In file: ${err.file}`);
        for (const issue of err.issues) {
          const pathStr = issue.path ? ` [${issue.path.join('.')}]` : '';
          console.error(`  - ${issue.message}${pathStr}`);
        }
      }
      process.exit(1);
    }

    console.log(`\n✅ Successfully validated ${result.filesCount} content files (${result.totalItemsCount} items):`);
    for (const [type, count] of Object.entries(result.countsByType)) {
      console.log(`  • ${type}: ${count} items`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Error running validation: ${err.message}`);
    process.exit(1);
  }
}
