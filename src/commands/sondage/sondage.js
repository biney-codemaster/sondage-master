const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { parseDuration, formatDuration } = require('../../utils/time');
const { hasPollPermission, denyReply } = require('../../utils/permissions');
const { getGuildConfig } = require('../../database/store');
const {
  generateId,
  parseOptions,
  refreshPollMessage,
  endPoll,
} = require('../../utils/pollManager');
const { savePoll, getPoll, getGuildPolls, deletePoll } = require('../../database/store');
const { buildPollComponents, buildInfoPanel, buildListPanel } = require('../../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Créer et gérer des sondages')
    .addSubcommand((sub) =>
      sub
        .setName('creer')
        .setDescription('Lancer un sondage')
        .addStringOption((o) => o.setName('question').setDescription('La question').setRequired(true))
        .addStringOption((o) =>
          o
            .setName('choix')
            .setDescription('Options séparées par des virgules (max 10)')
            .setRequired(true),
        )
        .addStringOption((o) => o.setName('duree').setDescription('Ex: 1h, 2j (vide = pas de limite)'))
        .addChannelOption((o) =>
          o
            .setName('salon')
            .setDescription('Où poster (défaut: ici)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addStringOption((o) => o.setName('description').setDescription('Texte en plus sous la question'))
        .addBooleanOption((o) => o.setName('choix_multiples').setDescription('Voter pour plusieurs options'))
        .addIntegerOption((o) =>
          o.setName('max_choix').setDescription('Limite si choix multiples').setMinValue(2).setMaxValue(10),
        )
        .addBooleanOption((o) =>
          o.setName('cacher_resultats').setDescription('Masquer les scores tant que c\'est ouvert'),
        )
        .addRoleOption((o) => o.setName('role_requis').setDescription('Rôle obligatoire pour voter')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('terminer')
        .setDescription('Clôturer un sondage')
        .addStringOption((o) => o.setName('id').setDescription('ID du sondage').setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('resultats')
        .setDescription('Voir les résultats détaillés')
        .addStringOption((o) => o.setName('id').setDescription('ID du sondage').setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('liste')
        .setDescription('Sondages du serveur'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('annuler')
        .setDescription('Supprimer un sondage')
        .addStringOption((o) => o.setName('id').setDescription('ID du sondage').setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('modifier')
        .setDescription('Modifier un sondage actif')
        .addStringOption((o) => o.setName('id').setDescription('ID').setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName('question').setDescription('Nouvelle question'))
        .addStringOption((o) => o.setName('duree').setDescription('Prolonger (ex: 30m)'))
        .addStringOption((o) => o.setName('description').setDescription('Nouvelle description')),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const polls = getGuildPolls(interaction.guildId);
    const choices = polls
      .filter((p) => !focused || p.question.toLowerCase().includes(focused) || p.id.includes(focused))
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ended ? '🏁' : '📊'} ${p.question.slice(0, 60)} (${p.id.slice(0, 8)})`,
        value: p.id,
      }));
    await interaction.respond(choices);
  },

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'liste') {
      return interaction.reply(buildListPanel(getGuildPolls(interaction.guildId), interaction.guildId));
    }

    if (!hasPollPermission(interaction.member)) {
      return denyReply(interaction);
    }

    switch (sub) {
      case 'creer':
        return handleCreate(interaction, client);
      case 'terminer':
        return handleEnd(interaction, client);
      case 'resultats':
        return handleResults(interaction);
      case 'annuler':
        return handleCancel(interaction, client);
      case 'modifier':
        return handleEdit(interaction, client);
      default:
        return interaction.reply({ content: 'Sous-commande inconnue.', ephemeral: true });
    }
  },
};

async function handleCreate(interaction, client) {
  const question = interaction.options.getString('question', true);
  const choicesInput = interaction.options.getString('choix', true);
  const options = parseOptions(choicesInput);

  if (options.length < 2) {
    return interaction.reply({
      content: 'Il faut au moins 2 choix. Sépare-les par des virgules : `Rouge, Bleu, Vert`',
      ephemeral: true,
    });
  }

  const channel = interaction.options.getChannel('salon') ?? interaction.channel;
  if (!channel.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
    return interaction.reply({ content: 'Je peux pas parler dans ce salon.', ephemeral: true });
  }

  const durationInput = interaction.options.getString('duree');
  let endAt = null;
  if (durationInput) {
    const ms = parseDuration(durationInput);
    if (!ms) {
      return interaction.reply({ content: 'Durée pas valide. Essaie `1h` ou `2j`.', ephemeral: true });
    }
    endAt = Date.now() + ms;
  }

  const poll = {
    id: generateId(),
    guildId: interaction.guildId,
    channelId: channel.id,
    messageId: null,
    question,
    description: interaction.options.getString('description') ?? null,
    hostId: interaction.user.id,
    createdAt: Date.now(),
    endAt,
    options,
    multiVote: interaction.options.getBoolean('choix_multiples') ?? false,
    maxChoices: interaction.options.getInteger('max_choix') ?? (interaction.options.getBoolean('choix_multiples') ? 10 : 1),
    hideResults: interaction.options.getBoolean('cacher_resultats') ?? false,
    requiredRoles: interaction.options.getRole('role_requis') ? [interaction.options.getRole('role_requis').id] : [],
    ended: false,
  };

  const payload = buildPollComponents(poll);
  const message = await channel.send(payload);
  poll.messageId = message.id;
  savePoll(poll);

  const lines = [
    `**Question** · ${question}`,
    `**Salon** · <#${channel.id}>`,
    `**Choix** · ${options.length}`,
    `**ID** · \`${poll.id}\``,
  ];
  if (endAt) lines.push(`**Durée** · ${formatDuration(endAt - Date.now())}`);

  return interaction.reply({
    ...buildInfoPanel('Sondage publié', lines),
    ephemeral: true,
  });
}

async function handleEnd(interaction, client) {
  const id = interaction.options.getString('id', true);
  const poll = getPoll(id);

  if (!poll || poll.guildId !== interaction.guildId) {
    return interaction.reply({ content: 'Sondage introuvable.', ephemeral: true });
  }
  if (poll.ended) {
    return interaction.reply({ content: 'Déjà terminé.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  await endPoll(client, id, { endedBy: interaction.user.id });
  return interaction.editReply(buildInfoPanel('C\'est clos', [`**${poll.question}**`]));
}

async function handleResults(interaction) {
  const id = interaction.options.getString('id', true);
  const poll = getPoll(id);

  if (!poll || poll.guildId !== interaction.guildId) {
    return interaction.reply({ content: 'Sondage introuvable.', ephemeral: true });
  }

  const total = poll.options.reduce((s, o) => s + o.votes.length, 0);
  const lines = poll.options.map((o) => {
    const pct = total > 0 ? Math.round((o.votes.length / total) * 100) : 0;
    return `• **${o.label}** · ${o.votes.length} (${pct}%)`;
  });

  return interaction.reply({
    ...buildInfoPanel(`Résultats · ${poll.question}`, lines),
    ephemeral: true,
  });
}

async function handleCancel(interaction, client) {
  const id = interaction.options.getString('id', true);
  const poll = getPoll(id);

  if (!poll || poll.guildId !== interaction.guildId) {
    return interaction.reply({ content: 'Sondage introuvable.', ephemeral: true });
  }

  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (channel?.isTextBased()) {
    const msg = await channel.messages.fetch(poll.messageId).catch(() => null);
    if (msg) {
      await msg.edit(
        buildInfoPanel('Sondage annulé', [
          `**${poll.question}**`,
          `Par <@${interaction.user.id}>`,
        ], 0x95a5a6),
      );
    }
  }

  deletePoll(id);
  return interaction.reply({ content: 'Sondage supprimé.', ephemeral: true });
}

async function handleEdit(interaction, client) {
  const id = interaction.options.getString('id', true);
  const poll = getPoll(id);

  if (!poll || poll.guildId !== interaction.guildId) {
    return interaction.reply({ content: 'Sondage introuvable.', ephemeral: true });
  }
  if (poll.ended) {
    return interaction.reply({ content: 'On touche plus à un sondage fini.', ephemeral: true });
  }

  const question = interaction.options.getString('question');
  const description = interaction.options.getString('description');
  const durationInput = interaction.options.getString('duree');

  if (!question && description === null && !durationInput) {
    return interaction.reply({ content: 'Donne au moins un truc à changer.', ephemeral: true });
  }

  if (question) poll.question = question;
  if (description !== null) poll.description = description || null;
  if (durationInput) {
    const extra = parseDuration(durationInput);
    if (!extra) return interaction.reply({ content: 'Durée invalide.', ephemeral: true });
    poll.endAt = (poll.endAt ?? Date.now()) + extra;
  }

  savePoll(poll);
  await refreshPollMessage(client, poll);

  return interaction.reply({
    ...buildInfoPanel('Mis à jour', [`**${poll.question}**`]),
    ephemeral: true,
  });
}
