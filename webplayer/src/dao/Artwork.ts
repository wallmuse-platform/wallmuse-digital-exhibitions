import {myParseFloat, myParseInt} from "../manager/Helper";

export class Artwork {

    public artwork_id!: number;
    public title!: string;
    /** VID, IMG, AUD, HTML, TEXT */
    public type!: string;
    public url!: string;
    public codecs?: string;
    /** Lighter streaming version (HD-WEB), sent by the manager for streaming videos */
    public web_url?: string;
    public web_codecs?: string;
    public md5?: string;
    public size!: number;
    public filename?: string;
    public width!: number;
    public height!: number;
    public duration!: number;
    public subtitle_url?: string;
    public subtitle_md5?: string;
    public subtitle_filename?: string;

    public constructor(json?: any) {
        this.artwork_id = myParseInt(this.artwork_id);
        this.size = myParseInt(this.size);
        this.width = myParseInt(this.width);
        this.height = myParseInt(this.height);
        this.duration = myParseFloat(this.duration);
        if (json) {
            Object.assign(this, json);
        }

        // Browsers play the streaming version; a standalone player (?player=standalone) keeps the master
        if (this.web_url && !Artwork.isStandalone()) {
            this.url = this.web_url;
            this.codecs = this.web_codecs || this.codecs;
        }

        this.correctUrlHost();
    }

    private static standalone?: boolean;

    private static isStandalone(): boolean {
        if (Artwork.standalone === undefined) {
            Artwork.standalone = new URLSearchParams(window.location.search).get('player') === 'standalone';
        }
        return Artwork.standalone;
    }

    // Media/subtitle URLs must be on :8443 (the front door for REST and media), never
    // :8444 (Tomcat direct over HTTP/2, whose write timeout closes the connection once
    // the browser has buffered ahead on a long/idle video) — see docs/media-port-8444-brief.md.
    // The server is not always consistent about this (observed a field coming back already
    // on :8444, not just missing the 'manager.' prefix), so normalize unconditionally rather
    // than only patching the host. Signed URLs (exp/k/sig) don't cover host/port, so this
    // rewrite stays valid either way.
    private correctUrlHost(): void {
        this.url = Artwork.normalizeMediaHost(this.url, 'artwork') ?? this.url;
        this.subtitle_url = Artwork.normalizeMediaHost(this.subtitle_url, 'subtitle');
    }

    private static normalizeMediaHost(url: string | undefined, label: string): string | undefined {
        if (!url) return url;
        let fixed = url;
        if (fixed.includes('manager.wallmuse.com:8444')) {
            fixed = fixed.replace('manager.wallmuse.com:8444', 'manager.wallmuse.com:8443');
        } else if (fixed.includes('wallmuse.com:8444')) {
            fixed = fixed.replace('wallmuse.com:8444', 'manager.wallmuse.com:8443');
        } else if (fixed.includes('wallmuse.com:8443') && !fixed.includes('manager.wallmuse.com:8443')) {
            fixed = fixed.replace('wallmuse.com:8443', 'manager.wallmuse.com:8443');
        }
        if (fixed !== url) {
            console.log(`🔧 [URL-FIX] Corrected ${label} URL to manager.wallmuse.com:8443:`, fixed);
        }
        return fixed;
    }

}
