require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Lance le serveur Express (transcripts)
require('./server');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    for (const file of fs.readdirSync(commandsPath)) {
        if (file.endsWith('.js')) {
            const command = require(path.join(commandsPath, file));
            const name = command.data ? command.data.name : command.name;
            if (name) client.commands.set(name, command);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    for (const file of fs.readdirSync(eventsPath)) {
        if (file.endsWith('.js')) {
            const event = require(path.join(eventsPath, file));
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
    }
}

const { updateDiscordCount } = require('./utils/serverCount');
setInterval(() => updateDiscordCount(client), 60_000);

client.login(process.env.TOKEN);
