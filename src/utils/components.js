const {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { getGuildConfig } = require('../database/store');
const config = require('../config');

const V2_FLAGS = MessageFlags.IsComponentsV2;
const BUTTON_STYLES = [
  ButtonStyle.Primary,
  ButtonStyle.Secondary,
  ButtonStyle.Success,
  ButtonStyle.Danger,
  ButtonStyle.Primary,
];

function accentForGuild(guildId) {
  const guildConfig = getGuildConfig(guildId);
  return guildConfig.accentColor ?? config.defaultAccent;
}

function totalVotes(poll) {
  return poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
}

function optionLabel(poll, option, index) {
  const count = option.votes.length;
  if (poll.hideResults && !poll.ended) return option.label;
  return `${option.label} (${count})`;
}

function buildPollComponents(poll) {
  const accent = poll.ended ? 0x95a5a6 : accentForGuild(poll.guildId);
  const votes = totalVotes(poll);
  const host = `<@${poll.hostId}>`;

  const container = new ContainerBuilder()
    .setAccentColor(accent)
    .addTextDisplayComponents(
      (t) => t.setContent(poll.ended ? '## Sondage terminé' : '## 📊 Sondage'),
      (t) => t.setContent(`**${poll.question}**`),
    );

  if (poll.description) {
    container.addTextDisplayComponents((t) => t.setContent(poll.description));
  }

  container.addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

  const meta = [];
  meta.push(`Par ${host}`);
  if (poll.endAt && !poll.ended) {
    meta.push(`Fin <t:${Math.floor(poll.endAt / 1000)}:R>`);
  }
  if (poll.ended) meta.push('Votes clos');
  meta.push(`${votes} vote(s) au total`);
  if (poll.multiVote) meta.push('Choix multiples autorisés');

  container.addTextDisplayComponents((t) => t.setContent(meta.join(' · ')));

  if (!poll.ended && poll.options.length > 0) {
    const rows = [];
    for (let i = 0; i < poll.options.length; i += 5) {
      const chunk = poll.options.slice(i, i + 5);
      rows.push(
        (row) =>
          row.setComponents(
            ...chunk.map((opt, j) => {
              const idx = i + j;
              return new ButtonBuilder()
                .setCustomId(`poll:vote:${poll.id}:${idx}`)
                .setLabel(optionLabel(poll, opt, idx).slice(0, 80))
                .setStyle(BUTTON_STYLES[idx % BUTTON_STYLES.length]);
            }),
          ),
      );
    }
    container.addActionRowComponents(...rows);
  }

  if (poll.ended || (poll.hideResults && poll.ended) || !poll.hideResults) {
    container.addSeparatorComponents((s) => s.setDivider(false).setSpacing(SeparatorSpacingSize.Small));
    const lines = poll.options.map((opt) => {
      const count = opt.votes.length;
      const pct = votes > 0 ? Math.round((count / votes) * 100) : 0;
      const bar = '█'.repeat(Math.round(pct / 10)) || '▏';
      if (poll.hideResults && !poll.ended) return `• ${opt.label} · ?`;
      return `• ${opt.label} · ${count} (${pct}%) ${bar}`;
    });
    container.addTextDisplayComponents((t) => t.setContent(lines.join('\n')));
  }

  return { components: [container], flags: V2_FLAGS };
}

function buildInfoPanel(title, lines, accent = config.defaultAccent) {
  const container = new ContainerBuilder()
    .setAccentColor(accent)
    .addTextDisplayComponents((t) => t.setContent(`## ${title}`));

  for (const line of lines) {
    container.addSeparatorComponents((s) => s.setDivider(false).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents((t) => t.setContent(line));
  }

  return { components: [container], flags: V2_FLAGS };
}

function buildListPanel(polls, guildId) {
  const active = polls.filter((p) => !p.ended);
  const ended = polls.filter((p) => p.ended);

  if (!polls.length) {
    return buildInfoPanel('Sondages', ['Rien en cours pour l\'instant.'], accentForGuild(guildId));
  }

  const lines = [];
  if (active.length) {
    lines.push('**Actifs**');
    for (const p of active.slice(0, 8)) {
      const end = p.endAt ? ` · fin <t:${Math.floor(p.endAt / 1000)}:R>` : '';
      lines.push(`• \`${p.id.slice(0, 8)}\` · ${p.question.slice(0, 50)}${end}`);
    }
  }
  if (ended.length) {
    lines.push('', '**Terminés**');
    for (const p of ended.slice(-4).reverse()) {
      lines.push(`• \`${p.id.slice(0, 8)}\` · ${p.question.slice(0, 50)}`);
    }
  }

  return buildInfoPanel('Sondages du serveur', lines, accentForGuild(guildId));
}

function buildConfigPanel(guildConfig, guild) {
  const accent = guildConfig.accentColor ?? config.defaultAccent;
  const managers =
    guildConfig.managerRoles.length > 0
      ? guildConfig.managerRoles.map((id) => `<@&${id}>`).join(', ')
      : 'admins + Manage Server';

  return buildInfoPanel(
    `Config · ${guild.name}`,
    [
      `**Logs** · ${guildConfig.logChannelId ? `<#${guildConfig.logChannelId}>` : 'pas configuré'}`,
      `**Gestionnaires** · ${managers}`,
      `**Couleur** · \`#${accent.toString(16).padStart(6, '0')}\``,
    ],
    accent,
  );
}

function buildHelpPanel() {
  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      (t) => t.setContent('## SondageMaster'),
      (t) => t.setContent('Sondages avec boutons V2. `/sondage` pour tout gérer, `/config` pour les réglages.'),
    )
    .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      (t) => t.setContent('`/sondage creer` · `/sondage terminer` · `/sondage resultats`'),
      (t) => t.setContent('`/sondage liste` · `/sondage annuler` · `/sondage modifier`'),
    );

  return { components: [container], flags: V2_FLAGS };
}

module.exports = {
  V2_FLAGS,
  buildPollComponents,
  buildInfoPanel,
  buildListPanel,
  buildConfigPanel,
  buildHelpPanel,
  totalVotes,
};
