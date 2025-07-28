#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import why from 'why-is-node-running';
// import { hideBin } from 'yargs/helpers'

import { provideDaemonClient, runDaemonFor, DaemonEnvFileAlreadyExists } from './daemon'

const argv = yargs()
    .command('start-session <ppid>', false, (yargs) => {
        return yargs
            .positional('ppid', {
                describe: 'Bash process to start session for'
            })
    }, (argv) => {
        try {
            runDaemonFor(argv.ppid as number);
        } catch (exception) {
            if (exception instanceof DaemonEnvFileAlreadyExists) {
                console.error("An shweb session is already active!");
            } else {
                throw exception;
            }
        }
    })
    .command('close', 'Closes the current session (if any)', (yargs) => {}, (argv) => {
        provideDaemonClient().then((c) => c.close());
    })
    .command('navigate-to <url>', 'open given URL', (yargs) => {
        return yargs
            .positional('url', {
                describe: 'URL to open'
            })
    }, async (argv) => {
        const client = await provideDaemonClient();
        await client.navigateTo(argv.url as string);
        // setTimeout(() => {why();}, 1000);
    })
    .command('click <selector>', 'Click on element(s)', (yargs) => {
    
    }, async (argv) => {
        const client = await provideDaemonClient();
        client.click(argv.selector as string);
    })
    .command('enter-text <selector> <text>', 'Enter text into element(s)', (yargs) => {
    
    }, async (argv) => {
        const client = await provideDaemonClient();
        client.enterText(argv.selector as string, argv.text as string);
    })
    .command('get-html <selector>', 'Get element(s) HTML', (yargs) => {
    
    }, async (argv) => {
        const client = await provideDaemonClient();
        const body = await client.getHtml(argv.selector as string);
        console.log(body);
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging'
    })
    .strict()
    .help()
    .demandCommand(1, 'websh needs a command. Use --help for details.')
    .parse(hideBin(process.argv));
