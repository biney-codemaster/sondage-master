const fs = require('node:fs');
const path = require('node:path');

function loadCommands() {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '../commands');

  for (const folder of fs.readdirSync(commandsPath)) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    for (const file of fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'))) {
      const command = require(path.join(folderPath, file));
      if (command.data?.name) commands.set(command.data.name, command);
    }
  }

  return commands;
}

module.exports = { loadCommands };
