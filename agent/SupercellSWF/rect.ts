import C from "../c";

export default class Rect {
    mem: NativePointer;
    constructor() {
        this.mem = C.malloc(16);
        this.mem.writeInt(0);
        this.mem.add(1).writeInt(0);
    }


}