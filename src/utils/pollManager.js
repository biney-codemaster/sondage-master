const { randomInt } = require('node:crypto');
const { getPoll, savePoll, getGuildConfig, getActivePolls } = require('../database/store');
const { buildPollComponents, buildInfoPanel } = require('./components');

function generateId() {
  return `${Date.now().toString(36)}${randomInt(0xffff).toString(36)}`;
}

function parseOptions(input) {
  if (!input) return [];
  return input
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 80)
    .slice(0, 10)
    .map((label, index) => ({ id: index, label, votes: [] }));
}

function userVotes(poll, userId) {
  const indices = [];
  poll.options.forEach((opt, i) => {
    if (opt.votes.includes(userId)) indices.push(i);
  });
  return indices;
}

function checkEligibility(member, poll) {
  if (!member) return 'Profil introuvable.';
  if (poll.ended) return 'Ce sondage est fini.';
  if (poll.requiredRoles?.length) {
    const ok = poll.requiredRoles.some((id) => member.roles.cache.has(id));
    if (!ok) {
      return `Il te faut un de ces rôles : ${poll.requiredRoles.map((id) => `<@&${id}>`).join(', ')}`;
    }
  }
  return null;
}

function toggleVote(poll, userId, optionIndex) {
  const option = poll.options[optionIndex];
  if (!option) return { error: 'Option invalide.' };

  const already = option.votes.includes(userId);

  if (already) {
    option.votes = option.votes.filter((id) => id !== userId);
    return { action: 'removed' };
  }

  if (!poll.multiVote) {
    for (const opt of poll.options) {
      opt.votes = opt.votes.filter((id) => id !== userId);
    }
  } else if (poll.maxChoices > 0) {
    const current = userVotes(poll, userId).length;
    if (current >= poll.maxChoices) {
      return { error: `Max ${poll.maxChoices} choix par personne.` };
    }
  }

  option.votes.push(userId);
  return { action: 'added' };
}

async function refreshPollMessage(client, poll) {
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const message = await channel.messages.fetch(poll.messageId).catch(() => null);
  if (!message) return;
  await message.edit(buildPollComponents(poll));
}

async function endPoll(client, pollId, { endedBy = null } = {}) {
  const poll = getPoll(pollId);
  if (!poll || poll.ended) return null;

  poll.ended = true;
  poll.endedAt = Date.now();
  if (endedBy) poll.endedBy = endedBy;
  savePoll(poll);

  await refreshPollMessage(client, poll);

  const guildConfig = getGuildConfig(poll.guildId);
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);

  if (channel?.isTextBased()) {
    await channel.send(
      buildInfoPanel('Sondage clos', [
        `**Question** · ${poll.question}`,
        'Les résultats sont sur le panneau au-dessus.',
      ], 0x57f287),
    );
  }

  if (guildConfig.logChannelId) {
    const log = await client.channels.fetch(guildConfig.logChannelId).catch(() => null);
    if (log?.isTextBased()) {
      const lines = poll.options.map((o) => `• ${o.label} · ${o.votes.length} vote(s)`);
      await log.send(
        buildInfoPanel('Log sondage', [
          `**Question** · ${poll.question}`,
          `**ID** · \`${poll.id}\``,
          ...lines,
        ]),
      );
    }
  }

  return poll;
}

async function scheduleChecker(client) {
  const now = Date.now();
  for (const poll of getActivePolls()) {
    if (poll.endAt && poll.endAt <= now) {
      await endPoll(client, poll.id).catch(console.error);
    }
  }
}

module.exports = {
  generateId,
  parseOptions,
  userVotes,
  checkEligibility,
  toggleVote,
  refreshPollMessage,
  endPoll,
  scheduleChecker,
};
