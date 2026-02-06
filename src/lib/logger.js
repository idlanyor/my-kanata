import chalk from 'chalk';
import boxen from 'boxen';
import moment from 'moment';

const colors = {
    info: chalk.blueBright,
    success: chalk.greenBright,
    warn: chalk.yellowBright,
    error: chalk.redBright,
    debug: chalk.magentaBright,
    time: chalk.gray
};

const banner = () => {
    const content = chalk.bold.cyanBright('KANATA BOT MULTI-DEVICE') + '\n' +
                    chalk.white('Created by Roy') + '\n' +
                    chalk.gray('Status: ') + chalk.greenBright('Online');
    
    console.log(boxen(content, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        textAlign: 'center'
    }));
};

const log = (type, message, context = '') => {
    const time = colors.time(`[${moment().format('HH:mm:ss')}]`);
    const prefix = colors[type](type.toUpperCase().padEnd(7));
    const ctx = context ? chalk.black.bgWhite(` ${context} `) + ' ' : '';
    console.log(`${time} ${prefix} ${ctx}${message}`);
};

const logger = {
    info: (msg, ctx) => log('info', msg, ctx),
    success: (msg, ctx) => log('success', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),
    debug: (msg, ctx) => log('debug', msg, ctx),
    banner
};

export default logger;