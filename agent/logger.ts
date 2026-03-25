import Configuration from "./configuration";

export default class Logger {
    private static INSTANCE: Logger;

    private context?: string;
    constructor(context?: string) {
        this.context = context;
    }

    public static getInstance() {
        if (!Logger.INSTANCE) {
            Logger.INSTANCE = new Logger();
        }
        return Logger.INSTANCE;
    }

    public withContext(context: string) {
        return new Logger(context);
    }

    public debug(...args: any[]) {
        if (Configuration.DEBUG_LOGGING) {
            if (this.context) {
                console.log(`[DEBUG] [${this.context}]:`, ...args);
            } else {
                console.log(`[DEBUG]:`, ...args);
            }
        }
    }
}