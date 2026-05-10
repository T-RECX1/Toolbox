(function () {
  const dom = {
    input: document.getElementById("youtubeUrl"),
    videoMode: document.getElementById("youtubeVideoMode"),
    audioMode: document.getElementById("youtubeAudioMode"),
    id: document.getElementById("youtubeId"),
    mode: document.getElementById("youtubeMode"),
    start: document.getElementById("youtubeStart"),
    status: document.getElementById("youtubeStatus"),
    kind: document.getElementById("youtubeKind"),
    progress: document.getElementById("youtubeProgress"),
    copyWatch: document.getElementById("youtubeCopyWatch"),
    copyEmbed: document.getElementById("youtubeCopyEmbed"),
    copyThumb: document.getElementById("youtubeCopyThumb"),
    open: document.getElementById("youtubeOpen"),
    frame: document.getElementById("youtubeFrame"),
    audioPreview: document.getElementById("youtubeAudioPreview"),
    empty: document.getElementById("youtubeEmpty"),
    title: document.getElementById("youtubePreviewTitle"),
    meta: document.getElementById("youtubeMeta"),
    toast: document.getElementById("youtubeToast")
  };

  if (!dom.input) return;

  let currentMode = "video";
  let parsed = null;

  function parseStart(value) {
    if (!value) return 0;
    if (/^\d+$/.test(value)) return Number(value);
    const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (!match) return 0;
    return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  }

  function normalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      return new URL(withProtocol);
    } catch {
      return null;
    }
  }

  function extractVideoId(raw) {
    const url = normalizeUrl(raw);
    if (!url) return null;

    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v") || "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        const key = parts[0];
        if (["embed", "shorts", "live"].includes(key)) {
          id = parts[1] || "";
        }
      }
    }

    id = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 11);
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;

    const start = parseStart(url.searchParams.get("t") || url.searchParams.get("start") || "");
    return { id, start, host };
  }

  function buildLinks(info) {
    const startQuery = info.start ? `&t=${info.start}s` : "";
    const embedStart = info.start ? `?start=${info.start}` : "";
    return {
      watch: `https://www.youtube.com/watch?v=${info.id}${startQuery}`,
      embed: `https://www.youtube.com/embed/${info.id}${embedStart}`,
      privacyEmbed: `https://www.youtube-nocookie.com/embed/${info.id}${embedStart}`,
      thumbnail: `https://img.youtube.com/vi/${info.id}/maxresdefault.jpg`
    };
  }

  function setButtons(enabled) {
    [dom.copyWatch, dom.copyEmbed, dom.copyThumb].forEach((button) => {
      button.disabled = !enabled;
    });
    dom.open.classList.toggle("disabled", !enabled);
    dom.open.setAttribute("aria-disabled", String(!enabled));
  }

  function setProgress(value, status) {
    dom.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
    if (status) dom.status.textContent = status;
  }

  function render() {
    parsed = extractVideoId(dom.input.value);
    dom.mode.textContent = currentMode === "video" ? "Video" : "Audio";
    dom.videoMode.classList.toggle("active", currentMode === "video");
    dom.audioMode.classList.toggle("active", currentMode === "audio");

    if (!parsed) {
      dom.id.textContent = "-";
      dom.start.textContent = "0s";
      dom.kind.textContent = "idle";
      dom.meta.textContent = "Paste a link to begin";
      dom.frame.removeAttribute("src");
      dom.frame.hidden = true;
      dom.audioPreview.hidden = true;
      dom.empty.hidden = false;
      dom.open.href = "#";
      setButtons(false);
      setProgress(0, "Waiting for a YouTube link");
      return;
    }

    const links = buildLinks(parsed);
    dom.id.textContent = parsed.id;
    dom.start.textContent = `${parsed.start}s`;
    dom.kind.textContent = currentMode;
    dom.meta.textContent = `${parsed.id} | ${currentMode}`;
    dom.open.href = links.watch;
    setButtons(true);
    setProgress(100, currentMode === "video" ? "Video links ready" : "Audio-intent links ready");
    dom.empty.hidden = true;

    if (currentMode === "video") {
      dom.title.textContent = "Video preview";
      dom.frame.src = links.privacyEmbed;
      dom.frame.hidden = false;
      dom.audioPreview.hidden = true;
    } else {
      dom.title.textContent = "Audio intent";
      dom.frame.removeAttribute("src");
      dom.frame.hidden = true;
      dom.audioPreview.hidden = false;
    }
  }

  function copyText(text, label) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => toast(`${label} copied`),
        () => fallbackCopy(text, label)
      );
      return;
    }
    fallbackCopy(text, label);
  }

  function fallbackCopy(text, label) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    toast(copied ? `${label} copied` : "Copy failed");
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1600);
  }

  dom.input.addEventListener("input", render);
  dom.videoMode.addEventListener("click", () => {
    currentMode = "video";
    render();
  });
  dom.audioMode.addEventListener("click", () => {
    currentMode = "audio";
    render();
  });
  dom.copyWatch.addEventListener("click", () => {
    if (!parsed) return;
    copyText(buildLinks(parsed).watch, "Watch link");
  });
  dom.copyEmbed.addEventListener("click", () => {
    if (!parsed) return;
    copyText(buildLinks(parsed).privacyEmbed, "Embed link");
  });
  dom.copyThumb.addEventListener("click", () => {
    if (!parsed) return;
    copyText(buildLinks(parsed).thumbnail, "Thumbnail link");
  });

  setButtons(false);
  render();
})();
