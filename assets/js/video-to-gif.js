(function () {
  const dom = {
    input: document.getElementById("videoInput"),
    dropZone: document.getElementById("dropZone"),
    controls: document.getElementById("controls"),
    startTime: document.getElementById("startTime"),
    endTime: document.getElementById("endTime"),
    startRange: document.getElementById("startRange"),
    endRange: document.getElementById("endRange"),
    resolution: document.getElementById("resolution"),
    frameRate: document.getElementById("frameRate"),
    durationLabel: document.getElementById("durationLabel"),
    selectionLabel: document.getElementById("selectionLabel"),
    convertButton: document.getElementById("convertButton"),
    downloadButton: document.getElementById("downloadButton"),
    progressText: document.getElementById("progressText"),
    progressPercent: document.getElementById("progressPercent"),
    progressBar: document.getElementById("progressBar"),
    previewStage: document.getElementById("previewStage"),
    sourcePreview: document.getElementById("sourcePreview"),
    gifPreview: document.getElementById("gifPreview"),
    outputMeta: document.getElementById("outputMeta")
  };

  let sourceUrl = "";
  let gifUrl = "";
  let loadedFileName = "";
  let isLoopingPreview = false;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${String(mins).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
  }

  function setProgress(value, label) {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    dom.progressBar.style.width = `${percent}%`;
    dom.progressPercent.textContent = `${percent}%`;
    if (label) dom.progressText.textContent = label;
  }

  function setReadyState(ready) {
    [dom.startTime, dom.endTime, dom.startRange, dom.endRange, dom.resolution, dom.frameRate].forEach((control) => {
      control.disabled = !ready;
    });
    dom.convertButton.disabled = !ready;
    dom.controls.classList.toggle("ready", ready);
  }

  function updateSelectionLabels() {
    const start = Number(dom.startTime.value);
    const end = Number(dom.endTime.value);
    const duration = Math.max(0, end - start);
    dom.selectionLabel.textContent = `${formatTime(start)} to ${formatTime(end)} (${duration.toFixed(1)}s)`;
    dom.outputMeta.textContent = loadedFileName ? `${loadedFileName} selected` : "Upload a video to begin";
  }

  function clampSelection(source) {
    const duration = dom.sourcePreview.duration || 0;
    let start = Number(dom.startTime.value);
    let end = Number(dom.endTime.value);

    start = Math.max(0, Math.min(start, Math.max(0, duration - 0.1)));
    end = Math.max(start + 0.1, Math.min(end, duration));

    if (source === "start") {
      end = Math.max(end, start + 0.1);
    }
    if (source === "end") {
      start = Math.min(start, end - 0.1);
    }

    dom.startTime.value = start.toFixed(1);
    dom.endTime.value = end.toFixed(1);
    dom.startRange.value = start.toFixed(1);
    dom.endRange.value = end.toFixed(1);
    updateSelectionLabels();
  }

  function resetDownload() {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifUrl = "";
    dom.gifPreview.removeAttribute("src");
    dom.previewStage.classList.remove("has-gif");
    dom.downloadButton.href = "#";
    dom.downloadButton.classList.add("disabled");
    dom.downloadButton.setAttribute("aria-disabled", "true");
  }

  function loadVideo(file) {
    resetDownload();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    loadedFileName = file.name;
    sourceUrl = URL.createObjectURL(file);
    dom.sourcePreview.src = sourceUrl;
    dom.sourcePreview.load();
    dom.previewStage.classList.add("has-video");
    dom.progressText.textContent = "Loading video";
    setProgress(0);
  }

  function syncFromRange(event) {
    const target = event.currentTarget;
    resetDownload();
    if (target === dom.startRange) dom.startTime.value = target.value;
    if (target === dom.endRange) dom.endTime.value = target.value;
    clampSelection(target === dom.startRange ? "start" : "end");
    previewFromStart();
  }

  function syncFromNumber(event) {
    const target = event.currentTarget;
    resetDownload();
    if (target === dom.startTime) dom.startRange.value = target.value;
    if (target === dom.endTime) dom.endRange.value = target.value;
    clampSelection(target === dom.startTime ? "start" : "end");
    previewFromStart();
  }

  function previewFromStart() {
    if (!Number.isFinite(dom.sourcePreview.duration)) return;
    dom.previewStage.classList.remove("has-gif");
    dom.previewStage.classList.add("has-video");
    dom.sourcePreview.currentTime = Number(dom.startTime.value);
    dom.sourcePreview.play().catch(() => {});
  }

  function setupPreviewLoop() {
    if (isLoopingPreview) return;
    isLoopingPreview = true;
    dom.sourcePreview.addEventListener("timeupdate", () => {
      const end = Number(dom.endTime.value);
      const start = Number(dom.startTime.value);
      if (dom.sourcePreview.currentTime >= end && Number.isFinite(end)) {
        dom.sourcePreview.currentTime = start;
        dom.sourcePreview.play().catch(() => {});
      }
    });
  }

  function waitForEvent(element, eventName) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        element.removeEventListener(eventName, onEvent);
        element.removeEventListener("error", onError);
      };
      const onEvent = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("The video could not be read by this browser."));
      };
      element.addEventListener(eventName, onEvent, { once: true });
      element.addEventListener("error", onError, { once: true });
    });
  }

  async function seekVideo(time) {
    const video = dom.sourcePreview;
    const maxTime = Math.max(0, (video.duration || 0) - 0.04);
    const target = Math.min(Math.max(0, time), maxTime);
    if (Math.abs(video.currentTime - target) < 0.025) return;
    const seeked = waitForEvent(video, "seeked");
    video.currentTime = target;
    await seeked;
  }

  function getOutputSize() {
    const sourceWidth = dom.sourcePreview.videoWidth || 480;
    const sourceHeight = dom.sourcePreview.videoHeight || 270;
    const selected = dom.resolution.value;
    const width = selected === "source" ? sourceWidth : Math.min(Number(selected), sourceWidth);
    const height = Math.max(1, Math.round((width / sourceWidth) * sourceHeight));
    return { width, height };
  }

  function createGlobalPalette() {
    const palette = new Uint8Array(256 * 3);
    let offset = 0;
    for (let r = 0; r < 8; r += 1) {
      for (let g = 0; g < 8; g += 1) {
        for (let b = 0; b < 4; b += 1) {
          palette[offset++] = Math.round((r * 255) / 7);
          palette[offset++] = Math.round((g * 255) / 7);
          palette[offset++] = Math.round((b * 255) / 3);
        }
      }
    }
    return palette;
  }

  function quantizeImageData(imageData) {
    const source = imageData.data;
    const indices = new Uint8Array(imageData.width * imageData.height);
    for (let i = 0, j = 0; i < source.length; i += 4, j += 1) {
      const r = source[i] >> 5;
      const g = source[i + 1] >> 5;
      const b = source[i + 2] >> 6;
      indices[j] = (r << 5) | (g << 2) | b;
    }
    return indices;
  }

  function lzwEncode(minCodeSize, indices) {
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    let nextCode = endCode + 1;
    let codeSize = minCodeSize + 1;
    let bitBuffer = 0;
    let bitCount = 0;
    const output = [];

    const writeCode = (code) => {
      bitBuffer |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        output.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    };

    const createDictionary = () => {
      const dictionary = new Map();
      for (let i = 0; i < clearCode; i += 1) {
        dictionary.set(String.fromCharCode(i), i);
      }
      return dictionary;
    };

    let dictionary = createDictionary();
    writeCode(clearCode);

    let phrase = String.fromCharCode(indices[0] || 0);
    for (let i = 1; i < indices.length; i += 1) {
      const character = String.fromCharCode(indices[i]);
      const phrasePlus = phrase + character;

      if (dictionary.has(phrasePlus)) {
        phrase = phrasePlus;
      } else {
        writeCode(dictionary.get(phrase));
        if (nextCode < 4096) {
          dictionary.set(phrasePlus, nextCode);
          nextCode += 1;
          if (nextCode === 1 << codeSize && codeSize < 12) {
            codeSize += 1;
          }
        } else {
          writeCode(clearCode);
          dictionary = createDictionary();
          nextCode = endCode + 1;
          codeSize = minCodeSize + 1;
        }
        phrase = character;
      }
    }

    writeCode(dictionary.get(phrase));
    writeCode(endCode);

    if (bitCount > 0) {
      output.push(bitBuffer & 0xff);
    }

    return output;
  }

  class GifWriter {
    constructor(width, height, frameDelay) {
      this.width = width;
      this.height = height;
      this.frameDelay = frameDelay;
      this.bytes = [];
      this.palette = createGlobalPalette();
      this.writeHeader();
    }

    writeString(value) {
      for (let i = 0; i < value.length; i += 1) {
        this.bytes.push(value.charCodeAt(i));
      }
    }

    writeShort(value) {
      this.bytes.push(value & 0xff, (value >> 8) & 0xff);
    }

    writeHeader() {
      this.writeString("GIF89a");
      this.writeShort(this.width);
      this.writeShort(this.height);
      this.bytes.push(0xf7, 0x00, 0x00);
      this.bytes.push(...this.palette);
      this.writeString("!\xff\u000bNETSCAPE2.0\u0003\u0001");
      this.writeShort(0);
      this.bytes.push(0);
    }

    writeSubBlocks(data) {
      for (let offset = 0; offset < data.length; offset += 255) {
        const chunk = data.slice(offset, offset + 255);
        this.bytes.push(chunk.length, ...chunk);
      }
      this.bytes.push(0);
    }

    addFrame(indices) {
      this.writeString("!\xf9\u0004");
      this.bytes.push(0x08);
      this.writeShort(this.frameDelay);
      this.bytes.push(0x00, 0x00);
      this.bytes.push(0x2c);
      this.writeShort(0);
      this.writeShort(0);
      this.writeShort(this.width);
      this.writeShort(this.height);
      this.bytes.push(0x00);
      this.bytes.push(8);
      this.writeSubBlocks(lzwEncode(8, indices));
    }

    finish() {
      this.bytes.push(0x3b);
      return new Blob([new Uint8Array(this.bytes)], { type: "image/gif" });
    }
  }

  async function convertToGif() {
    const start = Number(dom.startTime.value);
    const end = Number(dom.endTime.value);
    const fps = Number(dom.frameRate.value);
    const duration = Math.max(0.1, end - start);
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    const maxFrames = 220;

    if (frameCount > maxFrames) {
      setProgress(0, `Trim the clip or lower fps. Current selection would create ${frameCount} frames.`);
      return;
    }

    resetDownload();
    dom.convertButton.disabled = true;
    dom.sourcePreview.pause();
    dom.previewStage.classList.add("has-video");
    dom.previewStage.classList.remove("has-gif");

    const { width, height } = getOutputSize();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const delay = Math.max(2, Math.round(100 / fps));
    const writer = new GifWriter(width, height, delay);

    dom.outputMeta.textContent = `${width} x ${height} at ${fps} fps`;
    setProgress(2, "Preparing frames");

    try {
      for (let index = 0; index < frameCount; index += 1) {
        const position = frameCount === 1 ? start : start + (duration * index) / frameCount;
        await seekVideo(position);
        context.drawImage(dom.sourcePreview, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        writer.addFrame(quantizeImageData(imageData));
        setProgress(4 + ((index + 1) / frameCount) * 90, `Encoding frame ${index + 1} of ${frameCount}`);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      const blob = writer.finish();
      gifUrl = URL.createObjectURL(blob);
      dom.gifPreview.src = gifUrl;
      dom.downloadButton.href = gifUrl;
      dom.downloadButton.download = `${loadedFileName.replace(/\.[^.]+$/, "") || "toolbox-video"}.gif`;
      dom.downloadButton.classList.remove("disabled");
      dom.downloadButton.setAttribute("aria-disabled", "false");
      dom.previewStage.classList.remove("has-video");
      dom.previewStage.classList.add("has-gif");
      setProgress(100, `GIF ready (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      setProgress(0, error.message || "Conversion failed");
    } finally {
      dom.convertButton.disabled = false;
      await seekVideo(start).catch(() => {});
    }
  }

  function setupEvents() {
    dom.input.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) loadVideo(file);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dom.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dom.dropZone.classList.add("dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dom.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dom.dropZone.classList.remove("dragging");
      });
    });

    dom.dropZone.addEventListener("drop", (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) {
        dom.input.files = event.dataTransfer.files;
        loadVideo(file);
      }
    });

    dom.sourcePreview.addEventListener("loadedmetadata", () => {
      const duration = dom.sourcePreview.duration || 0;
      const defaultEnd = Math.min(duration, 5);
      [dom.startRange, dom.endRange].forEach((range) => {
        range.max = duration.toFixed(1);
      });
      dom.startTime.max = duration.toFixed(1);
      dom.endTime.max = duration.toFixed(1);
      dom.startTime.value = "0.0";
      dom.startRange.value = "0.0";
      dom.endTime.value = defaultEnd.toFixed(1);
      dom.endRange.value = defaultEnd.toFixed(1);
      dom.durationLabel.textContent = `${formatTime(duration)} total`;
      setReadyState(true);
      setProgress(0, "Ready to convert");
      updateSelectionLabels();
      setupPreviewLoop();
      previewFromStart();
    });

    [dom.startRange, dom.endRange].forEach((range) => range.addEventListener("input", syncFromRange));
    [dom.startTime, dom.endTime].forEach((input) => input.addEventListener("input", syncFromNumber));
    [dom.resolution, dom.frameRate].forEach((control) => {
      control.addEventListener("change", () => {
        resetDownload();
        const { width, height } = getOutputSize();
        dom.outputMeta.textContent = `${width} x ${height} at ${dom.frameRate.value} fps`;
      });
    });
    dom.convertButton.addEventListener("click", convertToGif);
  }

  if (dom.input) {
    setupEvents();
    setReadyState(false);
  }
})();
