import C from "../c";
import Application from "./application";
import Path from "./path";

export type DirEntry = {
    name: string;
    isDirectory: boolean;
}

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

        public static listDirectory(path: string): DirEntry[] {
            const $results: DirEntry[] = [];
            const dir = C.opendir(path.ptr());
            if (dir.isNull()) {
                return $results;
            }

            let $entry: NativePointer;
            while (!($entry = C.readdir(dir)).isNull()) {
                const name = Dirent.getName($entry);
                const type = Dirent.getType($entry);

                if (name === "." || name === "..") continue;

                const $dirEntry: DirEntry = {
                    "name": name,
                    "isDirectory": type === 4
                }
                $results.push($dirEntry);
            }

            C.closedir(dir);
            return $results;
        }

        public static listDirectoryRecursive(path: string): DirEntry[] {
            const results: DirEntry[] = [];

            function walk(currentPath: string, relativePath: string = "") {
                const entries = FileSystem.Directory.listDirectory(currentPath);

                for (const entry of entries) {
                    const fullPath = Path.join(currentPath, entry.name);

                    const relative = relativePath.length > 0
                        ? Path.join(relativePath, entry.name)
                        : entry.name;

                    results.push({
                        name: relative,
                        isDirectory: entry.isDirectory
                    });

                    if (entry.isDirectory) {
                        walk(fullPath, relative);
                    }
                }
            }

            walk(path);

            return results;
        }
    }

    export class File {
        public static exists(path: string): boolean {
            return C.access(path.ptr(), 0) === 0 ? true : false;
        }

        public static copy(source: string, target: string) {
            const O_RDONLY = 0;
            const O_WRONLY = 1;
            const O_CREAT = 0x40;
            const O_TRUNC = 0x200;

            const BUFFER_SIZE = 4096;
            const buffer = C.malloc(BUFFER_SIZE);

            const srcFd = C.open(source.ptr(), O_RDONLY, 0);
            const dstFd = C.open(target.ptr(), O_WRONLY | O_CREAT | O_TRUNC, 0o666);

            if (srcFd < 0) return;
            if (dstFd < 0) {
                C.close(srcFd);
                return;
            }

            while (true) {
                const $bytesRead = C.read(srcFd, buffer, BUFFER_SIZE);
                if ($bytesRead <= 0) {
                    break;
                }
                C.write(dstFd, buffer, $bytesRead);
            }

            C.free(buffer);
            C.close(srcFd);
            C.close(dstFd);
        }
    }

    export function isDirectory(path: string): boolean {
        const $path = path.ptr();
        const $dir = C.opendir($path);
        if ($dir.isNull()) return false;
        C.closedir($dir);
        return true;
    }

    export function isFile(path: string): boolean {
        return !isDirectory(path);
    }
}

export default FileSystem;