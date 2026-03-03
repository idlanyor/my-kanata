import { config } from '../config/index.js';
import { hasPermission, DATA_COLLECTION_PERMISSION } from '../config/rbac.js';
import mongoose from 'mongoose';

const parseCookies = (cookieHeader = '') => {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        const i = v.indexOf('=');
        return [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
      })
  );
};

export const authenticate = async (req, res, next) => {
  try {
    const sid = parseCookies(req.headers.cookie || '').sid;
    console.log(`[Auth] Checking SID: ${sid ? sid.slice(0, 8) + '...' : 'MISSING'}`);
    
    if (!sid) {
      return res.status(401).json({ error: 'Unauthorized: No SID' });
    }

    const db = mongoose.connection.db;
    if (!db) {
        console.error('[Auth] Database connection not ready');
        return res.status(500).json({ error: 'Database connection not ready' });
    }

    const sessionStore = db.collection(config.sessionCollection);
    const session = await sessionStore.findOne({ sid });
    
    if (!session) {
      console.log(`[Auth] Session not found for SID: ${sid.slice(0, 8)}...`);
      return res.status(401).json({ error: 'Unauthorized: Invalid session' });
    }

    console.log(`[Auth] Session found for ${session.jid}, Role: ${session.role}`);

    if (session.expiresAt < new Date()) {
        console.log('[Auth] Session expired');
        await sessionStore.deleteOne({ sid });
        return res.status(401).json({ error: 'Session expired' });
    }

    req.session = session;
    return next();
  } catch (error) {
    console.error('[Auth] Error:', error);
    return next(error);
  }
};

export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.session) return res.status(401).json({ error: 'Unauthorized' });
        
        // If roles is empty, allow all authenticated
        if (roles.length === 0) return next();

        const userRole = req.session.role || 'viewer';
        if (!roles.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

export const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });
    const userRole = req.session.role || 'viewer';
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

export const authorizeDataAction = (action) => {
  return (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });
    const userRole = req.session.role || 'viewer';
    const collection = req.params.collection;
    const permission = DATA_COLLECTION_PERMISSION[collection]?.[action];

    if (!permission) {
      return res.status(403).json({ error: 'Forbidden: Unknown collection permission' });
    }

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
