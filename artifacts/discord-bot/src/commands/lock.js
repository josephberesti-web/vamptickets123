const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (prevent @everyone from sending messages)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lock (defaults to current)'))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for locking')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: false,
      }, { reason });

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔒 Channel Locked')
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await channel.send({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`🔒 This channel has been locked by ${interaction.user.tag}. Reason: ${reason}`)] });
      await interaction.editReply({ content: `✅ <#${channel.id}> has been locked.` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to lock: ${err.message}` });
    }
  },
};
