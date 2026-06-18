const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { hasPollPermission, denyReply } = require('../../utils/permissions');
const { getGuildConfig, setGuildConfig } = require('../../database/store');
const { buildConfigPanel, buildInfoPanel } = require('../../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Réglages du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName('voir').setDescription('Voir la config'))
    .addSubcommand((sub) =>
      sub
        .setName('logs')
        .setDescription('Salon des logs')
        .addChannelOption((o) => o.setName('salon').setDescription('Salon').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('role')
        .setDescription('Rôle gestionnaire')
        .addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true))
        .addBooleanOption((o) => o.setName('retirer').setDescription('Retirer au lieu d\'ajouter')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('couleur')
        .setDescription('Couleur des panneaux')
        .addStringOption((o) => o.setName('hex').setDescription('Ex: 5865F2').setRequired(true)),
    ),

  async execute(interaction) {
    if (!hasPollPermission(interaction.member)) return denyReply(interaction);

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'voir') {
      return interaction.reply(buildConfigPanel(getGuildConfig(guildId), interaction.guild));
    }

    switch (sub) {
      case 'logs': {
        const ch = interaction.options.getChannel('salon', true);
        setGuildConfig(guildId, { logChannelId: ch.id });
        return interaction.reply({
          ...buildInfoPanel('Logs ok', [`Ça partira dans <#${ch.id}>.`]),
          ephemeral: true,
        });
      }
      case 'role': {
        const role = interaction.options.getRole('role', true);
        const remove = interaction.options.getBoolean('retirer') ?? false;
        const config = getGuildConfig(guildId);
        let roles = [...config.managerRoles];
        if (remove) roles = roles.filter((id) => id !== role.id);
        else if (!roles.includes(role.id)) roles.push(role.id);
        setGuildConfig(guildId, { managerRoles: roles });
        return interaction.reply({
          content: remove ? `${role} retiré.` : `${role} ajouté.`,
          ephemeral: true,
        });
      }
      case 'couleur': {
        const hex = interaction.options.getString('hex', true).replace('#', '');
        const parsed = parseInt(hex, 16);
        if (Number.isNaN(parsed) || hex.length < 6) {
          return interaction.reply({ content: 'Hex invalide.', ephemeral: true });
        }
        setGuildConfig(guildId, { accentColor: parsed });
        return interaction.reply({
          ...buildInfoPanel('Couleur', [`\`#${hex.toUpperCase()}\``], parsed),
          ephemeral: true,
        });
      }
      default:
        return interaction.reply({ content: '?', ephemeral: true });
    }
  },
};
