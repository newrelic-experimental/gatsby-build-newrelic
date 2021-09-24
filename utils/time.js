const hrTimeSupport = process && process.hrtime;

const now = (startTimestamp, startTick) => {
  if (!hrTimeSupport || !startTimestamp || !startTick) {
    return Date.now() * 1000;
  }
  const hrtime = process.hrtime(startTick);
  const elapsedMicros = Math.floor(hrtime[0] * 1000000 + hrtime[1] / 1000);
  return startTimestamp + elapsedMicros;
};

// Returns the current time in epoch microseconds
// if startTimestamp and startTick are present, process.hrtime is used
// See https://nodejs.org/api/process.html#process_process_hrtime_time
module.exports = {
  now,
  hrtime: hrTimeSupport ? process.hrtime : () => undefined,
};
