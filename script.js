// agent/library.ts
var GameLibrary = class _GameLibrary {
  static INSTANCE;
  static base;
  constructor() {
    _GameLibrary.INSTANCE = this;
  }
  static getInstance() {
    if (!_GameLibrary.INSTANCE) {
      _GameLibrary.INSTANCE = new _GameLibrary();
    }
    return _GameLibrary.INSTANCE;
  }
  loadLibrary() {
    while (true) {
      try {
        _GameLibrary.base = Process.getModuleByName("libg.so").base;
        break;
      } catch (e) {
        continue;
      }
    }
    return _GameLibrary.base;
  }
  getLibrary() {
    return _GameLibrary.base;
  }
  ensureLoadedLibrary() {
    if (!_GameLibrary.base) {
      this.loadLibrary();
    }
  }
};

// agent/configuration.ts
var Configuration = class {
  static DEBUG_LOGGING = true;
};

// agent/logger.ts
var Logger = class _Logger {
  static INSTANCE;
  context;
  constructor(context) {
    this.context = context;
  }
  static getInstance() {
    if (!_Logger.INSTANCE) {
      _Logger.INSTANCE = new _Logger();
    }
    return _Logger.INSTANCE;
  }
  withContext(context) {
    return new _Logger(context);
  }
  debug(...args) {
    if (Configuration.DEBUG_LOGGING) {
      if (this.context) {
        console.log(`[DEBUG] [${this.context}]:`, ...args);
      } else {
        console.log(`[DEBUG]:`, ...args);
      }
    }
  }
};

// agent/Patches/clicks.ts
function RemoveClickSound() {
  const base4 = GameLibrary.getInstance().getLibrary();
  Memory.patchCode(base4.add(5746084), Process.pageSize, (code) => {
    const writer = new Arm64Writer(code, { pc: base4.add(5746084) });
    writer.putNop();
    writer.flush();
  });
}

// agent/Patches/gameflow.ts
function GoToLimboState() {
  const logger2 = Logger.getInstance().withContext("LIMBO");
  const base4 = GameLibrary.getInstance().getLibrary();
  logger2.debug("Initializing limbo state...");
  Interceptor.replace(base4.add(9533388), new NativeCallback(function() {
  }, "void", []));
  logger2.debug("Limbo state initialized!");
}

// agent/base.ts
var BaseClass = class {
  constructor() {
  }
  add(offset) {
    const instance = GameLibrary.getInstance();
    const library2 = instance.getLibrary();
    return library2.add(offset);
  }
  static add(offset) {
    const instance = GameLibrary.getInstance();
    const library2 = instance.getLibrary();
    return library2.add(offset);
  }
};

// agent/Classes/networking.ts
var ServerConnection = class extends BaseClass {
  constructor() {
    super();
  }
  static update() {
    return this.add(7856788);
  }
};

// agent/Patches/networking.ts
function PatchNetworking() {
  const logger2 = Logger.getInstance().withContext("Patch");
  logger2.debug("Trying to patch networking...");
  Interceptor.replace(ServerConnection.update(), new NativeCallback(function() {
  }, "void", []));
  logger2.debug("Networking patched!");
}

// agent/c.ts
var C = class {
  static free(ptr2) {
    new NativeFunction(this.getExport("free"), "void", ["pointer"])(ptr2);
  }
  static getExport(name) {
    return Module.getGlobalExportByName(name);
  }
  static malloc(size) {
    return new NativeFunction(this.getExport("malloc"), "pointer", ["int"])(size);
  }
  static getaddrinfo() {
    return new NativeFunction(this.getExport("getaddrinfo"), "int", ["pointer", "pointer", "pointer", "pointer"]);
  }
  static stat(path, buf) {
    return new NativeFunction(Module.getGlobalExportByName("stat"), "int", ["pointer", "pointer"])(path, buf);
  }
  static access(path, mode) {
    return new NativeFunction(Module.getGlobalExportByName("access"), "int", ["pointer", "int"])(path, mode);
  }
};

// agent/Classes/titan.ts
var StringObject = class _StringObject extends BaseClass {
  string;
  memory;
  constructor(string) {
    super();
    this.string = string;
    this.memory = C.malloc(20);
    this.String();
  }
  String() {
    const method = _StringObject.getStringMethod();
    const object = method(this.memory, this.string.ptr());
    return this.memory;
  }
  static getStringMethod() {
    return new NativeFunction(this.add(13968800), "pointer", ["pointer", "pointer"]);
  }
};
var Stage = class extends BaseClass {
  constructor() {
    super();
  }
  static getInstance() {
    return this.add(17764976).readPointer();
  }
  static addChild(childPtr) {
    return new NativeFunction(this.add(12319064), "pointer", ["pointer", "pointer"])(this.getInstance().readPointer(), childPtr);
  }
  static removeChild(childPtr) {
    return new NativeFunction(this.add(12285420), "pointer", ["pointer", "pointer"])(this.getInstance().readPointer().add(6648).readPointer(), childPtr);
  }
};

// agent/prototypes.ts
function BakePrototypes() {
  NativePointer.prototype.fromsc = function() {
    const str = (this.add(4).readInt() >= 8 ? this.add(8).readPointer() : this.add(8)).readUtf8String();
    return str ? str : "";
  };
  String.prototype.ptr = function() {
    return Memory.allocUtf8String(this);
  };
  String.prototype.scptr = function() {
    const StringCtor = StringObject.getStringMethod();
    let ptr2 = C.malloc(20);
    StringCtor(ptr2, this.ptr());
    Script.bindWeak(ptr2, () => {
      C.free(ptr2);
    });
    setTimeout(() => {
      C.free(ptr2);
    }, 250);
    return ptr2;
  };
}

// agent/UserInterface/touch.ts
var TouchTracker = class {
  touches = /* @__PURE__ */ new Map();
  panId = null;
  startTouchX = 0;
  startTouchY = 0;
  startClipX = 0;
  startClipY = 0;
  startDistance = 0;
  startScaleX = 1;
  startScaleY = 1;
  zoomCenterX = 0;
  zoomCenterY = 0;
  isZooming = false;
  timeoutMs = 150;
  handleTouch(id, x, y, movieClip) {
    const now = Date.now();
    if (x < 0 || y < 0) return;
    this.touches.set(id, { x, y, lastSeen: now });
    this.cleanup(now);
    const touchCount = this.touches.size;
    if (touchCount >= 2) {
      const points = Array.from(this.touches.values()).slice(0, 2);
      const p1 = points[0];
      const p2 = points[1];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const midpointX = (p1.x + p2.x) / 2;
      const midpointY = (p1.y + p2.y) / 2;
      if (!this.isZooming) {
        this.isZooming = true;
        this.panId = null;
        this.startDistance = distance;
        this.startScaleX = movieClip.add(16).readFloat();
        this.startScaleY = movieClip.add(28).readFloat();
        this.zoomCenterX = midpointX;
        this.zoomCenterY = midpointY;
        this.startClipX = movieClip.add(32).readFloat();
        this.startClipY = movieClip.add(36).readFloat();
        return;
      }
      const touchToClip = 1 / 5;
      const clipMidX = midpointX * touchToClip;
      const clipMidY = midpointY * touchToClip;
      const scaleFactor = distance / this.startDistance;
      const newScaleX = this.startScaleX * scaleFactor;
      const newScaleY = this.startScaleY * scaleFactor;
      movieClip.add(16).writeFloat(newScaleX);
      movieClip.add(28).writeFloat(newScaleY);
      const offsetX = (this.startClipX - clipMidX) * (scaleFactor - 1);
      const offsetY = (this.startClipY - clipMidY) * (scaleFactor - 1);
      movieClip.add(32).writeFloat(this.startClipX + offsetX);
      movieClip.add(36).writeFloat(this.startClipY + offsetY);
      return;
    }
    if (touchCount === 1) {
      const [touchId, touch] = Array.from(this.touches.entries())[0];
      if (this.panId !== touchId) {
        this.panId = touchId;
        this.startTouchX = touch.x;
        this.startTouchY = touch.y;
        this.startClipX = movieClip.add(32).readFloat();
        this.startClipY = movieClip.add(36).readFloat();
      }
      if (touchId !== this.panId) return;
      const dx = touch.x - this.startTouchX;
      const dy = touch.y - this.startTouchY;
      movieClip.add(32).writeFloat(this.startClipX + dx / 5);
      movieClip.add(36).writeFloat(this.startClipY + dy / 5);
    }
  }
  cleanup(now) {
    const removedIds = [];
    for (const [id, touch] of this.touches) {
      if (now - touch.lastSeen > this.timeoutMs) {
        this.touches.delete(id);
        removedIds.push(id);
      }
    }
    if (this.touches.size < 2) {
      this.isZooming = false;
    }
    if (this.panId !== null && removedIds.includes(this.panId)) {
      this.panId = null;
    }
  }
};

// agent/SupercellSWF/movieclip.ts
var MovieClip = class {
  static play(movieClip) {
    if (movieClip.add(77).readU8()) {
      movieClip.add(104).writeU8(0);
      movieClip.add(77).writeU8(0);
    }
  }
  static pause(movieClip) {
    if (movieClip.add(77).readU8() <= 1) {
      movieClip.add(104).writeU8(0);
      movieClip.add(77).writeU8(3);
    }
  }
  static getTotalFrames(movieClip) {
    if (movieClip) {
      return movieClip.add(158).readU16();
    } else {
      return 0;
    }
  }
  static getCurrentFrame(movieClip) {
    if (movieClip) {
      return movieClip.add(152).readU16();
    } else {
      return 0;
    }
  }
};

// agent/SupercellSWF/swf.ts
var SupercellSWF = class _SupercellSWF {
  swf;
  constructor(swf) {
    this.swf = swf;
  }
  static getSWF(swfName) {
    const base4 = GameLibrary.getInstance().getLibrary();
    const ResourceManager_getSupercellSWF = new NativeFunction(base4.add(12031132), "pointer", ["pointer", "int"]);
    return new _SupercellSWF(ResourceManager_getSupercellSWF(swfName.ptr(), 0));
  }
  getSWF() {
    return this.swf;
  }
  getExportNameCount() {
    return this.swf.add(112).readInt();
  }
  getExportNameArray() {
    return this.swf.add(288).readPointer();
  }
  getExportNameAt(index) {
    const Array2 = this.getExportNameArray();
    return Array2.add(index * 8).readPointer();
  }
  getExportNames() {
    const names = [];
    for (let i = 0; i < this.getExportNameCount(); i++) {
      names.push(this.getExportNameAt(i).readUtf8String());
    }
    return names;
  }
  getShapesCount() {
    return this.swf.add(100).readInt();
  }
  getMovieClipCount() {
    return this.swf.add(104).readInt();
  }
  getTextFieldCount() {
    return this.swf.add(116).readInt();
  }
  getBitmapCount() {
    return this.swf.add(108).readInt();
  }
  getBitmapArray() {
    return this.swf.add(160).readPointer().add(208);
  }
  getBitmapAt(index) {
    return this.getBitmapArray().add(index * 8);
  }
  getBitmapWidth(index) {
    return this.getBitmapAt(index).add(128).readInt();
  }
  getBitmapHeight(index) {
    return this.getBitmapAt(index).add(132).readInt();
  }
};

// agent/Update/base.ts
GameLibrary.getInstance().ensureLoadedLibrary();
var base = GameLibrary.getInstance().getLibrary();
var Update = class {
  function;
  task = null;
  constructor(func = null) {
    this.function = func;
  }
  execute() {
    if (this.function) {
      this.function();
    }
  }
  startTask() {
    const GameMain_update = base.add(4831620);
    this.task = Interceptor.attach(GameMain_update, {
      onEnter: (args) => {
        this.execute();
      }
    });
  }
  stopTask() {
    if (this.task != null) {
      this.task.detach();
      this.task = null;
    }
  }
  setFunction(func) {
    this.function = func;
  }
};

// agent/Update/timeline.ts
var TimelineSliderTask = class extends Update {
  constructor() {
    super();
  }
};

// agent/UserInterface/ui.ts
GameLibrary.getInstance().ensureLoadedLibrary();
var base2 = GameLibrary.getInstance().getLibrary();
var GameMain_loadAsset = new NativeFunction(base2.add(4841756), "pointer", ["pointer", "int"]);
var ResourceManager_getMovieClip = new NativeFunction(base2.add(9581544), "pointer", ["pointer", "pointer", "int"]);
var MovieClip_getTextFieldByName = new NativeFunction(base2.add(12221696), "pointer", ["pointer", "pointer"]);
var TextField_setText = new NativeFunction(base2.add(12407920), "pointer", ["pointer", "pointer"]);
var MovieClip_getMovieClipByName = new NativeFunction(base2.add(12221088), "pointer", ["pointer", "pointer"]);
var GameButton = new NativeFunction(base2.add(5744716), "pointer", ["pointer"]);
var getMC = new NativeFunction(base2.add(12032828), "pointer", ["pointer", "pointer"]);
var MovieClip_gotoAndStopFrameIndex = new NativeFunction(base2.add(12217964), "pointer", ["pointer", "int"]);
var SCEditor = class {
  base;
  logger = Logger.getInstance().withContext("SCEditor");
  loaderLogger = Logger.getInstance().withContext("Loader");
  state = false;
  debugTextField = null;
  exportNamesTextField = null;
  buttons = /* @__PURE__ */ new Map();
  miscButtons = [];
  selectedFile = SupercellSWF.getSWF("");
  hookAttached = false;
  background;
  selectedClip;
  selectedSCFile = "sc/sce_ui.sc";
  exportButtons = [];
  scFiles = ["background_basic.sc", "background_brawlentines25.sc", "background_dragonsandfairies.sc", "background_najia.sc", "background_sandoftime.sc", "background_sirius.sc", "brawl_pass.sc", "buddy.sc", "buddy_shop.sc", "characters.sc", "daily_wins.sc", "debug.sc", "effects.sc", "effects_brawler.sc", "effects_brawler2.sc", "effects_brawler_8bit.sc", "effects_brawler_alli.sc", "effects_brawler_amber.sc", "effects_brawler_angelo.sc", "effects_brawler_ash.sc", "effects_brawler_barley.sc", "effects_brawler_bea.sc", "effects_brawler_belle.sc", "effects_brawler_berry.sc", "effects_brawler_bibi.sc", "effects_brawler_bo.sc", "effects_brawler_bonnie.sc", "effects_brawler_brock.sc", "effects_brawler_bull.sc", "effects_brawler_buster.sc", "effects_brawler_buzz.sc", "effects_brawler_byron.sc", "effects_brawler_carl.sc", "effects_brawler_charlie.sc", "effects_brawler_chester.sc", "effects_brawler_chuck.sc", "effects_brawler_clancy.sc", "effects_brawler_colette.sc", "effects_brawler_colt.sc", "effects_brawler_cordelius.sc", "effects_brawler_crow.sc", "effects_brawler_darryl.sc", "effects_brawler_doug.sc", "effects_brawler_draco.sc", "effects_brawler_dynamike.sc", "effects_brawler_edgar.sc", "effects_brawler_elprimo.sc", "effects_brawler_emz.sc", "effects_brawler_eve.sc", "effects_brawler_fang.sc", "effects_brawler_finx.sc", "effects_brawler_frank.sc", "effects_brawler_gale.sc", "effects_brawler_gen.sc", "effects_brawler_gene.sc", "effects_brawler_gigi.sc", "effects_brawler_glowbert.sc", "effects_brawler_gray.sc", "effects_brawler_griff.sc", "effects_brawler_grom.sc", "effects_brawler_gus.sc", "effects_brawler_hank.sc", "effects_brawler_jacky.sc", "effects_brawler_jaeyong.sc", "effects_brawler_janet.sc", "effects_brawler_jessie.sc", "effects_brawler_juju.sc", "effects_brawler_kaze.sc", "effects_brawler_kenji.sc", "effects_brawler_kit.sc", "effects_brawler_larrylawrie.sc", "effects_brawler_leon.sc", "effects_brawler_lily.sc", "effects_brawler_lola.sc", "effects_brawler_lou.sc", "effects_brawler_lumi.sc", "effects_brawler_maisie.sc", "effects_brawler_mandy.sc", "effects_brawler_max.sc", "effects_brawler_meeple.sc", "effects_brawler_meg.sc", "effects_brawler_melodie.sc", "effects_brawler_mico.sc", "effects_brawler_mina.sc", "effects_brawler_moe.sc", "effects_brawler_mortis.sc", "effects_brawler_mrp.sc", "effects_brawler_najia.sc", "effects_brawler_nani.sc", "effects_brawler_nita.sc", "effects_brawler_ollie.sc", "effects_brawler_otis.sc", "effects_brawler_pam.sc", "effects_brawler_pearl.sc", "effects_brawler_penny.sc", "effects_brawler_pierce.sc", "effects_brawler_piper.sc", "effects_brawler_poco.sc", "effects_brawler_rico.sc", "effects_brawler_rosa.sc", "effects_brawler_rt.sc", "effects_brawler_ruffs.sc", "effects_brawler_sam.sc", "effects_brawler_sandy.sc", "effects_brawler_shade.sc", "effects_brawler_shelly.sc", "effects_brawler_sirius.sc", "effects_brawler_spike.sc", "effects_brawler_sprout.sc", "effects_brawler_squeak.sc", "effects_brawler_stu.sc", "effects_brawler_surge.sc", "effects_brawler_tara.sc", "effects_brawler_tick.sc", "effects_brawler_trunk.sc", "effects_brawler_willow.sc", "effects_brawler_ziggy.sc", "emoji_1.sc", "emoji_2.sc", "emoji_65.sc", "emoji_66.sc", "events.sc", "gacha.sc", "hero_portraits.sc", "level.sc", "loading.sc", "loading_brawlentine26.sc", "loading_buffies.sc", "loading_dragonsandfairies.sc", "loading_glowbert.sc", "loading_mecha.sc", "loading_naija.sc", "loading_sirius.sc", "loading_steampunk.sc", "main.py", "player_icons.sc", "player_icons_1.sc", "player_icons_66.sc", "prestige.sc", "profile.sc", "quests.sc", "sprays_1.sc", "sprays_66.sc", "start.bat", "supercell_id.sc", "trophy_world_1.sc", "trophy_world_2.sc", "trophy_world_3.sc", "trophy_world_4.sc", "trophy_world_5.sc", "trophy_world_6.sc", "trophy_world_common.sc", "trophy_world_future.sc", "trophy_world_minimap.sc", "ui.sc", "ui_achievements.sc", "ui_brawler_event.sc", "ui_roguelite.sc", "sce_ui.sc", "collab_monkeygod.sc"];
  page = 0;
  timelineEnabled = false;
  timelineClip = null;
  timelineIsPlaying = true;
  playbackBtn = null;
  playbackBtnClip = ptr(0);
  timelineSlider = ptr(0);
  timelineSliderMinX = 375;
  timelineSliderMaxX = 867.5;
  constructor() {
    this.base = GameLibrary.getInstance().getLibrary();
  }
  init() {
    this.loadUI();
    this.createCoreButtons();
    this.attachHook();
    this.showDebug();
  }
  loadUI() {
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
  disableOriginalButtons(top) {
    ["button_load", "button_exit", "button_misc", "button_exports"].forEach((name) => {
      MovieClip_getMovieClipByName(top, name.ptr()).add(8).writeInt(0);
    });
  }
  createCoreButtons() {
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
  createButton(mc, x, y = 0) {
    const mem = C.malloc(848);
    GameButton(mem);
    new NativeFunction(mem.readPointer().add(360).readPointer(), "void", ["pointer", "pointer", "int"])(mem, mc, 1);
    mem.add(32).writeFloat(x);
    mem.add(36).writeFloat(y);
    Stage.addChild(mem);
    return mem;
  }
  getTopMC() {
    return getMC("sc/sce_ui.sc".ptr(), "catalogue_screen_header".ptr());
  }
  getBottomMC() {
    return getMC("sc/sce_ui.sc".ptr(), "sceditor_bottom".ptr());
  }
  toggleMisc() {
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
            this.miscButtons.push(this.createMiscButton(`Button ${i}`, 50 * i));
            ;
        }
      }
    } else {
      this.miscButtons.forEach((btn) => Stage.removeChild(btn));
      this.miscButtons = [];
    }
  }
  createMiscButton(label, y) {
    const mc = MovieClip_getMovieClipByName(this.getTopMC(), "button_misc".ptr());
    const tf = MovieClip_getTextFieldByName(mc, "txt_misc".ptr());
    TextField_setText(tf, label.scptr());
    return this.createButton(mc, 500, y);
  }
  showDebug() {
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
      `Selected MovieClip: ${movieClipName}
`,
      `Frames: ${MovieClip.getTotalFrames(this.selectedClip)}
`,
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
  attachHook() {
    if (this.hookAttached) return;
    this.hookAttached = true;
    Interceptor.attach(this.base.add(12421880), {
      // CustomButton::buttonClicked
      onEnter: (args) => {
        const clicked = args[0];
        if (this.isClicked("load", clicked)) {
          this.loaderLogger.debug(this.selectedFile.getExportNames());
        }
        if (this.isClicked("exit", clicked)) {
          new NativeFunction(Module.getGlobalExportByName("exit"), "void", ["int"])(0);
        }
        if (this.isClicked("misc", clicked)) {
          this.toggleMisc();
        }
        if (this.miscButtons.length > 0 && clicked.equals(this.miscButtons[4])) {
          this.page++;
          if (this.exportNamesTextField != null && this.exportNamesTextField.length > 0) {
            for (let i = 0; i < this.exportNamesTextField.length; i++) {
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
        if (this.miscButtons.length > 0 && clicked.equals(this.miscButtons[0])) {
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
        if (this.playbackBtn != null && clicked.equals(this.playbackBtn) && this.timelineEnabled && this.selectedClip != null) {
          console.log("playback button clicked");
          let movieClip = this.selectedClip;
          this.timelineIsPlaying = !this.timelineIsPlaying;
          MovieClip_gotoAndStopFrameIndex(this.playbackBtnClip, this.timelineIsPlaying ? 0 : 1);
          if (this.timelineIsPlaying) {
            MovieClip.play(movieClip);
          } else {
            MovieClip.pause(movieClip);
          }
        }
        if (this.miscButtons.length > 0 && clicked.equals(this.miscButtons[2])) {
          const logger2 = Logger.getInstance().withContext("MOVIECLIP TEST");
          const swf = this.selectedFile.getSWF();
          const arr = swf.add(176).readPointer();
          for (let i = 0; i < this.selectedFile.getMovieClipCount(); i++) {
            const element = arr.add(80 * i);
            const id = element.add(48).readU16();
            const framerate = element.add(56).readU8();
            const instance_count = element.add(52).readU16();
            const children_array1 = element.add(16).readPointer();
            for (let j = 0; j < instance_count; j++) {
              const child_id = children_array1.add(2 * j).readU16();
              logger2.debug(`ID: ${id}, Child ID: ${child_id}`);
            }
            const children_array2 = element.add(32).readPointer();
            try {
              for (let j = 0; j < instance_count; j++) {
                const child_name = children_array2.add(8 * j).readPointer().readUtf8String();
                logger2.debug(`ID: ${id}, Child Name: ${child_name}`);
              }
            } catch (e) {
            }
            logger2.debug(`ID: ${id}, Framerate: ${framerate}`);
            if (id == 8) {
              const x_mc = element;
              const MovieClip2 = new NativeFunction(base2.add(12207104), "pointer", ["pointer", "pointer", "int"])(x_mc, this.selectedFile.getSWF(), 0);
              MovieClip2.add(32).writeFloat(200);
              MovieClip2.add(36).writeFloat(200);
              Stage.addChild(MovieClip2);
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
  buttonMap = /* @__PURE__ */ new Map();
  interceptorAttached = false;
  showExportNames() {
    this.exportButtons.forEach((btn) => Stage.removeChild(btn));
    this.exportButtons = [];
    if (this.exportNamesTextField == null) this.exportNamesTextField = [];
    this.exportNamesTextField.forEach((tf) => Stage.removeChild(tf));
    this.exportNamesTextField = [];
    const start = this.page * 20;
    const text = this.selectedFile.getExportNames().slice(start, start + 20);
    const exportNameCount = this.selectedFile.getExportNameCount();
    this.logger.debug(text);
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
    for (let i = start; i < Math.min(start + 20, exportNameCount); i++) {
      const button = MovieClip_getMovieClipByName(this.getTopMC(), "button_load".ptr());
      const btnTf = MovieClip_getTextFieldByName(button, "txt_load".ptr());
      TextField_setText(btnTf, "".scptr());
      button.add(16).writeFloat(0.5);
      button.add(28).writeFloat(0.5);
      const btn = this.createButton(button, 385, 80 + (i - start) * 20.5);
      this.exportButtons.push(btn);
      this.buttonMap.set(btn.toInt32(), i);
    }
    if (!this.interceptorAttached) {
      this.interceptorAttached = true;
      Interceptor.attach(base2.add(12421880), {
        onEnter: (args) => {
          const btnPtr = args[0].toInt32();
          const index = this.buttonMap.get(btnPtr);
          if (index === void 0) return;
          const uisc = this.selectedFile;
          const clip = ResourceManager_getMovieClip(
            `sc/${this.selectedSCFile.replace("sc/", "")}`.ptr(),
            uisc.getExportNameAt(index),
            0
          );
          if (this.selectedClip) {
            new NativeFunction(base2.add(12285420), "pointer", ["pointer", "pointer"])(
              this.background,
              this.selectedClip
            );
          }
          new NativeFunction(base2.add(12284692), "pointer", ["pointer", "pointer"])(
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
  isClicked(name, ptr2) {
    const btn = this.buttons.get(name);
    return !!btn && ptr2.equals(btn);
  }
};

// agent/index.ts
var library = GameLibrary.getInstance();
var base3 = library.loadLibrary();
BakePrototypes();
PatchNetworking();
GoToLimboState();
RemoveClickSound();
var logger = Logger.getInstance().withContext("Main");
logger.debug(`found base at @${base3}`);
Interceptor.attach(base3.add(9676980), {
  onEnter(args) {
    const a2 = args[1];
    const logger2 = Logger.getInstance().withContext("DataTableResourcesLoader::listResources");
    this.stringer = Interceptor.attach(base3.add(13968928), {
      onEnter(args2) {
        const str = args2[1];
        logger2.debug(`load -> ${str.fromsc()}`);
      }
    });
  },
  onLeave(retval) {
    this.stringer.detach();
  }
});
var sceditor = null;
Interceptor.attach(base3.add(9530808), {
  // LoadingScreen constuctor
  // here we start to actually load our "sc-editor"
  onEnter(args) {
    sceditor = new SCEditor();
    sceditor.init();
  }
});
var tracker = new TouchTracker();
Interceptor.attach(base3.add(14029808), {
  // InputTouches::moveTouch
  onEnter(args) {
    const id = args[0].toInt32();
    const x = args[1].toInt32();
    const y = args[2].toInt32();
    if (sceditor.selectedClip != null && sceditor != null)
      tracker.handleTouch(id, x, y, sceditor.selectedClip);
  }
});
