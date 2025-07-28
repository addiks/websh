
import express from 'express';
import { Server } from 'net';

import { ShWebBrowser } from './browser'

export interface ShWebServerEventReceiver {
    close(): void;
}

export class ShWebServer {
    public readonly port: number;
    private express;
    private server: Server|null = null;
    private eventReceiver: ShWebServerEventReceiver;

    constructor (
        eventReceiver: ShWebServerEventReceiver, 
        browser: ShWebBrowser
    ) {
        this.eventReceiver = eventReceiver;
        this.port = 1024 + Math.floor((Math.random() * (65535 - 1024)) + 1);
        this.express = express();

        this.express.get("/", (request, response) => {
            response.send(process.pid);
        });
        this.express.get("/click/:selector", function (request, response) {
            console.log("/click/:selector");
            const selector = request.params.selector;
            browser.click(selector);
            response.send("OK");
        });
        this.express.get("/get-html/:selector", function (request, response) {
            console.log("/get-html/:selector");
            const html = browser.getHtml(request.params.selector);
            console.log(typeof html);
            console.log(html);
            response.send(html);
        });
        this.express.get("/close-session", (request, response) => {
            this.eventReceiver.close();
            response.send("OK");
        });
        this.express.get("/navigate-to/:b64url", (request, response) => {
            const b64url = request.params.b64url;
            const url: string = Buffer.from(b64url, 'base64').toString();
            browser.navigateTo(url);
            response.send("OK");
        });
    }
    
    public start(): void {
        console.log("Starting webserver on port " + this.port);
        this.server = this.express.listen(this.port, "127.0.0.1");
    }
    
    public stop(): void {
        console.log("Stopping webserver");
        this.server?.close();
    }

}