const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for the current channel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addIntegerOption(opt =>
      opt.setName('seconds').setDescription('Slowmode delay in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);

      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('🐌 Slowmode Updated')
        .addFields(
          { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Slowmode', value: seconds === 0 ? 'Disabled' : `${seconds} second(s)`, inline: true }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: seconds === 0 ? '✅ Slowmode disabled.' : `✅ Slowmode set to **${seconds}** second(s).` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to set slowmode: ${err.message}` });
    }
  },
};
