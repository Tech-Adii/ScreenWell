import { z } from 'zod';
import { DailyPlan } from '../shared/types';
export const planActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add'), title: z.string().trim().min(1).max(120) }).strict(),
  z.object({ type: z.literal('toggle'), id: z.string().uuid() }).strict(),
  z.object({ type: z.literal('remove'), id: z.string().uuid() }).strict(),
  z.object({ type: z.literal('goal'), minutes: z.number().int().min(15).max(360) }).strict(),
]);
export function updateDailyPlan(plan: DailyPlan, input: unknown, newId: string): DailyPlan {
  const action = planActionSchema.parse(input);
  switch (action.type) {
    case 'add':
      if (plan.tasks.length >= 5)
        throw new Error('Keep a little space: five priorities is the daily limit.');
      return { ...plan, tasks: [...plan.tasks, { id: newId, title: action.title, done: false }] };
    case 'toggle':
      return {
        ...plan,
        tasks: plan.tasks.map((task) =>
          task.id === action.id ? { ...task, done: !task.done } : task,
        ),
      };
    case 'remove':
      return { ...plan, tasks: plan.tasks.filter((task) => task.id !== action.id) };
    case 'goal':
      return { ...plan, focusGoal: action.minutes };
  }
}
