import GameLibrary from "../library"
import Logger from "../logger";

export default () => {
    const logger = Logger.getInstance().withContext("LIMBO");
    const base = GameLibrary.getInstance().getLibrary();
    logger.debug("Initializing limbo state...")
    Interceptor.replace(base.add(0x915D38), new NativeCallback(function() {}, 'void', [])) // LoadingScreen::enter
    // now the game ui won't be loaded

    logger.debug("Limbo state initialized!")
}