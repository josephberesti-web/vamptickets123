const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

function parseDuration(str) {
  if (!str) return 10 * 60 * 1000;
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 2d). Default: 10m'))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the mute')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) return interaction.editReply({ content: 'User not found in this server.' });
    if (!member.moderatable) return interaction.editReply({ content: 'I cannot mute this user.' });
    if (member.id === interaction.user.id) return interaction.editReply({ content: 'You cannot mute yourself.' });

    const durationMs = parseDuration(durationStr);
    if (durationMs === null) return interaction.editReply({ content: 'Invalid duration format. Use: `10s`, `5m`, `2h`, `1d`' });

    const maxMs = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > maxMs) return interaction.editReply({ content: 'Duration cannot exceed 28 days.' });

    try {
      await member.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('🔇 Member Muted (Timeout)')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Duration', value: durationStr || '10m', inline: true },
          { name: 'Reason', value: reason },
          { name: 'Expires', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: `✅ **${member.user.tag}** has been muted for \`${durationStr || '10m'}\`. Reason: ${reason}` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to mute: ${err.message}` });
    }
  },
};
