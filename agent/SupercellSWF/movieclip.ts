export default class MovieClip {
    public static play(movieClip: NativePointer) {
        if (movieClip.add(77).readU8()) {
            movieClip.add(104).writeU8(0);
            movieClip.add(77).writeU8(0);
        }
    }
    public static pause(movieClip: NativePointer) {
        if (movieClip.add(77).readU8() <= 1) {
            movieClip.add(104).writeU8(0);
            movieClip.add(77).writeU8(3);
        }
    }
    
    public static getTotalFrames(movieClip: NativePointer) {
        if (movieClip) {
            return movieClip.add(158).readU16();
        } else {
            return 0;
        }
    }
    public static getCurrentFrame(movieClip: NativePointer) {
        if (movieClip) {
            return movieClip.add(152).readU16();
        } else {
            return 0;
        }
    }
}