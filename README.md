# Forza Road Finder

A zero-build, local-only browser tool for highlighting unexplored roads on a Forza Horizon map.

## Privacy model

- Screenshots are decoded in browser memory with `createImageBitmap`.
- Live capture uses the browser's `getDisplayMedia` permission dialog.
- Image pixels and video frames are processed locally with WebGL2 or Canvas 2D.
- The app has no backend, analytics, storage, cookies, or third-party dependencies.
- A Content Security Policy sets `connect-src 'none'`, so the page cannot make network connections after its static files load.
- Closing the page, replacing an image, or stopping capture releases the associated browser resources.

## Use

1. Open the site in a current Chrome or Edge browser.
2. Load a full-map screenshot by choosing, dropping, or pasting an image; or select **Live capture** and choose the Forza Horizon window in the browser dialog.
3. Adjust **Road grey** and **Match tolerance** until unexplored road segments are isolated.
4. Use **Pick color from map** and click an unexplored road when the default grey does not match your map.
5. Switch between the original, result, and comparison views, then zoom and pan to inspect small segments.

For better results, hide map icons in the game and zoom out until the entire map is visible.

## Local access

ES Modules and screen capture work reliably through HTTP on `localhost`, not by double-clicking `index.html`. Serve this directory with any static server you already trust. For example, if Python is installed:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8080/`.

The static server only serves files from this directory. It is not part of the project and no installation is required.

## Manual verification

- Load PNG, JPEG, and WebP screenshots through the file picker, drag and drop, and clipboard paste.
- Replace one screenshot with another and confirm the new map renders at the correct dimensions.
- Start live capture, choose the game window, pause, resume, and stop it.
- Stop sharing from the browser's own sharing indicator and confirm the page reports that capture stopped.
- Change the target color, marker color, and tolerance and confirm the result updates immediately.
- Pick a color from the original map and confirm the target swatch changes.
- Check original, result, and comparison views at several comparison positions.
- Test wheel zoom, pointer drag, touch pinch, and **Fit view**.
- Switch between Chinese and English and test a narrow mobile viewport.
- In DevTools Network, clear the log after loading, then process an image and live video. No requests should appear.
- In DevTools, disable WebGL2 and confirm the page reports Canvas 2D fallback.

## GitHub Pages

No build is needed. Publish the repository root from the `main` branch in **Settings > Pages**, or use any equivalent static hosting. All module and asset paths are relative, so project Pages URLs such as `https://owner.github.io/repository/` are supported.

## Project structure

```text
index.html
styles.css
js/
  main.js
  i18n.js
  input/
    image-source.js
    capture-source.js
  render/
    color.js
    processor.js
  view/
    viewport.js
```