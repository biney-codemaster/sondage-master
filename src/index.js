const { Client, Collection, GatewayIntentBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const config = require('./config');
const { loadCommands } = require('./handlers/commandLoader');
const { scheduleChecker } = require('./utils/pollManager');

if (!config.token || !config.clientId) {
  console.error('Renseigne DISCORD_TOKEN et CLIENT_ID dans le fichier .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
for (const [name, command] of loadCommands()) {
  client.commands.set(name, command);
}

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

setInterval(() => scheduleChecker(client), 15_000);

client.login(config.token);
