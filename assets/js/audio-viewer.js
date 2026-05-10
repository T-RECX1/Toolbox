(function () {
  const $ = (id) => document.getElementById(id);
  const dom = {
    input: $("audioInput"),
    drop: $("audioDrop"),
    audio: $("audioElement"),
    play: $("audioPlay"),
    stop: $("audioStop"),
    demo: $("audioDemo"),
    reanalyze: $("audioReanalyze"),
    snapshot: $("audioSnapshot"),
    copyStats: $("audioCopyStats"),
    zoom: $("audioZoom"),
    speed: $("audioSpeed"),
    pitch: $("audioPitch"),
    gain: $("audioGain"),
    detail: $("audioDetail"),
    range: $("audioRange"),
    follow: $("audioFollow"),
    loop: $("audioLoop"),
    loopStart: $("audioLoopStart"),
    loopEnd: $("audioLoopEnd"),
    seek: $("audioSeek"),
    scroll: $("audioScroll"),
    stack: $("audioCanvasStack"),
    timeline: $("audioTimeline"),
    waveform: $("audioWaveform"),
    piano: $("audioPianoRoll"),
    pianoLabels: $("audioPianoLabels"),
    volume: $("audioVolumeCanvas"),
    playhead: $("audioPlayhead"),
    fileName: $("audioFileName"),
    timeReadout: $("audioTimeReadout"),
    status: $("audioStatus"),
    topNotes: $("audioTopNotes"),
    duration: $("audioDuration"),
    sampleRate: $("audioSampleRate"),
    peak: $("audioPeak"),
    loudness: $("audioLoudness"),
    zoomValue: $("audioZoomValue"),
    speedValue: $("audioSpeedValue"),
    pitchValue: $("audioPitchValue"),
    gainValue: $("audioGainValue"),
    toast: $("audioToast")
  };

  if (!dom.input || !dom.audio) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteRanges = {
    bass: [24, 72],
    vocal: [36, 84],
    wide: [24, 96]
  };
  const detailConfig = {
    fast: { frames: 360, window: 1024, step: 2 },
    balanced: { frames: 620, window: 1536, step: 1 },
    detail: { frames: 900, window: 2048, step: 1 }
  };

  const state = {
    audioContext: null,
    objectUrl: "",
    buffer: null,
    mono: null,
    fileLabel: "",
    analysis: null,
    pixelsPerSecond: 120,
    gutter: 68,
    trackWidth: 900,
    rows: [],
    statsText: ""
  };

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const sec = String(total % 60).padStart(2, "0");
    return `${minutes}:${sec}`;
  }

  function db(value) {
    return 20 * Math.log10(Math.max(0.000001, value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function midiName(midi) {
    return `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function setCanvas(canvas, width, height) {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
  }

  function updateLabels() {
    const speed = Number(dom.speed.value);
    const pitch = Number(dom.pitch.value);
    const gain = Number(dom.gain.value);
    dom.zoomValue.textContent = `${Math.round(Number(dom.zoom.value))} px/s`;
    dom.speedValue.textContent = `${speed.toFixed(2)}x`;
    dom.pitchValue.textContent = `${pitch > 0 ? "+" : ""}${pitch} st`;
    dom.gainValue.textContent = `${gain}%`;
  }

  function updatePlaybackRate() {
    updateLabels();
    const speed = Number(dom.speed.value);
    const pitchRatio = Math.pow(2, Number(dom.pitch.value) / 12);
    dom.audio.preservesPitch = false;
    dom.audio.mozPreservesPitch = false;
    dom.audio.webkitPreservesPitch = false;
    dom.audio.playbackRate = clamp(speed * pitchRatio, 0.25, 4);
    dom.audio.volume = clamp(Number(dom.gain.value) / 100, 0, 1);
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1500);
  }

  function enableLoadedState(enabled) {
    [dom.play, dom.stop, dom.reanalyze, dom.snapshot, dom.copyStats, dom.seek].forEach((node) => {
      node.disabled = !enabled;
    });
  }

  async function getAudioContext() {
    if (!AudioContextClass) throw new Error("This browser does not support Web Audio decoding.");
    if (!state.audioContext) state.audioContext = new AudioContextClass();
    return state.audioContext;
  }

  async function loadFile(file) {
    if (!file) return;
    dom.status.textContent = "Decoding audio...";
    enableLoadedState(false);

    try {
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = URL.createObjectURL(file);
      dom.audio.src = state.objectUrl;
      state.fileLabel = file.name || "Generated demo";
      dom.fileName.textContent = state.fileLabel;

      const arrayBuffer = await file.arrayBuffer();
      const audioContext = await getAudioContext();
      state.buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      state.mono = makeMonoBuffer(state.buffer);
      dom.loopStart.value = 0;
      dom.loopEnd.value = state.buffer.duration.toFixed(1);
      updateStats();
      enableLoadedState(true);
      await analyzeAndRender();
      toast("Audio ready");
    } catch (error) {
      dom.status.textContent = error.message || "Could not decode this audio file.";
      enableLoadedState(false);
    }
  }

  function makeMonoBuffer(buffer) {
    const length = buffer.length;
    const channels = buffer.numberOfChannels;
    const mono = new Float32Array(length);
    for (let channel = 0; channel < channels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) mono[i] += data[i] / channels;
    }
    return mono;
  }

  function updateStats() {
    if (!state.buffer || !state.mono) return;
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < state.mono.length; i += 1) {
      const sample = Math.abs(state.mono[i]);
      if (sample > peak) peak = sample;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / state.mono.length);
    const duration = state.buffer.duration;
    dom.duration.textContent = formatTime(duration);
    dom.sampleRate.textContent = `${Math.round(state.buffer.sampleRate).toLocaleString()} Hz`;
    dom.peak.textContent = `${db(peak).toFixed(1)} dB`;
    dom.loudness.textContent = `${db(rms).toFixed(1)} dB`;
    dom.seek.max = String(duration);
    dom.timeReadout.textContent = `${formatTime(dom.audio.currentTime)} / ${formatTime(duration)}`;
    state.statsText = [
      `File: ${state.fileLabel}`,
      `Duration: ${formatTime(duration)} (${duration.toFixed(2)}s)`,
      `Sample rate: ${Math.round(state.buffer.sampleRate)} Hz`,
      `Channels: ${state.buffer.numberOfChannels}`,
      `Peak: ${db(peak).toFixed(1)} dB`,
      `Approx loudness: ${db(rms).toFixed(1)} dB`
    ].join("\n");
  }

  function computeWaveform(trackWidth) {
    const data = state.mono;
    const length = data.length;
    const peaks = new Float32Array(trackWidth * 2);
    const rms = new Float32Array(trackWidth);
    const samplesPerPixel = Math.max(1, Math.floor(length / trackWidth));

    for (let x = 0; x < trackWidth; x += 1) {
      const start = x * samplesPerPixel;
      const end = Math.min(length, start + samplesPerPixel);
      let min = 1;
      let max = -1;
      let sum = 0;
      for (let i = start; i < end; i += 1) {
        const sample = data[i] || 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
        sum += sample * sample;
      }
      peaks[x * 2] = min;
      peaks[x * 2 + 1] = max;
      rms[x] = Math.sqrt(sum / Math.max(1, end - start));
    }

    return { peaks, rms };
  }

  function goertzel(data, start, windowSize, step, coeff) {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let used = 0;
    for (let i = 0; i < windowSize; i += step) {
      const sample = data[start + i] || 0;
      const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, windowSize - 1));
      s0 = sample * win + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
      used += 1;
    }
    return (s1 * s1 + s2 * s2 - coeff * s1 * s2) / Math.max(1, used);
  }

  async function computePianoRoll(trackWidth) {
    const range = noteRanges[dom.range.value] || noteRanges.vocal;
    const config = detailConfig[dom.detail.value] || detailConfig.balanced;
    const duration = state.buffer.duration;
    const sampleRate = state.buffer.sampleRate;
    const notes = [];
    for (let midi = range[0]; midi <= range[1]; midi += 1) notes.push(midi);

    const frames = Math.max(80, Math.min(config.frames, Math.round(duration * 14), trackWidth));
    const energies = new Float32Array(frames * notes.length);
    const frameRms = new Float32Array(frames);
    const noteSums = new Float32Array(notes.length);
    const coeffs = notes.map((midi) => 2 * Math.cos((2 * Math.PI * midiToFreq(midi)) / sampleRate));
    const windowSize = Math.min(config.window, state.mono.length);
    let maxEnergy = 0;

    for (let frame = 0; frame < frames; frame += 1) {
      const center = frames <= 1 ? 0 : Math.floor((frame / (frames - 1)) * (state.mono.length - 1));
      const start = clamp(center - Math.floor(windowSize / 2), 0, Math.max(0, state.mono.length - windowSize));
      let sum = 0;
      for (let i = 0; i < windowSize; i += config.step) {
        const sample = state.mono[start + i] || 0;
        sum += sample * sample;
      }
      frameRms[frame] = Math.sqrt(sum / Math.max(1, windowSize / config.step));

      for (let note = 0; note < notes.length; note += 1) {
        const raw = goertzel(state.mono, start, windowSize, config.step, coeffs[note]);
        const energy = Math.log10(1 + raw * 1600);
        energies[frame * notes.length + note] = energy;
        noteSums[note] += energy;
        if (energy > maxEnergy) maxEnergy = energy;
      }

      if (frame % 26 === 0) {
        dom.status.textContent = `Analyzing notes ${Math.round((frame / frames) * 100)}%`;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    const topNotes = notes
      .map((midi, index) => ({ midi, total: noteSums[index] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((item) => midiName(item.midi));

    return { notes, frames, energies, frameRms, maxEnergy: Math.max(0.001, maxEnergy), topNotes };
  }

  async function analyzeAndRender() {
    if (!state.buffer || !state.mono) return;
    updateLabels();
    updatePlaybackRate();
    dom.status.textContent = "Preparing canvases...";

    const requestedPps = Number(dom.zoom.value);
    const maxWidth = 28000;
    state.trackWidth = Math.max(900, Math.min(maxWidth, Math.round(state.buffer.duration * requestedPps)));
    state.pixelsPerSecond = state.trackWidth / Math.max(0.001, state.buffer.duration);

    const rowHeight = 10;
    const range = noteRanges[dom.range.value] || noteRanges.vocal;
    const pianoHeight = (range[1] - range[0] + 1) * rowHeight;
    const totalWidth = state.gutter + state.trackWidth;
    setCanvas(dom.timeline, totalWidth, 34);
    setCanvas(dom.waveform, totalWidth, 178);
    setCanvas(dom.piano, totalWidth, pianoHeight);
    setCanvas(dom.volume, totalWidth, 78);
    dom.stack.style.width = `${totalWidth}px`;
    dom.playhead.style.height = `${dom.timeline.height + dom.waveform.height + dom.piano.height + dom.volume.height + 22}px`;
    positionPianoLabels(pianoHeight);

    const waveform = computeWaveform(state.trackWidth);
    const piano = await computePianoRoll(state.trackWidth);
    state.analysis = { waveform, piano };
    drawAll();
    renderPianoLabels(piano.notes);
    dom.topNotes.textContent = `Top notes: ${piano.topNotes.join(", ") || "none"}`;
    dom.status.textContent = "Ready";
    updatePlayhead();
  }

  function drawAll() {
    if (!state.analysis) return;
    drawTimeline();
    drawWaveform();
    drawPianoRoll();
    drawVolume();
  }

  function positionPianoLabels(height) {
    if (!dom.pianoLabels) return;
    const top = dom.timeline.height + dom.waveform.height + 14;
    dom.pianoLabels.style.top = `${top}px`;
    dom.pianoLabels.style.height = `${height}px`;
    dom.pianoLabels.style.width = `${state.gutter}px`;
  }

  function renderPianoLabels(notes) {
    if (!dom.pianoLabels || !notes || !notes.length) return;
    dom.pianoLabels.textContent = "";
    dom.pianoLabels.style.setProperty("--note-count", notes.length);
    notes.slice().reverse().forEach((midi) => {
      const label = document.createElement("span");
      label.textContent = midiName(midi);
      label.className = midi % 12 === 0 ? "root-note" : noteNames[midi % 12].includes("#") ? "sharp-note" : "";
      dom.pianoLabels.appendChild(label);
    });
  }

  function drawTimeline() {
    const canvas = dom.timeline;
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#020202";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = "rgba(255,255,255,0.08)";
    c.beginPath();
    c.moveTo(state.gutter, canvas.height - 0.5);
    c.lineTo(canvas.width, canvas.height - 0.5);
    c.stroke();
    c.fillStyle = "rgba(247,247,248,0.55)";
    c.font = "11px Consolas, monospace";
    c.textBaseline = "middle";
    c.fillText("time", 14, canvas.height / 2);

    const tick = state.buffer.duration > 90 ? 10 : state.buffer.duration > 30 ? 5 : 1;
    for (let time = 0; time <= state.buffer.duration; time += tick) {
      const x = state.gutter + time * state.pixelsPerSecond;
      c.strokeStyle = time % (tick * 2) === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)";
      c.beginPath();
      c.moveTo(x + 0.5, 9);
      c.lineTo(x + 0.5, canvas.height);
      c.stroke();
      c.fillStyle = "rgba(247,247,248,0.55)";
      c.fillText(formatTime(time), x + 5, 14);
    }
  }

  function drawWaveform() {
    const canvas = dom.waveform;
    const c = canvas.getContext("2d");
    const { peaks } = state.analysis.waveform;
    const center = canvas.height / 2;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#020202";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "rgba(247,247,248,0.56)";
    c.font = "12px system-ui, sans-serif";
    c.fillText("waveform", 14, 22);
    c.strokeStyle = "rgba(255,255,255,0.08)";
    c.beginPath();
    c.moveTo(state.gutter, center);
    c.lineTo(canvas.width, center);
    c.stroke();

    c.strokeStyle = "rgba(255,159,10,0.9)";
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x < state.trackWidth; x += 1) {
      const min = peaks[x * 2];
      const max = peaks[x * 2 + 1];
      const px = state.gutter + x + 0.5;
      c.moveTo(px, center + min * center * 0.86);
      c.lineTo(px, center + max * center * 0.86);
    }
    c.stroke();

    c.strokeStyle = "rgba(255,255,255,0.06)";
    c.beginPath();
    c.moveTo(state.gutter + 0.5, 0);
    c.lineTo(state.gutter + 0.5, canvas.height);
    c.stroke();
  }

  function drawPianoRoll() {
    const canvas = dom.piano;
    const c = canvas.getContext("2d");
    const { notes, frames, energies, maxEnergy } = state.analysis.piano;
    const rowHeight = canvas.height / notes.length;
    const frameWidth = state.trackWidth / frames;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#020202";
    c.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < notes.length; index += 1) {
      const midi = notes[notes.length - 1 - index];
      const y = index * rowHeight;
      const isBlack = noteNames[midi % 12].includes("#");
      c.fillStyle = isBlack ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)";
      c.fillRect(0, y, state.gutter, rowHeight);
      c.fillStyle = midi % 12 === 0 ? "rgba(247,247,248,0.7)" : "rgba(247,247,248,0.34)";
      c.font = "10px Consolas, monospace";
      c.textBaseline = "middle";
      if (midi % 12 === 0 || rowHeight > 9) c.fillText(midiName(midi), 12, y + rowHeight / 2);
      c.strokeStyle = midi % 12 === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.045)";
      c.beginPath();
      c.moveTo(state.gutter, y + 0.5);
      c.lineTo(canvas.width, y + 0.5);
      c.stroke();
    }

    for (let frame = 0; frame < frames; frame += 1) {
      const x = state.gutter + frame * frameWidth;
      for (let noteIndex = 0; noteIndex < notes.length; noteIndex += 1) {
        const energy = energies[frame * notes.length + noteIndex] / maxEnergy;
        if (energy < 0.1) continue;
        const y = (notes.length - 1 - noteIndex) * rowHeight;
        const alpha = clamp((energy - 0.08) * 1.18, 0.06, 0.94);
        const hue = 32 + energy * 18;
        c.fillStyle = `hsla(${hue}, 100%, ${48 + energy * 22}%, ${alpha})`;
        c.fillRect(x, y + 1, Math.max(1, frameWidth + 1), Math.max(1, rowHeight - 1));
      }
    }

    c.strokeStyle = "rgba(255,255,255,0.08)";
    c.beginPath();
    c.moveTo(state.gutter + 0.5, 0);
    c.lineTo(state.gutter + 0.5, canvas.height);
    c.stroke();
  }

  function drawVolume() {
    const canvas = dom.volume;
    const c = canvas.getContext("2d");
    const { rms } = state.analysis.waveform;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#020202";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "rgba(247,247,248,0.56)";
    c.font = "12px system-ui, sans-serif";
    c.fillText("volume", 14, 21);

    const max = Math.max(0.001, ...rms);
    for (let x = 0; x < state.trackWidth; x += 1) {
      const value = rms[x] / max;
      const height = value * (canvas.height - 20);
      c.fillStyle = `rgba(255, 214, 10, ${0.18 + value * 0.7})`;
      c.fillRect(state.gutter + x, canvas.height - height, 1, height);
    }
  }

  function seekToCanvasEvent(event) {
    if (!state.buffer) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = clamp((x - state.gutter) / state.pixelsPerSecond, 0, state.buffer.duration);
    dom.audio.currentTime = time;
    updatePlayhead();
  }

  function updatePlayhead() {
    if (!state.buffer) return;
    const time = dom.audio.currentTime || 0;
    const x = state.gutter + time * state.pixelsPerSecond;
    dom.playhead.style.left = `${x}px`;
    dom.seek.value = String(time);
    dom.timeReadout.textContent = `${formatTime(time)} / ${formatTime(state.buffer.duration)}`;

    if (dom.loop.checked) {
      const start = Number(dom.loopStart.value) || 0;
      const end = Number(dom.loopEnd.value) || state.buffer.duration;
      if (end > start && time >= end) dom.audio.currentTime = start;
    }

    if (dom.follow.checked && !dom.audio.paused) {
      const visibleLeft = dom.scroll.scrollLeft;
      const visibleRight = visibleLeft + dom.scroll.clientWidth;
      if (x < visibleLeft + 120 || x > visibleRight - 160) {
        dom.scroll.scrollLeft = Math.max(0, x - dom.scroll.clientWidth * 0.38);
      }
    }
  }

  function togglePlay() {
    if (!state.buffer) return;
    if (dom.audio.paused) {
      updatePlaybackRate();
      dom.audio.play();
    } else {
      dom.audio.pause();
    }
  }

  function stopAudio() {
    dom.audio.pause();
    dom.audio.currentTime = 0;
    updatePlayhead();
  }

  function updateTransportButton() {
    dom.play.textContent = dom.audio.paused ? "Play" : "Pause";
  }

  function exportSnapshot() {
    if (!state.analysis) return;
    const gap = 8;
    const width = dom.timeline.width;
    const height = dom.timeline.height + dom.waveform.height + dom.piano.height + dom.volume.height + gap * 3;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    c.fillStyle = "#000";
    c.fillRect(0, 0, width, height);
    let y = 0;
    [dom.timeline, dom.waveform, dom.piano, dom.volume].forEach((source) => {
      c.drawImage(source, 0, y);
      y += source.height + gap;
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${state.fileLabel.replace(/\.[^.]+$/, "") || "audio-view"}-analysis.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Snapshot exported");
    }, "image/png");
  }

  async function copyStats() {
    if (!state.statsText) return;
    const notes = dom.topNotes.textContent.replace("Top notes: ", "");
    try {
      await navigator.clipboard.writeText(`${state.statsText}\nTop notes: ${notes}`);
      toast("Stats copied");
    } catch {
      toast("Copy unavailable");
    }
  }

  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, "WAVE");
    write(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, "data");
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = clamp(samples[i], -1, 1);
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return new Blob([view], { type: "audio/wav" });
  }

  async function loadDemo() {
    const sampleRate = 44100;
    const duration = 9.5;
    const samples = new Float32Array(Math.floor(sampleRate * duration));
    const melody = [60, 64, 67, 72, 69, 67, 64, 60, 55, 59, 62, 67];
    const beat = 0.42;
    for (let i = 0; i < samples.length; i += 1) {
      const time = i / sampleRate;
      const note = melody[Math.floor(time / beat) % melody.length];
      const freq = midiToFreq(note);
      const phase = (time % beat) / beat;
      const env = Math.exp(-phase * 3.1) * Math.min(1, phase * 16);
      const bass = Math.sin(2 * Math.PI * midiToFreq(36) * time) * 0.12;
      samples[i] = (Math.sin(2 * Math.PI * freq * time) * 0.42 + Math.sin(2 * Math.PI * freq * 2 * time) * 0.08) * env + bass;
    }
    const blob = encodeWav(samples, sampleRate);
    await loadFile(new File([blob], "audio-viewer-demo.wav", { type: "audio/wav" }));
  }

  function bind() {
    dom.input.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) loadFile(file);
    });
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
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) loadFile(file);
    });

    dom.play.addEventListener("click", togglePlay);
    dom.stop.addEventListener("click", stopAudio);
    dom.demo.addEventListener("click", loadDemo);
    dom.reanalyze.addEventListener("click", analyzeAndRender);
    dom.snapshot.addEventListener("click", exportSnapshot);
    dom.copyStats.addEventListener("click", copyStats);
    dom.seek.addEventListener("input", () => {
      dom.audio.currentTime = Number(dom.seek.value);
      updatePlayhead();
    });
    [dom.zoom, dom.detail, dom.range].forEach((control) => {
      control.addEventListener("input", analyzeAndRender);
      control.addEventListener("change", analyzeAndRender);
    });
    [dom.speed, dom.pitch, dom.gain].forEach((control) => {
      control.addEventListener("input", updatePlaybackRate);
      control.addEventListener("change", updatePlaybackRate);
    });
    [dom.timeline, dom.waveform, dom.piano, dom.volume].forEach((canvas) => {
      canvas.addEventListener("click", seekToCanvasEvent);
    });
    dom.audio.addEventListener("timeupdate", updatePlayhead);
    dom.audio.addEventListener("play", updateTransportButton);
    dom.audio.addEventListener("pause", updateTransportButton);
    dom.audio.addEventListener("ended", updateTransportButton);
  }

  updateLabels();
  enableLoadedState(false);
  bind();
})();
