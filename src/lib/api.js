const BASE_URL = 'https://api.kanata.web.id';

export const fetchAPI = async (endpoint, params = {}) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    return response.json();
};
