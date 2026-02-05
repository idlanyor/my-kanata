import Group from '../../database/models/Group.js';
import { clearSettingsCache } from '../../handlers/messageHandler.js';

export default [
    {
        name: 'setwelcome',
        aliases: ['setw'],
        description: 'Atur pesan welcome kustom',
        category: 'Group',
        execute: async (sock, m, args, text) => {
            if (!m.isGroup) return m.reply('Hanya di grup!');
            if (!text) return m.reply(`Ketik pesannya!\nPlaceholder: @user, @group, @desc`);

            await Group.findOneAndUpdate({ jid: m.chat }, { welcomeMsg: text }, { upsert: true });
            clearSettingsCache();
            m.reply(` Berhasil mengatur pesan welcome:\n\n${text}`);
        }
    },
    {
        name: 'setleave',
        aliases: ['setl'],
        description: 'Atur pesan leave kustom',
        category: 'Group',
        execute: async (sock, m, args, text) => {
            if (!m.isGroup) return m.reply('Hanya di grup!');
            if (!text) return m.reply(`Ketik pesannya!\nPlaceholder: @user, @group`);

            await Group.findOneAndUpdate({ jid: m.chat }, { leaveMsg: text }, { upsert: true });
            clearSettingsCache();
            m.reply(` Berhasil mengatur pesan leave:\n\n${text}`);
        }
    },
    {
        name: 'welcome',
        description: 'Aktifkan/Matikan fitur welcome',
        category: 'Group',
        execute: async (sock, m, args, text) => {
            if (!m.isGroup) return m.reply('Hanya di grup!');
            let group = await Group.findOne({ jid: m.chat }) || await Group.create({ jid: m.chat });
            group.welcome = !group.welcome;
            await group.save();
            clearSettingsCache();
            m.reply(` Fitur Welcome berhasil ${group.welcome ? '*DIAKTIFKAN*' : '*DIMATIKAN*'}`);
        }
    },
    {
        name: 'leave',
        description: 'Aktifkan/Matikan fitur leave',
        category: 'Group',
        execute: async (sock, m, args, text) => {
            if (!m.isGroup) return m.reply('Hanya di grup!');
            let group = await Group.findOne({ jid: m.chat }) || await Group.create({ jid: m.chat });
            group.left = !group.left;
            await group.save();
            clearSettingsCache();
            m.reply(` Fitur Leave berhasil ${group.left ? '*DIAKTIFKAN*' : '*DIMATIKAN*'}`);
        }
    }
];