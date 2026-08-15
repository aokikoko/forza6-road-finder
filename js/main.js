import { createI18n } from "./i18n.js";
import { decodeImageFile, imageFromClipboard } from "./input/image-source.js";
import { CaptureSource } from "./input/capture-source.js";
import { DEFAULT_SETTINGS, rgbToHex } from "./render/color.js";
import { createProcessor } from "./render/processor.js";
import { ViewportController } from "./view/viewport.js";

const elements = Object.fromEntries([
  "languageButton", "imageTab", "captureTab", "imagePanel", "capturePanel",
  "dropZone", "fileInput", "startCaptureButton", "captureActions",
  "pauseCaptureButton", "stopCaptureButton", "targetColor", "targetColorValue",
  "markerColor", "markerColorValue", "tolerance", "toleranceValue", "noiseFilter",
  "noiseFilterValue", "sampleButton",
  "resetSettingsButton", "compareField", "comparePosition", "compareValue",
  "statusDot", "statusText", "zoomOutButton", "zoomInButton", "zoomValue",
  "resetViewButton", "viewport", "stage", "resultCanvas", "originalCanvas",
  "compareLine", "emptyState", "sampleCursor", "imageMeta", "toast", "captureVideo"
].map((id) => [id, document.getElementById(id)]));

const i18n = createI18n();
i18n.apply();
elements.languageButton.textContent = i18n.language === "zh" ? "EN" : "中";

const settings = { ...DEFAULT_SETTINGS };
const originalContext = elements.originalCanvas.getContext("2d", { willReadFrequently: true });
const { processor, backend } = createProcessor(elements.resultCanvas);
let currentBitmap = null;
let source = null;
let sourceType = null;
let animationFrame = 0;
let lastFrameTime = 0;
let sampleMode = false;
let toastTimer = 0;

const viewport = new ViewportController({
  viewport: elements.viewport,
  stage: elements.stage,
  zoomOutput: elements.zoomValue,
  onZoomChange: (zoom) => {
    elements.zoomOutButton.disabled = !source || zoom <= 1;
    elements.zoomInButton.disabled = !source || zoom >= 8;
  }
});

const capture = new CaptureSource(elements.captureVideo, () => {
  stopFrameLoop();
  elements.captureActions.hidden = true;
  elements.startCaptureButton.hidden = false;
  setStatus("statusStopped", false);
});

function showToast(messageKey) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = i18n.translate(messageKey);
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 4200);
}

function setStatus(messageKey, active = false) {
  elements.statusText.dataset.i18n = messageKey;
  elements.statusText.textContent = i18n.translate(messageKey);
  elements.statusDot.classList.toggle("is-active", active);
}

function dimensionsFor(activeSource) {
  if (activeSource instanceof HTMLVideoElement) {
    return { width: activeSource.videoWidth, height: activeSource.videoHeight };
  }
  return { width: activeSource?.width ?? 0, height: activeSource?.height ?? 0 };
}

function releaseBitmap() {
  currentBitmap?.close();
  currentBitmap = null;
}

function prepareCanvases(width, height) {
  if (elements.originalCanvas.width !== width || elements.originalCanvas.height !== height) {
    elements.originalCanvas.width = width;
    elements.originalCanvas.height = height;
  }
  viewport.setSourceSize(width, height);
  elements.emptyState.hidden = true;
  elements.sampleButton.disabled = false;
  elements.resetViewButton.disabled = false;
  elements.zoomInButton.disabled = false;
  elements.imageMeta.textContent = `${width} × ${height} · ${backend === "webgl" ? "WebGL2" : "Canvas 2D"}`;
}

function render(activeSource = source) {
  if (!activeSource) {
    return;
  }
  const { width, height } = dimensionsFor(activeSource);
  if (!width || !height) {
    return;
  }
  prepareCanvases(width, height);
  originalContext.drawImage(activeSource, 0, 0, width, height);
  processor.draw(activeSource, width, height, settings);
}

function startFrameLoop() {
  stopFrameLoop();
  const drawFrame = (timestamp) => {
    if (!capture.active || capture.paused) {
      return;
    }
    const minimumDelay = backend === "webgl" ? 50 : 300;
    if (timestamp - lastFrameTime >= minimumDelay) {
      render(elements.captureVideo);
      lastFrameTime = timestamp;
    }
    animationFrame = requestAnimationFrame(drawFrame);
  };
  animationFrame = requestAnimationFrame(drawFrame);
}

function stopFrameLoop() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

async function loadImage(file) {
  if (!file?.type.startsWith("image/")) {
    showToast("imageTypeError");
    return;
  }
  setStatus("statusLoading");
  try {
    const bitmap = await decodeImageFile(file);
    stopCapture(false);
    releaseBitmap();
    currentBitmap = bitmap;
    source = bitmap;
    sourceType = "image";
    render();
    setStatus("statusImage", true);
  } catch (error) {
    console.error(error);
    setStatus("statusReady");
    showToast(error instanceof TypeError ? "imageTypeError" : "imageError");
  } finally {
    elements.fileInput.value = "";
  }
}

async function startCapture() {
  setStatus("statusRequesting");
  elements.startCaptureButton.disabled = true;
  try {
    const video = await capture.start();
    releaseBitmap();
    source = video;
    sourceType = "capture";
    render(video);
    elements.startCaptureButton.hidden = true;
    elements.captureActions.hidden = false;
    elements.pauseCaptureButton.dataset.i18n = "pause";
    elements.pauseCaptureButton.textContent = i18n.translate("pause");
    setStatus("statusLive", true);
    startFrameLoop();
  } catch (error) {
    console.error(error);
    const key = error.message === "CAPTURE_UNSUPPORTED"
      ? "captureUnsupported"
      : error.message === "CAPTURE_INSECURE"
        ? "captureSecure"
        : error.name === "NotAllowedError"
          ? "captureDenied"
          : "captureError";
    setStatus(source ? "statusImage" : "statusReady", Boolean(source));
    showToast(key);
  } finally {
    elements.startCaptureButton.disabled = false;
  }
}

function stopCapture(updateStatus = true) {
  stopFrameLoop();
  capture.stop();
  elements.captureActions.hidden = true;
  elements.startCaptureButton.hidden = false;
  if (sourceType === "capture") {
    source = null;
    sourceType = null;
  }
  if (updateStatus) {
    setStatus("statusStopped");
  }
}

function updateSettings() {
  settings.targetColor = elements.targetColor.value;
  settings.markerColor = elements.markerColor.value;
  settings.tolerance = Number(elements.tolerance.value);
  settings.noiseFilter = Number(elements.noiseFilter.value);
  elements.targetColorValue.value = settings.targetColor.toUpperCase();
  elements.markerColorValue.value = settings.markerColor.toUpperCase();
  elements.toleranceValue.value = String(settings.tolerance);
  elements.noiseFilterValue.value = String(settings.noiseFilter);
  if (source && !capture.paused) {
    render();
  }
}

function resetSettings() {
  elements.targetColor.value = DEFAULT_SETTINGS.targetColor;
  elements.markerColor.value = DEFAULT_SETTINGS.markerColor;
  elements.tolerance.value = String(DEFAULT_SETTINGS.tolerance);
  elements.noiseFilter.value = String(DEFAULT_SETTINGS.noiseFilter);
  setBackgroundMode(DEFAULT_SETTINGS.grayscaleBackground ? "grayscale" : "color", false);
  updateSettings();
}

function setBackgroundMode(mode, rerender = true) {
  settings.grayscaleBackground = mode === "grayscale";
  document.querySelectorAll("[data-background]").forEach((button) => {
    const isActive = button.dataset.background === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (rerender && source && !capture.paused) {
    render();
  }
}

function setInputTab(tab) {
  const isImage = tab === "image";
  elements.imageTab.classList.toggle("is-active", isImage);
  elements.imageTab.setAttribute("aria-selected", String(isImage));
  elements.captureTab.classList.toggle("is-active", !isImage);
  elements.captureTab.setAttribute("aria-selected", String(!isImage));
  elements.imagePanel.hidden = !isImage;
  elements.capturePanel.hidden = isImage;
}

function setViewMode(mode) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === mode);
  });
  elements.compareField.hidden = mode !== "compare";
  elements.compareLine.hidden = mode !== "compare";

  if (mode === "original") {
    elements.originalCanvas.style.visibility = "visible";
    elements.originalCanvas.style.clipPath = "none";
  } else if (mode === "result") {
    elements.originalCanvas.style.visibility = "hidden";
  } else {
    elements.originalCanvas.style.visibility = "visible";
    updateCompare();
  }
}

function updateCompare() {
  const position = Number(elements.comparePosition.value);
  elements.compareValue.value = `${position}%`;
  elements.originalCanvas.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
  elements.compareLine.style.left = `${position}%`;
}

function beginSampling() {
  if (!source) {
    return;
  }
  sampleMode = true;
  elements.viewport.classList.add("is-sampling");
  elements.sampleCursor.hidden = false;
}

function sampleAt(event) {
  if (!sampleMode) {
    return;
  }
  const point = viewport.sourcePoint(event.clientX, event.clientY);
  if (!point) {
    return;
  }
  const pixel = originalContext.getImageData(point.x, point.y, 1, 1).data;
  elements.targetColor.value = rgbToHex(pixel[0], pixel[1], pixel[2]);
  sampleMode = false;
  elements.viewport.classList.remove("is-sampling");
  elements.sampleCursor.hidden = true;
  updateSettings();
  showToast("sampled");
}

elements.languageButton.addEventListener("click", () => {
  const language = i18n.toggle();
  elements.languageButton.textContent = language === "zh" ? "EN" : "中";
  elements.pauseCaptureButton.dataset.i18n = capture.paused ? "resume" : "pause";
  elements.pauseCaptureButton.textContent = i18n.translate(elements.pauseCaptureButton.dataset.i18n);
});
elements.imageTab.addEventListener("click", () => setInputTab("image"));
elements.captureTab.addEventListener("click", () => setInputTab("capture"));
elements.fileInput.addEventListener("change", () => loadImage(elements.fileInput.files[0]));
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("is-dragging");
});
elements.dropZone.addEventListener("dragleave", () => elements.dropZone.classList.remove("is-dragging"));
elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragging");
  loadImage(event.dataTransfer.files[0]);
});
document.addEventListener("paste", (event) => {
  const file = imageFromClipboard(event);
  if (file) {
    event.preventDefault();
    loadImage(file);
  } else if (document.activeElement === document.body) {
    showToast("pasteHint");
  }
});
elements.startCaptureButton.addEventListener("click", startCapture);
elements.pauseCaptureButton.addEventListener("click", () => {
  const paused = capture.togglePause();
  elements.pauseCaptureButton.dataset.i18n = paused ? "resume" : "pause";
  elements.pauseCaptureButton.textContent = i18n.translate(paused ? "resume" : "pause");
  setStatus(paused ? "statusPaused" : "statusLive", !paused);
  if (paused) {
    stopFrameLoop();
  } else {
    startFrameLoop();
  }
});
elements.stopCaptureButton.addEventListener("click", () => stopCapture());
[elements.targetColor, elements.markerColor, elements.tolerance, elements.noiseFilter].forEach((input) => {
  input.addEventListener("input", updateSettings);
});
document.querySelectorAll("[data-background]").forEach((button) => {
  button.addEventListener("click", () => setBackgroundMode(button.dataset.background));
});
elements.sampleButton.addEventListener("click", beginSampling);
elements.resetSettingsButton.addEventListener("click", resetSettings);
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setViewMode(button.dataset.view));
});
elements.comparePosition.addEventListener("input", updateCompare);
elements.zoomOutButton.addEventListener("click", () => viewport.stepZoom(-1));
elements.zoomInButton.addEventListener("click", () => viewport.stepZoom(1));
elements.resetViewButton.addEventListener("click", () => viewport.fit(true));
elements.viewport.addEventListener("click", sampleAt);

if (backend === "canvas") {
  showToast("webglFallback");
}

window.addEventListener("beforeunload", () => {
  stopFrameLoop();
  capture.stop();
  releaseBitmap();
  processor.destroy();
  viewport.destroy();
});