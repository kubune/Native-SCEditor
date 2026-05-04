import C from "./c";
import { StringObject } from "./Classes/titan";

declare global {
    interface String {
        ptr(): NativePointer;
        scptr(): NativePointer;
    }
    interface NativePointer {
        fromsc(): string;
    }
}

export default function BakePrototypes() {
    NativePointer.prototype.fromsc = function () {
        const str = (this.add(4).readInt() >= 8 ? this.add(8).readPointer() : this.add(8)).readUtf8String();
        return str ? str : "";
    }

    String.prototype.ptr = function () {
        return Memory.allocUtf8String(this as string);
    }

    String.prototype.scptr = function () {
        const StringCtor = StringObject.getStringMethod();
        let ptr = C.malloc(20);
        StringCtor(ptr, this.ptr());
        Script.bindWeak(ptr, () => {
            C.free(ptr);
        });
        setTimeout(() => {
            C.free(ptr);
        }, 250);
        return ptr;
    }
}