const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
        if (!channel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎉 Bienvenue chez les KSL!')
            .setColor('#2E83F7')
            .setDescription(`Bienvenue ${member.user.username}! Nous sommes heureux de t'accueillir sur notre serveur.\n\nN'hésite pas à explorer et à rejoindre notre communauté!`)
            .setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }))
            .setImage(member.guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👥 Membres du serveur', value: `${member.guild.memberCount.toString()}`, inline: true },
                { name: '📅 Tu as rejoint', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
            )
            .setFooter({ text: `Bienvenue #${member.id}` })
            .setTimestamp();

    }
};