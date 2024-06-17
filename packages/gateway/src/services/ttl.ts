/**
 * Calculates a future Unix timestamp based on the provided TTL (time-to-live) value
 * and returns it as a string.
 *
 * @param {number} ttlInSecs - The TTL value in seconds.
 * @returns {string} The future Unix timestamp (in seconds) as a string.
 *
 * This function adds the TTL value to the current time in seconds,
 * rounds the result down to the nearest whole number, and converts it to a string.
 */
export function formatTTL(ttlInSecs: number): string {
  return Math.floor(Date.now() / 1000 + ttlInSecs).toString()
}
