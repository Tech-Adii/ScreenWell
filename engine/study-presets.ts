import { z } from 'zod';
import { StudyPreset } from '../shared/types';
import { studyPresetLimit } from '../shared/study';
import { studyPlanConfigSchema } from './study';

const name = z.string().trim().min(1).max(40);
const id = z.uuid();
const presetSchema = z.object({ id, name, config: studyPlanConfigSchema }).strict();
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('save'), name, config: studyPlanConfigSchema }).strict(),
  z.object({ type: z.literal('remove'), id }).strict(),
]);

export function readStudyPresets(value: unknown): StudyPreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      const parsed = presetSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, studyPresetLimit);
}

export function updateStudyPresets(
  presets: StudyPreset[],
  input: unknown,
  newId: string,
): StudyPreset[] {
  const action = actionSchema.parse(input);
  if (action.type === 'remove') return presets.filter((preset) => preset.id !== action.id);
  if (presets.length >= studyPresetLimit)
    throw new Error('Remove a saved profile before adding another.');
  if (presets.some((preset) => preset.name.toLowerCase() === action.name.toLowerCase())) {
    throw new Error('A saved profile already has that name.');
  }
  return [...presets, { id: newId, name: action.name, config: action.config }];
}
