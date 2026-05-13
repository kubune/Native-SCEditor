import GameLibrary from "./library";
import Logger from "./logger";
import BakePrototypes from "./prototypes";
import TouchTracker from "./UserInterface/touch";
import SCEditor from "./UserInterface/ui";

import GoToLimboState from "./Patches/gameflow";
import PatchNetworking from "./Patches/networking";
import SyncMediaDirectory from "./Patches/fileSyncer";

import Assets from "./assets";

const library = GameLibrary.getInstance();
const base = library.loadLibrary();
BakePrototypes();

const assets = new Assets();
assets.init();

PatchNetworking();
GoToLimboState();
SyncMediaDirectory();
//RemoveClickSound();

const logger = Logger.getInstance().withContext("Main");
logger.debug(`found base at @${base}`);

let sceditor: any = null;

Interceptor.attach(base.add(0x915324), { // LoadingScreen constuctor
    // here we start to actually load our "sc-editor"
    onEnter(args) {
        sceditor = new SCEditor();
        sceditor.init();
    }
});

const tracker = new TouchTracker();

Interceptor.attach(base.add(0xD606D0), { // InputTouches::moveTouch
    onEnter(args) {
        const id = args[0].toInt32();
        const x = args[1].toInt32();
        const y = args[2].toInt32();

        if (sceditor.selectedClip != null && sceditor != null)
            tracker.handleTouch(id, x, y, sceditor.selectedClip);
    }
});