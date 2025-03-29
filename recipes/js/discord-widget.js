document.addEventListener('DOMContentLoaded', () => {
    function loadDiscordWidget() {
        const discordWidget = document.getElementById('discord-widget');
        const discordServerId = '807000904397094913';
        const widgetUrl = `https://discord.com/widget?id=${discordServerId}&theme=dark`;

        const iframe = document.createElement('iframe');
        iframe.src = widgetUrl;
        iframe.width = '100%';
        iframe.height = '400';
        iframe.frameBorder = '0';
        iframe.allowtransparency = 'true';
        iframe.sandbox = 'allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts';

        discordWidget.appendChild(iframe);
    }

    loadDiscordWidget();
});
