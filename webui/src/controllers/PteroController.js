import * as pteroService from '../services/pteroService.js';
import { Server } from '../models/Server.js';
import { logAction } from '../services/auditService.js';

export const getPteroServerStatus = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const resources = await pteroService.getServerResources(identifier);
        res.json(resources);
    } catch (error) {
        next(error);
    }
};

export const controlPteroServer = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const { signal } = req.body; // start, stop, restart, kill
        await pteroService.setServerPower(identifier, signal);
        
        await logAction({ req, action: `PTERO_${signal.toUpperCase()}`, details: { identifier } });
        
        res.json({ ok: true, message: `Signal ${signal} sent to server.` });
    } catch (error) {
        next(error);
    }
};

export const toggleSuspend = async (req, res, next) => {
    try {
        const { id } = req.params; // DB ID
        const server = await Server.findById(id);
        if (!server) return res.status(404).json({ error: 'Server not found in DB' });

        const isSuspending = server.status !== 'suspended';
        
        if (isSuspending) {
            await pteroService.suspendServer(server.pteroId);
            server.status = 'suspended';
        } else {
            await pteroService.unsuspendServer(server.pteroId);
            server.status = 'active';
        }

        await server.save();
        await logAction({ req, action: isSuspending ? 'SUSPEND_SERVER' : 'UNSUSPEND_SERVER', details: { id, pteroId: server.pteroId } });

        res.json(server);
    } catch (error) {
        next(error);
    }
};

export const syncServersFromPanel = async (req, res, next) => {
    try {
        const [pteroServers, pteroUsers] = await Promise.all([
            pteroService.listAllServers(),
            pteroService.listAllUsers()
        ]);

        let addedCount = 0;
        const results = [];

        for (const s of pteroServers) {
            const exists = await Server.findOne({ pteroId: s.id });
            if (!exists) {
                const owner = pteroUsers.find(u => u.id === s.user);
                const userJid = owner?.external_id || 'unknown';

                const defaultExpired = new Date();
                defaultExpired.setDate(defaultExpired.getDate() + 30);

                const newSrv = await Server.create({
                    userId: userJid,
                    pteroId: s.id,
                    identifier: s.identifier,
                    planName: s.name,
                    price: 0,
                    expiredAt: defaultExpired,
                    status: 'active'
                });
                addedCount++;
                results.push(newSrv);
            }
        }

        await logAction({ req, action: 'SYNC_SERVERS', details: { addedCount } });
        res.json({ ok: true, addedCount, servers: results });
    } catch (error) {
        next(error);
    }
};
