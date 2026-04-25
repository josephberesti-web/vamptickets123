require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  modmail: {
    ownerID: process.env.OWNER_ID || '1164293195656601740',
    supportId: process.env.SUPPORT_CATEGORY_ID || '1491556418908717087',
    whitelist: process.env.WHITELIST_ROLE_ID || '1492274789035933887',
    staff: process.env.STAFF_ROLE_ID || '1492274789035933887',
    staffPingChannel: process.env.STAFF_PING_CHANNEL_ID || '1492636843513217164',
  },

  logs: {
    logschannel: process.env.LOGS_CHANNEL_ID || '1492639975647481866',
    transcriptChannel: process.env.TRANSCRIPT_PING_CHANNEL_ID || '1492639975647481866',
    transcriptFileChannel: process.env.TRANSCRIPT_FILE_CHANNEL_ID || '1492276302932213961',
    auditLogChannel: process.env.AUDIT_LOG_CHANNEL_ID || '',
    modLogChannel: process.env.MOD_LOG_CHANNEL_ID || '',
  },

  automod: {
    enabled: process.env.AUTOMOD_ENABLED !== 'false',
    spamThreshold: parseInt(process.env.SPAM_THRESHOLD || '5'),
    spamWindowMs: parseInt(process.env.SPAM_WINDOW_MS || '5000'),
    muteDurationMs: parseInt(process.env.AUTOMOD_MUTE_MS || '300000'),
    bannedWords: (process.env.BANNED_WORDS || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean),
    muteRoleId: process.env.MUTE_ROLE_ID || '',
  },
};
