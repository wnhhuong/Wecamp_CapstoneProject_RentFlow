import { getDateKey } from '@/shared/utils/dateFormatter'

/** Matches MOVEOUT_NOTICE_DAYS in the backend, which rejects anything earlier. */
export const MOVEOUT_NOTICE_DAYS = 7

const DAY_IN_MS = 24 * 60 * 60 * 1000

/** Earliest move-out date the backend accepts, as a calendar date in Vietnam. */
export function getEarliestMoveoutDate(): string {
  return getDateKey(new Date(Date.now() + MOVEOUT_NOTICE_DAYS * DAY_IN_MS))
}
