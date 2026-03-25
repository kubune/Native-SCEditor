export default class GameLibrary {
    private static INSTANCE: GameLibrary;
    private static base: NativePointer;

    constructor() {
        GameLibrary.INSTANCE = this;
    }

    public static getInstance(): GameLibrary {
        if (!GameLibrary.INSTANCE) {
            GameLibrary.INSTANCE = new GameLibrary();
        }
        return GameLibrary.INSTANCE;
    }

    public loadLibrary() {
        while (true) {
            try {
                GameLibrary.base = Process.getModuleByName("libg.so").base;
                break;
            } catch (e) {
                continue;
            }
        }
        return GameLibrary.base;
    }

    public getLibrary(): NativePointer {
        return GameLibrary.base;
    }

    public ensureLoadedLibrary() {
        if (!GameLibrary.base) {
            this.loadLibrary();
        }
    }
}