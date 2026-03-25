import ServerConnection from "../Classes/networking";
import Logger from "../logger";

export default function PatchNetworking() {
    const logger = Logger.getInstance().withContext("Patch");
    logger.debug("Trying to patch networking...")
    Interceptor.replace(ServerConnection.update(), new NativeCallback(function() {}, "void", []));
    logger.debug("Networking patched!")
}