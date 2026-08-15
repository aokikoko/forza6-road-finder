const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export class ViewportController {
  constructor({ viewport, stage, zoomOutput, onZoomChange }) {
    this.viewport = viewport;
    this.stage = stage;
    this.zoomOutput = zoomOutput;
    this.onZoomChange = onZoomChange;
    this.sourceWidth = 0;
    this.sourceHeight = 0;
    this.displayWidth = 0;
    this.displayHeight = 0;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.pointers = new Map();
    this.dragOrigin = null;
    this.pinchOrigin = null;
    this.enabled = false;

    this.resizeObserver = new ResizeObserver(() => this.fit(false));
    this.resizeObserver.observe(viewport);
    viewport.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    viewport.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    viewport.addEventListener("pointermove", (event) => this.onPointerMove(event));
    viewport.addEventListener("pointerup", (event) => this.onPointerUp(event));
    viewport.addEventListener("pointercancel", (event) => this.onPointerUp(event));
  }

  setSourceSize(width, height) {
    this.sourceWidth = width;
    this.sourceHeight = height;
    this.enabled = width > 0 && height > 0;
    this.stage.style.display = this.enabled ? "block" : "none";
    this.viewport.classList.toggle("has-source", this.enabled);
    this.fit(true);
  }

  fit(resetZoom = true) {
    if (!this.enabled) {
      return;
    }
    const bounds = this.viewport.getBoundingClientRect();
    const availableWidth = Math.max(1, bounds.width - 24);
    const availableHeight = Math.max(1, bounds.height - 24);
    const scale = Math.min(
      availableWidth / this.sourceWidth,
      availableHeight / this.sourceHeight
    );
    this.displayWidth = this.sourceWidth * scale;
    this.displayHeight = this.sourceHeight * scale;
    this.stage.style.width = `${this.displayWidth}px`;
    this.stage.style.height = `${this.displayHeight}px`;

    if (resetZoom) {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    }
    this.constrainPan();
    this.applyTransform();
  }

  setZoom(nextZoom, anchor = null) {
    if (!this.enabled) {
      return;
    }
    const oldZoom = this.zoom;
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));

    if (anchor && oldZoom !== this.zoom) {
      const bounds = this.viewport.getBoundingClientRect();
      const anchorX = anchor.x - bounds.left - bounds.width / 2;
      const anchorY = anchor.y - bounds.top - bounds.height / 2;
      const ratio = this.zoom / oldZoom;
      this.panX = anchorX - (anchorX - this.panX) * ratio;
      this.panY = anchorY - (anchorY - this.panY) * ratio;
    }
    this.constrainPan();
    this.applyTransform();
  }

  stepZoom(direction) {
    this.setZoom(this.zoom * (direction > 0 ? 1.25 : 0.8));
  }

  onWheel(event) {
    if (!this.enabled) {
      return;
    }
    event.preventDefault();
    this.setZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 0.89), {
      x: event.clientX,
      y: event.clientY
    });
  }

  onPointerDown(event) {
    if (!this.enabled || this.viewport.classList.contains("is-sampling")) {
      return;
    }
    this.viewport.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      this.dragOrigin = {
        x: event.clientX,
        y: event.clientY,
        panX: this.panX,
        panY: this.panY
      };
      this.viewport.classList.add("is-dragging");
    } else if (this.pointers.size === 2) {
      const [first, second] = this.pointers.values();
      this.pinchOrigin = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom: this.zoom
      };
      this.dragOrigin = null;
    }
  }

  onPointerMove(event) {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2 && this.pinchOrigin) {
      const [first, second] = this.pointers.values();
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      this.setZoom(this.pinchOrigin.zoom * distance / Math.max(1, this.pinchOrigin.distance), {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2
      });
    } else if (this.dragOrigin) {
      this.panX = this.dragOrigin.panX + event.clientX - this.dragOrigin.x;
      this.panY = this.dragOrigin.panY + event.clientY - this.dragOrigin.y;
      this.constrainPan();
      this.applyTransform();
    }
  }

  onPointerUp(event) {
    this.pointers.delete(event.pointerId);
    this.viewport.classList.remove("is-dragging");
    this.dragOrigin = null;
    this.pinchOrigin = null;
  }

  constrainPan() {
    const bounds = this.viewport.getBoundingClientRect();
    const maxX = Math.max(0, (this.displayWidth * this.zoom - bounds.width) / 2 + 12);
    const maxY = Math.max(0, (this.displayHeight * this.zoom - bounds.height) / 2 + 12);
    this.panX = Math.min(maxX, Math.max(-maxX, this.panX));
    this.panY = Math.min(maxY, Math.max(-maxY, this.panY));
  }

  applyTransform() {
    this.stage.style.left = `calc(50% + ${this.panX}px)`;
    this.stage.style.top = `calc(50% + ${this.panY}px)`;
    this.stage.style.transform = `translate(-50%, -50%) scale(${this.zoom})`;
    this.zoomOutput.value = `${Math.round(this.zoom * 100)}%`;
    this.onZoomChange?.(this.zoom);
  }

  sourcePoint(clientX, clientY) {
    const bounds = this.stage.getBoundingClientRect();
    if (
      clientX < bounds.left || clientX > bounds.right
      || clientY < bounds.top || clientY > bounds.bottom
    ) {
      return null;
    }
    return {
      x: Math.min(this.sourceWidth - 1, Math.max(0,
        Math.floor((clientX - bounds.left) / bounds.width * this.sourceWidth))),
      y: Math.min(this.sourceHeight - 1, Math.max(0,
        Math.floor((clientY - bounds.top) / bounds.height * this.sourceHeight)))
    };
  }

  destroy() {
    this.resizeObserver.disconnect();
  }
}