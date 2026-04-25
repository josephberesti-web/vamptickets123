const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a user')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to ban').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Duration (minutes)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'No reason';

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
      }

      if (!member.bannable) {
        return interaction.reply({ content: '❌ I cannot ban this user (role hierarchy issue).', ephemeral: true });
      }

      await member.ban({ reason });

      await interaction.reply(`🔨 ${user.tag} banned for ${duration} minutes.`);

      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(user.id, 'Tempban expired');
        } catch (err) {
          console.error('Unban failed:', err);
        }
      }, duration * 60 * 1000);

    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to execute command.', ephemeral: true });
    }
  }
};
