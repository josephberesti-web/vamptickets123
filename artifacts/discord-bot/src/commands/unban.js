const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addStringOption(opt => opt.setName('user_id').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the unban')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const user = await interaction.client.users.fetch(userId);
      await interaction.guild.members.unban(userId, reason);

      const embed = new EmbedBuilder()
        .setColor('#00CC66')
        .setTitle('🔓 Member Unbanned')
        .addFields(
          { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: `✅ **${user.tag}** has been unbanned.` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to unban: ${err.message}` });
    }
  },
};
