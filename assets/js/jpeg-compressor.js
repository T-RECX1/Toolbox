(function () {
  const dom = {
    input: document.getElementById("jpegInput"),
    drop: document.getElementById("jpegDrop"),
    canvas: document.getElementById("jpegCanvas"),
    empty: document.getElementById("jpegEmpty"),
    quality: document.getElementById("jpegQuality"),
    detail: document.getElementById("jpegDetail"),
    scale: document.getElementById("jpegScale"),
    passes: document.getElementById("jpegPasses"),
    contrast: document.getElementById("jpegContrast"),
    saturation: document.getElementById("jpegSaturation"),
    qualityValue: document.getElementById("jpegQualityValue"),
    detailValue: document.getElementById("jpegDetailValue"),
    scaleValue: document.getElementById("jpegScaleValue"),
    passesValue: document.getElementById("jpegPassesValue"),
    contrastValue: document.getElementById("jpegContrastValue"),
    saturationValue: document.getElementById("jpegSaturationValue"),
    originalSize: document.getElementById("jpegOriginalSize"),
    outputSize: document.getElementById("jpegOutputSize"),
    savings: document.getElementById("jpegSavings"),
    status: document.getElementById("jpegStatus"),
    dimensions: document.getElementById("jpegDimensions"),
    progress: document.getElementById("jpegProgress"),
    meta: document.getElementById("jpegMeta"),
    download: document.getElementById("jpegDownload"),
    reset: document.getElementById("jpegReset")
  };

  if (!dom.input) return;

  const ctx = dom.canvas.getContext("2d");
  let sourceImage = null;
  let sourceName = "compressed-image";
  let sourceBytes = 0;
  let renderTimer = 0;
  let isRendering = false;
  let pendingRender = false;
  let outputUrl = "";
  let outputBlob = null;

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
  }

  function setProgress(value, message) {
    dom.progress.style.width = `${Math.max(0, Math.min(100, Math.round(value)))}%`;
    if (message) dom.status.textContent = message;
  }

  function updateLabels() {
    dom.qualityValue.textContent = `${Math.round(Number(dom.quality.value) * 100)}%`;
    dom.detailValue.textContent = `${Math.round(Number(dom.detail.value) * 100)}%`;
    dom.scaleValue.textContent = `${Math.round(Number(dom.scale.value) * 100)}%`;
    dom.passesValue.textContent = dom.passes.value;
    dom.contrastValue.textContent = `${dom.contrast.value}%`;
    dom.saturationValue.textContent = `${dom.saturation.value}%`;
  }

  function canvasToBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    });
  }

  function loadBlobAsImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not decode compressed image."));
      };
      image.src = url;
    });
  }

  async function render() {
    if (!sourceImage) return;
    if (isRendering) {
      pendingRender = true;
      return;
    }

    isRendering = true;
    pendingRender = false;
    try {
      setProgress(12, "Preparing compression");

      const quality = Number(dom.quality.value);
      const detail = Number(dom.detail.value);
      const scale = Number(dom.scale.value);
      const passes = Number(dom.passes.value);
      const finalWidth = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
      const finalHeight = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
      const workingWidth = Math.max(1, Math.round(sourceImage.naturalWidth * detail));
      const workingHeight = Math.max(1, Math.round(sourceImage.naturalHeight * detail));

      const workCanvas = document.createElement("canvas");
      workCanvas.width = workingWidth;
      workCanvas.height = workingHeight;
      const workCtx = workCanvas.getContext("2d");
      workCtx.fillStyle = "#fff";
      workCtx.fillRect(0, 0, workingWidth, workingHeight);
      workCtx.drawImage(sourceImage, 0, 0, workingWidth, workingHeight);

      let blob = await canvasToBlob(workCanvas, quality);
      if (!blob) throw new Error("JPEG encoding failed.");
      setProgress(36, "Encoding JPEG pass 1");

      for (let pass = 2; pass <= passes; pass += 1) {
        const image = await loadBlobAsImage(blob);
        workCtx.clearRect(0, 0, workingWidth, workingHeight);
        workCtx.fillStyle = "#fff";
        workCtx.fillRect(0, 0, workingWidth, workingHeight);
        workCtx.drawImage(image, 0, 0, workingWidth, workingHeight);
        blob = await canvasToBlob(workCanvas, quality);
        if (!blob) throw new Error("JPEG encoding failed.");
        setProgress(36 + (pass / passes) * 34, `Encoding JPEG pass ${pass}`);
      }

      const compressedImage = await loadBlobAsImage(blob);
      dom.canvas.width = finalWidth;
      dom.canvas.height = finalHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.filter = `contrast(${dom.contrast.value}%) saturate(${dom.saturation.value}%)`;
      ctx.clearRect(0, 0, finalWidth, finalHeight);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, finalWidth, finalHeight);
      ctx.drawImage(compressedImage, 0, 0, finalWidth, finalHeight);
      ctx.filter = "none";

      outputBlob = await canvasToBlob(dom.canvas, Math.max(0.01, Math.min(0.95, quality)));
      if (!outputBlob) throw new Error("Output encoding failed.");
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(outputBlob);

      dom.canvas.classList.add("visible");
      dom.empty.hidden = true;
      dom.download.disabled = false;
      dom.reset.disabled = false;
      dom.originalSize.textContent = formatBytes(sourceBytes);
      dom.outputSize.textContent = formatBytes(outputBlob.size);
      const saved = sourceBytes ? Math.max(-999, Math.round((1 - outputBlob.size / sourceBytes) * 100)) : 0;
      dom.savings.textContent = `${saved}%`;
      dom.dimensions.textContent = `${finalWidth} x ${finalHeight}`;
      dom.meta.textContent = `${workingWidth} x ${workingHeight} working grid`;
      setProgress(100, "JPEG ready");
    } catch (error) {
      setProgress(0, error.message || "Compression failed");
    } finally {
      isRendering = false;
      if (pendingRender) scheduleRender();
    }
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 90);
  }

  function loadImage(file) {
    sourceBytes = file.size;
    sourceName = file.name.replace(/\.[^.]+$/, "") || "compressed-image";
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        sourceImage = image;
        dom.download.disabled = true;
        dom.reset.disabled = false;
        setProgress(0, "Image loaded");
        scheduleRender();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    dom.quality.value = "0.72";
    dom.detail.value = "1";
    dom.scale.value = "1";
    dom.passes.value = "1";
    dom.contrast.value = "100";
    dom.saturation.value = "100";
    updateLabels();
    scheduleRender();
  }

  function download() {
    if (!outputUrl) return;
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `${sourceName}-compressed.jpg`;
    link.click();
  }

  dom.input.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) loadImage(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dom.drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.drop.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dom.drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.drop.classList.remove("dragging");
    });
  });

  dom.drop.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) loadImage(file);
  });

  [dom.quality, dom.detail, dom.scale, dom.passes, dom.contrast, dom.saturation].forEach((control) => {
    control.addEventListener("input", () => {
      updateLabels();
      scheduleRender();
    });
  });

  dom.download.addEventListener("click", download);
  dom.reset.addEventListener("click", reset);
  dom.download.disabled = true;
  dom.reset.disabled = true;
  updateLabels();
})();
