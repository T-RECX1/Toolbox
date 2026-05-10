(function () {
  const iconMap = window.ToolboxTools && window.ToolboxTools.icons ? window.ToolboxTools.icons : {};

  function motifMarkup(name) {
    const motifs = {
      film: `
        <div class="card-motif film-motif" aria-hidden="true">
          <div class="motif-scale"><small>0</small><small>4</small><small>8</small></div>
          <div class="motif-frames">
            <span></span><span></span><span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="motif-trim"><i></i><b></b><em></em></div>
        </div>`,
      youtube: `
        <div class="card-motif youtube-motif" aria-hidden="true">
          <div class="youtube-screen"><span></span></div>
          <div class="youtube-switch"><i></i><b></b></div>
          <div class="youtube-wave"><span></span><span></span><span></span><span></span><span></span></div>
        </div>`,
      qr: `
        <div class="card-motif qr-motif" aria-hidden="true">
          <div class="qr-mini-grid">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
          </div>
          <div class="qr-scan-line"><i></i></div>
        </div>`,
      lyrics: `
        <div class="card-motif lyrics-motif" aria-hidden="true">
          <p><span></span><i></i><b></b><em></em></p>
          <p><i></i><span></span><em></em><b></b></p>
          <p><b></b><em></em><span></span><i></i></p>
          <div class="lyrics-motif-rail"><span></span><span></span><span></span><span></span></div>
        </div>`,
      wave: `
        <div class="card-motif wave-motif" aria-hidden="true">
          <small>01:42</small>
          <span></span><span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span>
        </div>`,
      audioView: `
        <div class="card-motif audio-view-motif" aria-hidden="true">
          <div class="audio-motif-wave">
            <span></span><span></span><span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="audio-motif-roll">
            <i></i><i></i><i></i><i></i><i></i><i></i>
            <b></b><b></b><b></b><b></b>
          </div>
          <div class="audio-motif-volume"><em></em></div>
        </div>`,
      stems: `
        <div class="card-motif stem-motif" aria-hidden="true">
          <div class="stem-lanes">
            <span><i></i><b></b></span>
            <span><i></i><b></b></span>
            <span><i></i><b></b></span>
            <span><i></i><b></b></span>
            <span><i></i><b></b></span>
          </div>
          <div class="stem-notes">
            <i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
        </div>`,
      layers: `
        <div class="card-motif layers-motif" aria-hidden="true">
          <span></span><span></span><span></span><i></i>
        </div>`,
      styleAnalyzer: `
        <div class="card-motif style-analyzer-motif" aria-hidden="true">
          <div class="style-motif-preview"><span></span><i></i><b></b></div>
          <div class="style-motif-palette"><span></span><span></span><span></span><span></span></div>
          <div class="style-motif-bars"><i></i><i></i><i></i></div>
        </div>`,
      ascii: `
        <div class="card-motif ascii-motif" aria-hidden="true">
          <div class="ascii-glyphs">
            <span>@</span><span>#</span><span>%</span><span>+</span><span>:</span><span>.</span>
            <span>$</span><span>8</span><span>&</span><span>*</span><span>=</span><span>-</span>
          </div>
          <i></i>
        </div>`,
      jpeg: `
        <div class="card-motif jpeg-motif" aria-hidden="true">
          <div class="jpeg-blocks">
            <span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="jpeg-meter"><i></i></div>
        </div>`,
      swatches: `
        <div class="card-motif swatches-motif" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>`,
      files: `
        <div class="card-motif files-motif" aria-hidden="true">
          <span></span><span></span><span></span><i></i>
        </div>`,
      batch: `
        <div class="card-motif batch-motif" aria-hidden="true">
          <span></span><span></span><span></span><i></i>
        </div>`
    };

    return motifs[name] || motifs.film;
  }

  function injectNamedIcons() {
    document.querySelectorAll("[data-icon]").forEach((slot) => {
      const iconName = slot.getAttribute("data-icon");
      if (iconMap[iconName]) {
        slot.innerHTML = iconMap[iconName];
      }
    });
  }

  const readoutMap = {
    "video-to-gif": ["12 fps", "320x180", "0:05.6", "Ready"],
    "youtube-link": ["Video", "Audio", "Link parsed", "Ready"],
    "qr-code-studio": ["PNG", "SVG", "Scan safe", "Ready"],
    "audio-viewer": ["44.1 kHz", "03:47", "Notes", "Live"],
    "stem-splitter": ["Vocals", "Drums", "Bass", "Mix"],
    "audio-extractor": ["WAV", "MP3", "Stem", "Planned"],
    "ascii-generator": ["128x64", "Mono", "Loss map", "Ready"],
    "jpeg-compressor": ["72%", "Smaller", "Quality", "Ready"],
    "image-style-analyzer": ["Mood", "Light", "DNA", "Done"],
    "image-effects": ["Mask", "Glow", "Grade", "Planned"],
    "palette-studio": ["Extract", "Refine", "Export", "Soon"],
    "lyrics-analyzer": ["Line", "Sound", "Match", "Ready"],
    "file-converter": ["PDF", "PNG", "DOC", "Soon"],
    "batch-renamer": ["Queue", "Rules", "Preview", "Soon"]
  };

  function readoutMarkup(tool) {
    const readouts = readoutMap[tool.slug] || [tool.meta, tool.status, "Local", "Object"];
    return `
      <div class="tool-readouts" aria-hidden="true">
        ${readouts.map((item) => `<span>${item}</span>`).join("")}
      </div>
    `;
  }

  function createToolCard(tool) {
    const isReady = Boolean(tool.href);
    const element = document.createElement(isReady ? "a" : "article");
    element.className = `tool-card reveal${isReady ? "" : " disabled-card"}`;
    element.style.setProperty("--tool-accent", tool.accent);
    if (isReady) {
      element.href = tool.href;
    }

    element.innerHTML = `
      <div class="tool-card-top">
        <span class="tool-live-title"><i></i>${tool.name}</span>
        <span class="tool-status">${tool.status}</span>
      </div>
      ${motifMarkup(tool.motif)}
      ${readoutMarkup(tool)}
      <div class="tool-copy">
        <p>${tool.description}</p>
      </div>
      <div class="tool-meta">
        <span>${tool.meta}</span>
        <span>${isReady ? "Open" : "Soon"}</span>
      </div>
    `;

    return element;
  }

  function renderToolCategories() {
    const mount = document.getElementById("toolCategories");
    if (!mount || !window.ToolboxTools) return;

    const fragment = document.createDocumentFragment();
    window.ToolboxTools.categories.forEach((category) => {
      const section = document.createElement("section");
      section.className = "category-block";
      section.innerHTML = `
        <div class="category-label reveal">
          <h3>${category.name}</h3>
          <p>${category.description}</p>
        </div>
        <div class="tool-grid"></div>
      `;

      const grid = section.querySelector(".tool-grid");
      category.tools.forEach((tool) => grid.appendChild(createToolCard(tool)));
      fragment.appendChild(section);
    });

    mount.appendChild(fragment);
  }

  function setupRevealAnimations() {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index * 35, 220)}ms`;
      observer.observe(element);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectNamedIcons();
    renderToolCategories();
    setupRevealAnimations();
  });
})();
