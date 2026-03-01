const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Affiche le panneau pour ouvrir un ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Système de Tickets Support')
            .setDescription('Bienvenue dans notre système de support!\n\nCliquez sur le bouton ci-dessous pour ouvrir un nouveau ticket. Notre équipe staff vous répondra dans les plus brefs délais.')
            .setColor('#2E83F7')
            .addFields(
                { name: '📝 Comment ça fonctionne?', value: 'Cliquez sur le bouton pour créer un ticket privé où vous pourrez discuter avec notre équipe.' },
                { name: '⏱️ Temps de réponse', value: 'Nous répondons généralement dans les 24 heures.' }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'KSL Support System' })
            .setTimestamp();
        const button = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Ouvrir un ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫');
        const row = new ActionRowBuilder().addComponents(button);
        await interaction.reply({ embeds: [embed], components: [row] });
    },
};