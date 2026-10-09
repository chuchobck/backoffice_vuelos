import { z } from 'zod';
import { textField } from '@/shared/lib/schemas';

export const SeatMapEditSchema = z.object({ name: textField(150) });
export type SeatMapValues = z.infer<typeof SeatMapEditSchema>;
