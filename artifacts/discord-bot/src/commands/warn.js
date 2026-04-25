const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

const warnings = new Map();

function getWarnings(userId, guildId) {
  const key = `${guildId}:${userId}`;
  return warnings.get(key) || [];
}

function addWarning(userId, guildId, reason, moderator) {
  const key = `${guildId}:${userId}`;
  const list = warnings.get(key) || [];
  list.push({ reason, moderator, timestamp: Date.now() });
  warnings.set(key, list);
  return list;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');

    if (!member) return interaction.editReply({ content: 'User not found in this server.' });
    if (member.id === interaction.user.id) return interaction.editReply({ content: 'You cannot warn yourself.' });

    const warnList = addWarning(member.id, interaction.guild.id, reason, interaction.user.tag);

    try {
      await member.user.send(`⚠️ You have received a warning in **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${warnList.length}`);
    } catch (_) {}

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('⚠️ Member Warned')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Total Warnings', value: `${warnList.length}`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await sendModLog(interaction.client, embed);
    await interaction.editReply({ content: `✅ **${member.user.tag}** has been warned. They now have **${warnList.length}** warning(s).` });
  },

  getWarnings,
};
