const { SlashCommandBuilder } = require('discord.js');
const { createTicket } = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ouvre un ticket de support'),
    async execute(interaction) {
        await createTicket(interaction);
    },
};