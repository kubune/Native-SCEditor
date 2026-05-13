import BaseClass from "../base";
import C from "../c";

export class StringObject extends BaseClass {
    string: string;
    memory: NativePointer;
    constructor(string: string) {
        super();
        this.string = string;
        this.memory = C.malloc(20);
        this.String();
    }

    String() {
        const method = StringObject.getStringMethod();
        const object = method(this.memory, this.string.ptr());
        return this.memory;
    }

    public static getStringMethod() {
        return new NativeFunction(this.add(0xD51880), 'pointer', ['pointer', 'pointer']);
    }
}

export class Stage extends BaseClass {
    constructor() {
        super();
    }

    public static getInstance() {
        return this.add(0x11AA010);
    }

    public static addChild(childPtr: NativePointer) {
        return new NativeFunction(this.add(0xBBEC60), 'pointer', ['pointer', 'pointer'])(this.getInstance().readPointer(), childPtr);
    }

    public static removeChild(childPtr: NativePointer) {
        return new NativeFunction(this.add(0xBB68F4), 'pointer', ['pointer', 'pointer'])(this.getInstance().readPointer().add(6648).readPointer(), childPtr);
    }
}

export class ResourceManager extends BaseClass {
    constructor() {
        super();
    }

    public static getMovieClip(scFile: String, export_name: String | NativePointer, a3: number = 0) {
        let exportNamePtr: NativePointer;
        if (typeof export_name === "string") {
            exportNamePtr = export_name.ptr();
        }
        else {
            exportNamePtr = export_name as NativePointer;
        }
        return new NativeFunction(this.add(0x921B24), 'pointer', ['pointer', 'pointer', 'int'])(scFile.ptr(), exportNamePtr, a3);
    }

    public static getSupercellSWF(swfName: String) {
        return new NativeFunction(this.add(0xB787A4), 'pointer', ['pointer', 'int'])(swfName.ptr(), 0);
    }
}