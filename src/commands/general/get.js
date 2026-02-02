import axios from 'axios';

export default {
    name: 'get',
    aliases: ['get'],
    description: 'Make a GET request to a URL',
    category: 'General',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a URL.');
        
        let url = text.trim();
        if (!url.startsWith('http')) url = 'https://' + url;

        // console.log(`[DEBUG] Executing GET request to: ${url}`);
        await m.reply(` Fetching: ${url}...`);

        try {
            const response = await axios.get(url, { timeout: 10000 });
            const result = typeof response.data === 'object' 
                ? JSON.stringify(response.data, null, 2) 
                : String(response.data).slice(0, 2000);

            await m.reply(` *Response:* 
${result}
`);
            // console.log(`[DEBUG] GET request successful`);
        } catch (err) {
            console.error(`[DEBUG] GET request failed:`, err.message);
            await m.reply(` *Error:* ${err.message}`);
        }
    }
};