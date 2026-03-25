import GameLibrary from "../library"
import Logger from "../logger";

export default function GoToLimboState() {
    const logger = Logger.getInstance().withContext("LIMBO");
    const base = GameLibrary.getInstance().getLibrary();
    logger.debug("Initializing limbo state...")
    Interceptor.replace(base.add(0x9177CC), new NativeCallback(function() {}, 'void', [])) // LoadingScreen::enter
    /*
    now the game ui won't be loaded,
    nor any files like csv files sc files,
    no server connection as there's no handler for
    that when we won't go past that point
    */

    logger.debug("Limbo state initialized!")
}