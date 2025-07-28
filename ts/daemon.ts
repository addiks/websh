
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'node:child_process';

import { WebShServer, WebShServerEventReceiver } from './http-server'
import { WebShBrowser } from './browser'

function parentPidOf(pid: number): number|null {
    try {
        const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
        const match = status.match(/^PPid:\s+(\d+)/m);
        if (match) {
            return parseInt(match[1], 10);
        }
    } catch (err) {
        // No process or no permissions to access process
    }
    return null;
}

function envFileFor(ppid: number): string {
    return os.tmpdir() + "/addiks/websh/" + ppid + ".env";
}

function findEnvFile(): string {
    let ppid: number|null = process.ppid;
    let envFilePath: string = "";
    const seen = new Set();
    while(typeof ppid == "number" && !seen.has(ppid)) {
        seen.add(ppid);
        envFilePath = envFileFor(ppid);
        if (fs.existsSync(envFilePath)) {
            return envFilePath;
        } else {
            ppid = parentPidOf(ppid)
        }
    }
    return envFileFor(process.ppid);
}

class DaemonServerUnreachable extends Error {
}

export class DaemonEnvFileAlreadyExists extends Error {
    public readonly daemon: WebShDaemon;
    
    constructor(daemon: WebShDaemon) {
        super("An shweb session is already active!");
        this.daemon = daemon;
    }
}

class WebShDaemon implements WebShServerEventReceiver {
    public readonly envFile: string;
    private webserver: WebShServer;
    private browser: WebShBrowser;
    private hadInteractionSinceLastLoop: boolean = false;
    private wasStopped: boolean = false;

    constructor (envFile: string) {
        this.envFile = envFile;
        this.browser = new WebShBrowser();
        this.webserver = new WebShServer(this, this.browser);
    }
    
    public writeEnvFile() {
        if (fs.existsSync(this.envFile)) {
            throw new DaemonEnvFileAlreadyExists(this);
        }
        fs.mkdirSync(path.dirname(this.envFile), {recursive: true});
        console.log("Writing to " + this.envFile);
        fs.writeFileSync(this.envFile, JSON.stringify({
            pid: process.pid,
            port: this.webserver.port
        }));
    }
    
    public async main() {
        try {
            this.wasStopped = false;
            this.writeEnvFile();
            this.webserver.start();
            await this.sleepWhileThereIsInteraction();
            
        } finally {
            this.webserver.stop();
            if (fs.existsSync(this.envFile)) {
                fs.unlinkSync(this.envFile);
            }
        }
    }
    
    public close(): void {
        this.wasStopped = true;
    }
    
    private async sleepWhileThereIsInteraction(): Promise<any> {
        this.hadInteractionSinceLastLoop = true;
        while (this.hadInteractionSinceLastLoop) {
            this.hadInteractionSinceLastLoop = false;
            
            for (let i=0; i<(60*5); i++) {
                await sleepFor(1000);
                if (this.wasStopped) {
                    break;
                }
            }
        }
    }

}

async function startNewDaemonProcess() {
    const log = fs.openSync("/tmp/addiks/websh.log", "a");
    const daemon = spawn("node", [process.cwd() + "/build/websh.js", "start-session", process.ppid.toString()], {
        detached: true,
        stdio: ['ignore', log, log]
    });
    daemon.unref();
    await sleepFor(1000); // TODO: Wait for open port
}

export async function runDaemonFor(ppid: number) {
    let envFile: string = envFileFor(ppid);
    console.log("Starting new deamon at " + envFile);
    
    const daemon = new WebShDaemon(envFile);
    await daemon.main();
}

class WebShDaemonClient {
    private port: number;

    constructor (envFile: string) {
        const json = fs.readFileSync(envFile).toString();
        const env: any = JSON.parse(json);
        this.port = env.port;
    }
    
    public async ping() {
        await fetch(this.baseUrl() + "/");
    }
    
    public async close() {
        await fetch(this.baseUrl() + "/close-session", {
            method: 'POST'
        });
    }
    
    public async navigateTo(url: string) {
        const b64url = Buffer.from(url, 'binary').toString('base64');
        await fetch(this.baseUrl() + "/navigate-to/" + b64url, {
            method: 'POST'
        });
    }
    
    public async click(selector: string) {
        const url = this.baseUrl() + "/click/" + selector;
        await fetch(url, {
            method: 'POST'
        });
    }
    
    public async enterText(selector: string, text: string) {
        const url = this.baseUrl() + "/enter-text/" + selector;
        await fetch(url, {
            method: 'POST',
            body: text
        });
    }
    
    public async getHtml(selector: string): Promise<string> {
        const url = this.baseUrl() + "/get-html/" + selector;
        return (await fetch(url)).text();
    }
    
    private baseUrl(): string {
        return "http://localhost:" + this.port;
    }
    
}

export async function provideDaemonClient(): Promise<WebShDaemonClient> {
    
    let envFile: string = findEnvFile();
    
    if (!fs.existsSync(envFile)) {
        await startNewDaemonProcess();
    }
    
    try {
        const client = new WebShDaemonClient(envFile);
        await client.ping();
        return client;
        
    } catch (e: any) {
        console.log("blah");
        if (e instanceof TypeError && e.message == "fetch failed") {
            fs.unlinkSync(envFile);
            await startNewDaemonProcess();
            return new WebShDaemonClient(envFile);
            
        } else {
            throw e;
        }
    }
}

function sleepFor(milliseconds: number): Promise<any> {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}
    