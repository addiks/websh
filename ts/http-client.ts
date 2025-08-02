
import fs from 'fs';

export class WebShClient {
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
    
    public async activateRunScriptsDangerously(): Promise<void> {
        await fetch(this.baseUrl() + "/run-scripts-dangerously", {
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
