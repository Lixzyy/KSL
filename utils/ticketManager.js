const { PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function buildTranscriptHtml({ channelName, memberTag, memberAvatar, createdDate, closedDate, messages, bgB64 }) {

    const rows = messages
        .filter(msg => msg.content || msg.attachments.size > 0)
        .map((msg, i) => {
            const ts      = new Date(msg.createdTimestamp).toLocaleString('fr-FR');
            const content = escapeHtml(msg.content || '*(aucun texte)*');

            const avatarUrl = msg.author.avatar
                ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=40`
                : null;

            const avatarHtml = avatarUrl
                ? `<img class="ava" src="${avatarUrl}" alt="${escapeHtml(msg.author.username)}" />`
                : `<div class="ava ava-init">${escapeHtml(msg.author.username.charAt(0).toUpperCase())}</div>`;

            const files = msg.attachments.size > 0
                ? `<div class="msg-files">${[...msg.attachments.values()].map(a =>
                    `<a href="${a.url}" class="file-link" target="_blank">↗ ${escapeHtml(a.name)}</a>`
                  ).join('')}</div>`
                : '';

            return `
            ${i > 0 ? '<div class="divider"></div>' : ''}
            <div class="msg">
                ${avatarHtml}
                <div class="msg-inner">
                    <div class="msg-top">
                        <span class="msg-author">${escapeHtml(msg.author.username)}</span>
                        <span class="msg-ts">${ts}</span>
                    </div>
                    <div class="msg-txt">${content}</div>
                    ${files}
                </div>
            </div>`;
        }).join('');

    const bgStyle = bgB64 ? `style="background-image:url(data:image/png;base64,${bgB64})"` : '';
    const msgCount = messages.filter(m => m.content || m.attachments.size > 0).length;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript — ${escapeHtml(channelName)}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }

        body {
            font-family: 'IBM Plex Sans', sans-serif;
            background: #08070f;
            color: #d4cbe8;
            min-height: 100vh;
            padding: 44px 20px 64px;
        }

        #bg {
            position: fixed; inset: 0; z-index: 0;
            background-size: cover; background-position: center;
        }
        #bg::after {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(
                to bottom,
                rgba(8,7,15,.80) 0%,
                rgba(8,7,15,.60) 28%,
                rgba(8,7,15,.82) 65%,
                rgba(8,7,15,.97) 100%
            );
        }

        .wrap {
            max-width: 820px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }

        /* ── TOPBAR ── */
        .topbar {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(120,60,220,.22);
        }

        .topbar-left { display:flex; flex-direction:column; gap:5px; }

        .ticket-label {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; letter-spacing: 3px;
            text-transform: uppercase; color: #7b4fd4;
        }

        .ticket-name {
            font-size: 21px; font-weight: 600;
            color: #ede8ff; letter-spacing: -.3px;
        }

        .ticket-meta {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px; color: #3e3258;
        }

        .ksl-badge {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px; font-weight: 600;
            color: #9966ee;
            border: 1px solid rgba(120,60,220,.28);
            padding: 6px 14px; border-radius: 4px;
            letter-spacing: 2px; white-space: nowrap;
            align-self: flex-start;
        }

        /* ── OWNER CARD ── */
        .owner-card {
            display: flex;
            align-items: center;
            gap: 14px;
            background: #0d0b18;
            border: 1px solid rgba(120,60,220,.18);
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 14px;
        }

        .owner-avatar {
            width: 42px; height: 42px;
            border-radius: 8px;
            object-fit: cover;
            flex-shrink: 0;
        }

        .owner-avatar-init {
            width: 42px; height: 42px;
            border-radius: 8px;
            background: #1e1030;
            border: 1px solid rgba(120,60,220,.3);
            display: flex; align-items: center; justify-content: center;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 16px; font-weight: 600; color: #9966ee;
            flex-shrink: 0;
        }

        .owner-info { display:flex; flex-direction:column; gap:3px; }

        .owner-name { font-size: 14px; font-weight: 600; color: #ede8ff; }

        .owner-tag {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; color: #4a3d68; letter-spacing: .5px;
        }

        /* ── STATS ── */
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: rgba(120,60,220,.13);
            border: 1px solid rgba(120,60,220,.16);
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 20px;
        }

        .stat { background: #0d0b18; padding: 14px 16px; }

        .stat-l {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 9px; letter-spacing: 2px;
            text-transform: uppercase; color: #3e3258;
            margin-bottom: 6px;
        }

        .stat-v { font-size: 13px; font-weight: 500; color: #d4cbe8; }

        /* ── LOG ── */
        .log {
            border: 1px solid rgba(120,60,220,.18);
            border-radius: 6px;
            overflow: hidden;
            background: #0a0814;
        }

        .log-head {
            display: flex; align-items: center;
            justify-content: space-between;
            padding: 11px 20px;
            border-bottom: 1px solid rgba(120,60,220,.14);
            background: #0d0b18;
        }

        .log-head-title {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; letter-spacing: 2.5px;
            text-transform: uppercase; color: #3e3258;
        }

        .log-head-count {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; color: #7b4fd4;
        }

        .log-body {
            display: flex;
            flex-direction: column;
            max-height: 640px;
            overflow-y: auto;
            padding: 8px 0;
        }

        .log-body::-webkit-scrollbar { width: 2px; }
        .log-body::-webkit-scrollbar-track { background: transparent; }
        .log-body::-webkit-scrollbar-thumb { background: #3d2470; }

        .msg {
            display: flex;
            padding: 9px 20px;
            border-left: 2px solid transparent;
            transition: background .12s, border-color .12s;
        }

        .msg:hover {
            background: rgba(120,60,220,.05);
            border-left-color: #7b4fd4;
        }

        .ava {
            width: 30px; height: 30px;
            border-radius: 6px;
            object-fit: cover;
            flex-shrink: 0;
            margin-right: 13px;
            margin-top: 1px;
        }

        .ava-init {
            width: 30px; height: 30px;
            border-radius: 6px;
            background: #1e1030;
            border: 1px solid rgba(120,60,220,.25);
            display: flex; align-items: center; justify-content: center;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px; font-weight: 600; color: #9966ee;
            flex-shrink: 0;
            margin-right: 13px;
            margin-top: 1px;
        }

        .msg-inner { flex:1; min-width:0; }

        .msg-top {
            display: flex; align-items: baseline;
            gap: 10px; margin-bottom: 4px;
        }

        .msg-author { font-size:13px; font-weight:600; color:#b07fff; }

        .msg-ts {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; color: #2e2040;
        }

        .msg-txt {
            font-size: 13.5px; line-height: 1.55;
            color: #9d93b8; word-break: break-word;
            white-space: pre-wrap; font-weight: 300;
        }

        .msg-files {
            margin-top: 7px;
            display: flex; flex-wrap: wrap; gap: 6px;
        }

        .file-link {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10.5px; color: #7b4fd4;
            text-decoration: none;
            border-bottom: 1px solid rgba(120,60,220,.3);
            padding-bottom: 1px;
            transition: color .15s, border-color .15s;
        }

        .file-link:hover { color: #b07fff; border-color: #b07fff; }

        .divider {
            height: 1px;
            background: rgba(120,60,220,.07);
            margin: 0 20px;
        }

        .empty {
            text-align: center;
            padding: 60px 20px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px; color: #2e2445; letter-spacing: 1px;
        }

        /* ── FOOTER ── */
        .foot {
            margin-top: 18px;
            display: flex; justify-content: space-between;
            padding: 0 4px;
        }

        .foot span {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px; color: #2e2040; letter-spacing: .5px;
        }

        .foot strong { color: #7b4fd4; font-weight: 600; }

        @media (max-width:560px) {
            .stats { grid-template-columns: repeat(2,1fr); }
            .topbar { flex-direction:column; }
        }
    </style>
</head>
<body>

<div id="bg" ${bgStyle}></div>

<div class="wrap">

    <div class="topbar">
        <div class="topbar-left">
            <span class="ticket-label">KSL Support System · Transcript</span>
            <span class="ticket-name">${escapeHtml(channelName)}</span>
            <span class="ticket-meta">Fermé le ${escapeHtml(closedDate)}</span>
        </div>
        <div class="ksl-badge">KSL</div>
    </div>

    <div class="owner-card">
        ${memberAvatar
            ? `<img class="owner-avatar" src="${memberAvatar}" alt="${escapeHtml(memberTag)}" />`
            : `<div class="owner-avatar-init">${escapeHtml(memberTag.charAt(0).toUpperCase())}</div>`
        }
        <div class="owner-info">
            <span class="owner-name">${escapeHtml(memberTag)}</span>
            <span class="owner-tag">Propriétaire du ticket</span>
        </div>
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-l">Créé le</div>
            <div class="stat-v">${escapeHtml(createdDate)}</div>
        </div>
        <div class="stat">
            <div class="stat-l">Fermé le</div>
            <div class="stat-v">${escapeHtml(closedDate)}</div>
        </div>
        <div class="stat">
            <div class="stat-l">Messages</div>
            <div class="stat-v">${msgCount}</div>
        </div>
    </div>

    <div class="log">
        <div class="log-head">
            <span class="log-head-title">Journal de conversation</span>
            <span class="log-head-count">${msgCount} entrées</span>
        </div>
        <div class="log-body" id="log-body">
            ${rows || '<div class="empty">— aucun message —</div>'}
        </div>
    </div>

    <div class="foot">
        <span><strong>KSL</strong> Support System</span>
        <span>Généré le ${escapeHtml(closedDate)}</span>
    </div>

</div>

<script>
    const lb = document.getElementById('log-body');
    if (lb) lb.scrollTop = lb.scrollHeight;
</script>
</body>
</html>`;
}

async function createTicket(interaction) {
    const guild  = interaction.guild;
    const member = interaction.member;
    const category = guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);

    if (!category) {
        return interaction.editReply({ content: 'Catégorie de tickets introuvable.' });
    }

    const ticketName = `tickets-${member.user.username}`;
    const existing   = guild.channels.cache.find(c => c.name === ticketName);
    if (existing) {
        return interaction.editReply({ content: 'Vous avez déjà un ticket ouvert.' });
    }

    const channel = await guild.channels.create({
        name: ticketName,
        type: 0,
        parent: category.id,
        permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: process.env.TICKET_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });

    if (process.env.TICKET_USER_ROLE_ID) {
        const role = guild.roles.cache.get(process.env.TICKET_USER_ROLE_ID);
        if (role) await member.roles.add(role).catch(console.error);
    }

    const ticketEmbed = new EmbedBuilder()
        .setTitle('🎫 Votre Ticket de Support')
        .setColor('#7b4fd4')
        .setDescription(`Bienvenue <@${member.id}>!\n\nMerci d'avoir ouvert un ticket. Notre équipe staff vous contactera bientôt. Veuillez décrire votre problème en détail.`)
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

    await channel.send({ embeds: [ticketEmbed], components: [new ActionRowBuilder().addComponents(closeButton)] });
    return interaction.editReply({ content: `✅ Votre ticket a été créé: ${channel}` });
}

async function generateTicketTranscript(channel, member) {
    try {
        let messages = [];
        let lastId   = null;

        while (true) {
            const opts = { limit: 100 };
            if (lastId) opts.before = lastId;
            const fetched = await channel.messages.fetch(opts);
            if (fetched.size === 0) break;
            messages.unshift(...fetched.values());
            lastId = fetched.last().id;
        }

        // Plus ancien → plus récent
        messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        const createdDate  = new Date(channel.createdTimestamp).toLocaleString('fr-FR');
        const closedDate   = new Date().toLocaleString('fr-FR');
        const transcriptId = `${channel.id}-${Date.now()}`;

        const memberAvatar = member.user.avatar
            ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=64`
            : null;

        // Image de fond depuis assets/bg.png
        const bgPath = path.join(__dirname, 'assets', 'bg.png');
        const bgB64  = fs.existsSync(bgPath)
            ? fs.readFileSync(bgPath).toString('base64')
            : null;

        const htmlContent = buildTranscriptHtml({
            channelName:  channel.name,
            memberTag:    member.user.tag,
            memberAvatar,
            createdDate,
            closedDate,
            messages,
            bgB64
        });

        const transcriptsDir = path.join(__dirname, 'transcripts');
        if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir, { recursive: true });
        fs.writeFileSync(path.join(transcriptsDir, `${transcriptId}.html`), htmlContent);

        const serverUrl     = process.env.SERVER_URL || 'http://localhost:3000';
        const transcriptUrl = `${serverUrl}/transcript/${transcriptId}`;

        const transcriptEmbed = new EmbedBuilder()
            .setTitle('📋 Transcript du Ticket')
            .setColor('#7b4fd4')
            .addFields(
                { name: '👤 Utilisateur', value: member.user.tag, inline: true },
                { name: '📅 Fermé le', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                { name: '💬 Messages', value: `${messages.length}`, inline: true }
            )
            .setThumbnail(member.user.avatarURL({ dynamic: true }))
            .setFooter({ text: 'KSL Support - Transcript archivé' })
            .setTimestamp();

        const viewButton = new ButtonBuilder()
            .setLabel('Voir le transcript')
            .setURL(transcriptUrl)
            .setStyle(ButtonStyle.Link)
            .setEmoji('📄');

        const buttonRow = new ActionRowBuilder().addComponents(viewButton);

        try {
            const dm = await member.user.createDM();
            await dm.send({
                content: `✅ **Voici le transcript de votre ticket ${channel.name}**`,
                embeds: [transcriptEmbed],
                components: [buttonRow]
            });
        } catch { /* DMs fermés */ }

        const transcriptChannel = channel.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID);
        if (transcriptChannel) {
            await transcriptChannel.send({
                content: `**Ticket:** ${channel.name} | **Utilisateur:** ${member.user.tag}`,
                embeds: [transcriptEmbed],
                components: [buttonRow]
            });
        }

        return true;
    } catch (err) {
        console.error('Erreur génération transcript:', err);
        return false;
    }
}

module.exports = { createTicket, generateTicketTranscript };
