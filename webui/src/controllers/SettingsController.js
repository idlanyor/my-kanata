import { Settings } from '../models/Settings.js';
import { logAction } from '../services/auditService.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ id: 'bot_settings' });
    if (!settings) {
      settings = await Settings.create({ id: 'bot_settings' });
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await Settings.findOneAndUpdate(
      { id: 'bot_settings' },
      { $set: updates },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    await logAction({ req, action: 'UPDATE_SETTINGS', details: { updates } });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};
