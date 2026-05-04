import GameLibrary from "./library";

export default class BaseClass {
    constructor() {
        // empty constructor, just to be extended
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