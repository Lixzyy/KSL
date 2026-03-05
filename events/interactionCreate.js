const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isButton()) {
            if (interaction.customId === 'create_ticket') {
                // ✅ Defer immédiatement avant tout travail async
                await interaction.deferReply({ ephemeral: true });
                
                const { createTicket } = require('../utils/ticketManager');
                await createTicket(interaction);
                // createTicket doit utiliser interaction.editReply() au lieu de interaction.reply()
            }

            if (interaction.customId === 'close_ticket') {
                // ✅ Defer immédiatement
                await interaction.deferReply();

                if (!interaction.channel.name || !interaction.channel.name.startsWith('tickets-')) {
                    return interaction.editReply({ content: 'Vous n\'êtes pas dans un ticket.' });
                }

                const username = interaction.channel.name.split('-').slice(1).join('-');
                const ticketMember = interaction.guild.members.cache.find(m => m.user.username === username);

                if (!ticketMember) {
                    return interaction.editReply({ content: 'Impossible de trouver le membre du ticket.' });
                }

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
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: 'Une erreur est survenue.' });
                } else {
                    await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
                }
            }
        }
    }
};
