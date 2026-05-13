import C from "../c";

export default class Path {
    public static join(...args: string[]): string {
        return args.join('/');
    }

    public static exists(path: string): boolean {
        return C.access(path.ptr(), 0) === 0 ? true : false;
    }
}