import { glob } from 'glob';
import path from 'path';
import { pathToFileURL } from 'url';

const commands = new Map();

export const loadCommands = async () => {
    // Determine the absolute path to the commands directory
    // Assuming this file is in src/lib/, we go up one level to src/ and then into commands/
    const commandsDir = path.resolve('src/commands');
    
    // Find all .js files in src/commands recursively
    // Using glob pattern to match all .js files in subdirectories
    const files = await glob(`${commandsDir}/**/*.js`);

    for (const file of files) {
        // Import using file URL for Windows compatibility and ESM
        const { default: command } = await import(pathToFileURL(file).href);
        if (command && command.name && command.execute) {
            // Extract category from path
            const relativePath = path.relative(commandsDir, file);
            const category = path.dirname(relativePath);
            command.category = category === '.' ? 'General' : category.charAt(0).toUpperCase() + category.slice(1);

            commands.set(command.name, command);
            if (command.aliases) {
                command.aliases.forEach(alias => commands.set(alias, command));
            }
        }
    }
    console.log(` Loaded ${commands.size} commands`);
};

export { commands };
