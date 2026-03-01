const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Ferme le ticket actuel'),
    async execute(interaction) {
        if (!interaction.channel.name || !interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'Vous n\'êtes pas dans un ticket.', ephemeral: true });
        }
        await interaction.channel.delete();
    },
};