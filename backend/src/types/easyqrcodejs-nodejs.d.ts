// easyqrcodejs-nodejs ships no TypeScript types and there is no @types
// package for it. This declares the minimal surface this project uses.
// https://github.com/ushelp/EasyQRCodeJS-NodeJS#readme
declare module "easyqrcodejs-nodejs" {
    export interface QRCodeOptions {
        text: string;
        width?: number;
        height?: number;
        colorDark?: string;
        colorLight?: string;
        correctLevel?: number;
        [key: string]: unknown;
    }

    export interface SaveImageOptions {
        path: string;
    }

    export default class QRCode {
        constructor(options: QRCodeOptions);
        saveImage(options: SaveImageOptions): Promise<unknown>;
        saveSVG(options: SaveImageOptions): Promise<unknown>;
        toDataURL(): Promise<string>;
        toSVGText(): Promise<string>;
        toStream(): Promise<NodeJS.ReadableStream>;
    }
}
