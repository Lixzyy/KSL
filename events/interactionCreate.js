const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isButton()) {
            if (interaction.customId === 'create_ticket') {
                const { createTicket } = require('../utils/ticketManager');
                await createTicket(interaction);
            }
            if (interaction.customId === 'close_ticket') {
                if (!interaction.channel.name || !interaction.channel.name.startsWith('tickets-')) {
                    return interaction.reply({ content: 'Vous n\'êtes pas dans un ticket.', ephemeral: true });
                }
                
                // Récupère le username depuis le nom du canal
                const username = interaction.channel.name.split('-').slice(1).join('-');
                const ticketMember = interaction.guild.members.cache.find(m => m.user.username === username);
                
                if (!ticketMember) {
                    return interaction.reply({ content: 'Impossible de trouver le membre du ticket.', ephemeral: true });
                }

                await interaction.deferReply();

                // Génère et envoie le transcript
                const { generateTicketTranscript } = require('../utils/ticketManager');
                await generateTicketTranscript(interaction.channel, ticketMember);
                
                const closedEmbed = new EmbedBuilder()
                    .setTitle('🔒 Ticket Fermé')
                    .setColor('#FF0000')
                    .setDescription(`Ce ticket a été fermé par ${interaction.user}.\n\n✅ Un transcript a été envoyé en MP et sur le serveur.`)
                    .setFooter({ text: 'Le canal sera supprimé dans 5 secondes...' })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [closedEmbed] });
                
                setTimeout(() => {
                    interaction.channel.delete().catch(console.error);
                }, 5000);
            }
        }
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
            }
        }
    }
};