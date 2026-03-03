import express from 'express';
import * as ServerController from '../controllers/ServerController.js';
import * as PteroController from '../controllers/PteroController.js';
import { authenticate, authorizePermission } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorizePermission('servers.read'), ServerController.getAllServers);
router.post('/', authorizePermission('servers.create'), ServerController.createServer);
router.patch('/:id', authorizePermission('servers.update'), ServerController.updateServer);
router.delete('/:id', authorizePermission('servers.delete'), ServerController.deleteServer);

// Pterodactyl specific actions
router.post('/sync', authorizePermission('servers.sync'), PteroController.syncServersFromPanel);
router.get('/:identifier/status', authorizePermission('servers.status.read'), PteroController.getPteroServerStatus);
router.post('/:identifier/power', authorizePermission('servers.power'), PteroController.controlPteroServer);
router.post('/:id/suspend-toggle', authorizePermission('servers.suspend'), PteroController.toggleSuspend);

export default router;
