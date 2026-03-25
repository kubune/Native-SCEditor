import C from "../c";
import { Stage } from "../Classes/titan";
import GameLibrary from "../library";
import Logger from "../logger";
import MovieClip from "../SupercellSWF/movieclip";
import Rect from "../SupercellSWF/rect";
import SupercellSWF from "../SupercellSWF/swf";
import TimelineSliderTask from "../Update/timeline";
import FileSystem from "./file";
import ScFileScanner from "./file";

GameLibrary.getInstance().ensureLoadedLibrary();
const base = GameLibrary.getInstance().getLibrary();
const GameMain_loadAsset = new NativeFunction(base.add(0x49E11C), 'pointer', ['pointer', 'int']);
const ResourceManager_getMovieClip = new NativeFunction(base.add(0x9233E8), 'pointer', ['pointer', 'pointer', 'int']);
const MovieClip_getTextFieldByName = new NativeFunction(base.add(0xBA7D00), 'pointer', ['pointer', 'pointer']);
const TextField_setText = new NativeFunction(base.add(0xBD5470), 'pointer', ['pointer', 'pointer']);
const MovieClip_getMovieClipByName = new NativeFunction(base.add(0xBA7AA0), 'pointer', ['pointer', 'pointer']);
const GameButton = new NativeFunction(base.add(0x57A84C), 'pointer', ['pointer']);
const getMC = new NativeFunction(base.add(0xB79B3C), 'pointer', ['pointer', 'pointer']);
const MovieClip_gotoAndStopFrameIndex = new NativeFunction(base.add(0xBA6E6C), 'pointer', ['pointer', 'int']);

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

    private scFiles = ['background_basic.sc', 'background_brawlentines25.sc', 'background_dragonsandfairies.sc', 'background_najia.sc', 'background_sandoftime.sc', 'background_sirius.sc', 'brawl_pass.sc', 'buddy.sc', 'buddy_shop.sc', 'characters.sc', 'daily_wins.sc', 'debug.sc', 'effects.sc', 'effects_brawler.sc', 'effects_brawler2.sc', 'effects_brawler_8bit.sc', 'effects_brawler_alli.sc', 'effects_brawler_amber.sc', 'effects_brawler_angelo.sc', 'effects_brawler_ash.sc', 'effects_brawler_barley.sc', 'effects_brawler_bea.sc', 'effects_brawler_belle.sc', 'effects_brawler_berry.sc', 'effects_brawler_bibi.sc', 'effects_brawler_bo.sc', 'effects_brawler_bonnie.sc', 'effects_brawler_brock.sc', 'effects_brawler_bull.sc', 'effects_brawler_buster.sc', 'effects_brawler_buzz.sc', 'effects_brawler_byron.sc', 'effects_brawler_carl.sc', 'effects_brawler_charlie.sc', 'effects_brawler_chester.sc', 'effects_brawler_chuck.sc', 'effects_brawler_clancy.sc', 'effects_brawler_colette.sc', 'effects_brawler_colt.sc', 'effects_brawler_cordelius.sc', 'effects_brawler_crow.sc', 'effects_brawler_darryl.sc', 'effects_brawler_doug.sc', 'effects_brawler_draco.sc', 'effects_brawler_dynamike.sc', 'effects_brawler_edgar.sc', 'effects_brawler_elprimo.sc', 'effects_brawler_emz.sc', 'effects_brawler_eve.sc', 'effects_brawler_fang.sc', 'effects_brawler_finx.sc', 'effects_brawler_frank.sc', 'effects_brawler_gale.sc', 'effects_brawler_gen.sc', 'effects_brawler_gene.sc', 'effects_brawler_gigi.sc', 'effects_brawler_glowbert.sc', 'effects_brawler_gray.sc', 'effects_brawler_griff.sc', 'effects_brawler_grom.sc', 'effects_brawler_gus.sc', 'effects_brawler_hank.sc', 'effects_brawler_jacky.sc', 'effects_brawler_jaeyong.sc', 'effects_brawler_janet.sc', 'effects_brawler_jessie.sc', 'effects_brawler_juju.sc', 'effects_brawler_kaze.sc', 'effects_brawler_kenji.sc', 'effects_brawler_kit.sc', 'effects_brawler_larrylawrie.sc', 'effects_brawler_leon.sc', 'effects_brawler_lily.sc', 'effects_brawler_lola.sc', 'effects_brawler_lou.sc', 'effects_brawler_lumi.sc', 'effects_brawler_maisie.sc', 'effects_brawler_mandy.sc', 'effects_brawler_max.sc', 'effects_brawler_meeple.sc', 'effects_brawler_meg.sc', 'effects_brawler_melodie.sc', 'effects_brawler_mico.sc', 'effects_brawler_mina.sc', 'effects_brawler_moe.sc', 'effects_brawler_mortis.sc', 'effects_brawler_mrp.sc', 'effects_brawler_najia.sc', 'effects_brawler_nani.sc', 'effects_brawler_nita.sc', 'effects_brawler_ollie.sc', 'effects_brawler_otis.sc', 'effects_brawler_pam.sc', 'effects_brawler_pearl.sc', 'effects_brawler_penny.sc', 'effects_brawler_pierce.sc', 'effects_brawler_piper.sc', 'effects_brawler_poco.sc', 'effects_brawler_rico.sc', 'effects_brawler_rosa.sc', 'effects_brawler_rt.sc', 'effects_brawler_ruffs.sc', 'effects_brawler_sam.sc', 'effects_brawler_sandy.sc', 'effects_brawler_shade.sc', 'effects_brawler_shelly.sc', 'effects_brawler_sirius.sc', 'effects_brawler_spike.sc', 'effects_brawler_sprout.sc', 'effects_brawler_squeak.sc', 'effects_brawler_stu.sc', 'effects_brawler_surge.sc', 'effects_brawler_tara.sc', 'effects_brawler_tick.sc', 'effects_brawler_trunk.sc', 'effects_brawler_willow.sc', 'effects_brawler_ziggy.sc', 'emoji_1.sc', 'emoji_2.sc', 'emoji_65.sc', 'emoji_66.sc', 'events.sc', 'gacha.sc', 'hero_portraits.sc', 'level.sc', 'loading.sc', 'loading_brawlentine26.sc', 'loading_buffies.sc', 'loading_dragonsandfairies.sc', 'loading_glowbert.sc', 'loading_mecha.sc', 'loading_naija.sc', 'loading_sirius.sc', 'loading_steampunk.sc', 'main.py', 'player_icons.sc', 'player_icons_1.sc', 'player_icons_66.sc', 'prestige.sc', 'profile.sc', 'quests.sc', 'sprays_1.sc', 'sprays_66.sc', 'start.bat', 'supercell_id.sc', 'trophy_world_1.sc', 'trophy_world_2.sc', 'trophy_world_3.sc', 'trophy_world_4.sc', 'trophy_world_5.sc', 'trophy_world_6.sc', 'trophy_world_common.sc', 'trophy_world_future.sc', 'trophy_world_minimap.sc', 'ui.sc', 'ui_achievements.sc', 'ui_brawler_event.sc', 'ui_roguelite.sc', 'sce_ui.sc', 'collab_monkeygod.sc'];
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
        this.loadUI();
        this.createCoreButtons();
        this.attachHook();
        this.showDebug();
    }

    private loadUI() {
        GameMain_loadAsset("sc/sce_ui.sc".scptr(), 0);
        this.selectedFile = SupercellSWF.getSWF(this.selectedSCFile);

        this.background = ResourceManager_getMovieClip("sc/sce_ui.sc".ptr(), "bgr_sce".ptr(), 0);
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
            MovieClip_getMovieClipByName(top, name.ptr()).add(8).writeInt(0);
        });
    }

    private createCoreButtons() {
        const top = this.getTopMC();

        this.buttons.set("load", this.createButton(
            MovieClip_getMovieClipByName(top, "button_load".ptr()),
            500
        ));

        this.buttons.set("exit", this.createButton(
            MovieClip_getMovieClipByName(top, "button_exit".ptr()),
            500
        ));

        this.buttons.set("exports", this.createButton(
            MovieClip_getMovieClipByName(top, "button_exports".ptr()),
            500
        ));

        const miscMC = MovieClip_getMovieClipByName(top, "button_misc".ptr());
        const tf = MovieClip_getTextFieldByName(miscMC, "txt_misc".ptr());
        TextField_setText(tf, "SCEditor Menu".scptr());

        this.buttons.set("misc", this.createButton(miscMC, 500, 0));
    }

    private createButton(mc: NativePointer, x: number, y: number = 0): NativePointer {
        const mem = C.malloc(0x350);
        GameButton(mem);

        new NativeFunction(mem.readPointer().add(360).readPointer(), 'void', ['pointer', 'pointer', 'int'])(mem, mc, 1);

        mem.add(32).writeFloat(x);
        mem.add(36).writeFloat(y);

        Stage.addChild(mem);
        return mem;
    }

    private getTopMC(): NativePointer {
        return getMC("sc/sce_ui.sc".ptr(), "catalogue_screen_header".ptr());
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
        const mc = MovieClip_getMovieClipByName(this.getTopMC(), "button_misc".ptr());
        const tf = MovieClip_getTextFieldByName(mc, "txt_misc".ptr());

        TextField_setText(tf, label.scptr());

        return this.createButton(mc, 500, y);
    }

    private showDebug() {
        if (this.debugTextField != null) {
            Stage.removeChild(this.debugTextField);
            this.debugTextField = null;
        }
        const mc = MovieClip_getMovieClipByName(this.getTopMC(), "button_misc".ptr());
        const tf = MovieClip_getTextFieldByName(mc, "txt_misc".ptr());
        let movieClipName;
        if (this.selectedClip != null) {
            movieClipName = this.selectedClip.add(96).readPointer().readUtf8String();
            if (movieClipName == null) {
                movieClipName = "null";
            }
        }
        const text = [
            `Selected File: sc/${this.selectedSCFile.replace("sc/", "")}`,
            `Selected MovieClip: ${movieClipName}\n`,
            `Frames: ${MovieClip.getTotalFrames(this.selectedClip)}\n`,
            `Export Names: ${this.selectedFile.getExportNameCount()}`,
            `TextFields: ${this.selectedFile.getTextFieldCount()}`,
            `Textures: ${this.selectedFile.getBitmapCount()}`,
            `MovieClips: ${this.selectedFile.getMovieClipCount()}`,
            `Shapes: ${this.selectedFile.getShapesCount()}`
        ].join("\n");

        TextField_setText(tf, text.scptr());

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
                    if (this.exportNamesTextField != null && this.exportNamesTextField.length > 0) {
                        for (let i = 0; i < this.exportNamesTextField.length; i ++) {
                            Stage.removeChild(this.exportNamesTextField[i]);
                        }
                        this.exportNamesTextField = null;
                        if (this.exportButtons.length > 0) {
                            for (let i = 0; i < this.exportButtons.length; i++) {
                                Stage.removeChild(this.exportButtons[i]);
                            }
                            this.exportButtons = [];
                        }
                        return;
                    }

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
                        const playback_button = MovieClip_getMovieClipByName(this.timelineClip, "playback_button".ptr());
                        MovieClip_gotoAndStopFrameIndex(playback_button, this.timelineIsPlaying ? 0 : 1);
                        this.playbackBtnClip = playback_button;
                        const bg = MovieClip_getMovieClipByName(this.timelineClip, "bg".ptr());
                        bg.add(32).writeFloat(550);
                        bg.add(36).writeFloat(450);

                        const slider_replay_bar_button = MovieClip_getMovieClipByName(this.timelineClip, "slider_replay_bar_button".ptr());
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

                            if (MovieClip.getCurrentFrame(this.selectedClip) == 0) {
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
                            const moveBy = delta / MovieClip.getTotalFrames(this.selectedClip);

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
                    MovieClip_gotoAndStopFrameIndex(this.playbackBtnClip, this.timelineIsPlaying ? 0 : 1);
                    if (this.timelineIsPlaying) {
                        MovieClip.play(movieClip)
                    } else {
                        MovieClip.pause(movieClip);
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
                        GameMain_loadAsset(name.scptr(), 0);
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


                /*if (this.miscButtons.length > 0 &&
                    clicked.equals(this.miscButtons[0])) {
                    if (this.state && this.debugTextField) {
                        Stage.removeChild(this.debugTextField);
                        this.debugTextField = null;
                        return;
                    }

                    this.showDebug();
                }*/
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

        // Create labels
        for (let i = 0; i < 20; i++) {
            const mc = MovieClip_getMovieClipByName(this.getTopMC(), "button_misc".ptr());
            const tf = MovieClip_getTextFieldByName(mc, "txt_misc".ptr());

            TextField_setText(tf, (text[i] ?? "").scptr());

            tf.add(118).writeInt(16);
            tf.add(144).writeInt(18);
            tf.add(32).writeFloat(110);
            tf.add(36).writeFloat(100 + 22.5 * i);

            Stage.addChild(tf);
            this.exportNamesTextField.push(tf);
        }

        // Create buttons + map them
        for (let i = start; i < Math.min(start + 20, exportNameCount); i++) {
            const button = MovieClip_getMovieClipByName(this.getTopMC(), "button_load".ptr());
            const btnTf = MovieClip_getTextFieldByName(button, "txt_load".ptr());

            TextField_setText(btnTf, "".scptr());
            button.add(16).writeFloat(0.5);
            button.add(28).writeFloat(0.5);

            const btn = this.createButton(button, 385, 80 + (i - start) * 20.5);

            this.exportButtons.push(btn);
            this.buttonMap.set(btn.toInt32(), i); // store index
        }

        // Attach interceptor ONCE
        if (!this.interceptorAttached) {
            this.interceptorAttached = true;

            Interceptor.attach(base.add(0xBD8AF8), {
                onEnter: (args) => {
                    const btnPtr = args[0].toInt32();
                    const index = this.buttonMap.get(btnPtr);

                    if (index === undefined) return;

                    const uisc = this.selectedFile;
                    const clip = ResourceManager_getMovieClip(
                        `sc/${this.selectedSCFile.replace("sc/", "")}`.ptr(),
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

                    // Scale + position
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