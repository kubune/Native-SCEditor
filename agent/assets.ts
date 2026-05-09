export default class Assets {
    private readonly libandroid = Process.getModuleByName("libandroid.so");

    private readonly AAssetManager_fromJava = this.libandroid.getExportByName("AAssetManager_fromJava");

    private readonly AAssetManager_openDir = new NativeFunction(this.libandroid.getExportByName("AAssetManager_openDir"), "pointer", ["pointer", "pointer"]);
    private readonly AAssetDir_getNextFileName = new NativeFunction(this.libandroid.getExportByName("AAssetDir_getNextFileName"), "pointer", ["pointer"]);
    private readonly AAssetDir_close = new NativeFunction(this.libandroid.getExportByName("AAssetDir_close"), "void", ["pointer"]);

    public static scFiles: string[];

    public init(): void {
        const hook = Interceptor.attach(this.AAssetManager_fromJava, {
            onLeave: (retval: NativePointer) => {
                try {
                    if (retval.isNull()) {
                        return;
                    }

                    // use immediately here
                    Assets.scFiles = this.list(retval, "sc");

                    hook.detach();
                } catch (e) {}
            }
        });
    }

    private list(assetManager: NativePointer, pathStr: string): string[] {
        let nameArray: string[] = [];
        try {
            const path = pathStr.ptr();
            const dir = this.AAssetManager_openDir(assetManager, path);

            if (dir.isNull()) {
                return [];
            }

            let namePtr: NativePointer;
            while (!(namePtr = this.AAssetDir_getNextFileName(dir)).isNull()) {
                const name = namePtr.readUtf8String()
                if (name != null)
                {
                    nameArray.push(name);
                }
            }

            this.AAssetDir_close(dir);
        } catch (e) {}
        return nameArray;
    }
}