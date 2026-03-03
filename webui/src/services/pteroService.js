import axios from 'axios';
import { config } from '../config/index.js';

const PTERO_URL = process.env.PTERO_URL;
const PTERO_API_KEY = process.env.PTERO_API_KEY; // Application API Key
const PTERO_CLIENT_KEY = process.env.PTERO_CLIENT_KEY; // Admin Client API Key

const pteroApp = axios.create({
    baseURL: `${PTERO_URL}/api/application`,
    headers: {
        'Authorization': `Bearer ${PTERO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json',
    }
});

const pteroClient = axios.create({
    baseURL: `${PTERO_URL}/api/client`,
    headers: {
        'Authorization': `Bearer ${PTERO_CLIENT_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json',
    }
});

export const listAllServers = async () => {
    try {
        const resp = await pteroApp.get('/servers');
        return resp.data.data.map(s => s.attributes);
    } catch (error) {
        console.error('Ptero listAllServers error:', error.message);
        throw error;
    }
};

export const listAllUsers = async () => {
    try {
        const resp = await pteroApp.get('/users');
        return resp.data.data.map(u => u.attributes);
    } catch (error) {
        console.error('Ptero listAllUsers error:', error.message);
        throw error;
    }
};

export const getServerDetails = async (serverId) => {
    try {
        const resp = await pteroApp.get(`/servers/${serverId}`);
        return resp.data.attributes;
    } catch (error) {
        console.error('Ptero getServerDetails error:', error.message);
        throw error;
    }
};

export const suspendServer = async (serverId) => {
    try {
        await pteroApp.post(`/servers/${serverId}/suspend`);
        return true;
    } catch (error) {
        console.error('Ptero suspendServer error:', error.message);
        throw error;
    }
};

export const unsuspendServer = async (serverId) => {
    try {
        await pteroApp.post(`/servers/${serverId}/unsuspend`);
        return true;
    } catch (error) {
        console.error('Ptero unsuspendServer error:', error.message);
        throw error;
    }
};

export const setServerPower = async (serverIdentifier, signal) => {
    try {
        await pteroClient.post(`/servers/${serverIdentifier}/power`, { signal });
        return true;
    } catch (error) {
        console.error('Ptero setServerPower error:', error.message);
        throw error;
    }
};

export const getServerResources = async (serverIdentifier) => {
    try {
        const resp = await pteroClient.get(`/servers/${serverIdentifier}/resources`);
        return resp.data.attributes;
    } catch (error) {
        console.error('Ptero getServerResources error:', error.message);
        throw error;
    }
};

export const findPteroUserByEmail = async (email) => {
    try {
        const resp = await pteroApp.get(`/users?filter[email]=${encodeURIComponent(email)}`);
        const row = resp.data?.data?.[0];
        return row ? row.attributes : null;
    } catch (error) {
        console.error('Ptero findPteroUserByEmail error:', error.message);
        throw error;
    }
};

export const findPteroUserByExternalId = async (externalId) => {
    try {
        const resp = await pteroApp.get(`/users?filter[external_id]=${encodeURIComponent(externalId)}`);
        const row = resp.data?.data?.[0];
        return row ? row.attributes : null;
    } catch (error) {
        console.error('Ptero findPteroUserByExternalId error:', error.message);
        throw error;
    }
};

export const createPteroUser = async ({ username, email, firstName, lastName, externalId, password }) => {
    try {
        const resp = await pteroApp.post('/users', {
            username,
            email,
            first_name: firstName,
            last_name: lastName,
            external_id: externalId,
            password
        });
        return resp.data.attributes;
    } catch (error) {
        console.error('Ptero createPteroUser error:', error.message);
        throw error;
    }
};

export const updatePteroUser = async (id, payload) => {
    try {
        const resp = await pteroApp.patch(`/users/${id}`, payload);
        return resp.data.attributes;
    } catch (error) {
        console.error('Ptero updatePteroUser error:', error.message);
        throw error;
    }
};
