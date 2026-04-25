const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempmute')
    .setDescription('Temporarily mute a user')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Duration (minutes)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'No reason';

      const member = await interaction.guild.members.fetch(user.id);

      if (!member.moderatable) {
        return interaction.reply({ content: '❌ I cannot mute this user (role hierarchy issue).', ephemeral: true });
      }

      await member.timeout(duration * 60 * 1000, reason);

      await interaction.reply(`🔇 ${user.tag} muted for ${duration} minutes.`);

    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to execute command.', ephemeral: true });
    }
  }
};
