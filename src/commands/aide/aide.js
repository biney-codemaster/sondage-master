const { SlashCommandBuilder } = require('discord.js');
const { buildHelpPanel } = require('../../utils/components');

module.exports = {
  data: new SlashCommandBuilder().setName('aide').setDescription('Aide rapide'),
  async execute(interaction) {
    return interaction.reply(buildHelpPanel());
  },
};
