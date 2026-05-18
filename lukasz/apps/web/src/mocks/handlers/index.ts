import { searchHandlers } from './search';
import { callHandlers } from './call-events';
import { scoringHandlers } from './scoring';
import { bookHandlers } from './book';

/**
 * Aggregated MSW handler list. Concatenated, not re-exported — per spec §5
 * (no barrel files). Browser/node setup imports this single array.
 */
export const handlers = [
  ...searchHandlers,
  ...callHandlers,
  ...scoringHandlers,
  ...bookHandlers,
];
