const { PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function createTicket(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;
    const category = guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);
    if (!category) {
        return interaction.reply({ content: 'Catégorie de tickets introuvable.', ephemeral: true });
    }

    const ticketName = `tickets-${member.user.username}`;
    const existing = guild.channels.cache.find(c => c.name === ticketName);
    if (existing) {
        return interaction.reply({ content: 'Vous avez déjà un ticket ouvert.', ephemeral: true });
    }

    const channel = await guild.channels.create({
        name: ticketName,
        type: 0, // GUILD_TEXT
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: member.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            },
            {
                id: process.env.TICKET_ROLE_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
        ]
    });

    if (process.env.TICKET_USER_ROLE_ID) {
        const role = guild.roles.cache.get(process.env.TICKET_USER_ROLE_ID);
        if (role) {
            await member.roles.add(role).catch(console.error);
        }
    }

    const ticketEmbed = new EmbedBuilder()
        .setTitle('🎫 Votre Ticket de Support')
        .setColor('#2E83F7')
        .setDescription(`Bienvenue <@${member.id}>!\n\nMerci d'avoir ouvert un ticket. Notre équipe staff vous contacter bientôt. Veuillez décrire votre problème en détail.`)
        .addFields(
            { name: '📍 Statut', value: 'En attente - Discussion ouverte', inline: true },
            { name: '👤 Auteur', value: `<@${member.id}>`, inline: true },
            { name: '⏰ Créé le', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
        )
        .setThumbnail(member.user.avatarURL({ dynamic: true }))
        .setFooter({ text: 'KSL Support - Nous sommes disponibles 24/7' })
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

    const buttonRow = new ActionRowBuilder().addComponents(closeButton);
    
    await channel.send({ embeds: [ticketEmbed], components: [buttonRow] });
    return interaction.reply({ content: `✅ Votre ticket a été créé: ${channel}`, ephemeral: true });
}

async function generateTicketTranscript(channel, member) {
    try {
        // Récupère tous les messages du ticket
        let messages = [];
        let lastId = null;

        while (true) {
            const options = { limit: 100 };
            if (lastId) {
                options.before = lastId;
            }
            const fetched = await channel.messages.fetch(options);
            if (fetched.size === 0) break;
            messages.unshift(...fetched.values());
            lastId = fetched.last().id;
        }

        // Crée le contenu HTML
        const createdDate = new Date(channel.createdTimestamp).toLocaleString('fr-FR');
        const closedDate = new Date().toLocaleString('fr-FR');
        const transcriptId = `${channel.id}-${Date.now()}`;

        let htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${channel.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #2E83F7 0%, #1e5bc6 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 28px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
            border-top: 2px solid rgba(255, 255, 255, 0.3);
            padding-top: 20px;
        }

        .info-block {
            text-align: center;
        }

        .info-label {
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.9;
            letter-spacing: 1px;
        }

        .info-value {
            font-size: 16px;
            font-weight: 600;
            margin-top: 5px;
        }

        .messages-container {
            padding: 30px;
            max-height: 600px;
            overflow-y: auto;
        }

        .message {
            display: flex;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
            padding-left: 15px;
            transition: all 0.3s ease;
        }

        .message:hover {
            border-left-color: #2E83F7;
            background: #f5f5f5;
            margin-left: -10px;
            padding-left: 25px;
        }

        .message-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
            flex-shrink: 0;
            font-size: 12px;
        }

        .message-content {
            flex: 1;
        }

        .message-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }

        .message-author {
            font-weight: 600;
            color: #2E83F7;
            font-size: 15px;
        }

        .message-timestamp {
            font-size: 12px;
            color: #999;
        }

        .message-text {
            color: #555;
            line-height: 1.5;
            word-wrap: break-word;
            white-space: pre-wrap;
        }

        .message-attachments {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
        }

        .attachment-link {
            display: inline-block;
            background: #f0f0f0;
            padding: 8px 12px;
            border-radius: 6px;
            color: #2E83F7;
            text-decoration: none;
            margin-right: 8px;
            margin-top: 5px;
            font-size: 13px;
            transition: all 0.3s ease;
        }

        .attachment-link:hover {
            background: #2E83F7;
            color: white;
        }

        .empty-message {
            text-align: center;
            padding: 30px;
            color: #999;
        }

        .footer {
            background: #f5f5f5;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }

        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #eee, transparent);
            margin: 15px 0;
        }

        .messages-container::-webkit-scrollbar {
            width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
            background: #f1f1f1;
        }

        .messages-container::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
            background: #2E83F7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Transcript du Ticket</h1>
            <div class="header-info">
                <div class="info-block">
                    <div class="info-label">👤 Utilisateur</div>
                    <div class="info-value">${member.user.tag}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">🎟️ Ticket</div>
                    <div class="info-value">${channel.name}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">🗓️ Créé le</div>
                    <div class="info-value">${createdDate}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">✅ Fermé le</div>
                    <div class="info-value">${closedDate}</div>
                </div>
                <div class="info-block">
                    <div class="info-label">💬 Messages</div>
                    <div class="info-value">${messages.length}</div>
                </div>
            </div>
        </div>

        <div class="messages-container">
            ${messages.length === 0 ? '<div class="empty-message">Aucun message dans ce ticket</div>' : ''}
            ${messages.map(msg => {
                if (!msg.content && msg.attachments.size === 0) return '';
                
                const timestamp = new Date(msg.createdTimestamp).toLocaleString('fr-FR');
                const avatar = msg.author.username.charAt(0).toUpperCase();
                const content = msg.content || '*(aucun texte)*';
                const attachments = msg.attachments.size > 0 
                    ? `<div class="message-attachments">
                        ${msg.attachments.map(att => 
                            `<a href="${att.url}" class="attachment-link" target="_blank">📎 ${att.name}</a>`
                        ).join('')}
                       </div>`
                    : '';

                return `
                    <div class="message">
                        <div class="message-avatar">${avatar}</div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">${msg.author.username}</span>
                                <span class="message-timestamp">${timestamp}</span>
                            </div>
                            <div class="message-text">${escapeHtml(content)}</div>
                            ${attachments}
                        </div>
                    </div>
                    <div class="divider"></div>
                `;
            }).join('')}
        </div>

        <div class="footer">
            <strong>KSL Support System</strong> - Transcript généré le ${closedDate}
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.querySelector('.messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        });
    </script>
</body>
</html>`;

        // Sauvegarde le HTML dans le dossier transcripts
        const transcriptsDir = path.join(__dirname, '..', 'transcripts');
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
        }

        const filePath = path.join(transcriptsDir, `${transcriptId}.html`);
        fs.writeFileSync(filePath, htmlContent);

        // Crée un embed avec un bouton pour voir le transcript
        const transcriptEmbed = new EmbedBuilder()
            .setTitle('📋 Transcript du Ticket')
            .setColor('#FF6B9D')
            .addFields(
                { name: '👤 Utilisateur', value: `${member.user.tag}`, inline: true },
                { name: '📅 Fermé le', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                { name: '💬 Messages', value: `${messages.length}`, inline: true }
            )
            .setThumbnail(member.user.avatarURL({ dynamic: true }))
            .setFooter({ text: 'KSL Support - Transcript archivé' })
            .setTimestamp();

        const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
        const transcriptUrl = `${serverUrl}/transcript/${transcriptId}`;

        const viewButton = new ButtonBuilder()
            .setLabel('Voir le transcript')
            .setURL(transcriptUrl)
            .setStyle(ButtonStyle.Link)
            .setEmoji('📄');

        const buttonRow = new ActionRowBuilder().addComponents(viewButton);

        // Envoie en MP à l'utilisateur
        try {
            const dmChannel = await member.user.createDM();
            await dmChannel.send({
                content: `✅ **Voici le transcript de votre ticket ${channel.name}**`,
                embeds: [transcriptEmbed],
                components: [buttonRow]
            });
        } catch (error) {
            console.log('Impossible d\'envoyer un MP à l\'utilisateur');
        }

        // Envoie sur le canal des transcripts
        const transcriptChannel = channel.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID);
        if (transcriptChannel) {
            await transcriptChannel.send({
                content: `**Transcript du ticket:** ${channel.name} | **Utilisateur:** ${member.user.tag}`,
                embeds: [transcriptEmbed],
                components: [buttonRow]
            });
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de la génération du transcript:', error);
        return false;
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

module.exports = { createTicket, generateTicketTranscript };
