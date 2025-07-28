
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'node:child_process';

import { ShWebServer, ShWebServerEventReceiver } from './http-server'
import { ShWebBrowser } from './browser'

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
    return os.tmpdir() + "/addiks/shweb/" + ppid + ".env";
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
    public readonly daemon: ShWebDaemon;
    
    constructor(daemon: ShWebDaemon) {
        super("An shweb session is already active!");
        this.daemon = daemon;
    }
}

class ShWebDaemon implements ShWebServerEventReceiver {
    public readonly envFile: string;
    private webserver: ShWebServer;
    private browser: ShWebBrowser;
    private hadInteractionSinceLastLoop: boolean = false;
    private wasStopped: boolean = false;

    constructor (envFile: string) {
        this.envFile = envFile;
        this.browser = new ShWebBrowser();
        this.webserver = new ShWebServer(this, this.browser);
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
    const log = fs.openSync("/tmp/addiks/shweb.log", "a");
    const daemon = spawn("node", [process.cwd() + "/build/shweb.js", "start-session", process.ppid.toString()], {
        detached: true,
        stdio: ['ignore', log, log]
    });
    daemon.unref();
    await sleepFor(1000); // TODO: Wait for open port
}

export async function runDaemonFor(ppid: number) {
    let envFile: string = envFileFor(ppid);
    console.log("Starting new deamon at " + envFile);
    
    const daemon = new ShWebDaemon(envFile);
    await daemon.main();
}

class ShWebDaemonClient {
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
        await fetch(this.baseUrl() + "/close-session");
    }
    
    public async navigateTo(url: string) {
        console.log("Sending navigate command to daemon...");
        const b64url = Buffer.from(url, 'binary').toString('base64');
        console.log(this.baseUrl() + "/navigate-to/" + b64url);
        await fetch(this.baseUrl() + "/navigate-to/" + b64url);
        console.log("NavTo finished");
    }
    
    public async getHtml(selector: string): Promise<string> {
        const url = this.baseUrl() + "/get-html/" + selector;
        console.log(url);
        
        return await this.streamToString((await fetch(url)).body);
    }
    
    private baseUrl(): string {
        return "http://localhost:" + this.port;
    }
    
    private streamToString (stream: any): Promise<string> {
        const chunks: any[] = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (err: any) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks as any[]).toString('utf8')));
        })
    }
    
}

export async function provideDaemonClient(): Promise<ShWebDaemonClient> {
    
    let envFile: string = findEnvFile();
    
    if (!fs.existsSync(envFile)) {
        console.log("Creating new deamon for PPID " + process.ppid);
        await startNewDaemonProcess();
        
    } else {
        console.log("Using existing deamon at " + envFile);
    }
    
    try {
        const client = new ShWebDaemonClient(envFile);
        await client.ping();
        return client;
        
    } catch (e: any) {
        console.log("blah");
        if (e instanceof TypeError && e.message == "fetch failed") {
            console.log("Existing daemon is down. Restarting...");
            fs.unlinkSync(envFile);
            console.log("blah1");
            await startNewDaemonProcess();
            console.log("bla2");
            return new ShWebDaemonClient(envFile);
            
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
    