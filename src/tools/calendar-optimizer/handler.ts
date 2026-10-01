import type { CalendarOptimizerInputT, CalendarOptimizerOutputT } from './schema.js';
import { computeCalendar } from '../../mocks/calendar-optimizer.fixture.js';
import { providedData, demoResult, asOfDate } from '../../host-data/contracts.js';
import { calendarFromData } from '../../host-data/engines.js';

export const calendarOptimizerHandler = (
  input: CalendarOptimizerInputT,
): Promise<CalendarOptimizerOutputT> => {
  const data = providedData(input);
  return Promise.resolve(
    data
      ? calendarFromData(input.reference_date ?? asOfDate(data.as_of), input.horizon_days, data)
      : demoResult(computeCalendar(input)),
  );
};
