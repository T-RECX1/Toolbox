(function () {
  const dom = {
    input: document.getElementById("asciiInput"),
    drop: document.getElementById("asciiDrop"),
    cellSize: document.getElementById("asciiCellSize"),
    font: document.getElementById("asciiFont"),
    charset: document.getElementById("asciiCharset"),
    invert: document.getElementById("asciiInvert"),
    run: document.getElementById("asciiRun"),
    reset: document.getElementById("asciiReset"),
    copy: document.getElementById("asciiCopy"),
    status: document.getElementById("asciiStatus"),
    progress: document.getElementById("asciiProgressBar"),
    progressValue: document.getElementById("asciiProgressValue"),
    iterations: document.getElementById("asciiIterations"),
    error: document.getElementById("asciiError"),
    gridSize: document.getElementById("asciiGridSize"),
    meta: document.getElementById("asciiOutputMeta"),
    toast: document.getElementById("asciiToast"),
    sourceCanvas: document.getElementById("asciiSourceCanvas"),
    outputCanvas: document.getElementById("asciiOutputCanvas"),
    errorCanvas: document.getElementById("asciiErrorCanvas"),
    sourceEmpty: document.getElementById("asciiSourceEmpty"),
    outputEmpty: document.getElementById("asciiOutputEmpty"),
    errorEmpty: document.getElementById("asciiErrorEmpty")
  };

  if (!dom.input) return;

  const sourceCtx = dom.sourceCanvas.getContext("2d", { willReadFrequently: true });
  const outputCtx = dom.outputCanvas.getContext("2d");
  const errorCtx = dom.errorCanvas.getContext("2d");

  const charSets = {
    dense: "@#MW&8%BQ0gD$S5Z2?!*+=-;:,. ",
    classic: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
    soft: "█▓▒░@%#*+=-:. "
  };

  const maxImageEdge = 620;
  const attemptsPerFrame = 1400;

  let sourceImage = null;
  let activeUrl = "";
  let running = false;
  let rafId = 0;
  let glyphWidth = 8;
  let glyphHeight = 12;
  let columns = 0;
  let rows = 0;
  let iterationCount = 0;
  let totalError = 0;
  let targetCells = [];
  let glyphCache = new Map();
  let characters = [];
  let textGrid = [];
  let errorGrid = [];

  function setProgress(value, message) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    dom.progress.style.width = `${clamped}%`;
    dom.progressValue.textContent = `${clamped}%`;
    if (message) dom.status.textContent = message;
  }

  function showCanvasState(ready) {
    [dom.sourceCanvas, dom.outputCanvas, dom.errorCanvas].forEach((canvas) => {
      canvas.classList.toggle("visible", ready);
    });
    [dom.sourceEmpty, dom.outputEmpty, dom.errorEmpty].forEach((node) => {
      node.hidden = ready;
    });
  }

  function toggleControls(ready) {
    dom.run.disabled = !ready;
    dom.reset.disabled = !ready;
    dom.copy.disabled = !ready;
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1800);
  }

  function stop() {
    running = false;
    dom.run.textContent = "Start";
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function fitImageSize(width, height) {
    if (width <= maxImageEdge && height <= maxImageEdge) {
      return { width, height };
    }
    const ratio = width > height ? maxImageEdge / width : maxImageEdge / height;
    return {
      width: Math.max(1, Math.floor(width * ratio)),
      height: Math.max(1, Math.floor(height * ratio))
    };
  }

  function measureGlyph() {
    glyphHeight = Math.max(5, Math.min(28, Number(dom.cellSize.value) || 12));
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d", { willReadFrequently: true });
    measureCtx.font = `${glyphHeight}px ${dom.font.value}`;
    measureCtx.textBaseline = "top";
    glyphWidth = Math.max(3, Math.ceil(measureCtx.measureText("M").width));
  }

  function readTargetCells(imageData, canvasWidth) {
    targetCells = [];
    for (let row = 0; row < rows; row += 1) {
      targetCells[row] = [];
      for (let col = 0; col < columns; col += 1) {
        const patch = new Uint8Array(glyphWidth * glyphHeight);
        let patchIndex = 0;
        for (let y = 0; y < glyphHeight; y += 1) {
          for (let x = 0; x < glyphWidth; x += 1) {
            const pixelIndex = ((row * glyphHeight + y) * canvasWidth + col * glyphWidth + x) * 4;
            let value =
              imageData[pixelIndex] * 0.299 +
              imageData[pixelIndex + 1] * 0.587 +
              imageData[pixelIndex + 2] * 0.114;
            if (dom.invert.checked) value = 255 - value;
            patch[patchIndex] = value;
            patchIndex += 1;
          }
        }
        targetCells[row][col] = patch;
      }
    }
  }

  function buildGlyphCache() {
    glyphCache = new Map();
    characters = Array.from(charSets[dom.charset.value] || charSets.dense);

    const canvas = document.createElement("canvas");
    canvas.width = glyphWidth;
    canvas.height = glyphHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.textBaseline = "top";
    ctx.font = `${glyphHeight}px ${dom.font.value}`;

    characters.forEach((char) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, glyphWidth, glyphHeight);
      ctx.fillStyle = "#fff";
      ctx.fillText(char, 0, 0);

      const pixels = ctx.getImageData(0, 0, glyphWidth, glyphHeight).data;
      const patch = new Uint8Array(glyphWidth * glyphHeight);
      for (let i = 0; i < patch.length; i += 1) {
        patch[i] = pixels[i * 4];
      }
      glyphCache.set(char, patch);
    });
  }

  function patchError(targetPatch, glyphPatch) {
    let error = 0;
    for (let i = 0; i < targetPatch.length; i += 1) {
      error += Math.abs(targetPatch[i] - glyphPatch[i]);
    }
    return error;
  }

  function drawCell(row, col, char, targetPatch, glyphPatch) {
    const x = col * glyphWidth;
    const y = row * glyphHeight;

    outputCtx.fillStyle = "#000";
    outputCtx.fillRect(x, y, glyphWidth, glyphHeight);
    outputCtx.fillStyle = "#fff";
    outputCtx.fillText(char, x, y);

    const heat = errorCtx.createImageData(glyphWidth, glyphHeight);
    for (let i = 0; i < targetPatch.length; i += 1) {
      const diff = Math.abs(targetPatch[i] - glyphPatch[i]);
      heat.data[i * 4] = diff;
      heat.data[i * 4 + 1] = Math.max(0, diff * 0.08);
      heat.data[i * 4 + 2] = Math.min(120, diff * 0.28);
      heat.data[i * 4 + 3] = 255;
    }
    errorCtx.putImageData(heat, x, y);
  }

  function updateStats() {
    const pixelCount = Math.max(1, columns * rows * glyphWidth * glyphHeight);
    const average = totalError / pixelCount;
    dom.iterations.textContent = iterationCount.toLocaleString();
    dom.error.textContent = average.toFixed(2);
    dom.gridSize.textContent = `${columns}x${rows}`;
    dom.meta.textContent = `${columns} columns, ${rows} rows`;
    setProgress(Math.max(0, 100 - average / 2.55));
  }

  function seedGrid() {
    textGrid = [];
    errorGrid = [];
    totalError = 0;
    outputCtx.font = `${glyphHeight}px ${dom.font.value}`;
    outputCtx.textBaseline = "top";
    outputCtx.fillStyle = "#000";
    outputCtx.fillRect(0, 0, dom.outputCanvas.width, dom.outputCanvas.height);
    errorCtx.fillStyle = "#000";
    errorCtx.fillRect(0, 0, dom.errorCanvas.width, dom.errorCanvas.height);

    for (let row = 0; row < rows; row += 1) {
      textGrid[row] = [];
      errorGrid[row] = [];
      for (let col = 0; col < columns; col += 1) {
        const char = characters[Math.floor(Math.random() * characters.length)];
        const glyph = glyphCache.get(char);
        const error = patchError(targetCells[row][col], glyph);
        textGrid[row][col] = char;
        errorGrid[row][col] = error;
        totalError += error;
        drawCell(row, col, char, targetCells[row][col], glyph);
      }
    }
  }

  function prepare() {
    if (!sourceImage) return;
    stop();
    measureGlyph();

    const fitted = fitImageSize(sourceImage.naturalWidth, sourceImage.naturalHeight);
    columns = Math.max(1, Math.floor(fitted.width / glyphWidth));
    rows = Math.max(1, Math.floor(fitted.height / glyphHeight));
    const width = columns * glyphWidth;
    const height = rows * glyphHeight;

    [dom.sourceCanvas, dom.outputCanvas, dom.errorCanvas].forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });

    sourceCtx.drawImage(sourceImage, 0, 0, width, height);
    const sourceData = sourceCtx.getImageData(0, 0, width, height);
    if (dom.invert.checked) {
      for (let i = 0; i < sourceData.data.length; i += 4) {
        sourceData.data[i] = 255 - sourceData.data[i];
        sourceData.data[i + 1] = 255 - sourceData.data[i + 1];
        sourceData.data[i + 2] = 255 - sourceData.data[i + 2];
      }
      sourceCtx.putImageData(sourceData, 0, 0);
    }

    readTargetCells(sourceData.data, width);
    buildGlyphCache();
    iterationCount = 0;
    seedGrid();
    showCanvasState(true);
    toggleControls(true);
    updateStats();
    setProgress(0, "Ready to evolve");
  }

  function tryMutation() {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * columns);
    const current = textGrid[row][col];
    const candidate = characters[Math.floor(Math.random() * characters.length)];
    if (candidate === current) return;

    const target = targetCells[row][col];
    const candidatePatch = glyphCache.get(candidate);
    const candidateError = patchError(target, candidatePatch);
    const currentError = errorGrid[row][col];

    if (candidateError < currentError) {
      textGrid[row][col] = candidate;
      errorGrid[row][col] = candidateError;
      totalError += candidateError - currentError;
      drawCell(row, col, candidate, target, candidatePatch);
    }
  }

  function evolve() {
    if (!running) return;
    for (let i = 0; i < attemptsPerFrame; i += 1) {
      tryMutation();
    }
    iterationCount += attemptsPerFrame;
    if (iterationCount % (attemptsPerFrame * 4) === 0) {
      updateStats();
      dom.status.textContent = "Evolving character field";
    }
    rafId = requestAnimationFrame(evolve);
  }

  function loadImage(file) {
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      sourceImage = image;
      prepare();
    };
    image.src = activeUrl;
    setProgress(0, "Loading image");
  }

  function copyText() {
    if (!textGrid.length) return;
    const text = textGrid.map((row) => row.join("")).join("\n");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => toast("ASCII copied"),
        () => fallbackCopy(text)
      );
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    toast(copied ? "ASCII copied" : "Copy failed");
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

  [dom.cellSize, dom.font, dom.charset, dom.invert].forEach((control) => {
    control.addEventListener("change", prepare);
  });

  dom.run.addEventListener("click", () => {
    running = !running;
    dom.run.textContent = running ? "Pause" : "Start";
    if (running) evolve();
  });

  dom.reset.addEventListener("click", prepare);
  dom.copy.addEventListener("click", copyText);
  showCanvasState(false);
  toggleControls(false);
})();
