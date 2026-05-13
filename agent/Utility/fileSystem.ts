import C from "../c";

namespace FileSystem {
    export class Directory {
        public static exists(path: string): boolean {
            return C.access(path.ptr(), 0) === 0 ? true : false;
        }
    }

    export class File {
        public static exists(path: string): boolean {
            return C.access(path.ptr(), 0) === 0 ? true : false;
        }
    }
}

export default FileSystem;