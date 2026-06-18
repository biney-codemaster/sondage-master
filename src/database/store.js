const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '../../data');
const GUILDS_FILE = path.join(DATA_DIR, 'guilds.json');
const POLLS_FILE = path.join(DATA_DIR, 'polls.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of [GUILDS_FILE, POLLS_FILE]) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '{}', 'utf8');
  }
}

function readJson(file) {
  ensureFiles();
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function getGuildConfig(guildId) {
  const all = readJson(GUILDS_FILE);
  return all[guildId] ?? {
    logChannelId: null,
    managerRoles: [],
    accentColor: null,
  };
}

function setGuildConfig(guildId, patch) {
  const all = readJson(GUILDS_FILE);
  all[guildId] = { ...getGuildConfig(guildId), ...patch };
  writeJson(GUILDS_FILE, all);
  return all[guildId];
}

function getPoll(id) {
  return readJson(POLLS_FILE)[id] ?? null;
}

function getAllPolls() {
  return readJson(POLLS_FILE);
}

function getGuildPolls(guildId) {
  return Object.values(getAllPolls()).filter((p) => p.guildId === guildId);
}

function getActivePolls() {
  return Object.values(getAllPolls()).filter((p) => !p.ended);
}

function savePoll(poll) {
  const all = getAllPolls();
  all[poll.id] = poll;
  writeJson(POLLS_FILE, all);
  return poll;
}

function deletePoll(id) {
  const all = getAllPolls();
  delete all[id];
  writeJson(POLLS_FILE, all);
}

module.exports = {
  getGuildConfig,
  setGuildConfig,
  getPoll,
  getAllPolls,
  getGuildPolls,
  getActivePolls,
  savePoll,
  deletePoll,
};
