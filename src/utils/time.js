const UNITS = {
  s: 1000, sec: 1000, seconde: 1000, secondes: 1000,
  m: 60_000, min: 60_000, minute: 60_000, minutes: 60_000,
  h: 3_600_000, heure: 3_600_000, heures: 3_600_000,
  j: 86_400_000, jour: 86_400_000, jours: 86_400_000, d: 86_400_000,
  semaine: 604_800_000, semaines: 604_800_000, w: 604_800_000,
};

function parseDuration(input) {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase().replace(/,/g, '.');
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([a-zéèêà]+)?$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2] || 'm';
  const ms = UNITS[unit];
  if (!ms || value <= 0) return null;
  return Math.round(value * ms);
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

module.exports = { parseDuration, formatDuration };
