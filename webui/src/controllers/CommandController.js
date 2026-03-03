import { glob } from 'glob';
import path from 'path';
import { pathToFileURL } from 'url';
import { botService } from '../services/botService.js';

export const getCommands = async (req, res, next) => {
  try {
    const commandsDir = path.resolve(botService.botPath, 'src/commands');
    const files = await glob(`${commandsDir}/**/*.js`);
    const commandList = [];

    for (const file of files) {
      try {
        const timestamp = Date.now();
        const fileUrl = `${pathToFileURL(file).href}?v=${timestamp}`;
        const { default: moduleExport } = await import(fileUrl);

        const relativePath = path.relative(commandsDir, file);
        const category = path.dirname(relativePath);
        const categoryName = category === '.' ? 'General' : category.split(path.sep).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

        const addCmd = (cmd) => {
          if (cmd && cmd.name) {
            commandList.push({
              name: cmd.name,
              aliases: cmd.aliases || [],
              description: cmd.description || '',
              category: cmd.category || categoryName,
              adminOnly: !!cmd.adminOnly,
              ownerOnly: !!cmd.ownerOnly,
              cooldown: cmd.cooldown || 0
            });
          }
        };

        if (Array.isArray(moduleExport)) {
          moduleExport.forEach(addCmd);
        } else {
          addCmd(moduleExport);
        }
      } catch (err) {
        console.error(`Failed to load command file ${file}:`, err.message);
      }
    }

    commandList.sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name);
    });

    res.json(commandList);
  } catch (error) {
    next(error);
  }
};
