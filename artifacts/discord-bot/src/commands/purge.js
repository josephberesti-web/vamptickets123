const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modules/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from a channel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of messages to delete (1–100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(opt => opt.setName('user').setDescription('Only delete messages from this user'))
    .addStringOption(opt => opt.setName('keyword').setDescription('Only delete messages containing this text'))
    .addBooleanOption(opt => opt.setName('bots').setDescription('Only delete bot messages')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');
    const keyword = interaction.options.getString('keyword')?.toLowerCase();
    const botsOnly = interaction.options.getBoolean('bots');

    try {
      const fetched = await interaction.channel.messages.fetch({ limit: 100 });

      let messages = [...fetched.values()];

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

      if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
      if (keyword) messages = messages.filter(m => m.content.toLowerCase().includes(keyword));
      if (botsOnly) messages = messages.filter(m => m.author.bot);

      messages = messages.slice(0, amount);

      if (messages.length === 0) {
        return interaction.editReply({ content: 'No messages found matching your filters.' });
      }

      const messageIds = messages.map(m => m.id);
      const deleted = await interaction.channel.bulkDelete(messageIds, true);

      const embed = new EmbedBuilder()
        .setColor('#FF4444')
        .setTitle('🗑️ Messages Purged')
        .addFields(
          { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Deleted', value: `${deleted.size} message(s)`, inline: true },
          { name: 'Filters', value: [
            filterUser ? `User: ${filterUser.tag}` : null,
            keyword ? `Keyword: "${keyword}"` : null,
            botsOnly ? 'Bots only' : null,
          ].filter(Boolean).join(', ') || 'None' }
        )
        .setTimestamp();

      await sendModLog(interaction.client, embed);
      await interaction.editReply({ content: `✅ Deleted **${deleted.size}** message(s).` });
    } catch (err) {
      await interaction.editReply({ content: `Failed to purge: ${err.message}` });
    }
  },
};
