const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

async function getAuditLogChannel(client) {
  const channelId = config.logs.auditLogChannel || config.logs.logschannel;
  if (!channelId) return null;
  try {
    return client.channels.cache.get(channelId) || await client.channels.fetch(channelId);
  } catch {
    return null;
  }
}

async function logEvent(client, embed) {
  const channel = await getAuditLogChannel(client);
  if (channel) {
    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to send audit log:', err.message);
    }
  }
}

async function onMessageDelete(message) {
  if (!message.guild) return;
  if (message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setColor('#FF4444')
    .setTitle('🗑️ Message Deleted')
    .addFields(
      { name: 'Author', value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Unknown', inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Content', value: message.content?.slice(0, 1024) || '*(no text content)*' }
    )
    .setTimestamp();

  if (message.attachments?.size > 0) {
    embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n').slice(0, 1024) });
  }

  await logEvent(message.client, embed);
}

async function onMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild) return;
  if (oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const embed = new EmbedBuilder()
    .setColor('#FFAA00')
    .setTitle('✏️ Message Edited')
    .addFields(
      { name: 'Author', value: oldMessage.author ? `<@${oldMessage.author.id}> (${oldMessage.author.tag})` : 'Unknown', inline: true },
      { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
      { name: 'Jump to Message', value: `[Click here](${newMessage.url})`, inline: true },
      { name: 'Before', value: oldMessage.content?.slice(0, 512) || '*(empty)*' },
      { name: 'After', value: newMessage.content?.slice(0, 512) || '*(empty)*' }
    )
    .setTimestamp();

  await logEvent(oldMessage.client, embed);
}

async function onVoiceStateUpdate(oldState, newState) {
  const user = newState.member?.user || oldState.member?.user;
  if (!user || user.bot) return;

  let description = '';
  let color = '#00AAFF';
  let title = '🔊 Voice State Update';

  if (!oldState.channelId && newState.channelId) {
    title = '🔊 Joined Voice Channel';
    color = '#00CC66';
    description = `<@${user.id}> joined <#${newState.channelId}>`;
  } else if (oldState.channelId && !newState.channelId) {
    title = '🔕 Left Voice Channel';
    color = '#CC3300';
    description = `<@${user.id}> left <#${oldState.channelId}>`;
  } else if (oldState.channelId !== newState.channelId) {
    title = '🔀 Switched Voice Channel';
    color = '#FFAA00';
    description = `<@${user.id}> moved from <#${oldState.channelId}> to <#${newState.channelId}>`;
  } else {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true }
    )
    .setTimestamp();

  await logEvent(newState.client, embed);
}

async function onGuildMemberAdd(member) {
  const embed = new EmbedBuilder()
    .setColor('#00CC66')
    .setTitle('✅ Member Joined')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  await logEvent(member.client, embed);
}

async function onGuildMemberRemove(member) {
  const embed = new EmbedBuilder()
    .setColor('#CC3300')
    .setTitle('🚪 Member Left')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
      { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  await logEvent(member.client, embed);
}

async function onGuildMemberUpdate(oldMember, newMember) {
  const changes = [];

  if (oldMember.nickname !== newMember.nickname) {
    changes.push({ name: 'Nickname Changed', value: `\`${oldMember.nickname || 'None'}\` → \`${newMember.nickname || 'None'}\`` });
  }

  const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (addedRoles.size > 0) {
    changes.push({ name: 'Roles Added', value: addedRoles.map(r => `<@&${r.id}>`).join(', ') });
  }
  if (removedRoles.size > 0) {
    changes.push({ name: 'Roles Removed', value: removedRoles.map(r => `<@&${r.id}>`).join(', ') });
  }

  if (changes.length === 0) return;

  const embed = new EmbedBuilder()
    .setColor('#FFAA00')
    .setTitle('📝 Member Updated')
    .addFields(
      { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
      ...changes
    )
    .setTimestamp();

  await logEvent(newMember.client, embed);
}

async function onChannelCreate(channel) {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setColor('#00CC66')
    .setTitle('📢 Channel Created')
    .addFields(
      { name: 'Channel', value: `<#${channel.id}> (${channel.name})`, inline: true },
      { name: 'Type', value: channel.type.toString(), inline: true }
    )
    .setTimestamp();
  await logEvent(channel.client, embed);
}

async function onChannelDelete(channel) {
  if (!channel.guild) return;
  const embed = new EmbedBuilder()
    .setColor('#CC3300')
    .setTitle('🗑️ Channel Deleted')
    .addFields(
      { name: 'Channel', value: `#${channel.name} (${channel.id})`, inline: true },
      { name: 'Type', value: channel.type.toString(), inline: true }
    )
    .setTimestamp();
  await logEvent(channel.client, embed);
}

async function onRoleCreate(role) {
  const embed = new EmbedBuilder()
    .setColor('#00CC66')
    .setTitle('🏷️ Role Created')
    .addFields({ name: 'Role', value: `<@&${role.id}> (${role.name})`, inline: true })
    .setTimestamp();
  await logEvent(role.client, embed);
}

async function onRoleDelete(role) {
  const embed = new EmbedBuilder()
    .setColor('#CC3300')
    .setTitle('🏷️ Role Deleted')
    .addFields({ name: 'Role', value: `${role.name} (${role.id})`, inline: true })
    .setTimestamp();
  await logEvent(role.client, embed);
}

module.exports = {
  onMessageDelete,
  onMessageUpdate,
  onVoiceStateUpdate,
  onGuildMemberAdd,
  onGuildMemberRemove,
  onGuildMemberUpdate,
  onChannelCreate,
  onChannelDelete,
  onRoleCreate,
  onRoleDelete,
};
