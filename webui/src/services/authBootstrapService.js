import { AuthIdentity } from '../models/AuthIdentity.js';
import { hashPassword } from './passwordService.js';
import { config } from '../config/index.js';

const SUPERADMIN = {
  name: 'Roy',
  jid: '62895395590009@s.whatsapp.net',
  lid: '79444496625700@lid',
  role: 'owner',
  active: true
};

export const ensureDefaultAuthIdentities = async () => {
  const { salt, hash } = await hashPassword(config.superadminPassword);
  const updated = await AuthIdentity.findOneAndUpdate(
    { jid: SUPERADMIN.jid },
    {
      $setOnInsert: {
        passwordSalt: salt,
        passwordHash: hash
      },
      $set: {
        name: SUPERADMIN.name,
        lid: SUPERADMIN.lid,
        role: SUPERADMIN.role,
        active: SUPERADMIN.active
      }
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  if (!updated.passwordHash || !updated.passwordSalt) {
    await AuthIdentity.updateOne(
      { _id: updated._id },
      { $set: { passwordSalt: salt, passwordHash: hash } }
    );
  }
};
