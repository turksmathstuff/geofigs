export function createBackgroundImageWorkflow(ctx) {
  const { store, boardController, makeId, runMutation, setBackgroundImageAsset, showNotice } = ctx;

  function fitBackgroundImageToBoard(naturalWidth, naturalHeight) {
    const bbox = boardController.getBoardBBox();
    const minX = Math.min(bbox[0], bbox[2]);
    const maxX = Math.max(bbox[0], bbox[2]);
    const minY = Math.min(bbox[1], bbox[3]);
    const maxY = Math.max(bbox[1], bbox[3]);
    const boardWidth = Math.max(0.0001, maxX - minX);
    const boardHeight = Math.max(0.0001, maxY - minY);
    const imageAspect = Math.max(0.0001, Number(naturalWidth) || 0) / Math.max(0.0001, Number(naturalHeight) || 0);
    const boardAspect = boardWidth / boardHeight;

    let width = boardWidth;
    let height = boardHeight;
    if (imageAspect > boardAspect) {
      height = width / imageAspect;
    } else {
      width = height * imageAspect;
    }

    const x = minX + (boardWidth - width) / 2;
    const y = minY + (boardHeight - height) / 2;
    return { x, y, width, height };
  }

  function readImageFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read the image file."));
      reader.readAsDataURL(file);
    });
  }

  function getImageDimensions(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      img.onerror = () => reject(new Error("Unable to load the uploaded image."));
      img.src = src;
    });
  }

  async function uploadBackgroundImageFromFile(file) {
    if (!file) {
      return;
    }
    if (!file.type?.startsWith("image/")) {
      showNotice("Please choose an image file.");
      return;
    }
    try {
      const src = await readImageFileAsDataUrl(file);
      const { naturalWidth, naturalHeight } = await getImageDimensions(src);
      const placement = fitBackgroundImageToBoard(naturalWidth, naturalHeight);
      const assetId = makeId("bg");
      setBackgroundImageAsset(assetId, src);
      runMutation("upload-background-image", () => {
        store.doc.canvas.backgroundImage = {
          assetId,
          naturalWidth,
          naturalHeight,
          opacity: 1,
          ...placement,
        };
      });
    } catch (err) {
      showNotice(err.message || "Unable to load the image.");
    }
  }

  function clearBackgroundImage() {
    if (!store.doc.canvas?.backgroundImage) {
      return;
    }
    runMutation("clear-background-image", () => {
      store.doc.canvas.backgroundImage = null;
    });
  }

  return { uploadBackgroundImageFromFile, clearBackgroundImage };
}
