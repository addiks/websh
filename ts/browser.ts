
import { JSDOM } from 'jsdom';

class ShWebTab {

}

export class ShWebBrowser {
    private tabs: ShWebTab[] = [];
    private dom: JSDOM;

    constructor () {
        this.dom = new JSDOM(``, {});
    }
    
    public navigateTo(url: string): void {
        this.dom = new JSDOM(``, {
            url: url,
            // contentType: "text/html",
            includeNodeLocations: true,
            storageQuota: 10000000,
            runScripts: "dangerously"
        });
    }
    
    public click(selector: string): void {
        
    }
    
    public getHtml(selector: string): string {
        let html = "";
        for (const node of this.dom.window.document.querySelectorAll(selector)) {
            html += node.outerHTML;
        }
        return html;
    }

}