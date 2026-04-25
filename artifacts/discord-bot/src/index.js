require('dotenv').config();

const {
  Client,
  Collection,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { handleAutomod } = require('./modules/automod');
const auditlog = require('./modules/auditlog');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

const healthHost = process.env.HOST || '0.0.0.0';
const healthPort = Number(process.env.PORT || 3030);

require('http')
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(client.isReady() ? 'Discord bot is connected.' : 'Discord bot process is running.');
  })
  .listen(healthPort, healthHost, () => {
    console.log(`Health server listening on ${healthHost}:${healthPort}`);
  });

const owner = config.modmail.ownerID;
const supportcat = config.modmail.supportId;
const whitelistrole = config.modmail.whitelist;
const staffID = config.modmail.staff;
const staffPingChannel = config.modmail.staffPingChannel;
const log = config.logs.logschannel;
const transcriptPingChannelId = config.logs.transcriptChannel;
const transcriptFileChannelId = config.logs.transcriptFileChannel;

const ticketTypes = [
  { id: 'bug_issue', label: 'Bug/Issue' },
  { id: 'report_player', label: 'Report a Player' },
  { id: 'general_inquiry', label: 'General Inquiry' },
  { id: 'payment_issues', label: 'Payment Issues' },
  { id: 'appeals', label: 'Appeals' },
  { id: 'miscellaneous_inquiries', label: 'Miscellaneous Inquiries' },
];

async function fetchTicketMessages(channel) {
  const messages = [];
  let lastMessageId;
  while (true) {
    const options = { limit: 100 };
    if (lastMessageId) options.before = lastMessageId;
    const batch = await channel.messages.fetch(options);
    if (!batch.size) break;
    messages.push(...batch.values());
    lastMessageId = batch.last().id;
    if (messages.length >= 1000) break;
  }
  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function getTicketCreatorId(channel, messages) {
  const topicMatch = channel.topic?.match(/ticket-owner:(\d+)/);
  if (topicMatch) return topicMatch[1];
  for (const message of messages) {
    for (const embed of message.embeds) {
      const footerText = embed.footer?.text || '';
      const footerMatch = footerText.match(/User ID:\s*(\d+)/);
      if (footerMatch) return footerMatch[1];
    }
  }
  return null;
}

function buildTranscript(channel, messages) {
  const lines = messages.map(message => {
    const author = message.author?.tag || message.author?.username || 'Unknown User';
    const timestamp = new Date(message.createdTimestamp).toISOString();
    const content = message.content || '';
    const attachments = [...message.attachments.values()].map(a => a.url);
    const attachmentText = attachments.length ? `\nAttachments: ${attachments.join(', ')}` : '';
    return `[${timestamp}] ${author}: ${content}${attachmentText}`;
  });
  return Buffer.from([
    `Transcript for #${channel.name}`,
    `Channel ID: ${channel.id}`,
    `Created: ${new Date().toISOString()}`,
    '',
    ...lines,
  ].join('\n'), 'utf8');
}

async function getConfiguredChannel(channelId, label) {
  if (!channelId) { console.warn(`${label} channel is not configured.`); return null; }
  try { return client.channels.cache.get(channelId) || await client.channels.fetch(channelId); }
  catch (error) { console.error(`Could not find ${label} channel:`, error); return null; }
}

async function sendTranscriptToTicketChannel(channel, action) {
  try {
    const messages = await fetchTicketMessages(channel);
    const ticketCreatorId = getTicketCreatorId(channel, messages);
    const transcriptPingChannel = await getConfiguredChannel(transcriptPingChannelId, 'transcript ping');
    const transcriptFileChannel = await getConfiguredChannel(transcriptFileChannelId, 'transcript file');
    if (!transcriptPingChannel) return { success: false, message: 'Transcript ping channel not configured.' };
    if (!transcriptFileChannel) return { success: false, message: 'Transcript file channel not configured.' };

    const fileName = `${channel.name}-transcript.txt`.replace(/[^a-z0-9_.-]/gi, '-');
    const ticketCreatorText = ticketCreatorId ? `<@${ticketCreatorId}>` : 'Unknown';
    const transcriptFile = buildTranscript(channel, messages);

    await transcriptPingChannel.send({
      content: `<@&${staffID}> A transcript was saved for **#${channel.name}**. File: <#${transcriptFileChannel.id}>`,
      allowedMentions: { roles: [staffID] },
    });

    await transcriptFileChannel.send({
      content: `# Ticket Transcript\n\n**Ticket:** #${channel.name} (${channel.id})\n**Creator:** ${ticketCreatorText}\n**Action:** ${action}`,
      files: [{ attachment: transcriptFile, name: fileName }],
    });

    if (ticketCreatorId) {
      try {
        const user = await client.users.fetch(ticketCreatorId);
        await user.send({ content: `Transcript for **#${channel.name}** — ${action}.`, files: [{ attachment: transcriptFile, name: fileName }] });
      } catch (_) {}
    }

    return { success: true, message: 'Transcript saved.' };
  } catch (error) {
    console.error('Failed to send transcript:', error);
    return { success: false, message: 'Could not send transcript.' };
  }
}

async function sendLogMessage(message) {
  const logChannel = await getConfiguredChannel(log, 'log');
  if (logChannel) await logChannel.send(message);
}

async function sendStaffPing(ticket, ticketType, user) {
  const channel = await getConfiguredChannel(staffPingChannel, 'staff ping');
  if (channel) {
    await channel.send({
      content: `<@&${staffID}> New **${ticketType.label}** ticket by <@${user.id}>: <#${ticket.id}>`,
      allowedMentions: { roles: [staffID], users: [user.id] },
    });
  }
}

function buildTicketActions() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🗑️ Delete Ticket').setCustomId('delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setLabel('🔒 Close Ticket').setCustomId('close2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('📄 Save Transcript').setCustomId('save_transcript').setStyle(ButtonStyle.Secondary)
  );
}

function userCanManageTickets(member) {
  return member?.roles.cache.has(whitelistrole);
}

function buildSupportTypeOptions() {
  const buttons = ticketTypes.map(t =>
    new ButtonBuilder().setLabel(t.label).setCustomId(`ticket_type_${t.id}`).setStyle(ButtonStyle.Secondary)
  );
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

function getTicketType(customId) {
  const id = customId.replace('ticket_type_', '');
  return ticketTypes.find(t => t.id === id);
}

function createTicketChannelName(username, ticketType) {
  const typeSlug = ticketType.id.replace(/_/g, '-');
  const userSlug = username.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 20);
  return `${typeSlug}-${userSlug}`;
}

function buildTicketDescriptionModal(ticketType) {
  return new ModalBuilder()
    .setCustomId(`ticket_description_${ticketType.id}`)
    .setTitle(`${ticketType.label} Ticket`)
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Describe your problem')
        .setPlaceholder('Write a short description of what you need help with.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1000)
    ));
}

async function createTicketFromInteraction(interaction, ticketType, description) {
  const supportmsg = new EmbedBuilder()
    .setTitle(`${interaction.user.displayName}'s ${ticketType.label} Ticket`)
    .setDescription(`**Ticket Type:** ${ticketType.label}\n\n**Description:**\n${description}\n\n**Hello!**\nOne of our team members will assist you shortly.`)
    .setFooter({ text: `User ID: ${interaction.user.id}` })
    .setColor('#2a043b');

  const ticket = await interaction.guild.channels.create({
    name: createTicketChannelName(interaction.user.username, ticketType),
    type: ChannelType.GuildText,
    parent: supportcat,
    topic: `ticket-owner:${interaction.user.id}; ticket-type:${ticketType.label}`,
    permissionOverwrites: [
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      { id: whitelistrole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    ],
  });

  await sendLogMessage(`# New Ticket\n\n**User:** <@${interaction.user.id}> opened <#${ticket.id}> for **${ticketType.label}**.\n\n**Description:** ${description}`);
  await sendStaffPing(ticket, ticketType, interaction.user);
  await ticket.send({
    content: `<@${interaction.user.id}> **==========================**`,
    embeds: [supportmsg],
    components: [buildTicketActions()],
    allowedMentions: { users: [interaction.user.id] },
  });

  return ticket;
}

client.once('ready', async () => {
  console.log(`${client.user.username} is ready!`);

  if (config.clientId) {
    const commands = client.commands.map(c => c.data.toJSON());
    const rest = new REST().setToken(config.token);
    try {
      if (config.guildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
        console.log(`Registered ${commands.length} slash commands to guild.`);
      } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
        console.log(`Registered ${commands.length} slash commands globally.`);
      }
    } catch (err) {
      console.error('Failed to register slash commands:', err.message);
    }
  }
});

client.on('messageCreate', async (message) => {
  await handleAutomod(message);

  if (message.author.id === owner) {
    if (message.content.toLowerCase().startsWith('!ticket-embed')) {
      message.delete();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('📨 Support').setStyle(ButtonStyle.Secondary).setCustomId('support')
      );
      const ticketmsg = new EmbedBuilder()
        .setTitle(`${message.guild.name}'s Ticket System`)
        .setDescription(`**Welcome to our Support Ticket System!** 🎫\n\n*Click the button below, select the category that best fits your problem, and fill out the description.*\n\n*Our team will respond as soon as possible.*`)
        .setFooter({ text: `${message.guild.name}`, iconURL: message.guild.iconURL() })
        .setColor('#842abe');
      message.channel.send({ embeds: [ticketmsg], components: [row] });
    }
  }
});

client.on('messageDelete', async (message) => {
  if (!message.partial) await auditlog.onMessageDelete(message);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.partial && !newMessage.partial) await auditlog.onMessageUpdate(oldMessage, newMessage);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  await auditlog.onVoiceStateUpdate(oldState, newState);
});

client.on('guildMemberAdd', async (member) => {
  await auditlog.onGuildMemberAdd(member);
});

client.on('guildMemberRemove', async (member) => {
  await auditlog.onGuildMemberRemove(member);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  await auditlog.onGuildMemberUpdate(oldMember, newMember);
});

client.on('channelCreate', async (channel) => {
  await auditlog.onChannelCreate(channel);
});

client.on('channelDelete', async (channel) => {
  await auditlog.onChannelDelete(channel);
});

client.on('roleCreate', async (role) => {
  await auditlog.onRoleCreate(role);
});

client.on('roleDelete', async (role) => {
  await auditlog.onRoleDelete(role);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
        return;
      }
    }

    if (interaction.isButton()) {
      const userId = interaction.user.id;

      if (interaction.customId === 'support') {
        await interaction.reply({ content: 'What kind of support ticket do you want to open?', components: buildSupportTypeOptions(), ephemeral: true });
      } else if (interaction.customId.startsWith('ticket_type_')) {
        const ticketType = getTicketType(interaction.customId);
        if (!ticketType) { await interaction.reply({ content: 'That ticket type is not available.', ephemeral: true }); return; }
        await interaction.showModal(buildTicketDescriptionModal(ticketType));
      } else if (interaction.customId === 'close2') {
        if (!userCanManageTickets(interaction.member)) {
          await interaction.reply({ content: 'You do not have permission to close tickets.', ephemeral: true });
          return;
        }
        await interaction.reply({ content: 'Ticket closed. It will be deleted in 10 seconds...' });
        await sendTranscriptToTicketChannel(interaction.channel, 'closed');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
      } else if (interaction.customId === 'delete') {
        if (!userCanManageTickets(interaction.member)) {
          await interaction.reply({ content: 'You do not have permission to delete tickets.', ephemeral: true });
          return;
        }
        await interaction.reply({ content: 'Deleting ticket in 5 seconds...' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      } else if (interaction.customId === 'save_transcript') {
        if (!userCanManageTickets(interaction.member)) {
          await interaction.reply({ content: 'You do not have permission to save transcripts.', ephemeral: true });
          return;
        }
        await interaction.reply({ content: '⏳ Saving transcript...', ephemeral: true });
        const result = await sendTranscriptToTicketChannel(interaction.channel, 'transcript manually saved');
        await interaction.editReply({ content: result.success ? `✅ ${result.message}` : `❌ ${result.message}` });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_description_')) {
        const ticketTypeId = interaction.customId.replace('ticket_description_', '');
        const ticketType = ticketTypes.find(t => t.id === ticketTypeId);
        if (!ticketType) { await interaction.reply({ content: 'Invalid ticket type.', ephemeral: true }); return; }

        await interaction.deferReply({ ephemeral: true });
        const description = interaction.fields.getTextInputValue('ticket_description') || 'No description provided.';

        const existingTicket = interaction.guild.channels.cache.find(ch =>
          ch.topic?.includes(`ticket-owner:${interaction.user.id}`) && ch.parentId === supportcat
        );

        if (existingTicket) {
          await interaction.editReply({ content: `You already have an open ticket: <#${existingTicket.id}>. Please close it before opening a new one.` });
          return;
        }

        const ticket = await createTicketFromInteraction(interaction, ticketType, description);
        await interaction.editReply({ content: `✅ Your ticket has been created: <#${ticket.id}>` });
      }
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const reply = { content: `Something went wrong: ${err.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      interaction.editReply(reply).catch(() => {});
    } else {
      interaction.reply(reply).catch(() => {});
    }
  }
});

if (!config.token) {
  console.error('DISCORD_TOKEN is not set. Please set it in your .env file or environment.');
  process.exit(1);
}

client.login(config.token).catch(err => {
  console.error('Failed to login to Discord:', err.message);
  process.exit(1);
});
