
import { JSDOM } from 'jsdom';

export class WebShBrowser {
    private dom: JSDOM;
    private runScriptsDangerously: boolean = false;

    constructor () {
        this.dom = new JSDOM(``, {});
    }
    
    public activateRunScriptsDangerously(): void {
        this.runScriptsDangerously = true;
    }
    
    public async navigateTo(url: string) {
        console.log("Opening '" + url + "' in browser.");
        const html: string = await (await fetch(url)).text();
        this.dom = new JSDOM(html, {
            url: url,
            // contentType: "text/html",
            includeNodeLocations: true,
            storageQuota: 10000000,
            runScripts: this.runScriptsDangerously ? "dangerously" : undefined,
            pretendToBeVisual: true
        });
    }
    
    public click(selector: string): void {
        for (const node of this.query(selector)) {
            // node.click();
        }
    }
    
    public enterText(selector: string, text: string): void {
        for (const node of this.query(selector)) {
            node.setAttribute('value', text);
        }
    }
    
    public getHtml(selector: string): string {
        let html = "";
        for (const node of this.query(selector)) {
            html += node.outerHTML;
        }
        return html;
    }
    
    private query(selector: string) {
        return this.dom.window.document.querySelectorAll(selector);
    }

}