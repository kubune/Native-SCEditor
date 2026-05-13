import Application from "../Utility/application";
import FileSystem from "../Utility/fileSystem";
import Path from "../Utility/path";
import C from "../c";

const PROTECTED_FILES = [
    "fingerprint.json"
];

export default () => {
    const mediaDirectory = Application.getMediaDirectory();
    const updateDirectory = Application.getUpdateDirectory();

    syncDirectory(mediaDirectory, updateDirectory);
}

function syncDirectory(sourceDir: string, targetDir: string) {
    if (!FileSystem.Directory.exists(targetDir)) {
        C.mkdir(targetDir.ptr(), 0o777);
    }

    const sourceEntries = FileSystem.Directory.listDirectory(sourceDir);
    const targetEntries = FileSystem.Directory.listDirectory(targetDir);

    const sourceMap: Record<string, boolean> = {};
    for (const entry of sourceEntries) {
        sourceMap[entry.name] = true;

        const sourcePath = Path.join(sourceDir, entry.name);
        const targetPath = Path.join(targetDir, entry.name);

        if (entry.isDirectory) {
            syncDirectory(sourcePath, targetPath);
        } else {
            FileSystem.File.copy(sourcePath, targetPath);
        }
    }

    for (const entry of targetEntries) {
        if (PROTECTED_FILES.includes(entry.name)) {
            continue;
        }
        if (sourceMap[entry.name]) {
            continue;
        }

        const targetPath = Path.join(targetDir, entry.name);
        if (entry.isDirectory) {
            deleteDirectoryRecursive(targetPath);
        } else {
            C.remove(targetPath);
        }
    }
}

function deleteDirectoryRecursive(path: string) {
    const entries = FileSystem.Directory.listDirectory(path);

    for (const entry of entries) {
        const entryPath = Path.join(path, entry.name);

        if (entry.name === "fingerprint.json") {
            continue;
        }

        if (entry.isDirectory) {
            deleteDirectoryRecursive(entryPath);
        } else {
            C.remove(entryPath);
        }
    }

    C.remove(path);
}