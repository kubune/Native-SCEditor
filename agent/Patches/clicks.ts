import GameLibrary from "../library";

// This wasnt updated to 66.293
export default () => {
    const base = GameLibrary.getInstance().getLibrary();    
    Memory.patchCode(base.add(0x57ADA4), Process.pageSize, (code: NativePointer) => {
        const writer = new Arm64Writer(code, { pc: base.add(0x57ADA4) });
        writer.putNop();
        writer.flush();
    });
}