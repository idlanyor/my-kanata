import axios from 'axios';

const CF_API_URL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/firewall/access_rules/rules`;

const headers = {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json'
};

export const listRules = async (mode = null, page = 1) => {
    try {
        const params = {
            page: page,
            per_page: 50
        };
        if (mode) params.mode = mode;

        const response = await axios.get(CF_API_URL, { headers, params });
        return response.data.result;
    } catch (error) {
        console.error('CF List Error:', error.response?.data || error.message);
        throw error;
    }
};

export const createRule = async (ip, mode, notes) => {
    try {
        const data = {
            mode: mode, // 'block', 'whitelist', 'challenge', 'js_challenge'
            configuration: {
                target: 'ip',
                value: ip
            },
            notes: notes || `Created via Bot by Owner`
        };

        const response = await axios.post(CF_API_URL, data, { headers });
        return response.data.result;
    } catch (error) {
        console.error('CF Create Error:', error.response?.data || error.message);
        throw error;
    }
};

export const deleteRule = async (ip) => {
    try {
        // 1. Find the rule ID first by searching the IP
        const searchResponse = await axios.get(CF_API_URL, {
            headers,
            params: {
                'configuration.value': ip
            }
        });

        const rules = searchResponse.data.result;
        if (rules.length === 0) return null; // Not found

        const ruleId = rules[0].id;

        // 2. Delete using ID
        await axios.delete(`${CF_API_URL}/${ruleId}`, { headers });
        return { id: ruleId, ip: ip };
    } catch (error) {
        console.error('CF Delete Error:', error.response?.data || error.message);
        throw error;
    }
};

// --- DNS Management Functions ---

export const getZoneId = async (domainName) => {
    try {
        const response = await axios.get('https://api.cloudflare.com/client/v4/zones', {
            headers,
            params: { name: domainName }
        });
        const zones = response.data.result;
        return zones.length > 0 ? zones[0].id : null;
    } catch (error) {
        console.error('CF GetZone Error:', error.response?.data || error.message);
        throw error;
    }
};

export const addDnsRecord = async (zoneId, type, name, content, proxied = false) => {
    try {
        const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
        const data = {
            type: type, // A, CNAME, etc
            name: name,
            content: content,
            ttl: 1, // Automatic
            proxied: proxied
        };

        const response = await axios.post(url, data, { headers });
        return response.data.result;
    } catch (error) {
        console.error('CF AddDNS Error:', error.response?.data || error.message);
        throw error;
    }
};

export const listDnsRecords = async (zoneId, page = 1) => {
    try {
        const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
        const response = await axios.get(url, {
            headers,
            params: { page, per_page: 50 }
        });
        return response.data.result;
    } catch (error) {
        console.error('CF ListDNS Error:', error.response?.data || error.message);
        throw error;
    }
};
