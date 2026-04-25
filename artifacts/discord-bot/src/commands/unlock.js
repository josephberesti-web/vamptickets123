const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to unlock (defaults to current)')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });

      const embed = new EmbedBuilder()
        .setColor('#00CC66')
        .setTitle('🔓 Channel Unlocked')
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await channel.send({ embeds: [new EmbedBuilder().setColor('#00CC66').setDescription(`🔓 This channel has been unlocked by ${interaction.user.tag}.`)] });
      await interaction.editReply({ content: `✅ <#${channel.id}> has been unlocked.` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to unlock: ${err.message}` });
    }
  },
};
