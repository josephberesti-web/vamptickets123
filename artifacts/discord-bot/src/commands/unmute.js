const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout (unmute) from a member')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for removing the timeout')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) return interaction.editReply({ content: 'User not found in this server.' });
    if (!member.isCommunicationDisabled()) return interaction.editReply({ content: 'This user is not currently timed out.' });

    try {
      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setColor('#00CC66')
        .setTitle('🔊 Member Unmuted')
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: `✅ **${member.user.tag}** has been unmuted.` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to unmute: ${err.message}` });
    }
  },
};
