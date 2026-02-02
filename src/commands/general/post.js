import axios from 'axios';

export default {
    name: 'post',
    aliases: ['get'],
    description: 'Make a POST request to a URL. Usage: !post <url> | <body>',
    category: 'General',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Usage: !post <url> | <body>\nExample: !post https://api.example.com/data | {"key": "value"}');

        const [urlPart, ...bodyParts] = text.split('|');
        let url = urlPart.trim();
        const bodyRaw = bodyParts.join('|').trim();

        if (!url.startsWith('http')) url = 'https://' + url;

        // console.log(`[DEBUG] Executing POST request to: ${url}`);

        let body = {};
        if (bodyRaw) {
            try {
                body = JSON.parse(bodyRaw);
            } catch (e) {
                return m.reply(' Invalid JSON body. Ensure you use strict JSON format (double quotes).');
            }
        }

        await m.reply(` Sending POST to: ${url}...`);

        try {
            const response = await axios.post(url, body, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            const result = typeof response.data === 'object'
                ? JSON.stringify(response.data, null, 2)
                : String(response.data).slice(0, 2000);

            await m.reply(` *Response:* 

${result}

`);
            // console.log(`[DEBUG] POST request successful`);
        } catch (err) {
            console.error(`[DEBUG] POST request failed:`, err.message);
            await m.reply(` *Error:* ${err.message}`);
        }
    }
};