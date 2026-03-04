require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Crée le dossier transcripts s'il n'existe pas
const transcriptsDir = path.join(__dirname, 'transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Lance le serveur Express pour les transcripts
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(transcriptsDir));

app.get('/transcript/:id', (req, res) => {
    const filePath = path.join(transcriptsDir, `${req.params.id}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('<h1>Transcript non trouvé</h1>');
    }
});

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur de transcripts lancé sur le port ${PORT}`);
});

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

// load commands (slash and legacy)
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

// load events
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

// periodic discord member count updates
const { updateDiscordCount } = require('./utils/serverCount');
setInterval(() => updateDiscordCount(client), 60_000); // every minute for Discord members

client.login(process.env.TOKEN);
