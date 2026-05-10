(function () {
  const $ = (id) => document.getElementById(id);
  const dom = {
    input: $("styleImageInput"),
    drop: $("styleDrop"),
    urlInput: $("styleUrlInput"),
    loadUrl: $("styleLoadUrl"),
    clear: $("styleClear"),
    sourceList: $("styleSourceList"),
    imageCount: $("styleImageCount"),
    paletteCount: $("stylePaletteCount"),
    overlap: $("styleOverlap"),
    previewTitle: $("stylePreviewTitle"),
    previewMeta: $("stylePreviewMeta"),
    previewStage: $("stylePreviewStage"),
    previewImage: $("stylePreviewImage"),
    overlay: $("styleOverlayCanvas"),
    paletteStrip: $("stylePaletteStrip"),
    chips: $("styleSummaryChips"),
    results: $("styleResultsPanel"),
    miniPalette: $("styleMiniPalette"),
    miniMood: $("styleMiniMood"),
    miniFocus: $("styleMiniFocus"),
    miniDna: $("styleMiniDna"),
    exportCanvas: $("styleExportCanvas"),
    toast: $("styleToast")
  };

  if (!dom.input || !dom.results) return;

  const state = {
    images: [],
    activeIndex: 0,
    mode: "single",
    tab: "overview"
  };

  const styleFamilies = [
    { name: "Premium minimal", traits: ["controlled contrast", "clean negative space", "low clutter"] },
    { name: "Cinematic editorial", traits: ["dramatic light", "depth", "intentional color"] },
    { name: "Soft futuristic", traits: ["cool light", "smooth texture", "calm precision"] },
    { name: "Warm analog", traits: ["warm palette", "grain", "low sharpness"] },
    { name: "Graphic poster", traits: ["bold contrast", "flat regions", "strong focal shape"] },
    { name: "Organic documentary", traits: ["natural light", "mixed texture", "real-world detail"] },
    { name: "Digital interface", traits: ["geometric structure", "clean surfaces", "accent discipline"] },
    { name: "Maximal energy", traits: ["dense detail", "high saturation", "active composition"] }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pct(value) {
    return `${Math.round(clamp(value, 0, 100))}%`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  function luminance(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s, l };
  }

  function colorDistance(a, b) {
    return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
  }

  function nearestRoleColor(palette, role) {
    if (!palette.length) return "#111111";
    if (role === "background") return palette.slice().sort((a, b) => b.percent - a.percent)[0].hex;
    if (role === "text") {
      const bg = hexToRgb(nearestRoleColor(palette, "background"));
      const bgLum = luminance(bg.r, bg.g, bg.b);
      return bgLum > 128 ? "#070707" : "#F5F5F7";
    }
    if (role === "accent") return palette.slice().sort((a, b) => b.saturation - a.saturation || b.percent - a.percent)[0].hex;
    return palette[Math.min(1, palette.length - 1)].hex;
  }

  function createSampleCanvas(image, maxSize) {
    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);
    return { canvas, ctx, width, height };
  }

  function extractPalette(pixels, total) {
    const buckets = new Map();
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha < 12) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const key = `${Math.round(r / 24) * 24},${Math.round(g / 24) * 24},${Math.round(b / 24) * 24}`;
      const item = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      item.count += 1;
      item.r += r;
      item.g += g;
      item.b += b;
      buckets.set(key, item);
    }

    return Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 9)
      .map((item) => {
        const r = item.r / item.count;
        const g = item.g / item.count;
        const b = item.b / item.count;
        const hsl = rgbToHsl(r, g, b);
        return {
          hex: rgbToHex(r, g, b).toUpperCase(),
          percent: (item.count / total) * 100,
          saturation: hsl.s,
          lightness: hsl.l,
          hue: hsl.h,
          r, g, b
        };
      });
  }

  function analyzePixels(image, data, width, height) {
    const pixels = data.data;
    const total = width * height;
    const palette = extractPalette(pixels, total);
    const gray = new Float32Array(total);
    let lumSum = 0;
    let satSum = 0;
    let tempSum = 0;
    let colorfulness = 0;
    let dark = 0;
    let light = 0;
    let warm = 0;
    let cool = 0;

    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = luminance(r, g, b);
      const hsl = rgbToHsl(r, g, b);
      gray[p] = lum;
      lumSum += lum;
      satSum += hsl.s;
      tempSum += r - b;
      colorfulness += Math.sqrt((r - g) ** 2 + (g - b) ** 2 + (b - r) ** 2);
      if (lum < 70) dark += 1;
      if (lum > 190) light += 1;
      if (r > b + 12) warm += 1;
      if (b > r + 12) cool += 1;
    }

    const meanLum = lumSum / total;
    const avgSat = satSum / total;
    let variance = 0;
    let edgeSum = 0;
    let saliencySum = 0;
    let salX = 0;
    let salY = 0;
    let horizontalLight = 0;
    let verticalLight = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const lum = gray[index];
        variance += (lum - meanLum) ** 2;
        const right = x < width - 1 ? Math.abs(lum - gray[index + 1]) : 0;
        const down = y < height - 1 ? Math.abs(lum - gray[index + width]) : 0;
        const edge = right + down;
        edgeSum += edge;
        const sal = Math.abs(lum - meanLum) * 0.8 + edge * 0.42;
        saliencySum += sal;
        salX += x * sal;
        salY += y * sal;
        horizontalLight += lum * ((x / Math.max(1, width - 1)) - 0.5);
        verticalLight += lum * ((y / Math.max(1, height - 1)) - 0.5);
      }
    }

    const contrast = Math.sqrt(variance / total);
    const edgeDensity = edgeSum / Math.max(1, total * 2);
    const focus = saliencySum
      ? { x: salX / saliencySum / width, y: salY / saliencySum / height }
      : { x: 0.5, y: 0.5 };
    const balanceDistance = Math.sqrt((focus.x - 0.5) ** 2 + (focus.y - 0.5) ** 2) * 2;
    const dominant = palette[0] || { percent: 0, hex: "#111111", r: 17, g: 17, b: 17 };
    const dominantRgb = hexToRgb(dominant.hex);
    let quietPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const current = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
      if (colorDistance(current, dominantRgb) < 36) quietPixels += 1;
    }

    const metrics = {
      brightness: (meanLum / 255) * 100,
      contrast: clamp((contrast / 72) * 100, 0, 100),
      saturation: clamp(avgSat * 120, 0, 100),
      temperature: clamp(50 + (tempSum / total) * 0.45, 0, 100),
      colorfulness: clamp((colorfulness / total / 145) * 100, 0, 100),
      edgeDensity: clamp((edgeDensity / 40) * 100, 0, 100),
      texture: clamp((edgeDensity / 34) * 100 + contrast * 0.24, 0, 100),
      negativeSpace: clamp(Math.max(dominant.percent, (quietPixels / total) * 100), 0, 100),
      balance: clamp(100 - balanceDistance * 100, 0, 100),
      polish: 0,
      intentionality: 0,
      clarity: 0,
      darkPct: (dark / total) * 100,
      lightPct: (light / total) * 100,
      warmPct: (warm / total) * 100,
      coolPct: (cool / total) * 100
    };

    metrics.clarity = clamp(100 - metrics.texture * 0.38 + metrics.contrast * 0.28 + metrics.negativeSpace * 0.18, 0, 100);
    metrics.polish = clamp(metrics.clarity * 0.42 + metrics.balance * 0.22 + (100 - Math.abs(metrics.saturation - 46)) * 0.2 + metrics.contrast * 0.16, 0, 100);
    metrics.intentionality = clamp(metrics.polish * 0.62 + Math.max(metrics.negativeSpace, metrics.contrast) * 0.24 + metrics.colorfulness * 0.14, 0, 100);

    const lightDirection = Math.abs(horizontalLight) > Math.abs(verticalLight)
      ? (horizontalLight > 0 ? "right-lit" : "left-lit")
      : (verticalLight > 0 ? "bottom-weighted" : "top-lit");

    return {
      image,
      width,
      height,
      palette,
      metrics,
      focus,
      lightDirection,
      histogram: {
        dark: metrics.darkPct,
        mid: clamp(100 - metrics.darkPct - metrics.lightPct, 0, 100),
        light: metrics.lightPct
      },
      raw: { meanLum, contrast, avgSat }
    };
  }

  function labelFromMetric(value, low, mid, high) {
    if (value < 34) return low;
    if (value < 67) return mid;
    return high;
  }

  function styleTags(analysis) {
    const m = analysis.metrics;
    const tags = [];
    tags.push(labelFromMetric(m.brightness, "dark", "balanced light", "bright"));
    tags.push(labelFromMetric(m.saturation, "muted", "controlled color", "vivid"));
    tags.push(labelFromMetric(m.contrast, "soft contrast", "clear contrast", "dramatic contrast"));
    tags.push(labelFromMetric(m.texture, "smooth", "textured", "grain/detail rich"));
    tags.push(m.temperature > 58 ? "warm" : m.temperature < 42 ? "cool" : "neutral");
    if (m.negativeSpace > 58) tags.push("spacious");
    if (m.polish > 72) tags.push("premium");
    if (m.edgeDensity > 66) tags.push("dense");
    return Array.from(new Set(tags)).slice(0, 8);
  }

  function styleFamily(analysis) {
    const m = analysis.metrics;
    const scores = [
      ["Premium minimal", m.negativeSpace * 0.34 + m.clarity * 0.34 + (100 - m.saturation) * 0.18 + m.polish * 0.14],
      ["Cinematic editorial", m.contrast * 0.32 + m.texture * 0.16 + m.temperature * 0.1 + m.polish * 0.2 + (100 - m.balance) * 0.12],
      ["Soft futuristic", (100 - m.texture) * 0.24 + (100 - Math.abs(m.temperature - 42)) * 0.24 + m.clarity * 0.28 + m.polish * 0.16],
      ["Warm analog", m.temperature * 0.3 + m.texture * 0.26 + (100 - m.clarity) * 0.12 + (100 - m.contrast) * 0.12],
      ["Graphic poster", m.contrast * 0.3 + m.colorfulness * 0.28 + m.clarity * 0.2 + m.edgeDensity * 0.1],
      ["Organic documentary", m.texture * 0.24 + m.balance * 0.16 + (100 - Math.abs(m.temperature - 54)) * 0.24 + (100 - m.polish) * 0.1],
      ["Digital interface", m.clarity * 0.3 + m.polish * 0.26 + m.negativeSpace * 0.18 + (100 - m.texture) * 0.16],
      ["Maximal energy", m.colorfulness * 0.3 + m.edgeDensity * 0.24 + m.saturation * 0.22 + (100 - m.negativeSpace) * 0.12]
    ].sort((a, b) => b[1] - a[1]);

    return {
      primary: scores[0][0],
      secondary: scores[1][0],
      confidence: clamp(scores[0][1], 0, 100),
      scores: scores.slice(0, 5).map(([name, score]) => ({ name, score: clamp(score, 0, 100) }))
    };
  }

  function dnaPhrase(analysis) {
    const m = analysis.metrics;
    const tone = m.temperature > 58 ? "Warm" : m.temperature < 42 ? "Cool" : "Neutral";
    const mood = m.polish > 72 ? "premium" : m.texture > 68 ? "tactile" : m.saturation > 62 ? "vivid" : "quiet";
    const structure = m.negativeSpace > 58 ? "minimal" : m.edgeDensity > 64 ? "dense" : "balanced";
    return `${tone} ${mood} ${structure}`;
  }

  function styleName(analysis) {
    const m = analysis.metrics;
    const first = m.temperature > 58 ? "Warm" : m.temperature < 42 ? "Midnight" : "Quiet";
    const second = m.saturation > 62 ? "Chromatic" : m.texture > 62 ? "Tactile" : m.polish > 72 ? "Precision" : "Soft";
    const third = m.negativeSpace > 60 ? "Minimalism" : m.contrast > 68 ? "Editorial" : m.edgeDensity > 65 ? "Field" : "Utility";
    return `${first} ${second} ${third}`;
  }

  function enrichAnalysis(base, name, dataUrl) {
    const family = styleFamily(base);
    const tags = styleTags(base);
    const phrase = dnaPhrase(base);
    const title = styleName(base);
    const m = base.metrics;
    const colorWords = [
      m.temperature > 58 ? "warm" : m.temperature < 42 ? "cool" : "neutral",
      m.saturation > 62 ? "saturated" : m.saturation < 34 ? "muted" : "controlled",
      m.contrast > 64 ? "high-contrast" : "soft-contrast"
    ];
    const lightingWords = [
      m.brightness > 62 ? "bright" : m.brightness < 34 ? "low-key" : "balanced",
      m.contrast > 66 ? "hard light" : "soft light",
      base.lightDirection
    ];
    const compositionWords = [
      m.balance > 72 ? "center-balanced" : "off-center",
      m.negativeSpace > 58 ? "negative space" : "filled frame",
      base.focus.x < 0.4 ? "left-weighted" : base.focus.x > 0.6 ? "right-weighted" : "center focus"
    ];
    const textureWords = [
      m.texture > 66 ? "grain/detail texture" : "clean surface",
      m.edgeDensity > 62 ? "sharp edge activity" : "soft edge language",
      m.polish > 72 ? "polished finish" : "natural finish"
    ];
    const moodWords = tags.filter((tag) => !["dark", "bright", "warm", "cool", "neutral"].includes(tag)).slice(0, 5);
    const promptLine = `${phrase.toLowerCase()}, ${family.primary.toLowerCase()}, ${colorWords.join(", ")}, ${lightingWords.join(", ")}, ${compositionWords.join(", ")}`;

    return {
      ...base,
      name,
      dataUrl,
      title,
      family,
      tags,
      phrase,
      colorWords,
      lightingWords,
      compositionWords,
      textureWords,
      moodWords,
      prompt: {
        short: promptLine,
        full: `Create an image with ${promptLine}. Use ${textureWords.join(", ")} and maintain ${m.polish > 70 ? "high polish and visual restraint" : "a natural, less over-finished feel"}.`,
        avoid: [
          m.saturation < 35 ? "oversaturated colors" : "muddy color mixing",
          m.negativeSpace > 58 ? "cluttered framing" : "empty generic composition",
          m.texture < 42 ? "unwanted grain" : "over-smoothed surfaces"
        ]
      },
      recipe: {
        keep: [
          `Keep the ${colorWords.join(" / ")} palette logic.`,
          `Keep the ${compositionWords[0]} composition behavior.`,
          `Keep the ${lightingWords[1]} lighting read.`,
          `Keep the ${family.primary.toLowerCase()} family cues.`,
          `Keep the ${m.polish > 70 ? "polished" : "honest"} finish.`
        ],
        reduce: [
          m.edgeDensity > 66 ? "Reduce competing edge detail if clarity matters." : "Reduce empty regions only if the image feels under-built.",
          m.saturation > 68 ? "Reduce chroma for a more premium read." : "Reduce extra colors that do not support the palette."
        ],
        add: [
          m.contrast < 44 ? "Add a clearer value anchor." : "Add small accent signals, not broad color fills.",
          m.negativeSpace < 42 ? "Add breathing room around the focal area." : "Add one deliberate focal detail."
        ],
        avoid: [
          "Avoid unrelated accent colors.",
          "Avoid effects that fight the original lighting direction.",
          "Avoid flattening the focal hierarchy."
        ]
      },
      personality: stylePersonality(base, family, tags)
    };
  }

  function stylePersonality(analysis, family, tags) {
    const m = analysis.metrics;
    const likes = [];
    if (m.negativeSpace > 55) likes.push("negative space");
    if (m.polish > 70) likes.push("controlled details");
    if (m.texture > 60) likes.push("tactile surfaces");
    if (m.contrast > 64) likes.push("clear drama");
    if (m.saturation < 40) likes.push("quiet color discipline");
    if (!likes.length) likes.push("balanced composition");

    return {
      sentence: `This style reads as ${tags.slice(0, 4).join(", ")} with a ${family.primary.toLowerCase()} backbone.`,
      likes,
      hates: [
        m.negativeSpace > 58 ? "visual clutter" : "generic emptiness",
        m.saturation > 62 ? "dull color" : "random loud color",
        m.polish > 70 ? "messy spacing" : "over-polished sameness"
      ]
    };
  }

  async function imageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load image."));
      image.src = dataUrl;
    });
  }

  async function addDataUrl(dataUrl, name) {
    const img = await imageFromDataUrl(dataUrl);
    const sample = createSampleCanvas(img, 240);
    const imageData = sample.ctx.getImageData(0, 0, sample.width, sample.height);
    const base = analyzePixels(img, imageData, sample.width, sample.height);
    const analysis = enrichAnalysis(base, name, dataUrl);
    state.images.push({ id: `${Date.now()}-${Math.random()}`, name, dataUrl, img, analysis });
    state.activeIndex = state.images.length - 1;
    renderAll();
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  async function addFiles(files) {
    const list = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;
    toast(`Analyzing ${list.length} image${list.length > 1 ? "s" : ""}`);
    for (const file of list) {
      const dataUrl = await readFile(file);
      await addDataUrl(dataUrl, file.name || "Uploaded image");
    }
  }

  async function addUrl() {
    const url = dom.urlInput.value.trim();
    if (!url) return;
    try {
      toast("Loading image URL");
      const response = await fetch(url);
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("URL did not return an image.");
      const dataUrl = await readFile(new File([blob], "linked-image", { type: blob.type }));
      await addDataUrl(dataUrl, url.split("/").pop() || "Linked image");
    } catch (error) {
      toast(error.message || "Image URL could not be loaded");
    }
  }

  function currentImagesForMode() {
    if (state.mode === "mood") return state.images;
    if (state.mode === "compare" || state.mode === "adapt") return state.images.slice(0, 2);
    return state.images[state.activeIndex] ? [state.images[state.activeIndex]] : [];
  }

  function aggregateAnalyses(images) {
    if (!images.length) return null;
    if (images.length === 1) return images[0].analysis;

    const analyses = images.map((item) => item.analysis);
    const metrics = {};
    Object.keys(analyses[0].metrics).forEach((key) => {
      metrics[key] = analyses.reduce((sum, analysis) => sum + analysis.metrics[key], 0) / analyses.length;
    });
    const paletteMap = new Map();
    analyses.forEach((analysis) => {
      analysis.palette.forEach((color) => {
        const key = color.hex;
        const item = paletteMap.get(key) || { ...color, percent: 0, count: 0 };
        item.percent += color.percent / analyses.length;
        item.count += 1;
        paletteMap.set(key, item);
      });
    });
    const palette = Array.from(paletteMap.values()).sort((a, b) => b.percent - a.percent).slice(0, 9);
    const focus = {
      x: analyses.reduce((sum, analysis) => sum + analysis.focus.x, 0) / analyses.length,
      y: analyses.reduce((sum, analysis) => sum + analysis.focus.y, 0) / analyses.length
    };
    const base = {
      image: analyses[0].image,
      width: analyses[0].width,
      height: analyses[0].height,
      palette,
      metrics,
      focus,
      lightDirection: mostCommon(analyses.map((analysis) => analysis.lightDirection)),
      histogram: {
        dark: metrics.darkPct,
        mid: clamp(100 - metrics.darkPct - metrics.lightPct, 0, 100),
        light: metrics.lightPct
      },
      raw: analyses[0].raw
    };
    return enrichAnalysis(base, `${images.length}-image style board`, images[0].dataUrl);
  }

  function mostCommon(values) {
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  function styleOverlap(a, b) {
    if (!a || !b) return 0;
    const metricDistance = ["brightness", "contrast", "saturation", "temperature", "texture", "negativeSpace", "polish"]
      .reduce((sum, key) => sum + Math.abs(a.metrics[key] - b.metrics[key]), 0) / 7;
    const paletteScore = paletteOverlap(a.palette, b.palette);
    return clamp((100 - metricDistance) * 0.62 + paletteScore * 0.38, 0, 100);
  }

  function paletteOverlap(a, b) {
    if (!a.length || !b.length) return 0;
    let score = 0;
    a.slice(0, 5).forEach((color) => {
      const rgb = hexToRgb(color.hex);
      const closest = Math.min(...b.slice(0, 5).map((other) => colorDistance(rgb, hexToRgb(other.hex))));
      score += clamp(100 - closest * 0.42, 0, 100);
    });
    return score / Math.min(5, a.length);
  }

  function activeAnalysis() {
    return aggregateAnalyses(currentImagesForMode());
  }

  function compareSummary() {
    if (state.images.length < 2) return null;
    const a = state.images[0].analysis;
    const b = state.images[1].analysis;
    const keys = ["brightness", "contrast", "saturation", "temperature", "texture", "negativeSpace", "polish"];
    const diffs = keys.map((key) => ({ key, diff: b.metrics[key] - a.metrics[key] })).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
    return {
      overlap: styleOverlap(a, b),
      shared: sharedTraits(a, b),
      differences: diffs.slice(0, 5),
      guidance: diffs.slice(0, 5).map((item) => {
        const label = item.key.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`);
        return item.diff > 0
          ? `Reduce ${label} in image B to move closer to image A.`
          : `Increase ${label} in image B to move closer to image A.`;
      })
    };
  }

  function sharedTraits(a, b) {
    const shared = [];
    if (Math.abs(a.metrics.temperature - b.metrics.temperature) < 14) shared.push("similar palette temperature");
    if (Math.abs(a.metrics.contrast - b.metrics.contrast) < 16) shared.push("similar contrast rhythm");
    if (Math.abs(a.metrics.texture - b.metrics.texture) < 18) shared.push("similar texture/detail density");
    if (paletteOverlap(a.palette, b.palette) > 62) shared.push("palette overlap");
    if (a.family.primary === b.family.primary) shared.push(`same ${a.family.primary.toLowerCase()} family`);
    return shared.length ? shared : ["shared visual intent is limited"];
  }

  function renderSourceList() {
    dom.sourceList.textContent = "";
    if (!state.images.length) {
      const empty = document.createElement("p");
      empty.className = "style-empty-note";
      empty.textContent = "No sources yet.";
      dom.sourceList.appendChild(empty);
      return;
    }
    state.images.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = `style-source-item${index === state.activeIndex ? " active" : ""}`;
      row.innerHTML = `
        <button type="button" class="style-source-select">
          <img src="${item.dataUrl}" alt="">
          <span>${escapeHtml(item.name)}</span>
          <small>${escapeHtml(item.analysis.phrase)}</small>
        </button>
        <div class="style-source-order">
          <button type="button" data-move="up" aria-label="Move source earlier">Up</button>
          <button type="button" data-move="down" aria-label="Move source later">Down</button>
        </div>`;
      row.querySelector(".style-source-select").addEventListener("click", () => {
        state.activeIndex = index;
        renderAll();
      });
      row.querySelector('[data-move="up"]').addEventListener("click", () => moveSource(index, -1));
      row.querySelector('[data-move="down"]').addEventListener("click", () => moveSource(index, 1));
      dom.sourceList.appendChild(row);
    });
  }

  function moveSource(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= state.images.length) return;
    const [item] = state.images.splice(index, 1);
    state.images.splice(target, 0, item);
    state.activeIndex = target;
    renderAll();
  }

  function renderPreview(analysis) {
    if (!analysis) {
      dom.previewStage.classList.remove("loaded");
      dom.previewImage.removeAttribute("src");
      dom.previewTitle.textContent = "No image loaded";
      dom.previewMeta.textContent = "Drop or paste an image";
      drawOverlay(null);
      return;
    }
    const image = state.images[state.activeIndex] || state.images[0];
    if (image) dom.previewImage.src = image.dataUrl;
    dom.previewStage.classList.add("loaded");
    dom.previewTitle.textContent = analysis.title;
    dom.previewMeta.textContent = `${analysis.width} x ${analysis.height} sample | ${analysis.family.primary}`;
    dom.previewImage.onload = () => drawOverlay(analysis);
    window.requestAnimationFrame(() => drawOverlay(analysis));
  }

  function drawOverlay(analysis) {
    const canvas = dom.overlay;
    const stage = dom.previewStage;
    const rect = stage.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, canvas.width, canvas.height);
    if (!analysis) return;
    c.strokeStyle = "rgba(255,255,255,0.12)";
    c.lineWidth = 1;
    for (let i = 1; i < 3; i += 1) {
      c.beginPath();
      c.moveTo((canvas.width / 3) * i, 0);
      c.lineTo((canvas.width / 3) * i, canvas.height);
      c.moveTo(0, (canvas.height / 3) * i);
      c.lineTo(canvas.width, (canvas.height / 3) * i);
      c.stroke();
    }
    const x = analysis.focus.x * canvas.width;
    const y = analysis.focus.y * canvas.height;
    const radius = 28 + (100 - analysis.metrics.balance) * 0.22;
    c.strokeStyle = "rgba(255,79,216,0.88)";
    c.fillStyle = "rgba(255,79,216,0.12)";
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#FF4FD8";
    c.beginPath();
    c.arc(x, y, 4, 0, Math.PI * 2);
    c.fill();
  }

  function renderPalette(analysis) {
    dom.paletteStrip.textContent = "";
    if (!analysis) return;
    analysis.palette.slice(0, 7).forEach((color) => {
      const item = document.createElement("button");
      item.type = "button";
      item.style.setProperty("--swatch", color.hex);
      item.innerHTML = `<span></span><strong>${color.hex}</strong><small>${Math.round(color.percent)}%</small>`;
      item.addEventListener("click", () => copyText(color.hex, "Color copied"));
      dom.paletteStrip.appendChild(item);
    });
  }

  function renderChips(analysis) {
    dom.chips.textContent = "";
    if (!analysis) return;
    [analysis.phrase, ...analysis.tags.slice(0, 5)].forEach((tag) => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      dom.chips.appendChild(chip);
    });
  }

  function metricObject(label, value) {
    return `<div class="style-meter"><span>${escapeHtml(label)}</span><strong>${pct(value)}</strong><i><b style="width:${pct(value)}"></b></i></div>`;
  }

  function renderResults(analysis) {
    if (!analysis) {
      dom.results.innerHTML = `<div class="style-waiting-object"><span></span><p>Upload one or more images to generate style analysis.</p></div>`;
      return;
    }
    const compare = compareSummary();
    const tab = state.tab;
    const views = {
      overview: overviewHtml(analysis, compare),
      color: colorHtml(analysis),
      composition: compositionHtml(analysis),
      lighting: lightingHtml(analysis),
      texture: textureHtml(analysis),
      mood: moodHtml(analysis),
      prompt: promptHtml(analysis, compare),
      dna: dnaHtml(analysis)
    };
    dom.results.innerHTML = views[tab] || views.overview;
    bindResultActions(analysis);
  }

  function overviewHtml(analysis, compare) {
    return `
      <section class="style-result-view active">
        <div class="style-headline-object">
          <span>Style name</span>
          <h3>${escapeHtml(analysis.title)}</h3>
          <p>${escapeHtml(analysis.personality.sentence)}</p>
        </div>
        <div class="style-meter-grid">
          ${metricObject("Polish", analysis.metrics.polish)}
          ${metricObject("Clarity", analysis.metrics.clarity)}
          ${metricObject("Contrast", analysis.metrics.contrast)}
          ${metricObject("Texture", analysis.metrics.texture)}
        </div>
        <div class="style-pill-list">${analysis.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        ${compare ? `<div class="style-compare-summary"><strong>${pct(compare.overlap)} style overlap</strong><p>${escapeHtml(compare.shared.join(", "))}</p></div>` : ""}
      </section>`;
  }

  function colorHtml(analysis) {
    const roles = [
      ["Background", nearestRoleColor(analysis.palette, "background")],
      ["Surface", nearestRoleColor(analysis.palette, "surface")],
      ["Text", nearestRoleColor(analysis.palette, "text")],
      ["Accent", nearestRoleColor(analysis.palette, "accent")]
    ];
    return `
      <section class="style-result-view active">
        <div class="style-color-bars">${analysis.palette.slice(0, 7).map((color) => `<span style="--swatch:${color.hex};--w:${pct(color.percent)}"><i></i><b>${color.hex}</b></span>`).join("")}</div>
        <div class="style-meter-grid">
          ${metricObject("Saturation", analysis.metrics.saturation)}
          ${metricObject("Temperature", analysis.metrics.temperature)}
          ${metricObject("Colorfulness", analysis.metrics.colorfulness)}
          ${metricObject("Dark mode fit", 100 - analysis.metrics.lightPct * 0.6)}
        </div>
        <div class="style-token-list">${roles.map(([name, color]) => `<button type="button" data-copy="${color}"><i style="background:${color}"></i><span>${name}</span><strong>${color}</strong></button>`).join("")}</div>
        <div class="style-copy-actions">
          <button type="button" class="button secondary" data-copy-palette>Copy palette</button>
          <button type="button" class="button secondary" data-copy-tokens>Copy CSS tokens</button>
        </div>
      </section>`;
  }

  function compositionHtml(analysis) {
    const xTag = analysis.focus.x < 0.42 ? "left-weighted" : analysis.focus.x > 0.58 ? "right-weighted" : "centered";
    const yTag = analysis.focus.y < 0.42 ? "upper-frame" : analysis.focus.y > 0.58 ? "lower-frame" : "mid-frame";
    return `
      <section class="style-result-view active">
        <div class="style-composition-object"><i style="left:${pct(analysis.focus.x * 100)};top:${pct(analysis.focus.y * 100)}"></i><span></span><span></span></div>
        <div class="style-meter-grid">
          ${metricObject("Balance", analysis.metrics.balance)}
          ${metricObject("Negative space", analysis.metrics.negativeSpace)}
          ${metricObject("Focal clarity", analysis.metrics.clarity)}
          ${metricObject("Density", 100 - analysis.metrics.negativeSpace)}
        </div>
        <div class="style-text-block"><strong>Composition read</strong><p>${escapeHtml(`The image reads as ${xTag} and ${yTag}, with ${analysis.metrics.negativeSpace > 55 ? "meaningful breathing room" : "a filled-frame structure"} and ${analysis.metrics.balance > 70 ? "stable balance" : "intentional asymmetry"}.`)}</p></div>
      </section>`;
  }

  function lightingHtml(analysis) {
    return `
      <section class="style-result-view active">
        <div class="style-light-object"><span></span><i style="transform:rotate(${analysis.metrics.temperature * 1.8 - 90}deg)"></i></div>
        <div class="style-meter-grid">
          ${metricObject("Brightness", analysis.metrics.brightness)}
          ${metricObject("Shadow contrast", analysis.metrics.contrast)}
          ${metricObject("Glow potential", analysis.metrics.lightPct)}
          ${metricObject("Warmth", analysis.metrics.temperature)}
        </div>
        <div class="style-text-block"><strong>Lighting read</strong><p>${escapeHtml(`Lighting feels ${analysis.lightingWords.join(", ")}. The strongest directional cue is ${analysis.lightDirection}.`)}</p></div>
      </section>`;
  }

  function textureHtml(analysis) {
    return `
      <section class="style-result-view active">
        <div class="style-meter-grid">
          ${metricObject("Texture", analysis.metrics.texture)}
          ${metricObject("Edge activity", analysis.metrics.edgeDensity)}
          ${metricObject("Cleanliness", 100 - analysis.metrics.texture * 0.64)}
          ${metricObject("Finish polish", analysis.metrics.polish)}
        </div>
        <div class="style-pill-list">${analysis.textureWords.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>
        <div class="style-text-block"><strong>Shape language</strong><p>${escapeHtml(`${analysis.metrics.edgeDensity > 60 ? "Sharp, active silhouettes and repeated detail." : "Soft, compact forms with lower edge activity."} ${analysis.metrics.texture > 62 ? "The finish feels tactile or grain-rich." : "The finish reads smooth and clean."}`)}</p></div>
      </section>`;
  }

  function moodHtml(analysis) {
    return `
      <section class="style-result-view active">
        <div class="style-headline-object">
          <span>Style personality</span>
          <h3>${escapeHtml(analysis.phrase)}</h3>
          <p>${escapeHtml(analysis.personality.sentence)}</p>
        </div>
        <div class="style-text-grid">
          <div><strong>What this style likes</strong>${analysis.personality.likes.map((x) => `<p>${escapeHtml(x)}</p>`).join("")}</div>
          <div><strong>What weakens it</strong>${analysis.personality.hates.map((x) => `<p>${escapeHtml(x)}</p>`).join("")}</div>
        </div>
        <div class="style-family-list">${analysis.family.scores.map((item) => `<span><b>${escapeHtml(item.name)}</b><i><em style="width:${pct(item.score)}"></em></i><strong>${pct(item.score)}</strong></span>`).join("")}</div>
      </section>`;
  }

  function promptHtml(analysis, compare) {
    const guide = compare && state.mode === "adapt"
      ? compare.guidance
      : analysis.recipe.keep.concat(analysis.recipe.add);
    return `
      <section class="style-result-view active">
        <div class="style-text-block prompt">
          <strong>Short prompt</strong>
          <p>${escapeHtml(analysis.prompt.short)}</p>
        </div>
        <div class="style-text-block prompt">
          <strong>Full prompt</strong>
          <p>${escapeHtml(analysis.prompt.full)}</p>
        </div>
        <div class="style-text-grid">
          <div><strong>Recreate this style</strong>${guide.slice(0, 6).map((x) => `<p>${escapeHtml(x)}</p>`).join("")}</div>
          <div><strong>Avoid</strong>${analysis.prompt.avoid.concat(analysis.recipe.avoid).slice(0, 5).map((x) => `<p>${escapeHtml(x)}</p>`).join("")}</div>
        </div>
        <div class="style-copy-actions">
          <button type="button" class="button primary" data-copy-prompt>Copy prompt</button>
          <button type="button" class="button secondary" data-copy-summary>Copy analysis</button>
        </div>
      </section>`;
  }

  function dnaHtml(analysis) {
    return `
      <section class="style-result-view active">
        ${dnaCardHtml(analysis)}
        <div class="style-copy-actions">
          <button type="button" class="button primary" data-export-dna>Export DNA PNG</button>
          <button type="button" class="button secondary" data-copy-summary>Copy DNA text</button>
        </div>
      </section>`;
  }

  function dnaCardHtml(analysis) {
    return `
      <article id="styleDnaCard" class="style-dna-card">
        <div class="style-dna-top">
          <img src="${analysis.dataUrl}" alt="">
          <div><span>Style DNA</span><strong>${escapeHtml(analysis.title)}</strong><small>${escapeHtml(analysis.phrase)}</small></div>
        </div>
        <div class="style-dna-palette">${analysis.palette.slice(0, 5).map((color) => `<i style="background:${color.hex}"></i>`).join("")}</div>
        <div class="style-dna-metrics">
          <span>contrast <b>${pct(analysis.metrics.contrast)}</b></span>
          <span>polish <b>${pct(analysis.metrics.polish)}</b></span>
          <span>family <b>${escapeHtml(analysis.family.primary)}</b></span>
        </div>
        <p>${escapeHtml(analysis.prompt.short)}</p>
        <div class="style-dna-signature"><i style="width:${pct(analysis.family.confidence)}"></i></div>
      </article>`;
  }

  function bindResultActions(analysis) {
    dom.results.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", () => copyText(button.dataset.copy, "Copied"));
    });
    const paletteButton = dom.results.querySelector("[data-copy-palette]");
    if (paletteButton) paletteButton.addEventListener("click", () => copyText(analysis.palette.map((c) => c.hex).join("\n"), "Palette copied"));
    const tokensButton = dom.results.querySelector("[data-copy-tokens]");
    if (tokensButton) tokensButton.addEventListener("click", () => copyText(cssTokens(analysis), "Tokens copied"));
    const promptButton = dom.results.querySelector("[data-copy-prompt]");
    if (promptButton) promptButton.addEventListener("click", () => copyText(analysis.prompt.full, "Prompt copied"));
    dom.results.querySelectorAll("[data-copy-summary]").forEach((button) => {
      button.addEventListener("click", () => copyText(summaryText(analysis), "Analysis copied"));
    });
    const exportButton = dom.results.querySelector("[data-export-dna]");
    if (exportButton) exportButton.addEventListener("click", () => exportDnaCard(analysis));
  }

  function cssTokens(analysis) {
    const roles = {
      background: nearestRoleColor(analysis.palette, "background"),
      surface: nearestRoleColor(analysis.palette, "surface"),
      text: nearestRoleColor(analysis.palette, "text"),
      accent: nearestRoleColor(analysis.palette, "accent")
    };
    return Object.entries(roles).map(([key, value]) => `--style-${key}: ${value};`).join("\n");
  }

  function summaryText(analysis) {
    return [
      `Style DNA: ${analysis.title}`,
      `Phrase: ${analysis.phrase}`,
      `Family: ${analysis.family.primary} (${pct(analysis.family.confidence)})`,
      `Tags: ${analysis.tags.join(", ")}`,
      `Palette: ${analysis.palette.slice(0, 6).map((c) => c.hex).join(", ")}`,
      `Prompt: ${analysis.prompt.short}`,
      `Keep: ${analysis.recipe.keep.join(" ")}`
    ].join("\n");
  }

  function renderMiniObjects(analysis) {
    [dom.miniPalette, dom.miniMood, dom.miniFocus, dom.miniDna].forEach((node) => { if (node) node.textContent = ""; });
    if (!analysis) return;
    dom.miniPalette.innerHTML = analysis.palette.slice(0, 5).map((color) => `<b style="background:${color.hex};width:${Math.max(12, color.percent)}%"></b>`).join("");
    dom.miniMood.innerHTML = analysis.tags.slice(0, 4).map((tag) => `<b>${escapeHtml(tag)}</b>`).join("");
    dom.miniFocus.innerHTML = `<b style="left:${pct(analysis.focus.x * 100)};top:${pct(analysis.focus.y * 100)}"></b>`;
    dom.miniDna.innerHTML = `<b style="width:${pct(analysis.family.confidence)}"></b><em>${escapeHtml(analysis.family.primary)}</em>`;
  }

  function renderAll() {
    const analysis = activeAnalysis();
    renderSourceList();
    renderPreview(analysis);
    renderPalette(analysis);
    renderChips(analysis);
    renderResults(analysis);
    renderMiniObjects(analysis);
    dom.imageCount.textContent = String(state.images.length);
    dom.paletteCount.textContent = analysis ? String(analysis.palette.length) : "0";
    const compare = compareSummary();
    dom.overlap.textContent = compare ? pct(compare.overlap) : "0%";
  }

  function exportDnaCard(analysis) {
    const canvas = dom.exportCanvas;
    const width = 1200;
    const height = 760;
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    c.fillStyle = "#000";
    c.fillRect(0, 0, width, height);
    roundRect(c, 70, 64, width - 140, height - 128, 58);
    c.fillStyle = "#050505";
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.12)";
    c.stroke();

    const img = state.images[state.activeIndex] ? state.images[state.activeIndex].img : analysis.image;
    c.save();
    roundRect(c, 112, 116, 280, 220, 36);
    c.clip();
    c.drawImage(img, 112, 116, 280, 220);
    c.restore();

    c.fillStyle = "#8E8E93";
    c.font = "700 28px system-ui, sans-serif";
    c.fillText("Style DNA", 430, 132);
    c.fillStyle = "#F5F5F7";
    c.font = "800 58px system-ui, sans-serif";
    wrapText(c, analysis.title, 430, 206, 610, 62);
    c.fillStyle = "#FF4FD8";
    c.font = "700 34px system-ui, sans-serif";
    c.fillText(analysis.phrase, 430, 324);

    analysis.palette.slice(0, 6).forEach((color, index) => {
      c.fillStyle = color.hex;
      roundRect(c, 112 + index * 70, 386, 54, 54, 16);
      c.fill();
    });

    drawCanvasMetric(c, "contrast", analysis.metrics.contrast, 430, 396);
    drawCanvasMetric(c, "polish", analysis.metrics.polish, 430, 470);
    drawCanvasMetric(c, "confidence", analysis.family.confidence, 430, 544);

    c.fillStyle = "#F5F5F7";
    c.font = "700 30px system-ui, sans-serif";
    c.fillText(analysis.family.primary, 112, 520);
    c.fillStyle = "rgba(245,245,247,0.68)";
    c.font = "500 24px system-ui, sans-serif";
    wrapText(c, analysis.prompt.short, 112, 580, 900, 34);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${analysis.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-style-dna.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("DNA card exported");
    }, "image/png");
  }

  function drawCanvasMetric(c, label, value, x, y) {
    c.fillStyle = "#8E8E93";
    c.font = "700 22px system-ui, sans-serif";
    c.fillText(label, x, y);
    c.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(c, x + 150, y - 19, 300, 14, 7);
    c.fill();
    c.fillStyle = "#FF4FD8";
    roundRect(c, x + 150, y - 19, 300 * clamp(value, 0, 100) / 100, 14, 7);
    c.fill();
    c.fillStyle = "#F5F5F7";
    c.font = "700 22px system-ui, sans-serif";
    c.fillText(pct(value), x + 470, y);
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

  function wrapText(c, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (c.measureText(test).width > maxWidth && line) {
        c.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) c.fillText(line, x, currentY);
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      toast("Copy unavailable");
    }
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1500);
  }

  function bind() {
    dom.input.addEventListener("change", (event) => addFiles(event.target.files));
    ["dragenter", "dragover"].forEach((name) => {
      dom.drop.addEventListener(name, (event) => {
        event.preventDefault();
        dom.drop.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach((name) => {
      dom.drop.addEventListener(name, (event) => {
        event.preventDefault();
        dom.drop.classList.remove("dragging");
      });
    });
    dom.drop.addEventListener("drop", (event) => {
      addFiles(event.dataTransfer.files);
    });
    document.addEventListener("paste", (event) => {
      const files = Array.from(event.clipboardData ? event.clipboardData.files : []).filter((file) => file.type.startsWith("image/"));
      if (files.length) addFiles(files);
    });
    dom.loadUrl.addEventListener("click", addUrl);
    dom.clear.addEventListener("click", () => {
      state.images = [];
      state.activeIndex = 0;
      renderAll();
    });
    document.querySelectorAll("[data-style-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.styleMode;
        document.querySelectorAll("[data-style-mode]").forEach((item) => item.classList.toggle("active", item === button));
        renderAll();
      });
    });
    document.querySelectorAll("[data-style-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.tab = button.dataset.styleTab;
        document.querySelectorAll("[data-style-tab]").forEach((item) => item.classList.toggle("active", item === button));
        renderAll();
      });
    });
    document.querySelectorAll("[data-style-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.styleJump;
        const target = document.querySelector(`[data-style-tab="${tab}"]`);
        if (target) target.click();
      });
    });
    window.addEventListener("resize", () => drawOverlay(activeAnalysis()));
  }

  bind();
  renderAll();
})();
