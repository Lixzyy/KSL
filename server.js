require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const transcriptsDir = path.join(__dirname, 'transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/transcript/:id', (req, res) => {
    const id = req.params.id;
    if (!/^[\w-]+$/.test(id)) return res.status(400).send('Identifiant invalide');

    const filePath = path.join(transcriptsDir, `${id}.html`);
    if (!fs.existsSync(filePath)) return res.status(404).send('Transcript non trouvé');

    res.sendFile(filePath);
});

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur de transcripts lancé sur le port ${PORT}`);
});

module.exports = app;
