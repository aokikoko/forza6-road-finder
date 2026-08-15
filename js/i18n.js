const messages = {
  zh: {
    privacyBadge: "仅在本机处理",
    controlsLabel: "检测控制",
    eyebrow: "地图检查工具",
    title: "找到最后一段路",
    subtitle: "载入完整地图截图，或捕获游戏窗口。像素不会离开你的浏览器。",
    sourceHeading: "选择画面",
    sourceTabsLabel: "输入来源",
    screenshotTab: "截图",
    captureTab: "实时捕获",
    dropTitle: "载入地图截图",
    dropHint: "选择、拖放或粘贴图片",
    captureCopy: "浏览器会让你选择共享窗口。请选择 Forza Horizon，并避免共享整个屏幕。",
    startCapture: "选择游戏窗口",
    pause: "暂停",
    resume: "继续",
    stop: "停止",
    detectHeading: "校准检测",
    roadColor: "道路灰色",
    markerColor: "标记颜色",
    tolerance: "匹配容差",
    noiseFilter: "邻域去噪",
    backgroundMode: "结果背景",
    backgroundModeLabel: "结果背景显示方式",
    backgroundColor: "原始颜色",
    backgroundGrayscale: "灰度背景",
    sampleColor: "从地图点击取色",
    resetSettings: "恢复默认设置",
    viewHeading: "检查地图",
    displayModeLabel: "显示模式",
    original: "原图",
    result: "结果",
    compare: "对比",
    comparePosition: "对比位置",
    workspaceLabel: "地图工作区",
    statusReady: "等待地图",
    statusLoading: "正在读取图片",
    statusImage: "截图已就绪",
    statusRequesting: "等待浏览器授权",
    statusLive: "正在本地处理实时画面",
    statusPaused: "实时画面已暂停",
    statusStopped: "实时捕获已停止",
    zoomOut: "缩小",
    zoomIn: "放大",
    resetView: "适合窗口",
    emptyTitle: "地图会显示在这里",
    emptyHint: "建议先在游戏中隐藏图标，并将地图缩放到完整区域。",
    sampleCursor: "点击未探索道路",
    privacyFooter: "无上传 · 无存储 · 无遥测",
    imageError: "无法读取这张图片，请选择常见的图片格式。",
    imageTypeError: "请选择图片文件。",
    captureUnsupported: "此浏览器不支持窗口捕获，请使用最新版 Chrome 或 Edge。",
    captureSecure: "窗口捕获需要 HTTPS 或 localhost 安全环境。",
    captureDenied: "未获得共享权限，没有任何画面被读取。",
    captureError: "无法开始捕获，请重试并选择游戏窗口。",
    webglFallback: "WebGL2 不可用，已切换为较慢的 CPU 处理。",
    sampled: "已更新道路目标颜色。",
    pasteHint: "剪贴板里没有可用图片。"
  },
  en: {
    privacyBadge: "Processed on this device",
    controlsLabel: "Detection controls",
    eyebrow: "Map inspection tool",
    title: "Find the final road",
    subtitle: "Load a full map screenshot or capture the game window. Pixels never leave your browser.",
    sourceHeading: "Choose a source",
    sourceTabsLabel: "Input source",
    screenshotTab: "Screenshot",
    captureTab: "Live capture",
    dropTitle: "Load map screenshot",
    dropHint: "Choose, drop, or paste an image",
    captureCopy: "Your browser will ask what to share. Choose Forza Horizon and avoid sharing your entire screen.",
    startCapture: "Choose game window",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    detectHeading: "Tune detection",
    roadColor: "Road grey",
    markerColor: "Marker color",
    tolerance: "Match tolerance",
    noiseFilter: "Neighborhood filter",
    backgroundMode: "Result background",
    backgroundModeLabel: "Result background appearance",
    backgroundColor: "Original color",
    backgroundGrayscale: "Grayscale",
    sampleColor: "Pick color from map",
    resetSettings: "Restore defaults",
    viewHeading: "Inspect map",
    displayModeLabel: "Display mode",
    original: "Original",
    result: "Result",
    compare: "Compare",
    comparePosition: "Compare position",
    workspaceLabel: "Map workspace",
    statusReady: "Waiting for a map",
    statusLoading: "Reading image",
    statusImage: "Screenshot ready",
    statusRequesting: "Waiting for browser permission",
    statusLive: "Processing live video locally",
    statusPaused: "Live video paused",
    statusStopped: "Live capture stopped",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    resetView: "Fit view",
    emptyTitle: "Your map will appear here",
    emptyHint: "Hide map icons in-game and zoom out until the full map is visible.",
    sampleCursor: "Click an unexplored road",
    privacyFooter: "No upload · No storage · No telemetry",
    imageError: "This image could not be read. Choose a common image format.",
    imageTypeError: "Choose an image file.",
    captureUnsupported: "Window capture is unavailable. Use the latest Chrome or Edge.",
    captureSecure: "Window capture requires HTTPS or localhost.",
    captureDenied: "Sharing was not allowed. No screen content was read.",
    captureError: "Capture could not start. Try again and choose the game window.",
    webglFallback: "WebGL2 is unavailable. Switched to slower CPU processing.",
    sampled: "The target road color was updated.",
    pasteHint: "No usable image was found on the clipboard."
  }
};

export function createI18n() {
  let language = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";

  function translate(key) {
    return messages[language][key] ?? messages.en[key] ?? key;
  }

  function apply() {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", translate(element.dataset.i18nAria));
    });
  }

  return {
    apply,
    get language() {
      return language;
    },
    toggle() {
      language = language === "zh" ? "en" : "zh";
      apply();
      return language;
    },
    translate
  };
}