import { ResourceManager } from "../Classes/titan";

export default class SupercellSWF {
    swf: NativePointer;
    constructor(swf: NativePointer) {
        this.swf = swf;
    }

    public static getSWF(swfName: string) {
        return new SupercellSWF(ResourceManager.getSupercellSWF(swfName));
    }

    public getSWF() {
        return this.swf;
    }

    public getExportNameCount() {
        return this.swf.add(112).readInt();
    }

    public getExportNameArray() {
        return this.swf.add(288).readPointer();
    }

    public getExportNameAt(index: number) {
        const Array = this.getExportNameArray();
        return Array.add(index * 8).readPointer();
    }

    public getExportNames() {
        const names = [];
        for (let i = 0; i < this.getExportNameCount(); i++) {
            names.push(this.getExportNameAt(i).readUtf8String());
        }
        return names;
    }

    public getShapesCount() {
        return this.swf.add(100).readInt();
    }

    public getMovieClipCount() {
        return this.swf.add(104).readInt();
    }

    public getTextFieldCount() {
        return this.swf.add(116).readInt();
    }

    public getBitmapCount() {
        return this.swf.add(108).readInt();
    }

    public getBitmapArray() {
        return this.swf.add(160).readPointer().add(208);
    }

    public getBitmapAt(index: number) {
        return this.getBitmapArray().add(index * 8)
    }

    public getBitmapWidth(index: number) {
        return this.getBitmapAt(index).add(128).readInt();
    } 

    public getBitmapHeight(index: number) {
        return this.getBitmapAt(index).add(132).readInt();
    }
}