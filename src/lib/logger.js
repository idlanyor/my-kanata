import chalk from 'chalk';
import boxen from 'boxen';
import moment from 'moment';
import gradient from 'gradient-string';
import CFonts from 'cfonts';
import { botSocket } from './socket.js';

const colors = {
    info: chalk.blueBright,
    success: chalk.greenBright,
    warn: chalk.yellowBright,
    error: chalk.redBright,
    debug: chalk.magentaBright,
    time: chalk.gray
};

const banner = () => {
    console.clear();
    
    // Create Big Text Banner
    CFonts.say('KANATA|BOT', {
        font: 'block',
        align: 'center',
        colors: ['system'],
        background: 'transparent',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: '0',
        gradient: 'cristal',
        independentGradient: true,
        transitionGradient: true,
    });

    const info = [
        `${chalk.white('Created by')} ${gradient.retro('Roy')}`,
        `${chalk.white('Version   ')} ${chalk.cyan('1.0.0')}`,
        `${chalk.white('Status    ')} ${chalk.greenBright('Online')}`,
        `${chalk.white('Time      ')} ${chalk.gray(moment().format('DD/MM/YYYY HH:mm:ss'))}`
    ].join('\n');

    console.log(boxen(info, {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'cyan',
        float: 'center',
        title: chalk.bold.white(' [ System Info ] '),
        titleAlignment: 'center'
    }));
};

const log = (type, message, context = '') => {
    const time = colors.time(`[${moment().format('HH:mm:ss')}]`);
    const prefix = colors[type](type.toUpperCase().padEnd(7));
    const ctx = context ? chalk.black.bgCyan(` ${context} `) + ' ' : '';
    
    // Apply gradient to the message if it's special
    const formattedMsg = type === 'success' ? gradient.summer(message) : message;
    
    // Emit to WebApp via WebSocket
    botSocket.emitLog(`${context ? `[${context}] ` : ''}${message}`, type);

    console.log(`${time} ${prefix} ${ctx}${formattedMsg}`);
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
