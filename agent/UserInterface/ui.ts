import Assets from "../assets";
import C from "../c";
import { MovieClip, TextField } from "../Classes/flash";
import { GameMain } from "../Classes/GameMain";
import { ResourceManager, Stage } from "../Classes/titan";
import GameLibrary from "../library";
import Logger from "../logger";
import MovieClipNativeHelper from "../SupercellSWF/movieclip";
import SupercellSWF from "../SupercellSWF/swf";
import TimelineSliderTask from "../Update/timeline";

GameLibrary.getInstance().ensureLoadedLibrary();
const base = GameLibrary.getInstance().getLibrary();
const GameButton = new NativeFunction(base.add(0x57A84C), 'pointer', ['pointer']);

// fallback getMovieClip function...
const getMC = new NativeFunction(base.add(0xB79B3C), 'pointer', ['pointer', 'pointer']); 

export default class SCEditor {
    private base: NativePointer;
    private logger = Logger.getInstance().withContext("SCEditor");
    private loaderLogger = Logger.getInstance().withContext("Loader");
    private state = false;
    private debugTextField: NativePointer | null = null;
    private exportNamesTextField: NativePointer[] | null = null;

    private buttons = new Map<string, NativePointer>();
    private miscButtons: NativePointer[] = [];

    private selectedFile: SupercellSWF = SupercellSWF.getSWF("");

    private hookAttached = false;
    private background: any;

    public selectedClip: any;

    private selectedSCFile: string = "sc/sce_ui.sc";

    private exportButtons: NativePointer[] = [];

    private scFiles = ['sce_ui.sc'];
    private page: number = 0;

    private timelineEnabled: boolean = false;
    private timelineClip: NativePointer | null = null;
    private timelineIsPlaying: boolean = true;
    private playbackBtn: NativePointer | null = null;
    private playbackBtnClip: NativePointer = ptr(0);
    private timelineSlider: NativePointer = ptr(0);

    private readonly timelineSliderMinX = 375;
    private readonly timelineSliderMaxX = 867.5;
    constructor() {
        this.base = GameLibrary.getInstance().getLibrary();
    }

    init() {
        this.preInit();
        this.loadUI();
        this.createCoreButtons();
        this.attachHook();
        this.showDebug();
    }

    preInit() {
        if (Assets.scFiles.length > 0) {
            this.scFiles = Assets.scFiles;
        }
    }

    private loadUI() {
        GameMain.loadAsset("sc/sce_ui.sc"); // assume the asset for the ui is here. maybe download it later?
        this.selectedFile = SupercellSWF.getSWF(this.selectedSCFile);

        this.background = ResourceManager.getMovieClip("sc/sce_ui.sc", "bgr_sce", 0);
        this.background.add(32).writeFloat(-150);
        this.background.add(36).writeFloat(-150);
        this.background.add(16).writeFloat(3);
        this.background.add(28).writeFloat(3);
        Stage.addChild(this.background);

        const top = this.getTopMC();
        top.add(32).writeFloat(500);
        Stage.addChild(top);

        this.disableOriginalButtons(top);
    }

    private disableOriginalButtons(top: NativePointer) {
        ["button_load", "button_exit", "button_misc", "button_exports"].forEach(name => {
            MovieClip.getMovieClipByName(top, name.ptr()).add(8).writeInt(0); // hide 
        });
    }

    private createCoreButtons() {
        const top = this.getTopMC();

        this.buttons.set("load", this.createButton(
            MovieClip.getMovieClipByName(top, "button_load".ptr()),
            500
        ));

        this.buttons.set("exit", this.createButton(
            MovieClip.getMovieClipByName(top, "button_exit".ptr()),
            500
        ));

        this.buttons.set("exports", this.createButton(
            MovieClip.getMovieClipByName(top, "button_exports".ptr()),
            500
        ));

        const miscMC = MovieClip.getMovieClipByName(top, "button_misc".ptr());
        const tf = MovieClip.getTextFieldByName(miscMC, "txt_misc".ptr());
        TextField.setText(tf, "SCEditor Menu".scptr());

        this.buttons.set("misc", this.createButton(miscMC, 500, 0));
    }

    private createButton(mc: NativePointer, x: number, y: number = 0): NativePointer {
        const mem = C.malloc(0x350);
        GameButton(mem);

        // damn they finally updated the GameButton class vtable!
        new NativeFunction(mem.readPointer().add(360).readPointer(), 'void', ['pointer', 'pointer', 'int'])(mem, mc, 1);

        mem.add(32).writeFloat(x);
        mem.add(36).writeFloat(y);

        Stage.addChild(mem);
        return mem;
    }

    private getTopMC(): NativePointer {
        return getMC("sc/sce_ui.sc".ptr(), "sceditor_top".ptr());
    }

    private getBottomMC(): NativePointer {
        return getMC("sc/sce_ui.sc".ptr(), "sceditor_bottom".ptr());
    }

    private toggleMisc() {
        this.state = !this.state;

        if (this.state) {
            for (let i = 1; i <= 7; i++) {
                switch (i) {
                    case 3:
                        let mc_btn = this.createMiscButton("MovieClip Test", 50 * i);
                        this.miscButtons.push(mc_btn);
                        break;
                    case 4:
                        let swtich = this.createMiscButton("Switch File", 50 * i);
                        this.miscButtons.push(swtich);
                        break;
                    case 5:
                        let next_page = this.createMiscButton("Next Page", 50 * i);
                        this.miscButtons.push(next_page);
                        break;
                    case 6:
                        let prev_page = this.createMiscButton("Prev Page", 50 * i);
                        this.miscButtons.push(prev_page);
                        break;
                    case 1:
                        let timeline = this.createMiscButton("Timeline", 50 * i);
                        this.miscButtons.push(timeline);
                        break;
                    default:
                        this.miscButtons.push(this.createMiscButton(`Button ${i}`, 50 * i));;
                }
            }
        } else {
            this.miscButtons.forEach(btn => Stage.removeChild(btn));
            this.miscButtons = [];
        }
    }

    private createMiscButton(label: string, y: number): NativePointer {
        const mc = MovieClip.getMovieClipByName(this.getTopMC(), "button_misc".ptr());
        const tf = MovieClip.getTextFieldByName(mc, "txt_misc".ptr());

        TextField.setText(tf, label.scptr());

        return this.createButton(mc, 500, y);
    }

    private showDebug() {
        if (this.debugTextField != null) {
            Stage.removeChild(this.debugTextField);
            this.debugTextField = null;
        }
        const mc = MovieClip.getMovieClipByName(this.getTopMC(), "button_misc".ptr());
        const tf = MovieClip.getTextFieldByName(mc, "txt_misc".ptr());
        let movieClipName;
        if (this.selectedClip != null) {
            movieClipName = this.selectedClip.add(96).readPointer().readUtf8String();
            if (movieClipName == null) {
                movieClipName = "null";
            }
        }
        const text = [
            `Selected File: sc/${this.selectedSCFile.replace("sc/", "")}`,
            `Selected MovieClip: ${movieClipName}`,
            `Frames: ${MovieClipNativeHelper.getTotalFrames(this.selectedClip)}\n`,
            `Export Names: ${this.selectedFile.getExportNameCount()}`,
            `TextFields: ${this.selectedFile.getTextFieldCount()}`,
            `Textures: ${this.selectedFile.getBitmapCount()}`,
            `MovieClips: ${this.selectedFile.getMovieClipCount()}`,
            `Shapes: ${this.selectedFile.getShapesCount()}`
        ].join("\n");

        TextField.setText(tf, text.scptr());

        tf.add(118).writeInt(17);
        tf.add(144).writeInt(14);
        tf.add(32).writeFloat(900);
        tf.add(36).writeFloat(490);

        Stage.addChild(tf);
        this.debugTextField = tf;
    }

    private attachHook() {
        if (this.hookAttached) return;
        this.hookAttached = true;

        Interceptor.attach(this.base.add(0xBD8AF8), { // CustomButton::buttonClicked
            onEnter: (args) => {
                const clicked = args[0];

                if (this.isClicked("load", clicked)) {
                    this.loaderLogger.debug(this.selectedFile.getExportNames());
                }

                if (this.isClicked("exit", clicked)) {
                    new NativeFunction(Module.getGlobalExportByName("exit"), 'void', ['int'])(0);
                }

                if (this.isClicked("misc", clicked)) {
                    this.toggleMisc();
                }
                
                if (this.miscButtons.length > 0 &&
                    clicked.equals(this.miscButtons[4])
                ) {
                    this.page++;
                    this.showExportNames();
                }

                if (this.miscButtons.length > 0 &&
                    clicked.equals(this.miscButtons[5])
                ) {
                    if (this.page > 0) this.page--;
                    this.showExportNames();
                }
                
                if (this.miscButtons.length > 0 &&
                    clicked.equals(this.miscButtons[0])
                ) {
                    if (this.timelineClip != null && this.timelineEnabled) {
                        Stage.removeChild(this.timelineClip);
                        this.timelineClip = null;
                    }
                    this.timelineEnabled = !this.timelineEnabled;
                    this.timelineClip = this.getBottomMC();
                    if (this.timelineEnabled) {
                        const playback_button = MovieClip.getMovieClipByName(this.timelineClip, "playback_button".ptr());
                        MovieClip.gotoAndStopFrameIndex(playback_button, this.timelineIsPlaying ? 0 : 1);
                        this.playbackBtnClip = playback_button;
                        const bg = MovieClip.getMovieClipByName(this.timelineClip, "bg".ptr());
                        bg.add(32).writeFloat(550);
                        bg.add(36).writeFloat(450);

                        const slider_replay_bar_button = MovieClip.getMovieClipByName(this.timelineClip, "slider_replay_bar_button".ptr());
                        slider_replay_bar_button.add(32).writeFloat(this.timelineSliderMinX);
                        slider_replay_bar_button.add(36).writeFloat(550);
                        
                        Stage.addChild(bg);
                        Stage.addChild(slider_replay_bar_button);

                        const btn = this.createButton(playback_button, 550, 450);
                        this.playbackBtn = btn;
                        this.timelineSlider = slider_replay_bar_button;
                        const timelinesliderTask = new TimelineSliderTask();
                        timelinesliderTask.setFunction(() => {
                            if (!this.timelineIsPlaying) return;

                            let x = this.timelineSlider.add(32).readFloat();

                            if (MovieClipNativeHelper.getCurrentFrame(this.selectedClip) == 0) {
                                x = this.timelineSliderMinX;
                            }

                            if (x < this.timelineSliderMinX) {
                                this.timelineSlider.add(32).writeFloat(this.timelineSliderMinX);
                                x = this.timelineSliderMinX;
                            }

                            if (x > this.timelineSliderMaxX) {
                                this.timelineSlider.add(32).writeFloat(this.timelineSliderMaxX);
                                x = this.timelineSliderMaxX;
                            }

                            const delta = this.timelineSliderMaxX - this.timelineSliderMinX;
                            const moveBy = delta / MovieClipNativeHelper.getTotalFrames(this.selectedClip);

                            x += moveBy;
                            this.timelineSlider.add(32).writeFloat(x);
                        });
                        timelinesliderTask.startTask();
                    }
                }
                if (this.playbackBtn != null && clicked.equals(this.playbackBtn) && this.timelineEnabled && this.selectedClip != null ) {
                    console.log("playback button clicked");
                    let movieClip = this.selectedClip;
                    this.timelineIsPlaying = !this.timelineIsPlaying;
                    MovieClip.gotoAndStopFrameIndex(this.playbackBtnClip, this.timelineIsPlaying ? 0 : 1);
                    if (this.timelineIsPlaying) {
                        MovieClipNativeHelper.play(movieClip)
                    } else {
                        MovieClipNativeHelper.pause(movieClip);
                    }
                }

                if (this.miscButtons.length > 0 &&
                    clicked.equals(this.miscButtons[2])
                ) {
                    // ADDING MOVIECLIP TO STAGE BY ID
                    const logger = Logger.getInstance().withContext("MOVIECLIP TEST");

                    const swf = this.selectedFile.getSWF();
                    const arr = swf.add(176).readPointer() // 80

                    for (let i = 0; i < this.selectedFile.getMovieClipCount(); i++) {
                        const element = arr.add(80 * i); // MovieClipOriginal

                        const id = element.add(48).readU16();
                        const framerate = element.add(56).readU8();
                        const instance_count = element.add(52).readU16();

                        const children_array1 = element.add(16).readPointer();

                        for (let j = 0; j < instance_count; j++) { // todo: fix
                            const child_id = children_array1.add(2 * j).readU16();
                            logger.debug(`ID: ${id}, Child ID: ${child_id}`);
                        }
                        
                        const children_array2 = element.add(32).readPointer();
                        try {
                            for (let j = 0; j < instance_count; j++) {
                                const child_name = children_array2.add(8 * j).readPointer().readUtf8String();

                                logger.debug(`ID: ${id}, Child Name: ${child_name}`);
                            }
                        } catch (e) {
                            
                        }
                        logger.debug(`ID: ${id}, Framerate: ${framerate}`);
                        if (id == 8) {
                            const x_mc = element;
                            const MovieClip = new NativeFunction(base.add(0xBA4400), 'pointer', ['pointer', 'pointer', 'int'])
                            (x_mc, this.selectedFile.getSWF(), 0); // MovieClip::createMovieClip

                            // atp we have the movieclip yay!

                            MovieClip.add(32).writeFloat(200); // x
                            MovieClip.add(36).writeFloat(200) // y
                            Stage.addChild(MovieClip);
                        }
                    }
                }

                if (this.miscButtons.length > 0 && clicked.equals(this.miscButtons[3])) {
                    const index = this.scFiles.indexOf(this.selectedSCFile);
                    const nextIndex = (index + 1) % this.scFiles.length;

                    const name = "sc/" + this.scFiles[nextIndex];
                    try {
                        GameMain.loadAsset(name);
                    } catch (e) {
                        
                    }
                    try {
                        this.selectedFile = SupercellSWF.getSWF(name);
                        this.selectedSCFile = this.scFiles[nextIndex];
                    } catch (e) {
                        this.selectedFile = SupercellSWF.getSWF(this.scFiles[0]);
                        this.selectedSCFile = this.scFiles[0];
                    }
                    this.showDebug();
                    if (this.exportNamesTextField != null) {
                        this.showExportNames();
                    }
                    this.page = 0;
                }

                if (this.isClicked("exports", clicked)) {
                    if (this.exportNamesTextField) {
                        if (this.exportNamesTextField.length > 0) {
                            for (let i = 0; i < this.exportNamesTextField.length; i++) {
                                Stage.removeChild(this.exportNamesTextField[i]);
                            }
                        }
                        this.exportNamesTextField = null;
                        if (this.exportButtons.length > 0) {
                            for (let i = 0; i < this.exportButtons.length; i++) {
                                Stage.removeChild(this.exportButtons[i]);
                            }
                            this.exportButtons = [];
                        }
                        if (this.selectedClip != null) {
                            Stage.removeChild(this.selectedClip);
                        }
                        return;
                    }

                    this.showExportNames();
                }
            }
        });
    }

    private buttonMap = new Map<number, number>();
    private interceptorAttached = false;

    private showExportNames() {
        // Cleanup UI
        this.exportButtons.forEach(btn => Stage.removeChild(btn));
        this.exportButtons = [];

        if (this.exportNamesTextField == null) this.exportNamesTextField = [];
        this.exportNamesTextField.forEach(tf => Stage.removeChild(tf));
        this.exportNamesTextField = [];

        const start = this.page * 20;
        const text = this.selectedFile.getExportNames().slice(start, start + 20);
        const exportNameCount = this.selectedFile.getExportNameCount();

        this.logger.debug(text);

        // create labels for export names
        for (let i = 0; i < 20; i++) {
            const mc = MovieClip.getMovieClipByName(this.getTopMC(), "button_misc".ptr());
            const tf = MovieClip.getTextFieldByName(mc, "txt_misc".ptr());

            TextField.setText(tf, (text[i] ?? "").scptr());

            tf.add(118).writeInt(16);
            tf.add(144).writeInt(18);
            tf.add(32).writeFloat(110);
            tf.add(36).writeFloat(100 + 22.5 * i);

            Stage.addChild(tf);
            this.exportNamesTextField.push(tf);
        }

        // map and create btns
        for (let i = start; i < Math.min(start + 20, exportNameCount); i++) {
            const button = MovieClip.getMovieClipByName(this.getTopMC(), "button_load".ptr());
            const btnTf = MovieClip.getTextFieldByName(button, "txt_load".ptr());

            TextField.setText(btnTf, "".scptr());
            button.add(16).writeFloat(0.5);
            button.add(28).writeFloat(0.5);

            const btn = this.createButton(button, 385, 77.5 + (i - start) * 22.5);

            this.exportButtons.push(btn);
            this.buttonMap.set(btn.toInt32(), i); // store index
        }

        if (!this.interceptorAttached) {
            this.interceptorAttached = true;

            Interceptor.attach(base.add(0xBD8AF8), {
                onEnter: (args) => {
                    const btnPtr = args[0].toInt32();
                    const index = this.buttonMap.get(btnPtr);

                    if (index === undefined) return;

                    const uisc = this.selectedFile;
                    const clip = ResourceManager.getMovieClip(
                        `sc/${this.selectedSCFile.replace("sc/", "")}`,
                        uisc.getExportNameAt(index),
                        0
                    );

                    if (this.selectedClip) {
                        new NativeFunction(base.add(0xBB75EC), 'pointer', ['pointer', 'pointer'])(
                            this.background,
                            this.selectedClip
                        );
                    }

                    new NativeFunction(base.add(0xBB7314), "pointer", ["pointer", "pointer"])(
                        this.background,
                        clip
                    );

                    clip.add(16).writeFloat(clip.add(16).readFloat() * 0.33);
                    clip.add(28).writeFloat(clip.add(28).readFloat() * 0.33);
                    clip.add(32).writeFloat(clip.add(32).readFloat() + 200);
                    clip.add(36).writeFloat(clip.add(36).readFloat() + 150);

                    this.selectedClip = clip;

                    const exportName = clip.add(96).readPointer().readUtf8String();
                    const childrenArray = clip.add(120).readPointer();
                    const childrenCount = clip.add(160).readU16();

                    const log = Logger.getInstance().withContext("CHILDS");

                    for (let j = 0; j < childrenCount; j++) {
                        try {
                            const childName = childrenArray.add(8 * j).readPointer().readUtf8String();
                            log.debug(`${exportName}: ${childName}`);
                        } catch {
                            log.debug(`${exportName}: null`);
                        }
                    }

                    if (this.debugTextField) {
                        Stage.removeChild(this.debugTextField);
                        this.debugTextField = null;
                    }

                    this.showDebug();
                }
            });
        }
    }

    private isClicked(name: string, ptr: NativePointer): boolean {
        const btn = this.buttons.get(name);
        return !!btn && ptr.equals(btn);
    }
}