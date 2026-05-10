(function () {
  const $ = (id) => document.getElementById(id);
  const dom = {
    canvas: $("qrCanvas"),
    stage: $("qrPreviewStage"),
    title: $("qrPreviewTitle"),
    version: $("qrVersionInfo"),
    toast: $("qrToast"),
    safetyLabel: $("qrSafetyLabel"),
    safetyScore: $("qrSafetyScore"),
    safetyBar: $("qrSafetyBar"),
    warnings: $("qrWarnings"),
    payloadSize: $("qrPayloadSize"),
    complexity: $("qrComplexity"),
    fileName: $("qrFileName"),
    exportSize: $("qrExportSize"),
    exportTarget: $("qrExportTarget"),
    exportPng: $("qrExportPng"),
    exportSvg: $("qrExportSvg"),
    copyImage: $("qrCopyImage"),
    logoInput: $("qrLogoInput"),
    logoDrop: $("qrLogoDrop"),
    removeLogo: $("qrRemoveLogo"),
    optimize: $("qrOptimize"),
    randomize: $("qrRandomize")
  };

  if (!dom.canvas) return;

  const ctx = dom.canvas.getContext("2d");
  const encoder = createQrEncoder();
  const state = {
    panel: "content",
    type: "url",
    preview: "raw",
    logoImage: null,
    logoDataUrl: "",
    matrix: null,
    payload: ""
  };

  function controls() {
    return {
      moduleShape: $("qrModuleShape").value,
      roundness: Number($("qrRoundness").value),
      gap: Number($("qrGap").value),
      quiet: Number($("qrQuiet").value),
      foreground: $("qrForeground").value,
      background: $("qrBackground").value,
      gradientTo: $("qrGradientTo").value,
      gradient: $("qrGradient").value,
      gradientAngle: Number($("qrGradientAngle").value),
      transparent: $("qrTransparent").checked,
      eyeOuter: $("qrEyeOuter").value,
      eyeInner: $("qrEyeInner").value,
      eyeOuterColor: $("qrEyeOuterColor").value,
      eyeInnerColor: $("qrEyeInnerColor").value,
      eyeGlow: $("qrEyeGlow").checked,
      logoSize: Number($("qrLogoSize").value),
      logoPadding: Number($("qrLogoPadding").value),
      logoOpacity: Number($("qrLogoOpacity").value),
      logoPlate: $("qrLogoPlate").value,
      logoPlateColor: $("qrLogoPlateColor").value,
      logoShadow: $("qrLogoShadow").checked,
      frameOn: $("qrFrameOn").checked,
      frameStyle: $("qrFrameStyle").value,
      frameLabel: $("qrFrameLabel").value,
      frameSubtitle: $("qrFrameSubtitle").value,
      framePadding: Number($("qrFramePadding").value),
      border: Number($("qrBorder").value),
      frameRadius: Number($("qrFrameRadius").value),
      frameColor: $("qrFrameColor").value,
      frameTextColor: $("qrFrameTextColor").value,
      errorLevel: $("qrErrorLevel").value,
      safeMode: $("qrSafeMode").checked
    };
  }

  function effectiveOptions(raw) {
    if (!raw.safeMode) return raw;
    return {
      ...raw,
      gap: Math.min(raw.gap, 0.16),
      quiet: Math.max(raw.quiet, 4),
      logoSize: Math.min(raw.logoSize, 0.18),
      roundness: Math.min(raw.roundness, 0.76),
      errorLevel: raw.logoSize > 0 ? "H" : raw.errorLevel
    };
  }

  function escapeWifi(value) {
    return String(value).replace(/([\\;,:"])/g, "\\$1");
  }

  function icsDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function buildPayload() {
    const value = (id) => ($(id) ? $(id).value.trim() : "");
    switch (state.type) {
      case "url":
        return value("qrUrl") || "https://example.com";
      case "text":
        return value("qrText");
      case "email": {
        const params = new URLSearchParams();
        if (value("qrEmailSubject")) params.set("subject", value("qrEmailSubject"));
        if (value("qrEmailBody")) params.set("body", value("qrEmailBody"));
        const query = params.toString();
        return `mailto:${value("qrEmail")}${query ? `?${query}` : ""}`;
      }
      case "phone":
        return `tel:${value("qrPhone")}`;
      case "sms": {
        const body = value("qrSmsBody");
        return `sms:${value("qrSmsPhone")}${body ? `?body=${encodeURIComponent(body)}` : ""}`;
      }
      case "wifi": {
        const security = $("qrWifiSecurity").value;
        const hidden = $("qrWifiHidden").checked ? "true" : "false";
        return `WIFI:T:${security};S:${escapeWifi(value("qrWifiSsid"))};P:${escapeWifi(value("qrWifiPassword"))};H:${hidden};;`;
      }
      case "vcard":
        return [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${value("qrVName")}`,
          `ORG:${value("qrVCompany")}`,
          `TITLE:${value("qrVTitle")}`,
          `TEL:${value("qrVPhone")}`,
          `EMAIL:${value("qrVEmail")}`,
          `URL:${value("qrVWebsite")}`,
          `ADR:;;${value("qrVAddress")}`,
          "END:VCARD"
        ].join("\n");
      case "location":
        return $("qrMapLink").checked
          ? `https://maps.google.com/?q=${encodeURIComponent(`${value("qrLat")},${value("qrLng")}`)}`
          : `geo:${value("qrLat")},${value("qrLng")}`;
      case "event":
        return [
          "BEGIN:VEVENT",
          `SUMMARY:${value("qrEventTitle")}`,
          `LOCATION:${value("qrEventLocation")}`,
          `DTSTART:${icsDate($("qrEventStart").value)}`,
          `DTEND:${icsDate($("qrEventEnd").value)}`,
          `DESCRIPTION:${value("qrEventNotes")}`,
          "END:VEVENT"
        ].join("\n");
      case "app":
        return value("qrAppLink");
      case "clipboard":
        return value("qrClipboard");
      case "raw":
        return value("qrRaw");
      default:
        return "https://example.com";
    }
  }

  function scheduleRender() {
    window.clearTimeout(scheduleRender.timer);
    scheduleRender.timer = window.setTimeout(render, 35);
  }

  function render() {
    updateLabels();
    const raw = controls();
    const options = effectiveOptions(raw);
    const payload = buildPayload();
    state.payload = payload;

    try {
      state.matrix = encoder.encode(payload, options.errorLevel);
      renderToCanvas(dom.canvas, previewSize(), state.preview === "framed" ? "framed" : state.preview, options, state.matrix);
      updateSafety(raw, options, payload, state.matrix);
      dom.version.textContent = `Version ${state.matrix.version} | ${state.matrix.size} x ${state.matrix.size}`;
      dom.payloadSize.textContent = `${payload.length} chars`;
      dom.complexity.textContent = payload.length < 80 ? "Low" : payload.length < 180 ? "Medium" : "High";
    } catch (error) {
      ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
      dom.version.textContent = "Payload too large";
      dom.warnings.innerHTML = `<p>${error.message}</p>`;
      dom.safetyLabel.textContent = "Poor";
      dom.safetyScore.textContent = "0";
      dom.safetyBar.style.width = "0%";
    }
  }

  function previewSize() {
    if (state.preview === "small") return 320;
    if (state.preview === "phone") return 760;
    return 920;
  }

  function updateLabels() {
    const set = (id, text) => {
      const node = $(id);
      if (node) node.textContent = text;
    };
    set("qrRoundnessValue", `${Math.round(Number($("qrRoundness").value) * 100)}%`);
    set("qrGapValue", `${Math.round(Number($("qrGap").value) * 100)}%`);
    set("qrQuietValue", $("qrQuiet").value);
    set("qrAngleValue", `${$("qrGradientAngle").value}deg`);
    set("qrLogoSizeValue", `${Math.round(Number($("qrLogoSize").value) * 100)}%`);
    set("qrLogoPaddingValue", `${Math.round(Number($("qrLogoPadding").value) * 100)}%`);
    set("qrLogoOpacityValue", `${Math.round(Number($("qrLogoOpacity").value) * 100)}%`);
    set("qrFramePaddingValue", $("qrFramePadding").value);
    set("qrBorderValue", $("qrBorder").value);
    set("qrFrameRadiusValue", $("qrFrameRadius").value);
  }

  function updateSafety(raw, options, payload, matrix) {
    const bg = raw.transparent ? "#ffffff" : raw.background;
    const contrast = contrastRatio(raw.foreground, bg);
    const warnings = [];
    let score = 100;

    if (contrast < 4.5) {
      score -= 32;
      warnings.push("Foreground/background contrast is weak.");
    } else if (contrast < 7) {
      score -= 10;
      warnings.push("Contrast is acceptable, but higher is safer.");
    }
    if (raw.quiet < 4) {
      score -= 18;
      warnings.push("Quiet zone is below the recommended 4 modules.");
    }
    if (raw.gap > 0.22) {
      score -= 16;
      warnings.push("Large module gaps can make the code harder to scan.");
    }
    if (raw.logoSize > 0.22 && state.logoImage) {
      score -= 22;
      warnings.push("Logo is large. High error correction is strongly recommended.");
    }
    if (raw.logoSize > 0.18 && raw.errorLevel !== "H" && state.logoImage) {
      score -= 18;
      warnings.push("Use H error correction when embedding larger logos.");
    }
    if (payload.length > 220) {
      score -= 10;
      warnings.push("Dense payload. Consider fewer style effects for small print sizes.");
    }
    if (matrix.version >= 9 && state.preview === "small") {
      score -= 8;
      warnings.push("High-density QR may be risky at small sizes.");
    }
    if (raw.safeMode && (raw.gap !== options.gap || raw.logoSize !== options.logoSize || raw.quiet !== options.quiet)) {
      warnings.push("Safe mode is clamping risky styling in the live preview.");
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    dom.safetyScore.textContent = String(score);
    dom.safetyBar.style.width = `${score}%`;
    dom.safetyLabel.textContent = score >= 86 ? "Excellent" : score >= 70 ? "Good" : score >= 46 ? "Risky" : "Poor";
    dom.warnings.innerHTML = warnings.length
      ? warnings.map((warning) => `<p>${warning}</p>`).join("")
      : "<p>Scan safety looks strong.</p>";
  }

  function renderToCanvas(canvas, size, target, options, matrix) {
    const framed = target === "framed" || (target !== "raw" && target !== "transparent" && options.frameOn && state.preview !== "raw");
    const transparent = target === "transparent" || options.transparent;
    const pixelRatio = 1;
    const w = size * pixelRatio;
    const h = framed ? Math.round(size * 1.18) : size;
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, w, h);

    const previewBg = state.preview === "light" ? "#f7f7f4" : "#000000";
    if (!transparent) {
      c.fillStyle = framed ? options.frameColor : options.background;
      if (framed) {
        roundRect(c, 0, 0, w, h, options.frameRadius + 12);
        c.fill();
      } else {
        c.fillRect(0, 0, w, h);
      }
    } else if (state.preview !== "raw") {
      c.fillStyle = previewBg;
      c.fillRect(0, 0, w, h);
    }

    let qrSize = framed ? size - options.framePadding * 2 : size;
    const labelSpace = framed ? 118 : 0;
    qrSize = Math.max(220, qrSize - labelSpace * 0.35);
    const qrX = framed ? (w - qrSize) / 2 : 0;
    const qrY = framed ? options.framePadding + 12 : 0;

    if (framed) {
      c.strokeStyle = options.frameTextColor;
      c.globalAlpha = 0.22;
      c.lineWidth = options.border;
      if (options.border > 0) {
        roundRect(c, 10, 10, w - 20, h - 20, options.frameRadius);
        c.stroke();
      }
      c.globalAlpha = 1;
    }

    drawQr(c, matrix, qrX, qrY, qrSize, options, transparent && target === "transparent");

    if (framed) {
      c.fillStyle = options.frameTextColor;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "700 48px system-ui, sans-serif";
      c.fillText(options.frameLabel || "Scan me", w / 2, qrY + qrSize + 54);
      if (options.frameSubtitle) {
        c.globalAlpha = 0.68;
        c.font = "500 24px system-ui, sans-serif";
        c.fillText(options.frameSubtitle, w / 2, qrY + qrSize + 92);
        c.globalAlpha = 1;
      }
    }
  }

  function drawQr(c, matrix, x, y, size, options, transparent) {
    const n = matrix.size;
    const quiet = options.quiet;
    const cell = size / (n + quiet * 2);
    const ox = x + quiet * cell;
    const oy = y + quiet * cell;

    if (!transparent) {
      c.fillStyle = options.background;
      c.fillRect(x, y, size, size);
    }

    const fill = moduleFill(c, x, y, size, options);
    c.fillStyle = fill;
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (!matrix.modules[row][col] || isFinderCell(matrix.size, col, row)) continue;
        drawModule(c, ox + col * cell, oy + row * cell, cell, options);
      }
    }

    drawEye(c, ox, oy, cell, options);
    drawEye(c, ox + (n - 7) * cell, oy, cell, options);
    drawEye(c, ox, oy + (n - 7) * cell, cell, options);
    drawLogo(c, x, y, size, options);
  }

  function moduleFill(c, x, y, size, options) {
    if (options.gradient === "linear") {
      const angle = (options.gradientAngle * Math.PI) / 180;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const dx = Math.cos(angle) * size * 0.55;
      const dy = Math.sin(angle) * size * 0.55;
      const gradient = c.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      gradient.addColorStop(0, options.foreground);
      gradient.addColorStop(1, options.gradientTo);
      return gradient;
    }
    if (options.gradient === "radial") {
      const gradient = c.createRadialGradient(x + size / 2, y + size / 2, size * 0.08, x + size / 2, y + size / 2, size * 0.72);
      gradient.addColorStop(0, options.gradientTo);
      gradient.addColorStop(1, options.foreground);
      return gradient;
    }
    return options.foreground;
  }

  function drawModule(c, x, y, cell, options) {
    const gap = options.gap * cell;
    const px = x + gap / 2;
    const py = y + gap / 2;
    const s = Math.max(0.2, cell - gap);
    const radius = s * options.roundness * 0.48;
    const shape = options.moduleShape;

    c.beginPath();
    if (shape === "dot") {
      c.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2);
    } else if (shape === "diamond") {
      c.moveTo(px + s / 2, py);
      c.lineTo(px + s, py + s / 2);
      c.lineTo(px + s / 2, py + s);
      c.lineTo(px, py + s / 2);
      c.closePath();
    } else if (shape === "pill") {
      roundRect(c, px, py + s * 0.16, s, s * 0.68, s * 0.34);
    } else {
      const r = shape === "square" ? 0 : shape === "extra" ? s * 0.44 : shape === "soft" ? s * 0.22 : radius;
      roundRect(c, px, py, s, s, r);
    }
    c.fill();
  }

  function drawEye(c, x, y, cell, options) {
    const outer = cell * 7;
    const middle = cell * 5;
    const inner = cell * 3;

    c.save();
    c.fillStyle = options.eyeOuterColor;
    if (options.eyeGlow) {
      c.shadowColor = options.eyeOuterColor;
      c.shadowBlur = cell * 2.4;
    }
    drawEyeShape(c, x, y, outer, options.eyeOuter, cell * 1.1);
    c.fill();
    c.restore();

    if (options.transparent) {
      c.save();
      c.globalCompositeOperation = "destination-out";
      drawEyeShape(c, x + cell, y + cell, middle, options.eyeOuter, cell * 0.78);
      c.fill();
      c.restore();
    } else {
      c.fillStyle = options.background;
      drawEyeShape(c, x + cell, y + cell, middle, options.eyeOuter, cell * 0.78);
      c.fill();
    }

    c.fillStyle = options.eyeInnerColor;
    drawEyeShape(c, x + cell * 2, y + cell * 2, inner, options.eyeInner, cell * 0.7);
    c.fill();
  }

  function drawEyeShape(c, x, y, size, shape, radius) {
    c.beginPath();
    if (shape === "circle") {
      c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    } else {
      roundRect(c, x, y, size, size, shape === "square" ? 0 : radius);
    }
  }

  function drawLogo(c, x, y, size, options) {
    if (!state.logoImage || options.logoSize <= 0) return;
    const logo = size * options.logoSize;
    const pad = size * options.logoPadding;
    const plate = logo + pad * 2;
    const px = x + (size - plate) / 2;
    const py = y + (size - plate) / 2;
    const lx = px + pad;
    const ly = py + pad;

    c.save();
    if (options.logoShadow) {
      c.shadowColor = "rgba(0,0,0,0.34)";
      c.shadowBlur = size * 0.025;
    }
    c.fillStyle = options.logoPlateColor;
    drawPlate(c, px, py, plate, options.logoPlate);
    c.fill();
    c.restore();

    c.save();
    drawPlate(c, lx, ly, logo, options.logoPlate === "pill" ? "rounded" : options.logoPlate);
    c.clip();
    c.globalAlpha = options.logoOpacity;
    c.drawImage(state.logoImage, lx, ly, logo, logo);
    c.restore();
  }

  function drawPlate(c, x, y, size, shape) {
    c.beginPath();
    if (shape === "circle") c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    else if (shape === "pill") roundRect(c, x, y + size * 0.18, size, size * 0.64, size * 0.32);
    else roundRect(c, x, y, size, size, shape === "square" ? 0 : size * 0.22);
  }

  function isFinderCell(size, col, row) {
    return (col < 7 && row < 7) || (col >= size - 7 && row < 7) || (col < 7 && row >= size - 7);
  }

  function roundRect(c, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + radius, y);
    c.lineTo(x + w - radius, y);
    c.quadraticCurveTo(x + w, y, x + w, y + radius);
    c.lineTo(x + w, y + h - radius);
    c.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    c.lineTo(x + radius, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const convert = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return convert(r) * 0.2126 + convert(g) * 0.7152 + convert(b) * 0.0722;
  }

  function contrastRatio(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPng() {
    const size = Number(dom.exportSize.value);
    const target = dom.exportTarget.value;
    const canvas = document.createElement("canvas");
    const options = effectiveOptions(controls());
    renderToCanvas(canvas, size, target, options, state.matrix || encoder.encode(state.payload, options.errorLevel));
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${dom.fileName.value || "toolbox-qr"}.png`);
        toast("PNG exported");
      }
    }, "image/png");
  }

  function exportSvg() {
    const options = effectiveOptions(controls());
    const matrix = state.matrix || encoder.encode(state.payload, options.errorLevel);
    const svg = buildSvg(matrix, options);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${dom.fileName.value || "toolbox-qr"}.svg`);
    toast("SVG exported");
  }

  async function copyImage() {
    const size = Number(dom.exportSize.value);
    const canvas = document.createElement("canvas");
    const options = effectiveOptions(controls());
    renderToCanvas(canvas, size, dom.exportTarget.value, options, state.matrix || encoder.encode(state.payload, options.errorLevel));
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        if (!navigator.clipboard || !window.ClipboardItem) throw new Error("Clipboard image copy is unavailable.");
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast("Image copied");
      } catch {
        downloadBlob(blob, `${dom.fileName.value || "toolbox-qr"}.png`);
        toast("Downloaded instead");
      }
    }, "image/png");
  }

  function buildSvg(matrix, options) {
    const quiet = options.quiet;
    const n = matrix.size + quiet * 2;
    const fg = options.foreground;
    const bg = options.transparent ? "none" : options.background;
    const r = options.moduleShape === "square" ? 0 : options.moduleShape === "dot" ? 0.5 : Math.min(0.45, options.roundness * 0.45);
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}">`];
    if (bg !== "none") parts.push(`<rect width="${n}" height="${n}" fill="${bg}"/>`);
    parts.push(`<g fill="${fg}">`);
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) {
        if (!matrix.modules[row][col] || isFinderCell(matrix.size, col, row)) continue;
        const x = col + quiet;
        const y = row + quiet;
        if (options.moduleShape === "dot") parts.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="${0.5 - options.gap * 0.5}"/>`);
        else parts.push(`<rect x="${x + options.gap / 2}" y="${y + options.gap / 2}" width="${1 - options.gap}" height="${1 - options.gap}" rx="${r}" ry="${r}"/>`);
      }
    }
    parts.push("</g>");
    [[0, 0], [matrix.size - 7, 0], [0, matrix.size - 7]].forEach(([cx, cy]) => {
      const x = cx + quiet;
      const y = cy + quiet;
      parts.push(`<rect x="${x}" y="${y}" width="7" height="7" rx="${options.eyeOuter === "square" ? 0 : 1.1}" fill="${options.eyeOuterColor}"/>`);
      if (bg !== "none") parts.push(`<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="${options.eyeOuter === "square" ? 0 : 0.8}" fill="${options.background}"/>`);
      parts.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${options.eyeInner === "circle" ? 1.5 : options.eyeInner === "square" ? 0 : 0.6}" fill="${options.eyeInnerColor}"/>`);
    });
    parts.push("</svg>");
    return parts.join("");
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1600);
  }

  function setPanel(name) {
    state.panel = name;
    document.querySelectorAll(".qr-control-tabs button").forEach((button) => button.classList.toggle("active", button.dataset.panel === name));
    document.querySelectorAll(".qr-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panelView === name));
  }

  function setType(name) {
    state.type = name;
    document.querySelectorAll(".qr-type-tabs button").forEach((button) => button.classList.toggle("active", button.dataset.qrType === name));
    document.querySelectorAll(".qr-content-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.qrTypeView === name));
    scheduleRender();
  }

  function setPreview(name) {
    state.preview = name;
    dom.stage.dataset.preview = name;
    document.querySelectorAll(".qr-preview-modes button").forEach((button) => button.classList.toggle("active", button.dataset.preview === name));
    scheduleRender();
  }

  function applyPreset(name) {
    const presets = {
      premium: { fg: "#050505", bg: "#ffffff", shape: "rounded", gradient: "none", eye: "#35e0a1", frame: true },
      safe: { fg: "#000000", bg: "#ffffff", shape: "square", gradient: "none", eye: "#000000", frame: false },
      rounded: { fg: "#08110d", bg: "#f7fff9", shape: "dot", gradient: "linear", eye: "#35e0a1", frame: true },
      mono: { fg: "#111111", bg: "#ffffff", shape: "square", gradient: "none", eye: "#111111", frame: false },
      sticker: { fg: "#03150d", bg: "#ffffff", shape: "squircle", gradient: "radial", eye: "#35e0a1", frame: true },
      wifi: { fg: "#03150d", bg: "#ffffff", shape: "rounded", gradient: "none", eye: "#35e0a1", frame: true, type: "wifi", label: "Wi-Fi access" }
    }[name];
    if (!presets) return;
    $("qrForeground").value = presets.fg;
    $("qrBackground").value = presets.bg;
    $("qrModuleShape").value = presets.shape;
    $("qrGradient").value = presets.gradient;
    $("qrEyeInnerColor").value = presets.eye;
    $("qrEyeOuterColor").value = presets.fg;
    $("qrFrameOn").checked = presets.frame;
    if (presets.label) $("qrFrameLabel").value = presets.label;
    if (presets.type) setType(presets.type);
    scheduleRender();
  }

  function optimize() {
    $("qrSafeMode").checked = true;
    $("qrErrorLevel").value = "H";
    $("qrQuiet").value = "4";
    $("qrGap").value = "0.08";
    $("qrLogoSize").value = Math.min(Number($("qrLogoSize").value), 0.16);
    $("qrForeground").value = "#050505";
    $("qrBackground").value = "#ffffff";
    scheduleRender();
  }

  function randomSafeStyle() {
    const shapes = ["square", "rounded", "dot", "squircle", "soft"];
    const palettes = [
      ["#050505", "#ffffff", "#35e0a1"],
      ["#03150d", "#f7fff9", "#35e0a1"],
      ["#101010", "#ffffff", "#0bbf7a"],
      ["#000000", "#f3fff9", "#35e0a1"]
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    $("qrModuleShape").value = shapes[Math.floor(Math.random() * shapes.length)];
    $("qrForeground").value = palette[0];
    $("qrBackground").value = palette[1];
    $("qrGradientTo").value = palette[2];
    $("qrEyeInnerColor").value = palette[2];
    $("qrEyeOuterColor").value = palette[0];
    $("qrGradient").value = Math.random() > 0.55 ? "linear" : "none";
    $("qrRoundness").value = String((0.25 + Math.random() * 0.38).toFixed(2));
    $("qrGap").value = String((0.04 + Math.random() * 0.08).toFixed(2));
    scheduleRender();
  }

  function setupLogoDrop() {
    const loadLogo = (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          state.logoImage = image;
          state.logoDataUrl = reader.result;
          scheduleRender();
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    dom.logoInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) loadLogo(file);
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      dom.logoDrop.addEventListener(eventName, (event) => {
        event.preventDefault();
        dom.logoDrop.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dom.logoDrop.addEventListener(eventName, (event) => {
        event.preventDefault();
        dom.logoDrop.classList.remove("dragging");
      });
    });
    dom.logoDrop.addEventListener("drop", (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) loadLogo(file);
    });
    dom.removeLogo.addEventListener("click", () => {
      state.logoImage = null;
      state.logoDataUrl = "";
      dom.logoInput.value = "";
      scheduleRender();
    });
  }

  function bindEvents() {
    document.querySelectorAll(".qr-control-tabs button").forEach((button) => button.addEventListener("click", () => setPanel(button.dataset.panel)));
    document.querySelectorAll(".qr-type-tabs button").forEach((button) => button.addEventListener("click", () => setType(button.dataset.qrType)));
    document.querySelectorAll(".qr-preview-modes button").forEach((button) => button.addEventListener("click", () => setPreview(button.dataset.preview)));
    document.querySelectorAll(".qr-control-object input, .qr-control-object select, .qr-control-object textarea").forEach((input) => {
      input.addEventListener("input", scheduleRender);
      input.addEventListener("change", scheduleRender);
    });
    document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
    dom.exportPng.addEventListener("click", exportPng);
    dom.exportSvg.addEventListener("click", exportSvg);
    dom.copyImage.addEventListener("click", copyImage);
    dom.optimize.addEventListener("click", optimize);
    dom.randomize.addEventListener("click", randomSafeStyle);
    setupLogoDrop();
  }

  function createQrEncoder() {
    const RS_BLOCKS = {
      1: { L: [[1, 26, 19]], M: [[1, 26, 16]], Q: [[1, 26, 13]], H: [[1, 26, 9]] },
      2: { L: [[1, 44, 34]], M: [[1, 44, 28]], Q: [[1, 44, 22]], H: [[1, 44, 16]] },
      3: { L: [[1, 70, 55]], M: [[1, 70, 44]], Q: [[2, 35, 17]], H: [[2, 35, 13]] },
      4: { L: [[1, 100, 80]], M: [[2, 50, 32]], Q: [[2, 50, 24]], H: [[4, 25, 9]] },
      5: { L: [[1, 134, 108]], M: [[2, 67, 43]], Q: [[2, 33, 15], [2, 34, 16]], H: [[2, 33, 11], [2, 34, 12]] },
      6: { L: [[2, 86, 68]], M: [[4, 43, 27]], Q: [[4, 43, 19]], H: [[4, 43, 15]] },
      7: { L: [[2, 98, 78]], M: [[4, 49, 31]], Q: [[2, 32, 14], [4, 33, 15]], H: [[4, 39, 13], [1, 40, 14]] },
      8: { L: [[2, 121, 97]], M: [[2, 60, 38], [2, 61, 39]], Q: [[4, 40, 18], [2, 41, 19]], H: [[4, 40, 14], [2, 41, 15]] },
      9: { L: [[2, 146, 116]], M: [[3, 58, 36], [2, 59, 37]], Q: [[4, 36, 16], [4, 37, 17]], H: [[4, 36, 12], [4, 37, 13]] },
      10: { L: [[2, 86, 68], [2, 87, 69]], M: [[4, 69, 43], [1, 70, 44]], Q: [[6, 43, 19], [2, 44, 20]], H: [[6, 43, 15], [2, 44, 16]] }
    };
    const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
    const ECL = { L: 1, M: 0, Q: 3, H: 2 };
    const EXP = new Array(512);
    const LOG = new Array(256);
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];

    const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
    const blocks = (version, level) => RS_BLOCKS[version][level].flatMap(([count, total, data]) => Array.from({ length: count }, () => ({ total, data })));
    const capacity = (version, level) => blocks(version, level).reduce((sum, block) => sum + block.data, 0);

    function encode(text, level) {
      const bytes = Array.from(new TextEncoder().encode(text));
      let version = 1;
      for (; version <= 10; version += 1) {
        const countBits = version < 10 ? 8 : 16;
        if (4 + countBits + bytes.length * 8 <= capacity(version, level) * 8) break;
      }
      if (version > 10) throw new Error("Payload is too large for this offline studio. Shorten content or use a link.");
      const data = buildData(bytes, version, level);
      return buildMatrix(data, version, level);
    }

    function buildData(bytes, version, level) {
      const bb = [];
      pushBits(bb, 4, 4);
      pushBits(bb, bytes.length, version < 10 ? 8 : 16);
      bytes.forEach((byte) => pushBits(bb, byte, 8));
      const capBits = capacity(version, level) * 8;
      pushBits(bb, 0, Math.min(4, capBits - bb.length));
      while (bb.length % 8) bb.push(0);
      const data = [];
      for (let i = 0; i < bb.length; i += 8) data.push(parseInt(bb.slice(i, i + 8).join(""), 2));
      for (let pad = 0; data.length < capacity(version, level); pad += 1) data.push(pad % 2 ? 0x11 : 0xec);

      const blockDefs = blocks(version, level);
      let offset = 0;
      const dataBlocks = [];
      const ecBlocks = [];
      blockDefs.forEach((block) => {
        const chunk = data.slice(offset, offset + block.data);
        offset += block.data;
        dataBlocks.push(chunk);
        ecBlocks.push(rsRemainder(chunk, block.total - block.data));
      });
      const result = [];
      for (let i = 0; i < Math.max(...dataBlocks.map((b) => b.length)); i += 1) dataBlocks.forEach((b) => { if (i < b.length) result.push(b[i]); });
      for (let i = 0; i < Math.max(...ecBlocks.map((b) => b.length)); i += 1) ecBlocks.forEach((b) => { if (i < b.length) result.push(b[i]); });
      return result;
    }

    function pushBits(bits, value, length) {
      for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    }

    function rsGenerator(degree) {
      let poly = [1];
      for (let i = 0; i < degree; i += 1) {
        const next = new Array(poly.length + 1).fill(0);
        poly.forEach((coef, j) => {
          next[j] ^= gfMul(coef, 1);
          next[j + 1] ^= gfMul(coef, EXP[i]);
        });
        poly = next;
      }
      return poly;
    }

    function rsRemainder(data, degree) {
      const gen = rsGenerator(degree);
      const res = data.concat(new Array(degree).fill(0));
      for (let i = 0; i < data.length; i += 1) {
        const coef = res[i];
        if (coef === 0) continue;
        for (let j = 0; j < gen.length; j += 1) res[i + j] ^= gfMul(gen[j], coef);
      }
      return res.slice(res.length - degree);
    }

    function buildMatrix(codewords, version, level) {
      const size = version * 4 + 17;
      const base = Array.from({ length: size }, () => new Array(size).fill(null));
      const func = Array.from({ length: size }, () => new Array(size).fill(false));
      const set = (row, col, value) => {
        if (row < 0 || row >= size || col < 0 || col >= size) return;
        base[row][col] = value;
        func[row][col] = true;
      };
      drawFinder(set, 0, 0);
      drawFinder(set, 0, size - 7);
      drawFinder(set, size - 7, 0);
      for (let i = 8; i < size - 8; i += 1) {
        set(6, i, i % 2 === 0);
        set(i, 6, i % 2 === 0);
      }
      ALIGN[version].forEach((row) => ALIGN[version].forEach((col) => {
        if (func[row] && func[row][col]) return;
        drawAlignment(set, row - 2, col - 2);
      }));
      set(size - 8, 8, true);
      reserveFormat(func, size);
      base[8][8] = false;
      func[8][8] = true;
      if (version >= 7) reserveVersion(func, size);

      const bits = codewords.flatMap((byte) => Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1));
      placeData(base, func, bits, size);

      let best = null;
      for (let mask = 0; mask < 8; mask += 1) {
        const candidate = base.map((row) => row.slice());
        for (let row = 0; row < size; row += 1) {
          for (let col = 0; col < size; col += 1) {
            if (!func[row][col] && maskBit(mask, row, col)) candidate[row][col] = !candidate[row][col];
          }
        }
        drawFormat(candidate, size, level, mask);
        if (version >= 7) drawVersion(candidate, size, version);
        const penalty = score(candidate);
        if (!best || penalty < best.penalty) best = { modules: candidate, penalty, mask };
      }
      return { modules: best.modules, size, version, mask: best.mask, level };
    }

    function drawFinder(set, row, col) {
      for (let r = -1; r <= 7; r += 1) for (let c = -1; c <= 7; c += 1) {
        const rr = row + r;
        const cc = col + c;
        const dark = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        set(rr, cc, dark);
      }
    }

    function drawAlignment(set, row, col) {
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < 5; c += 1) set(row + r, col + c, r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2));
    }

    function reserveFormat(func, size) {
      for (let i = 0; i < 9; i += 1) {
        if (i !== 6) {
          func[8][i] = true;
          func[i][8] = true;
        }
      }
      for (let i = 0; i < 8; i += 1) {
        func[8][size - 1 - i] = true;
        func[size - 1 - i][8] = true;
      }
    }

    function reserveVersion(func, size) {
      for (let i = 0; i < 6; i += 1) for (let j = 0; j < 3; j += 1) {
        func[i][size - 11 + j] = true;
        func[size - 11 + j][i] = true;
      }
    }

    function placeData(mod, func, bits, size) {
      let index = 0;
      let upward = true;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col -= 1;
        for (let i = 0; i < size; i += 1) {
          const row = upward ? size - 1 - i : i;
          for (let c = 0; c < 2; c += 1) {
            const cc = col - c;
            if (!func[row][cc]) mod[row][cc] = Boolean(bits[index++] || 0);
          }
        }
        upward = !upward;
      }
    }

    function maskBit(mask, row, col) {
      switch (mask) {
        case 0: return (row + col) % 2 === 0;
        case 1: return row % 2 === 0;
        case 2: return col % 3 === 0;
        case 3: return (row + col) % 3 === 0;
        case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
        case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
        case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
        case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
        default: return false;
      }
    }

    function bch(data, poly, shift, mask) {
      let value = data << shift;
      while (bitLength(value) - bitLength(poly) >= 0) value ^= poly << (bitLength(value) - bitLength(poly));
      return ((data << shift) | value) ^ mask;
    }

    function bitLength(value) {
      let len = 0;
      while (value) {
        len += 1;
        value >>>= 1;
      }
      return len;
    }

    function drawFormat(mod, size, level, mask) {
      const bits = bch((ECL[level] << 3) | mask, 0x537, 10, 0x5412);
      for (let i = 0; i < 15; i += 1) {
        const bit = Boolean((bits >>> i) & 1);
        if (i < 6) mod[i][8] = bit;
        else if (i < 8) mod[i + 1][8] = bit;
        else mod[size - 15 + i][8] = bit;
        if (i < 8) mod[8][size - i - 1] = bit;
        else if (i < 9) mod[8][15 - i] = bit;
        else mod[8][14 - i] = bit;
      }
      mod[size - 8][8] = true;
    }

    function drawVersion(mod, size, version) {
      const bits = bch(version, 0x1f25, 12, 0);
      for (let i = 0; i < 18; i += 1) {
        const bit = Boolean((bits >>> i) & 1);
        mod[Math.floor(i / 3)][(i % 3) + size - 11] = bit;
        mod[(i % 3) + size - 11][Math.floor(i / 3)] = bit;
      }
    }

    function score(mod) {
      const size = mod.length;
      let penalty = 0;
      for (let row = 0; row < size; row += 1) {
        let runColor = mod[row][0];
        let run = 1;
        for (let col = 1; col < size; col += 1) {
          if (mod[row][col] === runColor) run += 1;
          else {
            if (run >= 5) penalty += 3 + run - 5;
            runColor = mod[row][col];
            run = 1;
          }
        }
        if (run >= 5) penalty += 3 + run - 5;
      }
      for (let col = 0; col < size; col += 1) {
        let runColor = mod[0][col];
        let run = 1;
        for (let row = 1; row < size; row += 1) {
          if (mod[row][col] === runColor) run += 1;
          else {
            if (run >= 5) penalty += 3 + run - 5;
            runColor = mod[row][col];
            run = 1;
          }
        }
        if (run >= 5) penalty += 3 + run - 5;
      }
      for (let row = 0; row < size - 1; row += 1) for (let col = 0; col < size - 1; col += 1) {
        const color = mod[row][col];
        if (mod[row][col + 1] === color && mod[row + 1][col] === color && mod[row + 1][col + 1] === color) penalty += 3;
      }
      let dark = 0;
      for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) if (mod[row][col]) dark += 1;
      penalty += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
      return penalty;
    }

    return { encode };
  }

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  $("qrEventStart").value = now.toISOString().slice(0, 16);
  $("qrEventEnd").value = later.toISOString().slice(0, 16);
  bindEvents();
  render();
})();
