import BaseClass from "../base";

export class GameMain extends BaseClass {
    constructor() {
        super();
    }

    public static loadAsset(path: String, a2: number = 0) {
        return new NativeFunction(this.add(0x49E07C), 'pointer', ['pointer', 'int'])(path.scptr(), a2);
    }
}