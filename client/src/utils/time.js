export function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

export function detectConflict(existingBlocks, startTime, endTime, excludeId = null) {
  for (const block of existingBlocks) {
    if (excludeId && block.id === excludeId) continue;
    if (intervalsOverlap(startTime, endTime, block.startTime, block.endTime)) {
      return { conflict: true, with: block };
    }
  }
  return { conflict: false };
}

/** Returns array of "HH:00" labels from startHour to endHour (inclusive) */
export function buildHourLabels(startHour = 6, endHour = 22) {
  const labels = [];
  for (let h = startHour; h <= endHour; h++) {
    labels.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return labels;
}

/** Pixel offset for a time string within the timeline */
export function timeToPercent(time, startHour, totalHours) {
  const mins = toMinutes(time) - startHour * 60;
  return (mins / (totalHours * 60)) * 100;
}

export function durationPercent(startTime, endTime, totalHours) {
  const dur = toMinutes(endTime) - toMinutes(startTime);
  return (dur / (totalHours * 60)) * 100;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
