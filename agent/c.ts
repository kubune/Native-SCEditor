export default class C {
    private static $getExport(name: string): NativePointer {
        return Module.getGlobalExportByName(name);
    }

    public static malloc(size: number): NativePointer {
        return new NativeFunction(this.$getExport('malloc'), 'pointer', ['int'])(size);
    }
    public static free(ptr: NativePointer) {
        new NativeFunction(this.$getExport('free'), 'void', ['pointer'])(ptr);
    }
    public static stat(path: NativePointer, buf: NativePointer): number {
        return new NativeFunction(this.$getExport("stat"), 'int', ['pointer', 'pointer'])(path, buf);
    }
    public static access(path: NativePointer, mode: number): number {
        return new NativeFunction(this.$getExport("access"), "int", ["pointer", "int"])(path, mode);
    }
    public static mkdir(path: NativePointer, mode: number = 0o777): number {
        return new NativeFunction(this.$getExport("mkdir"), "int", ["pointer", "int"])(path, mode);
    }
    public static getuid(): number {
        return new NativeFunction(this.$getExport("getuid"), "int", [])();
    }
    public static open(path: NativePointer, flags: number, mode: number): number {
        return new NativeFunction(this.$getExport("open"), "int", ["pointer", "int", "int"])(path, flags, mode);
    }
    public static read(fd: number, buf: NativePointer, count: number): number {
        return new NativeFunction(this.$getExport("read"), "int", ["int", "pointer", "int"])(fd, buf, count);
    }
    public static write(fd: number, buf: NativePointer, count: number): number {
        return new NativeFunction(this.$getExport("write"), "int", ["int", "pointer", "int"])(fd, buf, count);
    }
    public static close(fd: number): number {
        return new NativeFunction(this.$getExport("close"), "int", ["int"])(fd);
    }
}