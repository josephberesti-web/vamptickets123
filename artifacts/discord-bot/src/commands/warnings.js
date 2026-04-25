const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getWarnings } = require('./warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.options.getMember('user') || interaction.options.getUser('user');
    const user = member?.user ?? member;

    const warnList = getWarnings(user.id, interaction.guild.id);

    if (warnList.length === 0) {
      return interaction.editReply({ content: `**${user.tag}** has no warnings.` });
    }

    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle(`⚠️ Warnings for ${user.tag}`)
      .setDescription(warnList.map((w, i) => `**${i + 1}.** ${w.reason}\n> By: ${w.moderator} • <t:${Math.floor(w.timestamp / 1000)}:R>`).join('\n\n'))
      .setFooter({ text: `Total: ${warnList.length} warning(s)` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
