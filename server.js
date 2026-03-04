require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// dossier qui contient les HTML de transcripts
const transcriptsDir = path.join(__dirname, 'transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'changeme',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
    })
);

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    req.session.redirectTo = req.originalUrl;
    res.redirect('/login');
}

app.get('/login', (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${process.env.SERVER_URL}/auth/callback`);
    const scope = encodeURIComponent('identify guilds');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.redirect('/error?msg=no_code');
    }

    try {
        const tokenResp = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${process.env.SERVER_URL}/auth/callback`
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenResp.data.access_token;

        const userResp = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const guildsResp = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const guilds = guildsResp.data || [];
        const isMember = guilds.some(g => g.id === process.env.GUILD_ID);
        if (!isMember) {
            return res.redirect('/error?msg=not_member');
        }

        req.session.user = {
            id: userResp.data.id,
            username: `${userResp.data.username}#${userResp.data.discriminator}`,
            avatar: userResp.data.avatar
        };

        const redirectTo = req.session.redirectTo || '/';
        delete req.session.redirectTo;
        res.redirect(redirectTo);
    } catch (err) {
        console.error('OAuth callback error', err);
        res.redirect('/error?msg=oauth_failed');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/error', (req, res) => {
    const msg = req.query.msg;
    let text;
    switch (msg) {
        case 'not_member':
            text = "Vous n'êtes pas membre du serveur.";
            break;
        case 'oauth_failed':
            text = "Échec de l'authentification.";
            break;
        case 'no_code':
            text = "Aucun code fourni.";
            break;
        default:
            text = "Erreur inconnue.";
    }

    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <title>Erreur</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans&display=swap" rel="stylesheet" />
    <style>
        body { background:#08070f; color:#9966ee; font-family:'IBM Plex Sans',sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; }
        a { color:#7b4fd4; text-decoration:none; }
    </style>
</head>
<body>
    <div>
        <h1>Erreur</h1>
        <p>${text}</p>
        <a href="/login">Se connecter</a>
    </div>
</body>
</html>`);
});

app.get('/transcript/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    if (!/^[\w-]+$/.test(id)) return res.status(400).send('Identifiant invalide');

    const filePath = path.join(transcriptsDir, `${id}.html`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Transcript non trouvé');
    }

    let html = fs.readFileSync(filePath, 'utf-8');

    if (req.session.user) {
        const user = req.session.user;
        let avatarUrl;
        if (user.avatar) {
            avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        } else {
            const num = parseInt(user.id, 10) % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${num}.png`;
        }

        const badge = `
<div id="login-badge" style="position:fixed;bottom:10px;right:10px;background:#0d0b18;color:#fff;padding:5px 10px;border-radius:5px;display:flex;align-items:center;gap:5px;font-family:'IBM Plex Sans',sans-serif;z-index:9999;">
    <img src="${avatarUrl}" alt="avatar" style="width:24px;height:24px;border-radius:50%;" />
    <span>${user.username}</span>
    <a href="/logout" style="color:#9966ee;text-decoration:none;margin-left:8px;">Quitter</a>
</div>`;

        html = html.replace('</body>', `${badge}\n</body>`);
    }

    res.send(html);
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur Express démarré sur le port ${PORT}`);
});

module.exports = app;
