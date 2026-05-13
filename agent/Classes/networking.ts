import BaseClass from "../base";

export default class ServerConnection extends BaseClass {
    constructor() {
        super();
    }
    
    public static readonly update = this.add(0x77CFB4);
}