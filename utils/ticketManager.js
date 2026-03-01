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
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0d0f14;
            --surface: #13161e;
            --surface2: #1a1e28;
            --border: rgba(255,255,255,0.07);
            --accent: #5b8ef0;
            --accent2: #a78bfa;
            --text: #e8eaf0;
            --muted: #6b7280;
            --success: #34d399;
            --danger: #f87171;
            --glow: rgba(91, 142, 240, 0.15);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DM Sans', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 40px 20px;
            position: relative;
            overflow-x: hidden;
        }

        /* Fond ambiant */
        body::before {
            content: '';
            position: fixed;
            top: -200px;
            left: -200px;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(91,142,240,0.08) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
        }
        body::after {
            content: '';
            position: fixed;
            bottom: -200px;
            right: -200px;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
        }

        .container {
            max-width: 860px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }

        /* ── HEADER ── */
        .header {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 36px 40px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent);
        }

        .header-top {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 28px;
        }

        .header-icon {
            width: 46px;
            height: 46px;
            background: linear-gradient(135deg, var(--accent), var(--accent2));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
            box-shadow: 0 0 20px rgba(91,142,240,0.3);
        }

        .header-title {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 22px;
            letter-spacing: -0.5px;
            color: var(--text);
        }

        .header-sub {
            font-size: 13px;
            color: var(--muted);
            margin-top: 2px;
            font-family: 'DM Mono', monospace;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }

        .stat-card {
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 14px 16px;
            transition: border-color 0.2s;
        }

        .stat-card:hover {
            border-color: rgba(91,142,240,0.3);
        }

        .stat-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--muted);
            margin-bottom: 6px;
            font-family: 'DM Mono', monospace;
        }

        .stat-value {
            font-family: 'Syne', sans-serif;
            font-weight: 700;
            font-size: 15px;
            color: var(--text);
        }

        .stat-icon {
            font-size: 11px;
            margin-right: 5px;
        }

        /* ── MESSAGES ── */
        .messages-wrapper {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            overflow: hidden;
        }

        .messages-header {
            padding: 16px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .messages-header-title {
            font-family: 'Syne', sans-serif;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: var(--muted);
            text-transform: uppercase;
        }

        .badge {
            background: rgba(91,142,240,0.15);
            color: var(--accent);
            border: 1px solid rgba(91,142,240,0.25);
            border-radius: 20px;
            padding: 2px 10px;
            font-size: 11px;
            font-family: 'DM Mono', monospace;
        }

        .messages-list {
            padding: 20px;
            max-height: 650px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        /* Scrollbar */
        .messages-list::-webkit-scrollbar { width: 5px; }
        .messages-list::-webkit-scrollbar-track { background: transparent; }
        .messages-list::-webkit-scrollbar-thumb { background: rgba(91,142,240,0.3); border-radius: 99px; }
        .messages-list::-webkit-scrollbar-thumb:hover { background: var(--accent); }

        .message {
            display: flex;
            gap: 14px;
            padding: 14px 16px;
            border-radius: 12px;
            transition: background 0.15s;
            animation: fadeSlide 0.3s ease both;
        }

        .message:hover {
            background: var(--surface2);
        }

        @keyframes fadeSlide {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* stagger les messages */
        .message:nth-child(1)  { animation-delay: 0.05s; }
        .message:nth-child(2)  { animation-delay: 0.10s; }
        .message:nth-child(3)  { animation-delay: 0.15s; }
        .message:nth-child(4)  { animation-delay: 0.20s; }
        .message:nth-child(5)  { animation-delay: 0.25s; }
        .message:nth-child(n+6){ animation-delay: 0.30s; }

        .avatar {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 13px;
            color: white;
            flex-shrink: 0;
            background: linear-gradient(135deg, var(--accent), var(--accent2));
            box-shadow: 0 2px 8px rgba(91,142,240,0.25);
        }

        .msg-body { flex: 1; min-width: 0; }

        .msg-meta {
            display: flex;
            align-items: baseline;
            gap: 10px;
            margin-bottom: 6px;
        }

        .msg-author {
            font-family: 'Syne', sans-serif;
            font-weight: 700;
            font-size: 14px;
            color: var(--accent);
        }

        .msg-time {
            font-family: 'DM Mono', monospace;
            font-size: 11px;
            color: var(--muted);
        }

        .msg-text {
            font-size: 14px;
            line-height: 1.6;
            color: rgba(232,234,240,0.85);
            word-break: break-word;
            white-space: pre-wrap;
        }

        .msg-attachments {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .attachment-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(91,142,240,0.1);
            border: 1px solid rgba(91,142,240,0.2);
            padding: 6px 12px;
            border-radius: 8px;
            color: var(--accent);
            text-decoration: none;
            font-size: 12px;
            font-family: 'DM Mono', monospace;
            transition: all 0.2s;
        }

        .attachment-link:hover {
            background: rgba(91,142,240,0.2);
            border-color: var(--accent);
        }

        .empty-message {
            text-align: center;
            padding: 60px 30px;
            color: var(--muted);
            font-size: 14px;
        }

        .empty-icon { font-size: 36px; display: block; margin-bottom: 12px; opacity: 0.4; }

        /* ── FOOTER ── */
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: var(--muted);
            font-family: 'DM Mono', monospace;
            padding: 16px;
        }

        .footer strong {
            color: var(--accent);
        }

        /* Séparateur entre messages groupés */
        .sep {
            height: 1px;
            background: var(--border);
            margin: 4px 16px;
            opacity: 0.5;
        }

    </style>
</head>
<body>
    <div class="container">

        <!-- HEADER -->
        <div class="header">
            <div class="header-top">
                <div class="header-icon">📋</div>
                <div>
                    <div class="header-title">Transcript du Ticket</div>
                    <div class="header-sub">${channel.name}</div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label"><span class="stat-icon">👤</span>Utilisateur</div>
                    <div class="stat-value">${member.user.tag}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label"><span class="stat-icon">🗓️</span>Créé le</div>
                    <div class="stat-value">${createdDate}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label"><span class="stat-icon">✅</span>Fermé le</div>
                    <div class="stat-value">${closedDate}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label"><span class="stat-icon">💬</span>Messages</div>
                    <div class="stat-value">${messages.length}</div>
                </div>
            </div>
        </div>

        <!-- MESSAGES -->
        <div class="messages-wrapper">
            <div class="messages-header">
                <span class="messages-header-title">Conversation</span>
                <span class="badge">${messages.length} messages</span>
            </div>

            <div class="messages-list">
                ${messages.length === 0
                    ? `<div class="empty-message"><span class="empty-icon">💬</span>Aucun message dans ce ticket</div>`
                    : messages.map(msg => {
                        if (!msg.content && msg.attachments.size === 0) return '';

                        const timestamp = new Date(msg.createdTimestamp).toLocaleString('fr-FR');
                        const avatar = msg.author.username.charAt(0).toUpperCase();
                        const content = msg.content || '*(aucun texte)*';
                        const attachments = msg.attachments.size > 0
                            ? `<div class="msg-attachments">
                                ${msg.attachments.map(att =>
                                    `<a href="${att.url}" class="attachment-link" target="_blank">📎 ${att.name}</a>`
                                ).join('')}
                               </div>`
                            : '';

                        return `
                            <div class="message">
                                <div class="avatar">${avatar}</div>
                                <div class="msg-body">
                                    <div class="msg-meta">
                                        <span class="msg-author">${msg.author.username}</span>
                                        <span class="msg-time">${timestamp}</span>
                                    </div>
                                    <div class="msg-text">${escapeHtml(content)}</div>
                                    ${attachments}
                                </div>
                            </div>
                        `;
                    }).join('<div class="sep"></div>')}
            </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <strong>KSL Support System</strong> · Transcript généré le ${closedDate}
        </div>

    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const list = document.querySelector('.messages-list');
            if (list) list.scrollTop = list.scrollHeight;
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
