const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to inspect (defaults to yourself)')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.options.getMember('user') || interaction.member;

    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle(`👤 User Info — ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: member.id, inline: true },
        { name: 'Display Name', value: member.displayName, inline: true },
        { name: 'Bot', value: member.user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Timed Out', value: member.isCommunicationDisabled() ? `Until <t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>` : 'No', inline: true },
        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ').slice(0, 1024) || 'None' }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
