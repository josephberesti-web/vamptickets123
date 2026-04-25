const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban'))
    .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('user') || interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    if (!target) return interaction.editReply({ content: 'User not found.' });

    const targetUser = target.user ?? target;
    const member = interaction.guild.members.cache.get(targetUser.id);

    if (member) {
      if (!member.bannable) return interaction.editReply({ content: 'I cannot ban this user (missing permissions or higher role).' });
      if (member.id === interaction.user.id) return interaction.editReply({ content: 'You cannot ban yourself.' });
    }

    try {
      try {
        await targetUser.send(`You have been **banned** from **${interaction.guild.name}**.\n**Reason:** ${reason}`);
      } catch (_) {}

      await interaction.guild.members.ban(targetUser.id, { reason: `${reason} (banned by ${interaction.user.tag})`, deleteMessageDays: deleteDays });

      const embed = new EmbedBuilder()
        .setColor('#CC0000')
        .setTitle('🔨 Member Banned')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Messages Deleted', value: `${deleteDays} day(s)`, inline: true }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: `✅ **${targetUser.tag}** has been banned. Reason: ${reason}` });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: `Failed to ban: ${err.message}` });
    }
  },
};
