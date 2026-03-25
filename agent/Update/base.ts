import GameLibrary from "../library";

GameLibrary.getInstance().ensureLoadedLibrary();
const base = GameLibrary.getInstance().getLibrary();

export default class Update {
    private function: Function | null;
    private task: InvocationListener | null = null;

    constructor(func: Function | null = null) {
        this.function = func;
    }

    private execute() {
        if (this.function) {
            this.function();
        }
    }

    public startTask() {
        const GameMain_update = base.add(0x49B984);
        this.task = Interceptor.attach(GameMain_update, {
            onEnter: (args) => {
                this.execute();
            }
        });
    }

    public stopTask() {
        if (this.task != null) {
            this.task.detach();
            this.task = null;
        }
    }

    public setFunction(func: Function) {
        this.function = func;
    }
}