const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) return interaction.editReply({ content: 'User not found in this server.' });
    if (!member.kickable) return interaction.editReply({ content: 'I cannot kick this user.' });
    if (member.id === interaction.user.id) return interaction.editReply({ content: 'You cannot kick yourself.' });

    try {
      try { await member.user.send(`You have been **kicked** from **${interaction.guild.name}**.\n**Reason:** ${reason}`); } catch (_) {}
      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('👢 Member Kicked')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: `✅ **${member.user.tag}** has been kicked. Reason: ${reason}` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to kick: ${err.message}` });
    }
  },
};
