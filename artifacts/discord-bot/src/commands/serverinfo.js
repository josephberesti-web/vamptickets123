const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get information about the server'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    await guild.fetch();

    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle(`🏰 Server Info — ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
