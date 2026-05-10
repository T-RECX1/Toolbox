(function () {
  const strokeAttrs = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  const icons = {
    videoGif: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M9 15h30v18H9z"/>
        <path ${strokeAttrs} d="M14 20h4M22 20h4M30 20h4M14 28h4M22 28h4M30 28h4"/>
        <path ${strokeAttrs} d="M16 37h16"/>
        <path ${strokeAttrs} d="M18 11h12"/>
      </svg>`,
    youtube: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M10 17c0-3 1.8-4 4.3-4h19.4c2.5 0 4.3 1 4.3 4v14c0 3-1.8 4-4.3 4H14.3C11.8 35 10 34 10 31z"/>
        <path ${strokeAttrs} d="M21 19.5v9l8-4.5z"/>
        <path ${strokeAttrs} d="M15 39h18"/>
        <path ${strokeAttrs} d="M18 9h12"/>
      </svg>`,
    audio: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M10 27h5l8 6V15l-8 6h-5z"/>
        <path ${strokeAttrs} d="M29 18v12M34 14v20M39 20v8"/>
        <path ${strokeAttrs} d="M29 24h10"/>
      </svg>`,
    audioView: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M9 32c4-12 7 8 11-4s8-12 12 0 5 5 7-4"/>
        <path ${strokeAttrs} d="M10 12h28v24H10z"/>
        <path ${strokeAttrs} d="M15 36V22M19 36V18M23 36V24M27 36V16M31 36V25M35 36V20"/>
        <path ${strokeAttrs} d="M15 12v8M23 12v10M31 12v9"/>
      </svg>`,
    stemSplitter: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M9 13h30M9 24h30M9 35h30"/>
        <path ${strokeAttrs} d="M15 13c4 6 4 16 0 22M24 13c-4 7-4 15 0 22M33 13c4 5 4 17 0 22"/>
        <path ${strokeAttrs} d="M13 18h7M28 19h8M11 29h10M27 30h9"/>
        <path ${strokeAttrs} d="M17 39h14"/>
      </svg>`,
    imageFx: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M11 15h24v18H11z"/>
        <path ${strokeAttrs} d="M17 11h20v18"/>
        <path ${strokeAttrs} d="M15 29l6-6 4 4 3-3 4 5"/>
        <path ${strokeAttrs} d="M30 19h.1M38 12l2-4M39 20l4-1M37 29l3 3"/>
      </svg>`,
    styleAnalyzer: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M10 14h18v18H10zM30 16h8v8h-8zM30 28h8v6h-8z"/>
        <path ${strokeAttrs} d="M14 36h20M14 10h12"/>
        <path ${strokeAttrs} d="M15 19h8M15 24h5M33 19h2M33 31h2"/>
        <path ${strokeAttrs} d="M12 41c5-4 9-4 14 0s8 4 12 0"/>
      </svg>`,
    ascii: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M10 14h28v20H10z"/>
        <path ${strokeAttrs} d="M15 20h4M23 20h2M30 20h3M15 27h2M22 27h5M31 27h2"/>
        <path ${strokeAttrs} d="M16 38h16"/>
        <path ${strokeAttrs} d="M17 10h14"/>
      </svg>`,
    jpeg: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M11 13h26v22H11z"/>
        <path ${strokeAttrs} d="M16 18h7v6h-7zM26 18h6v6h-6zM16 27h5v4h-5zM24 27h8v4h-8z"/>
        <path ${strokeAttrs} d="M14 39h20"/>
        <path ${strokeAttrs} d="M18 9h12"/>
      </svg>`,
    palette: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M11 16h26M11 24h26M11 32h26"/>
        <path ${strokeAttrs} d="M15 12v24M24 12v24M33 12v24"/>
        <path ${strokeAttrs} d="M9 14c0-2 1-3 3-3h24c2 0 3 1 3 3v20c0 2-1 3-3 3H12c-2 0-3-1-3-3z"/>
      </svg>`,
    file: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M13 10h15l7 7v21H13z"/>
        <path ${strokeAttrs} d="M28 10v8h7"/>
        <path ${strokeAttrs} d="M18 25h12M18 31h8"/>
        <path ${strokeAttrs} d="M35 25h4M37 23v4"/>
      </svg>`,
    batch: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M10 16h18v12H10z"/>
        <path ${strokeAttrs} d="M20 24h18v12H20z"/>
        <path ${strokeAttrs} d="M14 34h6M28 14h6"/>
        <path ${strokeAttrs} d="m32 10 4 4-4 4M16 30l-4 4 4 4"/>
      </svg>`,
    qr: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M10 10h10v10H10zM28 10h10v10H28zM10 28h10v10H10z"/>
        <path ${strokeAttrs} d="M14 14h2M32 14h2M14 32h2"/>
        <path ${strokeAttrs} d="M27 28h4v4h-4zM34 28h4M28 36h3M35 35h3M24 24h3M35 24h3"/>
      </svg>`,
    lyrics: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path ${strokeAttrs} d="M12 14h16M12 22h23M12 30h18M12 38h13"/>
        <path ${strokeAttrs} d="M31 11v18.5a4.5 4.5 0 1 0 3 4.2V16l7-2v-5z"/>
        <path ${strokeAttrs} d="M12 18h7M24 26h8M15 34h10"/>
      </svg>`
  };

  const categories = [
    {
      name: "Media",
      description: "Video and audio tools for small, shareable assets.",
      tools: [
        {
          name: "Video-to-GIF",
          slug: "video-to-gif",
          description: "Trim a short clip, preview the loop, and export a browser-made GIF.",
          status: "Ready",
          meta: "Video",
          accent: "#39d8ff",
          icon: "videoGif",
          motif: "film",
          href: "tools/video-to-gif.html"
        },
        {
          name: "YouTube Link",
          slug: "youtube-link",
          description: "Parse a YouTube URL, choose video or audio intent, and prepare clean share links.",
          status: "Ready",
          meta: "Media",
          accent: "#ff453a",
          icon: "youtube",
          motif: "youtube",
          href: "tools/youtube-link.html"
        },
        {
          name: "QR Code Studio",
          slug: "qr-code-studio",
          description: "Design scan-safe custom QR codes with logos, frames, colors, and exports.",
          status: "Ready",
          meta: "Media",
          accent: "#35E0A1",
          icon: "qr",
          motif: "qr",
          href: "tools/qr-code-studio.html"
        },
        {
          name: "Audio Viewer",
          slug: "audio-viewer",
          description: "Inspect audio as a scrollable waveform, piano spectrogram, and volume map.",
          status: "Ready",
          meta: "Audio",
          accent: "#ff9f0a",
          icon: "audioView",
          motif: "audioView",
          href: "tools/audio-viewer.html"
        },
        {
          name: "Stem Splitter",
          slug: "stem-splitter",
          description: "Mute or rebalance vocals, drums, bass, and instruments with local stem-style mix controls.",
          status: "Ready",
          meta: "Audio",
          accent: "#b8ff3d",
          icon: "stemSplitter",
          motif: "stems",
          href: "tools/stem-splitter.html"
        },
        {
          name: "Audio Extractor",
          slug: "audio-extractor",
          description: "Pull clean audio from a video and prepare it for editing or sharing.",
          status: "Planned",
          meta: "Audio",
          accent: "#ff9a3d",
          icon: "audio",
          motif: "wave"
        }
      ]
    },
    {
      name: "Image",
      description: "Focused visual utilities without the clutter of a full editor.",
      tools: [
        {
          name: "ASCII Generator",
          slug: "ascii-generator",
          description: "Evolve an uploaded image into character art with live error feedback.",
          status: "Ready",
          meta: "Image",
          accent: "#ff2d55",
          icon: "ascii",
          motif: "ascii",
          href: "tools/ascii-generator.html"
        },
        {
          name: "JPEG Compressor",
          slug: "jpeg-compressor",
          description: "Compress images locally with quality, scale, and artifact controls.",
          status: "Ready",
          meta: "Image",
          accent: "#30d158",
          icon: "jpeg",
          motif: "jpeg",
          href: "tools/jpeg-compressor.html"
        },
        {
          name: "Image Style Analyzer",
          slug: "image-style-analyzer",
          description: "Decode an image's palette, mood, lighting, composition, and style DNA.",
          status: "Ready",
          meta: "Style",
          accent: "#FF4FD8",
          icon: "styleAnalyzer",
          motif: "styleAnalyzer",
          href: "tools/image-style-analyzer.html"
        },
        {
          name: "Image Effects",
          slug: "image-effects",
          description: "Apply tasteful filters, overlays, and edge treatments to images.",
          status: "Planned",
          meta: "Image",
          accent: "#a77cff",
          icon: "imageFx",
          motif: "layers"
        },
        {
          name: "Palette Studio",
          slug: "palette-studio",
          description: "Extract palettes and generate quiet accent systems for projects.",
          status: "Planned",
          meta: "Color",
          accent: "#ffd166",
          icon: "palette",
          motif: "swatches"
        }
      ]
    },
    {
      name: "Text",
      description: "Language tools for shaping words, sound, and structure.",
      tools: [
        {
          name: "Lyrics Analyzer",
          slug: "lyrics-analyzer",
          description: "Split lyrics by line and color matching syllable sounds across the verse.",
          status: "Ready",
          meta: "Writing",
          accent: "#ff375f",
          icon: "lyrics",
          motif: "lyrics",
          href: "tools/lyrics-analyzer.html"
        }
      ]
    },
    {
      name: "Files",
      description: "Everyday cleanup and conversion helpers.",
      tools: [
        {
          name: "File Converter",
          slug: "file-converter",
          description: "Convert common file formats through a clean, guided workflow.",
          status: "Planned",
          meta: "Files",
          accent: "#62d6a6",
          icon: "file",
          motif: "files"
        },
        {
          name: "Batch Renamer",
          slug: "batch-renamer",
          description: "Rename groups of files with previews and reversible patterns.",
          status: "Planned",
          meta: "Files",
          accent: "#7bdff2",
          icon: "batch",
          motif: "batch"
        }
      ]
    }
  ];

  window.ToolboxTools = { categories, icons };
})();
