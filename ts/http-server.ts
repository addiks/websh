
import express from 'express';
import { Server } from 'net';

import { WebShBrowser } from './browser'

export interface WebShServerEventReceiver {
    close(): void;
}

export class WebShServer {
    public readonly port: number;
    private express;
    private server: Server|null = null;
    private eventReceiver: WebShServerEventReceiver;

    constructor (
        eventReceiver: WebShServerEventReceiver, 
        browser: WebShBrowser
    ) {
        this.eventReceiver = eventReceiver;
        this.port = 1024 + Math.floor((Math.random() * (65535 - 1024)) + 1);
        this.express = express();

        this.express.get("/", (request, response) => {
            response.send(process.pid);
        });
        this.express.post("/click/:selector", function (request, response) {
            console.log("/click/:selector");
            const selector = request.params.selector;
            browser.click(selector);
            response.send("OK");
        });
        this.express.post("/enter-text/:selector", function (request, response) {
            console.log("/click/:selector");
            const selector = request.params.selector;
            browser.enterText(selector, request.body);
            response.send("OK");
        });
        this.express.get("/get-html/:selector", function (request, response) {
            console.log("/get-html/:selector");
            const html = browser.getHtml(request.params.selector);
            console.log(typeof html);
            console.log(html);
            response.send(html);
        });
        this.express.post("/close-session", (request, response) => {
            this.eventReceiver.close();
            response.send("OK");
        });
        this.express.post("/navigate-to/:b64url", (request, response) => {
            console.log("/navigate-to/:b64url");
            const b64url = request.params.b64url;
            const url: string = Buffer.from(b64url, 'base64').toString();
            console.log(url);
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