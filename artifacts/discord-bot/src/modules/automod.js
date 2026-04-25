const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config');

const spamMap = new Map();

function getSpamKey(userId, guildId) {
  return `${guildId}:${userId}`;
}

function trackMessage(userId, guildId) {
  const key = getSpamKey(userId, guildId);
  const now = Date.now();
  const window = config.automod.spamWindowMs;

  if (!spamMap.has(key)) {
    spamMap.set(key, []);
  }

  const timestamps = spamMap.get(key).filter(t => now - t < window);
  timestamps.push(now);
  spamMap.set(key, timestamps);

  return timestamps.length;
}

function containsBannedWord(content) {
  const lower = content.toLowerCase();
  return config.automod.bannedWords.find(word => lower.includes(word)) || null;
}

async function applyMute(member, durationMs, reason) {
  try {
    await member.timeout(durationMs, reason);
    return true;
  } catch (err) {
    console.error('Failed to mute member:', err.message);
    return false;
  }
}

async function sendModLog(client, embed) {
  const channelId = config.logs.modLogChannel || config.logs.logschannel;
  if (!channelId) return;
  try {
    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId);
    if (channel) await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send mod log:', err.message);
  }
}

async function handleAutomod(message) {
  if (!config.automod.enabled) return;
  if (!message.guild) return;
  if (message.author.bot) return;

  const member = message.guild.members.cache.get(message.author.id);
  if (!member) return;

  if (member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

  const bannedWord = containsBannedWord(message.content);
  if (bannedWord) {
    try {
      await message.delete();
    } catch (_) {}

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚫 AutoMod — Banned Word')
      .addFields(
        { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Matched Word', value: `\`${bannedWord}\``, inline: true },
        { name: 'Message', value: message.content.slice(0, 1000) || '*(empty)*' }
      )
      .setTimestamp();

    await sendModLog(message.client, embed);

    try {
      await message.channel.send({
        content: `<@${message.author.id}>, your message was removed for containing a banned word.`,
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    } catch (_) {}

    return;
  }

  const msgCount = trackMessage(message.author.id, message.guild.id);
  if (msgCount >= config.automod.spamThreshold) {
    spamMap.set(getSpamKey(message.author.id, message.guild.id), []);

    const duration = config.automod.muteDurationMs;
    const muted = await applyMute(member, duration, 'AutoMod: Spam detected');

    const embed = new EmbedBuilder()
      .setColor('#FF6600')
      .setTitle('⚠️ AutoMod — Spam Detected')
      .addFields(
        { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Action', value: muted ? `Timed out for ${Math.round(duration / 60000)} minutes` : 'Timeout failed (check permissions)', inline: true },
        { name: 'Messages', value: `${msgCount} messages in ${config.automod.spamWindowMs / 1000}s`, inline: true }
      )
      .setTimestamp();

    await sendModLog(message.client, embed);

    try {
      await message.channel.send({
        content: `<@${message.author.id}>, you have been timed out for spamming.`,
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    } catch (_) {}
  }
}

module.exports = { handleAutomod, sendModLog };
