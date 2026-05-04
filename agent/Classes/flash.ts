import BaseClass from "../base";

export class MovieClip extends BaseClass {
    constructor() {
        super();
    }

    public static getMovieClipByName(movieClipPtr: NativePointer, name: String | NativePointer) {
        let namePtr: NativePointer;
        if (typeof name === "string") {
            namePtr = name.ptr();
        }
        else {
            namePtr = name as NativePointer;
        }
        return new NativeFunction(this.add(0xBA7AA0), 'pointer', ['pointer', 'pointer'])(movieClipPtr, namePtr);
    }

    public static getTextFieldByName(movieClipPtr: NativePointer, name: String | NativePointer) {
        let namePtr: NativePointer;
        if (typeof name === "string") {
            namePtr = name.ptr();
        }
        else {
            namePtr = name as NativePointer;
        } 
        return new NativeFunction(this.add(0xBA7D00), 'pointer', ['pointer', 'pointer'])(movieClipPtr, namePtr);
    }

    public static gotoAndStopFrameIndex(movieClipPtr: NativePointer, frameIndex: number) {
        return new NativeFunction(this.add(0xBA6E6C), 'pointer', ['pointer', 'int'])(movieClipPtr, frameIndex);
    }
}

export class TextField extends BaseClass {
    constructor() {
        super();
    }

    public static setText(textFieldPtr: NativePointer, text: String | NativePointer) {
        return new NativeFunction(this.add(0xBD5470), 'pointer', ['pointer', 'pointer'])(textFieldPtr, (typeof text === "string" ? text.scptr() : text as NativePointer));
    }
}