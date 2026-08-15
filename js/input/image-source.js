export async function decodeImageFile(file) {
  if (!(file instanceof Blob) || !file.type.startsWith("image/")) {
    throw new TypeError("IMAGE_TYPE");
  }

  return createImageBitmap(file, {
    imageOrientation: "from-image",
    premultiplyAlpha: "default"
  });
}

export function imageFromClipboard(event) {
  const items = Array.from(event.clipboardData?.items ?? []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  return imageItem?.getAsFile() ?? null;
}