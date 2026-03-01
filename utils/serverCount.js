async function updateDiscordCount(client) {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return;
        const count = guild.memberCount;
        const channel = client.channels.cache.get(process.env.DISCORD_COUNT_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            channel.setName(`𝙈𝙀𝙈𝘽𝙍𝙀𝙎 : ${count}`).catch(console.error);
        }
    } catch (err) {
        console.error('Erreur mise à jour compteur Discord', err);
    }
}

module.exports = { updateDiscordCount };
