import C from "../c";

const opendir = new NativeFunction(
    Module.getGlobalExportByName("opendir"),
    "pointer",
    ["pointer"]
);

const readdir = new NativeFunction(
    Module.getGlobalExportByName("readdir"),
    "pointer",
    ["pointer"]
);

const closedir = new NativeFunction(
    Module.getGlobalExportByName("closedir"),
    "int",
    ["pointer"]
);

const DIRENT_NAME_OFFSET = 19;
export default class FileSystem {
    public static Exists(path: string): boolean {
        if (path.endsWith("/"))
        {
            const pStr = Memory.allocUtf8String(path);
            return C.access(pStr, 0) === 0;
        }
        try {
            new File(path, "rb");
            return true;
        } catch (e) {
            return false;
        }
    }

    public static Create(path: string): File {
        return new File(path, "w");
    }

    public static Read(path: string): File {
        return new File(path, "r");
    }

    public static ListDirectory(path: string): string[] {
        const pathPtr = Memory.allocUtf8String(path);
        const dir = opendir(pathPtr) as NativePointer;

        if (dir.isNull()) {
            return [];
        }

        const results: string[] = [];
        let entry: NativePointer;

        while (!(entry = readdir(dir) as NativePointer).isNull()) {
            const namePtr = entry.add(DIRENT_NAME_OFFSET);
            const name = namePtr.readUtf8String();

            if (name === "." || name === "..") continue;
            console.log(name)
            const fullPath = path.endsWith("/") ? path + name : `${path}/${name}`;
            const subPtr = Memory.allocUtf8String(fullPath);
            const subDir = opendir(subPtr) as NativePointer;

            if (!subDir.isNull()) {
                closedir(subDir);
                results.push(name + "/"); 
            } else {
                results.push(name != null ? name : "");
            }
        }

        closedir(dir);
        console.log(results)
        return results;
    }
}