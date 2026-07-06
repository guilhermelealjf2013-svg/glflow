/**
 * Converts "HH:MM" to minutes since midnight.
 */
function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns true if [aStart, aEnd) overlaps with [bStart, bEnd).
 * Uses half-open intervals so back-to-back blocks (10:00–11:00 and 11:00–12:00) don't conflict.
 */
function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  const a1 = toMinutes(aStart);
  const a2 = toMinutes(aEnd);
  const b1 = toMinutes(bStart);
  const b2 = toMinutes(bEnd);
  return a1 < b2 && a2 > b1;
}

/**
 * Checks if a proposed block conflicts with any existing blocks for the same
 * representative on the same date.
 *
 * @param {Array}  existingBlocks  - [{startTime, endTime, id}]
 * @param {string} startTime       - "HH:MM"
 * @param {string} endTime         - "HH:MM"
 * @param {string} [excludeId]     - ID of a block to ignore (for updates)
 * @returns {{ conflict: boolean, with?: object }}
 */
function detectConflict(existingBlocks, startTime, endTime, excludeId = null) {
  for (const block of existingBlocks) {
    if (excludeId && block.id === excludeId) continue;
    if (intervalsOverlap(startTime, endTime, block.startTime, block.endTime)) {
      return { conflict: true, with: block };
    }
  }
  return { conflict: false };
}

module.exports = { detectConflict, intervalsOverlap, toMinutes };
