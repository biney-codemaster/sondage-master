const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`SondageMaster connecté : ${client.user.tag}`);
    client.user.setActivity('les sondages', { type: ActivityType.Watching });
  },
};
