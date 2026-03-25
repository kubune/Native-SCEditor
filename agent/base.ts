import GameLibrary from "./library";

export default class BaseClass {
    constructor() {
        
    }

    public add(offset: number) {
        const instance = GameLibrary.getInstance();
        const library = instance.getLibrary();
        return library.add(offset);
    }

    public static add(offset: number) {
        const instance = GameLibrary.getInstance();
        const library = instance.getLibrary();
        return library.add(offset);
    }
}