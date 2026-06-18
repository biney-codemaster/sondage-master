const { Events } = require('discord.js');
const { handleButton } = require('../handlers/buttonHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }

      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) await command.autocomplete(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction, client);
      }
    } catch (error) {
      console.error(error);
      const payload = { content: 'Erreur bot, réessaie.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  },
};
