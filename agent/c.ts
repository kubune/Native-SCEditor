export default class C {
    static free(ptr: NativePointer) {
        new NativeFunction(this.getExport('free'), 'void', ['pointer'])(ptr);
    }
    private static getExport(name: string): NativePointer {
        return Module.getGlobalExportByName(name);
    }

    public static malloc(size: number): NativePointer {
        return new NativeFunction(this.getExport('malloc'), 'pointer', ['int'])(size);
    }

    public static getaddrinfo(): NativePointer {
        return new NativeFunction(this.getExport('getaddrinfo'), 'int', ['pointer', 'pointer', 'pointer', 'pointer']);
    }
    static stat(path: NativePointer, buf: NativePointer): number {
        return new NativeFunction(Module.getGlobalExportByName("stat"), 'int', ['pointer', 'pointer'])(path, buf);
    }
    public static access(path: NativePointer, mode: number): number {
        return new NativeFunction(Module.getGlobalExportByName("access"), "int", ["pointer", "int"])(path, mode);
    }
}