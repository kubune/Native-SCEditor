import C from "../c";
import Application from "./application";

export class Dirent {
    public static getName(dirent: NativePointer): string {
        const name = dirent.add(Application.arch == "arm64" ? 19 : 11).readCString();
        if (name != null) {
            return name;
        }
        return "";
    }
    public static getType(dirent: NativePointer): number {
        return dirent.add(Application.arch == "arm64" ? 18 : 10).readU8();
    }
}

namespace FileSystem {
    export class Directory {
        public static exists(path: string): boolean {
            return C.access(path.ptr(), 0) === 0 ? true : false;
        }
        public static listDirectory(path: string): string[] {
            const $results: string[] = [];
            const dir = C.opendir(path.ptr());
            if (dir.isNull()) {
                return $results;
            }

            let $entry: NativePointer;
            while (!($entry = C.readdir(dir)).isNull()) {
                const name = Dirent.getName($entry);

                if (name === "." || name === "..") continue;

                $results.push(name);
            }

            C.closedir(dir);
            return $results;
        }
    }

    export class Path {
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