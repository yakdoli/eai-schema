export interface FetchResult {
    content: Buffer;
    contentType: string;
    size: number;
    url: string;
    fetchedAt: Date;
}
export declare class UrlFetchService {
    private validateUrl;
    private isBlockedHost;
    private isIpAddress;
    private isInCidrRange;
    fetchFromUrl(urlString: string): Promise<FetchResult>;
    private validateContent;
    isSupportedUrl(urlString: string): boolean;
}
export declare const urlFetchService: UrlFetchService;
//# sourceMappingURL=urlFetchService.d.ts.map