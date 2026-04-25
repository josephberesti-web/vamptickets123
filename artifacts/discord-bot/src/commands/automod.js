const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure AutoMod settings')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View current AutoMod settings')
    )
    .addSubcommand(sub =>
      sub.setName('addword')
        .setDescription('Add a word to the banned words list')
        .addStringOption(opt => opt.setName('word').setDescription('Word to ban').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('removeword')
        .setDescription('Remove a word from the banned words list')
        .addStringOption(opt => opt.setName('word').setDescription('Word to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable AutoMod')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('spam')
        .setDescription('Configure spam threshold')
        .addIntegerOption(opt => opt.setName('messages').setDescription('Messages before mute (default: 5)').setMinValue(2).setMaxValue(20).setRequired(true))
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds (default: 5)').setMinValue(2).setMaxValue(30).setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('🛡️ AutoMod Configuration')
        .addFields(
          { name: 'Status', value: config.automod.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Spam Threshold', value: `${config.automod.spamThreshold} messages / ${config.automod.spamWindowMs / 1000}s`, inline: true },
          { name: 'Mute Duration', value: `${Math.round(config.automod.muteDurationMs / 60000)} minute(s)`, inline: true },
          { name: 'Banned Words', value: config.automod.bannedWords.length > 0 ? config.automod.bannedWords.map(w => `\`${w}\``).join(', ') : 'None' }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'addword') {
      const word = interaction.options.getString('word').toLowerCase().trim();
      if (!config.automod.bannedWords.includes(word)) {
        config.automod.bannedWords.push(word);
      }
      return interaction.editReply({ content: `✅ \`${word}\` added to the banned words list.` });
    }

    if (sub === 'removeword') {
      const word = interaction.options.getString('word').toLowerCase().trim();
      const idx = config.automod.bannedWords.indexOf(word);
      if (idx !== -1) {
        config.automod.bannedWords.splice(idx, 1);
        return interaction.editReply({ content: `✅ \`${word}\` removed from the banned words list.` });
      }
      return interaction.editReply({ content: `\`${word}\` is not in the banned words list.` });
    }

    if (sub === 'toggle') {
      config.automod.enabled = interaction.options.getBoolean('enabled');
      return interaction.editReply({ content: `✅ AutoMod is now **${config.automod.enabled ? 'enabled' : 'disabled'}**.` });
    }

    if (sub === 'spam') {
      config.automod.spamThreshold = interaction.options.getInteger('messages');
      config.automod.spamWindowMs = interaction.options.getInteger('seconds') * 1000;
      return interaction.editReply({
        content: `✅ Spam threshold updated: **${config.automod.spamThreshold}** messages in **${config.automod.spamWindowMs / 1000}** seconds.`
      });
    }
  },
};
