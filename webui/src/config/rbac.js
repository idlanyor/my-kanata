export const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: [
    'bot.status.read',
    'bot.control',
    'bot.logs.read',
    'bot.sync.groups',
    'bot.relogin',
    'commands.read',
    'stats.read',
    'settings.read',
    'settings.update',
    'groups.read',
    'groups.update',
    'users.read',
    'users.update',
    'transactions.read',
    'transactions.update',
    'catalog.read',
    'catalog.update',
    'servers.read',
    'servers.create',
    'servers.update',
    'servers.sync',
    'servers.power',
    'servers.suspend',
    'servers.status.read'
  ],
  viewer: [
    'bot.status.read',
    'commands.read',
    'stats.read',
    'settings.read',
    'groups.read',
    'users.read',
    'transactions.read',
    'catalog.read',
    'servers.read',
    'servers.status.read'
  ]
};

export const DATA_COLLECTION_PERMISSION = {
  users: {
    read: 'users.read',
    update: 'users.update',
    delete: 'users.delete'
  },
  groups: {
    read: 'groups.read',
    update: 'groups.update',
    delete: 'groups.delete'
  },
  transactions: {
    read: 'transactions.read',
    update: 'transactions.update',
    delete: 'transactions.delete'
  },
  servers: {
    read: 'servers.read',
    update: 'servers.update',
    delete: 'servers.delete'
  }
};

export const getRolePermissions = (role = 'viewer') => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
};

export const hasPermission = (role = 'viewer', permission = '') => {
  const perms = getRolePermissions(role);
  return perms.includes('*') || perms.includes(permission);
};
