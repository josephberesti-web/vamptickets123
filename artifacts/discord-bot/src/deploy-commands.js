require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`Loaded command: ${command.data.name}`);
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);

    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log('Commands registered to guild (instant).');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Commands registered globally (may take up to 1 hour).');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();
