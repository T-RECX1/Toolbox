(function () {
  const $ = (id) => document.getElementById(id);
  const dom = {
    input: $("lyricsInput"),
    output: $("lyricsOutput"),
    legend: $("lyricsLegend"),
    summary: $("lyricsSummary"),
    lineCount: $("lyricsLineCount"),
    wordCount: $("lyricsWordCount"),
    groupCount: $("lyricsGroupCount"),
    mode: $("lyricsMode"),
    sensitivity: $("lyricsSensitivity"),
    minRepeats: $("lyricsMinRepeats"),
    minValue: $("lyricsMinValue"),
    dimUnmatched: $("lyricsDimUnmatched"),
    analyze: $("lyricsAnalyze"),
    sample: $("lyricsSample"),
    copy: $("lyricsCopy"),
    toast: $("lyricsToast")
  };

  if (!dom.input || !dom.output) return;

  const sampleLyrics = `I write in the night with a bright little line
Every rhyme finds time in the light
Soft words curve when the verse returns
I chase the bass till the phrase burns
Hold the tone, let it roll through the room
More than a poem when the vowels bloom`;

  const palette = [
    ["#ff2d55", "#fff"],
    ["#35e0a1", "#00150d"],
    ["#ffd60a", "#141000"],
    ["#64d2ff", "#00141e"],
    ["#bf5af2", "#fff"],
    ["#ff9f0a", "#1d0f00"],
    ["#7dff6a", "#071500"],
    ["#ff6bba", "#fff"],
    ["#5e8cff", "#fff"],
    ["#d4ff3f", "#111600"],
    ["#ff453a", "#fff"],
    ["#8eecf5", "#001315"]
  ];

  let lastAnnotatedText = "";

  function scheduleAnalyze() {
    window.clearTimeout(scheduleAnalyze.timer);
    scheduleAnalyze.timer = window.setTimeout(analyzeLyrics, 40);
  }

  function tokenizeLine(line) {
    return line.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?|[^A-Za-z0-9]+/g) || [];
  }

  function cleanWord(word) {
    return word
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9']/g, "")
      .replace(/'(ll|re|ve|d|m|s)$/g, "$1")
      .replace(/n't$/g, "nt")
      .replace(/'/g, "");
  }

  function isVowel(char, index) {
    return /[aeiou]/.test(char) || (char === "y" && index > 0);
  }

  function vowelGroups(text) {
    const groups = [];
    let index = 0;
    while (index < text.length) {
      if (!isVowel(text[index], index)) {
        index += 1;
        continue;
      }
      const start = index;
      while (index < text.length && isVowel(text[index], index)) index += 1;
      groups.push({ start, end: index, value: text.slice(start, index) });
    }
    return groups;
  }

  function splitSyllables(word) {
    const clean = cleanWord(word);
    const groups = vowelGroups(clean);
    if (groups.length <= 1) return [word];

    const segments = [];
    let start = 0;
    groups.forEach((group, index) => {
      if (index === groups.length - 1) {
        segments.push(word.slice(start));
        return;
      }
      const next = groups[index + 1];
      const consonants = Math.max(0, next.start - group.end);
      const boundary = consonants <= 1 ? group.end : group.end + consonants - 1;
      segments.push(word.slice(start, Math.max(start + 1, boundary)));
      start = Math.max(start + 1, boundary);
    });

    return segments.filter(Boolean);
  }

  function phoneticize(text) {
    let value = cleanWord(text);
    value = value
      .replace(/eaux$/g, "oh")
      .replace(/tion|tian|cian/g, "shun")
      .replace(/sion/g, "zhun")
      .replace(/ough/g, "oh")
      .replace(/augh/g, "aw")
      .replace(/ph/g, "f")
      .replace(/ck/g, "k")
      .replace(/qu/g, "kw")
      .replace(/x/g, "ks")
      .replace(/c(?=[eiy])/g, "s")
      .replace(/c/g, "k")
      .replace(/gh$/g, "")
      .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");
    return value;
  }

  function vowelFamily(value, group) {
    const raw = value;
    const nucleus = group.value;
    const tail = raw.slice(group.start);

    if (/^(eigh|ey|ay|ai)/.test(tail) || /^a[^aeiouy]*e$/.test(tail)) return "AY";
    if (/^(ee|ea|ei|ie)/.test(tail) || /^e$/.test(nucleus) && group.end === raw.length) return "EE";
    if (/^(igh|i[ae]|y)/.test(tail) || /^i[^aeiouy]*e$/.test(tail)) return "EYE";
    if (/^(oa|oe)/.test(tail) || /^o[^aeiouy]*e$/.test(tail)) return "OH";
    if (/^(oo|ew|ue)/.test(tail) || /^u[^aeiouy]*e$/.test(tail)) return "OO";
    if (/^(ou|ow)/.test(tail)) return "OW";
    if (/^(oi|oy)/.test(tail)) return "OY";
    if (/^ar/.test(tail)) return "AR";
    if (/^(er|ir|ur)/.test(tail)) return "ER";
    if (/^or/.test(tail)) return "OR";
    if (nucleus.includes("a")) return "A";
    if (nucleus.includes("e")) return "EH";
    if (nucleus.includes("i") || nucleus.includes("y")) return "IH";
    if (nucleus.includes("o")) return "AH";
    if (nucleus.includes("u")) return "UH";
    return nucleus.toUpperCase();
  }

  function simplifyCoda(coda, sensitivity) {
    let value = coda
      .replace(/e$/g, "")
      .replace(/gh$/g, "")
      .replace(/q/g, "k")
      .replace(/c/g, "k")
      .replace(/z/g, "s")
      .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");

    if (sensitivity === "loose") return "";
    if (sensitivity === "balanced") {
      value = value.replace(/s$/g, "");
      return value.slice(-2);
    }
    return value;
  }

  function soundKey(syllable, mode, sensitivity) {
    const sound = phoneticize(syllable);
    const groups = vowelGroups(sound);
    if (!sound || groups.length === 0) return "";
    const group = groups[groups.length - 1];
    const family = vowelFamily(sound, group);
    if (mode === "vowel") return family;
    const coda = simplifyCoda(sound.slice(group.end), sensitivity);
    return coda ? `${family}-${coda.toUpperCase()}` : family;
  }

  function makeColorMap(soundStats, minRepeats) {
    const entries = Array.from(soundStats.entries())
      .filter(([, stat]) => stat.count >= minRepeats)
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));

    const map = new Map();
    entries.forEach(([key], index) => {
      const [bg, fg] = palette[index % palette.length];
      map.set(key, { bg, fg, index });
    });
    return { map, entries };
  }

  function scanLyrics() {
    const mode = dom.mode.value;
    const sensitivity = dom.sensitivity.value;
    const lines = dom.input.value.replace(/\r\n/g, "\n").split("\n");
    const soundStats = new Map();
    let words = 0;

    const lineData = lines.map((line) => {
      const tokens = tokenizeLine(line);
      const wordIndexes = tokens
        .map((token, index) => (/^[A-Za-z0-9]/.test(token) ? index : -1))
        .filter((index) => index >= 0);
      const lastWordIndex = wordIndexes[wordIndexes.length - 1];

      const parsedTokens = tokens.map((token, tokenIndex) => {
        if (!/^[A-Za-z0-9]/.test(token)) return { type: "text", text: token };
        words += 1;
        const syllables = splitSyllables(token);
        return {
          type: "word",
          text: token,
          syllables: syllables.map((part, syllableIndex) => {
            const active = mode !== "ending" || (tokenIndex === lastWordIndex && syllableIndex === syllables.length - 1);
            const key = active ? soundKey(part, mode, sensitivity) : "";
            if (key) {
              const stat = soundStats.get(key) || { count: 0, examples: new Set() };
              stat.count += 1;
              stat.examples.add(part.toLowerCase());
              soundStats.set(key, stat);
            }
            return { text: part, key, active };
          })
        };
      });

      return { text: line, tokens: parsedTokens };
    });

    return { lines: lineData, soundStats, words };
  }

  function renderLine(line, lineIndex, colorMap, dimUnmatched) {
    const row = document.createElement("div");
    row.className = "lyric-line";

    const number = document.createElement("span");
    number.className = "lyric-line-number";
    number.textContent = String(lineIndex + 1).padStart(2, "0");
    row.appendChild(number);

    const content = document.createElement("p");
    if (!line.text) {
      const empty = document.createElement("span");
      empty.className = "lyric-empty-line";
      empty.textContent = "empty line";
      content.appendChild(empty);
      row.appendChild(content);
      return row;
    }

    line.tokens.forEach((token) => {
      if (token.type === "text") {
        content.appendChild(document.createTextNode(token.text));
        return;
      }

      const word = document.createElement("span");
      word.className = "lyric-word";
      token.syllables.forEach((syllable) => {
        const part = document.createElement("span");
        part.className = "lyric-syllable";
        part.textContent = syllable.text;
        if (syllable.key && colorMap.has(syllable.key)) {
          const color = colorMap.get(syllable.key);
          part.classList.add("highlighted");
          part.dataset.sound = syllable.key;
          part.style.setProperty("--sound-bg", color.bg);
          part.style.setProperty("--sound-fg", color.fg);
          part.title = `Sound: ${syllable.key}`;
        } else if (dimUnmatched) {
          part.classList.add("dimmed");
        }
        word.appendChild(part);
      });
      content.appendChild(word);
    });

    row.appendChild(content);
    return row;
  }

  function renderLegend(entries, colorMap) {
    dom.legend.textContent = "";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "lyrics-empty-note";
      empty.textContent = "No repeated sound groups yet. Lower the repeat threshold or add more lines.";
      dom.legend.appendChild(empty);
      return;
    }

    entries.slice(0, 18).forEach(([key, stat]) => {
      const color = colorMap.get(key);
      const item = document.createElement("button");
      item.type = "button";
      item.className = "lyrics-legend-item";
      item.dataset.sound = key;
      item.style.setProperty("--sound-bg", color.bg);
      item.style.setProperty("--sound-fg", color.fg);
      const examples = Array.from(stat.examples).slice(0, 3).join(", ");
      item.innerHTML = `<span>${key}</span><strong>${stat.count}</strong><small>${examples}</small>`;
      dom.legend.appendChild(item);
    });
  }

  function annotatedText(lines, colorMap) {
    return lines.map((line) => line.tokens.map((token) => {
      if (token.type === "text") return token.text;
      return token.syllables.map((syllable) => {
        if (syllable.key && colorMap.has(syllable.key)) return `${syllable.text}{${syllable.key}}`;
        return syllable.text;
      }).join("");
    }).join("")).join("\n");
  }

  function analyzeLyrics() {
    const minRepeats = Number(dom.minRepeats.value);
    dom.minValue.textContent = String(minRepeats);

    const result = scanLyrics();
    const { map, entries } = makeColorMap(result.soundStats, minRepeats);

    dom.output.textContent = "";
    result.lines.forEach((line, index) => {
      dom.output.appendChild(renderLine(line, index, map, dom.dimUnmatched.checked));
    });

    renderLegend(entries, map);
    lastAnnotatedText = annotatedText(result.lines, map);

    dom.lineCount.textContent = String(result.lines.length);
    dom.wordCount.textContent = String(result.words);
    dom.groupCount.textContent = String(entries.length);
    dom.summary.textContent = entries.length
      ? `${entries.length} repeated sound groups`
      : "No repeated groups";
  }

  function setActiveSound(key) {
    document.querySelectorAll("[data-sound]").forEach((node) => {
      node.classList.toggle("sound-active", Boolean(key) && node.dataset.sound === key);
      node.classList.toggle("sound-muted", Boolean(key) && node.dataset.sound !== key);
    });
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    window.setTimeout(() => dom.toast.classList.remove("visible"), 1500);
  }

  async function copyMap() {
    try {
      await navigator.clipboard.writeText(lastAnnotatedText || dom.input.value);
      toast("Sound map copied");
    } catch {
      toast("Copy unavailable");
    }
  }

  function bind() {
    dom.input.addEventListener("input", scheduleAnalyze);
    [dom.mode, dom.sensitivity, dom.minRepeats, dom.dimUnmatched].forEach((control) => {
      control.addEventListener("input", scheduleAnalyze);
      control.addEventListener("change", scheduleAnalyze);
    });
    dom.analyze.addEventListener("click", analyzeLyrics);
    dom.sample.addEventListener("click", () => {
      dom.input.value = sampleLyrics;
      analyzeLyrics();
    });
    dom.copy.addEventListener("click", copyMap);

    [dom.output, dom.legend].forEach((area) => {
      area.addEventListener("mouseover", (event) => {
        const target = event.target.closest("[data-sound]");
        setActiveSound(target ? target.dataset.sound : "");
      });
      area.addEventListener("mouseleave", () => setActiveSound(""));
      area.addEventListener("focusin", (event) => {
        const target = event.target.closest("[data-sound]");
        setActiveSound(target ? target.dataset.sound : "");
      });
      area.addEventListener("focusout", () => setActiveSound(""));
    });
  }

  bind();
  analyzeLyrics();
})();
