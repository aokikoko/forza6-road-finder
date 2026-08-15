export class CaptureSource {
  constructor(video, onEnded) {
    this.video = video;
    this.onEnded = onEnded;
    this.stream = null;
    this.paused = false;
  }

  get active() {
    return Boolean(this.stream);
  }

  async start() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("CAPTURE_UNSUPPORTED");
    }
    if (!window.isSecureContext) {
      throw new Error("CAPTURE_INSECURE");
    }

    this.stop(false);
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 10, max: 30 },
        width: { ideal: 2560 },
        height: { ideal: 1440 }
      },
      audio: false
    });

    this.stream = stream;
    this.paused = false;
    this.video.srcObject = stream;

    const [videoTrack] = stream.getVideoTracks();
    videoTrack.addEventListener("ended", () => {
      if (this.stream === stream) {
        this.stop(false);
        this.onEnded?.();
      }
    }, { once: true });

    await this.video.play();
    if (!this.video.videoWidth) {
      await new Promise((resolve) => {
        this.video.addEventListener("loadedmetadata", resolve, { once: true });
      });
    }
    return this.video;
  }

  togglePause() {
    if (!this.stream) {
      return false;
    }
    this.paused = !this.paused;
    return this.paused;
  }

  stop(stopTracks = true) {
    const stream = this.stream;
    this.stream = null;
    this.paused = false;

    if (stopTracks) {
      stream?.getTracks().forEach((track) => track.stop());
    }
    this.video.pause();
    this.video.srcObject = null;
  }
}