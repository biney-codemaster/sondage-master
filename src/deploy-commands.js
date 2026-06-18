const { REST, Routes } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./handlers/commandLoader');

const commands = [...loadCommands().values()].map((cmd) => cmd.data.toJSON());
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Enregistrement de ${commands.length} commande(s)...`);
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`Commandes sur le serveur ${config.guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Commandes globales enregistrées.');
    }
  } catch (error) {
    console.error(error);
  }
})();
