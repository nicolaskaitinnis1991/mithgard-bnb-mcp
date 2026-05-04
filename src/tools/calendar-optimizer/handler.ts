import type { CalendarOptimizerInputT, CalendarOptimizerOutputT } from './schema.js';
import { computeCalendar } from '../../mocks/calendar-optimizer.fixture.js';

export const calendarOptimizerHandler = (
  input: CalendarOptimizerInputT,
): Promise<CalendarOptimizerOutputT> => Promise.resolve(computeCalendar(input));
