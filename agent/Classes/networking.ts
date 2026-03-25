import BaseClass from "../base";

export default class ServerConnection extends BaseClass {
    constructor() {
        super();
    }

    public static update() {
        return this.add(0x77E294);
    }
}