const { getPoll, savePoll } = require('../database/store');
const { checkEligibility, toggleVote, refreshPollMessage } = require('../utils/pollManager');
const { buildInfoPanel } = require('../utils/components');

async function handleButton(interaction, client) {
  const [prefix, action, pollId, optionIndexRaw] = interaction.customId.split(':');
  if (prefix !== 'poll' || action !== 'vote') return false;

  const poll = getPoll(pollId);
  if (!poll || poll.guildId !== interaction.guildId) {
    await interaction.reply({ content: 'Ce sondage n\'existe plus.', ephemeral: true });
    return true;
  }

  const reason = checkEligibility(interaction.member, poll);
  if (reason) {
    return interaction.reply({ content: reason, ephemeral: true });
  }

  const optionIndex = parseInt(optionIndexRaw, 10);
  const result = toggleVote(poll, interaction.user.id, optionIndex);

  if (result.error) {
    return interaction.reply({ content: result.error, ephemeral: true });
  }

  savePoll(poll);
  await refreshPollMessage(client, poll);

  const label = poll.options[optionIndex]?.label ?? 'cette option';
  const msg =
    result.action === 'added'
      ? `Vote enregistré pour **${label}**.`
      : `Vote retiré sur **${label}**.`;

  return interaction.reply({ content: msg, ephemeral: true });
}

module.exports = { handleButton };
