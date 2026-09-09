export const formatDuration = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const padM = String(m).padStart(2, '0');
  const padS = String(s).padStart(2, '0');
  return `${padM}:${padS}`;
};
