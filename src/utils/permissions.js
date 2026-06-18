const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../database/store');

function hasPollPermission(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const config = getGuildConfig(member.guild.id);
  return config.managerRoles.some((roleId) => member.roles.cache.has(roleId));
}

function denyReply(interaction) {
  return interaction.reply({
    content: "T'as pas les droits pour gérer les sondages ici.",
    ephemeral: true,
  });
}

module.exports = { hasPollPermission, denyReply };
