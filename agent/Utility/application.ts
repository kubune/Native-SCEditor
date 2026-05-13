import C from "../c";
import FileSystem from "./fileSystem";

export default class Application {
    public static getPackageName(): string {
        const $buffer = Memory.alloc(4096);

        const $fd = C.open("/proc/self/cmdline".ptr(), 0, 0);
        const $length = C.read($fd, $buffer, 4096);
        C.close($fd);

        const $dataArray = new Uint8Array($buffer.readByteArray($length) as ArrayBuffer);
        return String.fromCharCode(...$dataArray).replace(/\0+$/, "");
    }

    public static getMediaDirectory(): string {
        const $userId = Math.floor(C.getuid() / 100000);
        const $path = `/storage/emulated/${$userId}/Android/media/${this.getPackageName()}/`;
        if (!FileSystem.Directory.exists($path)) {
            C.mkdir($path.ptr());
        }
        return $path;
    }
}