export default class TouchTracker {
    private touches = new Map<number, { x: number; y: number; lastSeen: number }>();

    private panId: number | null = null;

    private startTouchX: number = 0;
    private startTouchY: number = 0;

    private startClipX: number = 0;
    private startClipY: number = 0;

    private startDistance: number = 0;
    private startScaleX: number = 1;
    private startScaleY: number = 1;

    private zoomCenterX: number = 0;
    private zoomCenterY: number = 0;

    private isZooming: boolean = false;
    private timeoutMs: number = 150;

    handleTouch(id: number, x: number, y: number, movieClip: NativePointer): void {
        const now = Date.now();
        if (x < 0 || y < 0) return;

        this.touches.set(id, { x, y, lastSeen: now });
        this.cleanup(now);

        const touchCount = this.touches.size;

        // --------------------
        // TWO FINGERS → ZOOM
        // --------------------
        if (touchCount >= 2) {
            const points = Array.from(this.touches.values()).slice(0, 2);
            const p1 = points[0];
            const p2 = points[1];

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // inside the two-finger zoom section
            const midpointX = (p1.x + p2.x) / 2;
            const midpointY = (p1.y + p2.y) / 2;

            if (!this.isZooming) {
                this.isZooming = true;
                this.panId = null;

                this.startDistance = distance;
                this.startScaleX = movieClip.add(16).readFloat();
                this.startScaleY = movieClip.add(28).readFloat();

                // Zoom center in screen coordinates
                this.zoomCenterX = midpointX;
                this.zoomCenterY = midpointY;

                // Store current clip position
                this.startClipX = movieClip.add(32).readFloat();
                this.startClipY = movieClip.add(36).readFloat();

                return;
            }


            const touchToClip = 1 / 5; // adjust this to match your actual ratio
            const clipMidX = midpointX * touchToClip;
            const clipMidY = midpointY * touchToClip;

            // calculate scale factor
            const scaleFactor = distance / this.startDistance;
            const newScaleX = this.startScaleX * scaleFactor;
            const newScaleY = this.startScaleY * scaleFactor;

            movieClip.add(16).writeFloat(newScaleX);
            movieClip.add(28).writeFloat(newScaleY);

            // offset so midpoint stays under fingers
            const offsetX = (this.startClipX - clipMidX) * (scaleFactor - 1);
            const offsetY = (this.startClipY - clipMidY) * (scaleFactor - 1);

            movieClip.add(32).writeFloat(this.startClipX + offsetX);
            movieClip.add(36).writeFloat(this.startClipY + offsetY);
            return;
        }

        // --------------------
        // ONE FINGER → PAN
        // --------------------
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

    private cleanup(now: number) {
        const removedIds: number[] = [];

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
}