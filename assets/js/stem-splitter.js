(function () {
  const $ = (id) => document.getElementById(id);
  const dom = {
    input: $("stemInput"),
    drop: $("stemDrop"),
    analyze: $("stemAnalyze"),
    play: $("stemPlay"),
    stop: $("stemStop"),
    exportMix: $("stemExportWav"),
    copyReport: $("stemCopyReport"),
    mode: $("stemMode"),
    sensitivity: $("stemSensitivity"),
    gain: $("stemGain"),
    targetList: $("stemTargetList"),
    duration: $("stemDuration"),
    sampleRate: $("stemSampleRate"),
    laneCount: $("stemLaneCount"),
    modeLabel: $("stemModeLabel"),
    sensitivityValue: $("stemSensitivityValue"),
    gainValue: $("stemGainValue"),
    status: $("stemStatus"),
    progress: $("stemProgressBar"),
    progressValue: $("stemProgressValue"),
    fileName: $("stemFileName"),
    meta: $("stemMeta"),
    waveCanvas: $("stemWaveCanvas"),
    laneCanvas: $("stemLaneCanvas"),
    stage: document.querySelector(".stem-canvas-stage"),
    empty: $("stemEmpty"),
    playhead: $("stemPlayhead"),
    mixSummary: $("stemMixSummary"),
    selectedInfo: $("stemSelectedInfo"),
    toast: $("stemToast")
  };

  if (!dom.input || !dom.waveCanvas) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  const targets = [
    { id: "vocals", label: "Vocals", color: "#b8ff3d", range: [170, 3600], focus: [220, 330, 520, 880, 1400, 2400], reject: [55, 90, 6500], rejectWeight: 0.18, transientWeight: -0.08, smooth: 5 },
    { id: "bass", label: "Bass", color: "#35d8ff", range: [35, 230], focus: [42, 55, 73, 98, 130, 196], reject: [700, 1800, 5600], rejectWeight: 0.16, transientWeight: -0.04, smooth: 4 },
    { id: "kick", label: "Kick", color: "#ff9f0a", range: [36, 126], focus: [42, 52, 66, 82, 108], reject: [420, 2200, 7800], rejectWeight: 0.12, transientWeight: 1.65, smooth: 1 },
    { id: "snare", label: "Snare", color: "#ff375f", range: [150, 4200], focus: [185, 240, 420, 900, 1700, 3200], reject: [52, 95, 7200], rejectWeight: 0.1, transientWeight: 1.38, smooth: 1 },
    { id: "hihat", label: "Hi-hat", color: "#ffd60a", range: [5600, 13600], focus: [6200, 7600, 9200, 11200, 13200], reject: [60, 220, 1600], rejectWeight: 0.08, transientWeight: 1.2, smooth: 1 },
    { id: "toms", label: "Toms", color: "#ff7a1a", range: [72, 360], focus: [82, 110, 146, 196, 280], reject: [48, 850, 7200], rejectWeight: 0.11, transientWeight: 1.3, smooth: 2 },
    { id: "cymbals", label: "Cymbals", color: "#f5f5f7", range: [3800, 15000], focus: [4200, 5600, 7600, 9800, 12800], reject: [55, 180, 1200], rejectWeight: 0.08, transientWeight: 1.05, smooth: 1 },
    { id: "piano", label: "Piano", color: "#8f5cff", range: [80, 5200], focus: [110, 165, 247, 392, 660, 1100, 2200, 4200], reject: [48, 7600], rejectWeight: 0.08, transientWeight: -0.02, smooth: 3 },
    { id: "guitar", label: "Guitar", color: "#ff453a", range: [82, 4200], focus: [110, 147, 220, 330, 660, 1400, 2800], reject: [48, 6200, 9500], rejectWeight: 0.12, transientWeight: 0.04, smooth: 3 },
    { id: "strings", label: "Strings", color: "#ff4fd8", range: [180, 7600], focus: [196, 294, 440, 660, 1300, 2600, 5200], reject: [55, 95, 10500], rejectWeight: 0.08, transientWeight: -0.08, smooth: 7 },
    { id: "synth", label: "Synth", color: "#64d2ff", range: [80, 9000], focus: [98, 196, 392, 784, 1568, 3136, 6272], reject: [45, 13000], rejectWeight: 0.06, transientWeight: 0.02, smooth: 3 },
    { id: "brass", label: "Brass", color: "#ffd166", range: [150, 5200], focus: [165, 247, 370, 554, 1108, 2200, 4200], reject: [50, 9000], rejectWeight: 0.1, transientWeight: 0.06, smooth: 4 }
  ];

  const configs = {
    fast: { frames: 260, window: 1024, step: 2, centers: 3 },
    balanced: { frames: 420, window: 1536, step: 2, centers: 4 },
    detail: { frames: 620, window: 2048, step: 1, centers: 5 }
  };

  const state = {
    audioContext: null,
    buffer: null,
    mono: null,
    fileLabel: "",
    activeStem: "vocals",
    laneVolumes: {},
    muted: new Set(),
    analysis: null,
    audioNodes: [],
    liveGains: new Map(),
    isPlaying: false,
    playStartedAt: 0,
    playOffset: 0,
    playDuration: 0,
    playFrame: null,
    report: ""
  };

  targets.forEach((target) => {
    state.laneVolumes[target.id] = 100;
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function getTarget(id) {
    return targets.find((target) => target.id === id) || targets[0];
  }

  function toast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1500);
  }

  function setProgress(percent, label) {
    const safe = clamp(percent, 0, 100);
    dom.progress.style.width = `${safe}%`;
    dom.progressValue.textContent = `${Math.round(safe)}%`;
    if (label) dom.status.textContent = label;
  }

  function updateLabels() {
    dom.sensitivityValue.textContent = `${Math.round(Number(dom.sensitivity.value) * 100)}%`;
    dom.gainValue.textContent = `${Number(dom.gain.value)}%`;
    dom.modeLabel.textContent = dom.mode.options[dom.mode.selectedIndex].text;
  }

  async function getContext() {
    if (!AudioContextClass) throw new Error("This browser does not support Web Audio decoding.");
    if (!state.audioContext) state.audioContext = new AudioContextClass();
    return state.audioContext;
  }

  function makeMono(buffer) {
    const mono = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i += 1) mono[i] += data[i] / buffer.numberOfChannels;
    }
    return mono;
  }

  function enableReady(enabled) {
    [dom.analyze, dom.play, dom.stop, dom.exportMix, dom.copyReport].forEach((node) => {
      if (node) node.disabled = !enabled;
    });
  }

  function effectiveLaneValue(id) {
    return state.muted.has(id) ? 0 : Number(state.laneVolumes[id] || 0);
  }

  function activeTargets() {
    return targets.filter((target) => effectiveLaneValue(target.id) > 0);
  }

  function isDefaultMix() {
    return targets.every((target) => !state.muted.has(target.id) && Number(state.laneVolumes[target.id]) === 100);
  }

  function currentOffset() {
    if (!state.isPlaying || !state.audioContext || !state.buffer) return 0;
    return clamp(state.playOffset + state.audioContext.currentTime - state.playStartedAt, 0, state.buffer.duration);
  }

  function renderTargets() {
    dom.targetList.innerHTML = "";
    targets.forEach((target) => {
      const value = Number(state.laneVolumes[target.id]);
      const muted = state.muted.has(target.id);
      const item = document.createElement("div");
      item.className = `stem-target${target.id === state.activeStem ? " active" : ""}${muted ? " muted" : ""}`;
      item.style.setProperty("--stem-color", target.color);
      item.innerHTML = `
        <button class="stem-target-select" type="button">
          <i></i><span>${target.label}</span>
        </button>
        <input class="stem-volume" type="range" min="0" max="150" step="1" value="${value}" aria-label="${target.label} volume">
        <strong class="stem-volume-value">${muted ? "off" : `${value}%`}</strong>
        <button class="stem-mute ${muted ? "on" : ""}" type="button" aria-pressed="${muted}">${muted ? "On" : "Mute"}</button>`;

      item.querySelector(".stem-target-select").addEventListener("click", () => {
        state.activeStem = target.id;
        renderTargets();
        renderAll();
      });

      item.querySelector(".stem-volume").addEventListener("input", (event) => {
        state.laneVolumes[target.id] = Number(event.target.value);
        if (Number(event.target.value) > 0) state.muted.delete(target.id);
        item.classList.toggle("muted", state.muted.has(target.id));
        item.querySelector(".stem-volume-value").textContent = state.muted.has(target.id) ? "off" : `${state.laneVolumes[target.id]}%`;
        const mute = item.querySelector(".stem-mute");
        mute.classList.toggle("on", state.muted.has(target.id));
        mute.setAttribute("aria-pressed", String(state.muted.has(target.id)));
        mute.textContent = state.muted.has(target.id) ? "On" : "Mute";
        applyLiveVolumeChange(target.id);
        renderAll();
        makeReport();
      });

      item.querySelector(".stem-mute").addEventListener("click", () => {
        if (state.muted.has(target.id)) state.muted.delete(target.id);
        else state.muted.add(target.id);
        applyLiveVolumeChange(target.id);
        renderTargets();
        renderAll();
        makeReport();
      });

      dom.targetList.appendChild(item);
    });
  }

  function applyLiveVolumeChange(id) {
    if (!state.isPlaying) return;
    if (!state.liveGains.size || isDefaultMix()) {
      const offset = currentOffset();
      startPlayback(offset);
      return;
    }
    const active = activeTargets().length || 1;
    const scale = 0.92 / Math.sqrt(active);
    targets.forEach((target) => {
      const gain = state.liveGains.get(target.id);
      if (!gain || !state.audioContext) return;
      gain.gain.setTargetAtTime((Number(dom.gain.value) / 100) * (effectiveLaneValue(target.id) / 100) * scale, state.audioContext.currentTime, 0.025);
    });
  }

  async function loadFile(file) {
    if (!file) return;
    enableReady(false);
    stopPreview();
    setProgress(4, "Decoding audio...");
    try {
      const context = await getContext();
      const arrayBuffer = await file.arrayBuffer();
      state.buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      state.mono = makeMono(state.buffer);
      state.fileLabel = file.name || "audio-track";
      state.analysis = null;
      dom.fileName.textContent = state.fileLabel;
      dom.duration.textContent = formatTime(state.buffer.duration);
      dom.sampleRate.textContent = `${Math.round(state.buffer.sampleRate).toLocaleString()} Hz`;
      dom.laneCount.textContent = String(targets.length);
      dom.meta.textContent = `${state.buffer.numberOfChannels} ch / ${formatTime(state.buffer.duration)}`;
      enableReady(true);
      setProgress(18, "Audio decoded. Ready to analyze.");
      await analyze();
    } catch (error) {
      setProgress(0, error.message || "Could not decode this audio file.");
    }
  }

  function logCenters(low, high, count) {
    const centers = [];
    const a = Math.log(low);
    const b = Math.log(high);
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      centers.push(Math.exp(a + (b - a) * t));
    }
    return centers;
  }

  function goertzel(data, start, size, stride, freq, sampleRate) {
    const omega = (2 * Math.PI * freq) / sampleRate;
    const coeff = 2 * Math.cos(omega);
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let used = 0;
    for (let i = 0; i < size; i += stride) {
      const sample = data[start + i] || 0;
      const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, size - 1));
      s0 = sample * win + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
      used += 1;
    }
    return (s1 * s1 + s2 * s2 - coeff * s1 * s2) / Math.max(1, used);
  }

  function frameRms(data, start, size, stride) {
    let sum = 0;
    let used = 0;
    for (let i = 0; i < size; i += stride) {
      const sample = data[start + i] || 0;
      sum += sample * sample;
      used += 1;
    }
    return Math.sqrt(sum / Math.max(1, used));
  }

  function weightedSpectralEnergy(freqs, data, start, size, stride, sampleRate) {
    let sum = 0;
    let weight = 0;
    freqs.forEach((freq, index) => {
      if (freq >= sampleRate / 2 - 80) return;
      const emphasis = 1 / (1 + index * 0.14);
      sum += goertzel(data, start, size, stride, freq, sampleRate) * emphasis;
      weight += emphasis;
    });
    return sum / Math.max(1, weight);
  }

  function targetProfileEnergy(target, data, start, config, sampleRate, transient) {
    const focus = target.focus || logCenters(target.range[0], Math.min(target.range[1], sampleRate / 2 - 100), config.centers);
    const reject = target.reject || [];
    const focusEnergy = weightedSpectralEnergy(focus, data, start, config.window, config.step, sampleRate);
    const rejectEnergy = weightedSpectralEnergy(reject, data, start, config.window, config.step, sampleRate);
    let score = Math.max(0, focusEnergy - rejectEnergy * (target.rejectWeight || 0.08));
    if (target.transientWeight > 0) score *= 1 + transient * target.transientWeight;
    else score *= 1 - Math.min(0.18, transient * Math.abs(target.transientWeight || 0));
    return score;
  }

  function normalize(values) {
    let max = 0;
    values.forEach((value) => {
      if (value > max) max = value;
    });
    if (max <= 0) return values;
    return values.map((value) => Math.sqrt(value / max));
  }

  function smoothValues(values, radius) {
    if (radius <= 1) return values.slice();
    return values.map((value, index) => {
      let sum = 0;
      let weight = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const neighbor = values[index + offset];
        if (neighbor === undefined) continue;
        const localWeight = radius + 1 - Math.abs(offset);
        sum += neighbor * localWeight;
        weight += localWeight;
      }
      return sum / Math.max(1, weight);
    });
  }

  function refineEnergy(values, target) {
    const normalized = normalize(values);
    if (target.transientWeight > 0.8) {
      return normalize(normalized.map((value, index) => {
        const before = normalized[index - 1] || 0;
        const after = normalized[index + 1] || 0;
        const peak = Math.max(0, value - (before + after) * 0.42);
        return value * 0.72 + peak * 1.24;
      }));
    }
    return normalize(smoothValues(normalized, target.smooth || 3));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(0.001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function laneMaskValue(target, value) {
    const sensitivity = Number(dom.sensitivity.value);
    const transient = target.transientWeight > 0.8;
    const threshold = clamp(sensitivity + (transient ? -0.12 : -0.18), 0.12, 0.88);
    const width = transient ? 0.15 : 0.24;
    const mask = smoothstep(threshold - width, threshold + width, value);
    return Math.pow(mask, transient ? 1.15 : 1.35);
  }

  function maskAtTime(target, time) {
    if (!state.analysis) return 1;
    const energy = state.analysis.energies[target.id] || [];
    const times = state.analysis.frameTimes || [];
    if (!energy.length || !times.length) return 1;
    if (time <= times[0]) return laneMaskValue(target, energy[0]);
    for (let i = 1; i < times.length; i += 1) {
      if (times[i] >= time) {
        const span = Math.max(0.001, times[i] - times[i - 1]);
        const t = (time - times[i - 1]) / span;
        const value = energy[i - 1] + (energy[i] - energy[i - 1]) * t;
        return laneMaskValue(target, value);
      }
    }
    return laneMaskValue(target, energy[energy.length - 1]);
  }

  function scheduleLaneMask(context, maskGain, target, startAt, offset) {
    if (!state.analysis) {
      maskGain.gain.value = 1;
      return;
    }
    const energy = state.analysis.energies[target.id] || [];
    const times = state.analysis.frameTimes || [];
    if (!energy.length || !times.length) {
      maskGain.gain.value = 1;
      return;
    }

    maskGain.gain.cancelScheduledValues(startAt);
    maskGain.gain.setValueAtTime(maskAtTime(target, offset), startAt);
    for (let i = 0; i < times.length; i += 1) {
      if (times[i] <= offset) continue;
      const at = startAt + times[i] - offset;
      maskGain.gain.linearRampToValueAtTime(laneMaskValue(target, energy[i]), at);
    }
  }

  function computeWaveform(width) {
    const data = state.mono;
    const peaks = [];
    const samples = Math.max(1, Math.floor(data.length / width));
    for (let x = 0; x < width; x += 1) {
      const start = x * samples;
      const end = Math.min(data.length, start + samples);
      let min = 1;
      let max = -1;
      for (let i = start; i < end; i += 1) {
        const sample = data[i] || 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      peaks.push([min, max]);
    }
    return peaks;
  }

  async function analyze() {
    if (!state.buffer || !state.mono) return;
    stopPreview();
    const config = configs[dom.mode.value] || configs.balanced;
    const duration = state.buffer.duration;
    const sampleRate = state.buffer.sampleRate;
    const frameCount = Math.min(config.frames, Math.max(90, Math.floor(duration * 30)));
    const frameTimes = [];
    const energies = {};
    let previousRms = 0;

    targets.forEach((target) => {
      energies[target.id] = [];
    });

    setProgress(20, "Reading spectral lanes...");
    for (let frame = 0; frame < frameCount; frame += 1) {
      const time = duration * (frame / Math.max(1, frameCount - 1));
      const start = clamp(Math.round(time * sampleRate - config.window / 2), 0, Math.max(0, state.mono.length - config.window - 1));
      const rms = frameRms(state.mono, start, config.window, config.step);
      const transient = clamp((rms - previousRms) / Math.max(0.0001, previousRms || rms || 0.0001), 0, 1);
      previousRms = previousRms * 0.64 + rms * 0.36;
      frameTimes.push(time);
      targets.forEach((target) => {
        energies[target.id].push(targetProfileEnergy(target, state.mono, start, config, sampleRate, transient));
      });
      if (frame % 12 === 0) {
        setProgress(20 + (frame / frameCount) * 58, "Mapping instrument lanes...");
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    targets.forEach((target) => {
      energies[target.id] = refineEnergy(energies[target.id], target);
    });

    state.analysis = {
      frameCount,
      frameTimes,
      energies,
      waveform: computeWaveform(900),
      duration,
      sampleRate
    };
    dom.stage.classList.add("ready");
    setProgress(92, "Preparing mixer view...");
    renderAll();
    setProgress(100, "Instrument mixer ready.");
    makeReport();
  }

  function canvasSize(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function renderAll() {
    if (!state.analysis) {
      clearCanvases();
      return;
    }
    drawWave();
    drawLanes();
    const target = getTarget(state.activeStem);
    const value = effectiveLaneValue(target.id);
    dom.selectedInfo.textContent = `${target.label}: ${value}%${state.muted.has(target.id) ? " muted" : ""}`;
    dom.mixSummary.textContent = isDefaultMix()
      ? "Mix: original track"
      : `Mix: ${activeTargets().length}/${targets.length} lanes active`;
  }

  function clearCanvases() {
    [dom.waveCanvas, dom.laneCanvas].forEach((canvas) => {
      const { ctx, width, height } = canvasSize(canvas);
      ctx.clearRect(0, 0, width, height);
    });
  }

  function drawWave() {
    const { ctx, width } = canvasSize(dom.waveCanvas);
    ctx.clearRect(0, 0, width, 132);
    const mid = 76;
    const scale = 52;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(width, mid);
    ctx.stroke();
    ctx.strokeStyle = "rgba(184,255,61,0.74)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    state.analysis.waveform.forEach((pair, index) => {
      const x = (index / Math.max(1, state.analysis.waveform.length - 1)) * width;
      ctx.moveTo(x, mid + pair[0] * scale);
      ctx.lineTo(x, mid + pair[1] * scale);
    });
    ctx.stroke();
  }

  function drawLanes() {
    const { ctx, width, height } = canvasSize(dom.laneCanvas);
    ctx.clearRect(0, 0, width, height);
    const top = 142;
    const bottom = 84;
    const laneHeight = Math.max(26, (height - top - bottom) / targets.length);
    ctx.font = "700 11px ui-sans-serif, system-ui";
    targets.forEach((target, row) => {
      const y = top + row * laneHeight;
      const energy = state.analysis.energies[target.id];
      const laneValue = effectiveLaneValue(target.id);
      ctx.fillStyle = target.id === state.activeStem ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.018)";
      roundRect(ctx, 8, y + 4, width - 16, laneHeight - 8, 12);
      ctx.fill();
      ctx.fillStyle = laneValue ? target.color : "rgba(247,247,248,0.32)";
      ctx.fillText(target.label, 18, y + laneHeight / 2 + 4);
      const left = 96;
      const usable = width - left - 76;
      ctx.fillStyle = target.color;
      energy.forEach((value, index) => {
        const x = left + (index / Math.max(1, energy.length - 1)) * usable;
        const barH = Math.max(1, value * (laneHeight - 16));
        ctx.globalAlpha = laneValue ? (target.id === state.activeStem ? 0.95 : 0.42 + laneValue / 260) : 0.08;
        roundRect(ctx, x, y + laneHeight - 8 - barH, Math.max(2, usable / energy.length - 1), barH, 3);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(247,247,248,0.58)";
      ctx.font = "700 10px Consolas, monospace";
      ctx.fillText(`${laneValue}%`, width - 58, y + laneHeight / 2 + 4);
      ctx.font = "700 11px ui-sans-serif, system-ui";
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function stopPreview() {
    state.audioNodes.forEach((node) => {
      try { node.stop(0); } catch (error) {}
      try { node.disconnect(); } catch (error) {}
    });
    state.audioNodes = [];
    state.liveGains.clear();
    state.isPlaying = false;
    dom.playhead.classList.remove("visible");
    dom.playhead.style.left = "0%";
    cancelAnimationFrame(state.playFrame);
  }

  async function playSelectedPreview() {
    await startPlayback(0);
  }

  async function startPlayback(offset) {
    if (!state.buffer) return;
    stopPreview();
    const context = await getContext();
    if (context.state === "suspended") await context.resume();
    const startAt = context.currentTime + 0.035;
    const master = Number(dom.gain.value) / 100;

    if (isDefaultMix()) {
      startAudioLayer(context, null, master, startAt, offset);
      setProgress(100, "Playing original mix...");
    } else {
      const lanes = activeTargets();
      if (!lanes.length) {
        setProgress(100, "All lanes are muted.");
        toast("All lanes are muted");
        return;
      }
      const scale = 0.92 / Math.sqrt(lanes.length);
      lanes.forEach((target) => {
        startAudioLayer(context, target, master * (effectiveLaneValue(target.id) / 100) * scale, startAt, offset);
      });
      setProgress(100, `Playing ${lanes.length} lane${lanes.length === 1 ? "" : "s"}...`);
    }

    state.isPlaying = true;
    state.playOffset = offset;
    state.playStartedAt = startAt;
    state.playDuration = state.buffer.duration;
    dom.playhead.classList.add("visible");
    animatePlayhead();
  }

  function startAudioLayer(context, target, gainValue, startAt, offset) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = state.buffer;
    const output = target ? buildFilterChain(context, source, target) : source;
    const mask = target ? context.createGain() : null;
    gain.gain.value = gainValue;
    if (mask) {
      scheduleLaneMask(context, mask, target, startAt, offset);
      output.connect(mask).connect(gain).connect(context.destination);
    } else {
      output.connect(gain).connect(context.destination);
    }
    source.onended = () => {
      if (state.audioNodes.includes(source)) stopPreview();
    };
    source.start(startAt, offset);
    state.audioNodes.push(source, gain);
    if (mask) state.audioNodes.push(mask);
    if (output !== source) state.audioNodes.push(output);
    if (target) state.liveGains.set(target.id, gain);
  }

  function buildFilterChain(context, source, target) {
    const high = context.createBiquadFilter();
    const low = context.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = Math.max(20, target.range[0]);
    high.Q.value = target.id === "kick" || target.id === "bass" ? 0.82 : 0.65;
    low.type = "lowpass";
    low.frequency.value = Math.min(target.range[1], context.sampleRate / 2 - 100);
    low.Q.value = target.id === "hihat" || target.id === "cymbals" ? 0.48 : 0.72;
    source.connect(high);
    high.connect(low);
    return low;
  }

  function animatePlayhead() {
    if (!state.isPlaying || !state.audioContext || !state.buffer) return;
    const elapsed = state.audioContext.currentTime - state.playStartedAt;
    const absolute = clamp(state.playOffset + elapsed, 0, state.buffer.duration);
    const percent = clamp(absolute / Math.max(0.1, state.buffer.duration), 0, 1);
    dom.playhead.style.left = `${percent * 100}%`;
    if (percent < 1) {
      state.playFrame = requestAnimationFrame(animatePlayhead);
    } else {
      stopPreview();
    }
  }

  async function exportMixWav() {
    if (!state.buffer || !OfflineContextClass) return;
    const lanes = isDefaultMix() ? targets : activeTargets();
    if (!isDefaultMix() && !lanes.length) {
      toast("All lanes are muted");
      return;
    }
    setProgress(24, "Rendering current mix...");
    const rendered = await renderMixOffline();
    const blob = encodeWav(rendered);
    downloadBlob(blob, "toolbox-stem-mix.wav");
    setProgress(100, "Mix WAV exported.");
    toast("Mix exported");
  }

  async function renderMixOffline() {
    const channels = state.buffer.numberOfChannels;
    const offline = new OfflineContextClass(channels, state.buffer.length, state.buffer.sampleRate);
    const master = Number(dom.gain.value) / 100;
    if (isDefaultMix()) {
      const source = offline.createBufferSource();
      const gain = offline.createGain();
      source.buffer = state.buffer;
      gain.gain.value = master;
      source.connect(gain).connect(offline.destination);
      source.start(0);
      return offline.startRendering();
    }

    const lanes = activeTargets();
    const scale = 0.92 / Math.sqrt(lanes.length);
    lanes.forEach((target) => {
      const source = offline.createBufferSource();
      const mask = offline.createGain();
      const gain = offline.createGain();
      source.buffer = state.buffer;
      scheduleLaneMask(offline, mask, target, 0, 0);
      buildFilterChain(offline, source, target).connect(mask).connect(gain).connect(offline.destination);
      gain.gain.value = master * (effectiveLaneValue(target.id) / 100) * scale;
      source.start(0);
    });
    return offline.startRendering();
  }

  function encodeWav(buffer) {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytes = 44 + length * channels * 2;
    const array = new ArrayBuffer(bytes);
    const view = new DataView(array);
    let offset = 0;
    writeString("RIFF");
    view.setUint32(offset, bytes - 8, true); offset += 4;
    writeString("WAVEfmt ");
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * channels * 2, true); offset += 4;
    view.setUint16(offset, channels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString("data");
    view.setUint32(offset, length * channels * 2, true); offset += 4;
    for (let i = 0; i < length; i += 1) {
      for (let ch = 0; ch < channels; ch += 1) {
        const sample = clamp(buffer.getChannelData(ch)[i], -1, 1);
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([array], { type: "audio/wav" });

    function writeString(value) {
      for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
      offset += value.length;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 700);
  }

  function makeReport() {
    if (!state.analysis) return "";
    state.report = [
      "Stem Splitter report",
      `File: ${state.fileLabel}`,
      `Duration: ${formatTime(state.analysis.duration)}`,
      `Sample rate: ${Math.round(state.analysis.sampleRate)} Hz`,
      `Mode: ${dom.mode.options[dom.mode.selectedIndex].text}`,
      `Selected: ${getTarget(state.activeStem).label}`,
      `Active lanes: ${activeTargets().map((target) => `${target.label} ${effectiveLaneValue(target.id)}%`).join(", ") || "none"}`,
      "Note: browser-local spectral filtering, not neural source separation."
    ].join("\n");
    return state.report;
  }

  function copyReport() {
    const report = makeReport();
    navigator.clipboard.writeText(report).then(() => toast("Report copied"));
  }

  function handleDrop(event) {
    event.preventDefault();
    dom.drop.classList.remove("dragging");
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    loadFile(file);
  }

  function bind() {
    renderTargets();
    updateLabels();
    dom.laneCount.textContent = String(targets.length);
    dom.input.addEventListener("change", (event) => loadFile(event.target.files[0]));
    dom.drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      dom.drop.classList.add("dragging");
    });
    dom.drop.addEventListener("dragleave", () => dom.drop.classList.remove("dragging"));
    dom.drop.addEventListener("drop", handleDrop);
    dom.analyze.addEventListener("click", analyze);
    dom.play.addEventListener("click", playSelectedPreview);
    dom.stop.addEventListener("click", stopPreview);
    dom.exportMix.addEventListener("click", exportMixWav);
    dom.copyReport.addEventListener("click", copyReport);
    [dom.mode, dom.sensitivity].forEach((node) => {
      node.addEventListener("input", () => {
        updateLabels();
        if (state.analysis) analyze();
      });
    });
    dom.gain.addEventListener("input", () => {
      updateLabels();
      if (state.isPlaying) {
        const offset = currentOffset();
        startPlayback(offset);
      }
    });
    window.addEventListener("resize", renderAll);
    enableReady(false);
  }

  bind();
})();
