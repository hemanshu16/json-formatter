/* =========================================
   JSON Formatter — App Logic
   ========================================= */

(function () {
  "use strict";

  // -------------------------
  //  DOM References
  // -------------------------
  const inputEl = document.getElementById("json-input");
  const outputEl = document.getElementById("json-output");
  const treeEl = document.getElementById("json-tree");
  const inputLinesEl = document.getElementById("input-lines");
  const outputLinesEl = document.getElementById("output-lines");
  const inputSizeEl = document.getElementById("input-size");
  const outputSizeEl = document.getElementById("output-size");
  const statusMsg = document.getElementById("status-message");
  const statusLines = document.getElementById("status-lines");
  const statusSize = document.getElementById("status-size");
  const toastEl = document.getElementById("toast");
  const convertOutput = document.getElementById("convert-output");

  const btnFormat = document.getElementById("btn-format");
  const btnMinify = document.getElementById("btn-minify");
  const btnValidate = document.getElementById("btn-validate");
  const btnCopy = document.getElementById("btn-copy");
  const btnDownload = document.getElementById("btn-download");
  const btnClear = document.getElementById("btn-clear");
  const btnSample = document.getElementById("btn-sample");
  const btnUpload = document.getElementById("btn-upload");
  const fileInput = document.getElementById("file-input");
  const indentSelect = document.getElementById("indent-size");
  const btnConvertCopy = document.getElementById("btn-convert-copy");
  const btnConvertDownload = document.getElementById("btn-convert-download");

  const outputFormatted = document.getElementById("output-formatted");
  const outputTree = document.getElementById("output-tree");

  let currentConvertFormat = "xml";

  // -------------------------
  //  Helpers
  // -------------------------
  function getIndent() {
    const val = indentSelect.value;
    return val === "\\t" ? "\t" : Number(val);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function setStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = "status-msg " + (type || "");
  }

  function updateLineNumbers(text, lineEl) {
    const count = (text || "").split("\n").length;
    const nums = [];
    for (let i = 1; i <= count; i++) nums.push(i);
    lineEl.textContent = nums.join("\n");
  }

  function updateMeta() {
    const raw = inputEl.value;
    const lines = raw ? raw.split("\n").length : 0;
    const bytes = new Blob([raw]).size;
    inputSizeEl.textContent = raw.length.toLocaleString() + " chars";
    statusLines.textContent = "Lines: " + lines;
    statusSize.textContent = "Size: " + formatSize(bytes);
  }

  function updateOutputMeta(text) {
    outputSizeEl.textContent = text.length.toLocaleString() + " chars";
  }

  // -------------------------
  //  Syntax Highlighting
  // -------------------------
  function highlightJSON(json) {
    // Escape HTML first
    const escaped = json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = "hl-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "hl-key";
          } else {
            cls = "hl-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "hl-boolean";
        } else if (/null/.test(match)) {
          cls = "hl-null";
        }
        return '<span class="' + cls + '">' + match + "</span>";
      },
    );
  }

  // -------------------------
  //  Core Actions
  // -------------------------
  function doFormat() {
    const raw = inputEl.value.trim();
    if (!raw) {
      setStatus("Please enter some JSON first.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const indent = getIndent();
      const formatted = JSON.stringify(parsed, null, indent);
      outputEl.innerHTML = highlightJSON(formatted);
      updateLineNumbers(formatted, outputLinesEl);
      updateOutputMeta(formatted);
      setStatus("✓ JSON formatted successfully", "success");
      showTab("formatted");
      buildTree(parsed);
      runConversion(parsed);
      saveToLocalStorage(raw);
    } catch (e) {
      handleError(e);
    }
  }

  function doMinify() {
    const raw = inputEl.value.trim();
    if (!raw) {
      setStatus("Please enter some JSON first.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const minified = JSON.stringify(parsed);
      outputEl.innerHTML = highlightJSON(minified);
      updateLineNumbers(minified, outputLinesEl);
      updateOutputMeta(minified);
      setStatus(
        "✓ JSON minified — " + formatSize(new Blob([minified]).size),
        "success",
      );
      showTab("formatted");
    } catch (e) {
      handleError(e);
    }
  }

  function doValidate() {
    const raw = inputEl.value.trim();
    if (!raw) {
      setStatus("Please enter some JSON first.", "error");
      return;
    }
    try {
      JSON.parse(raw);
      setStatus("✓ Valid JSON", "success");
      showToast("✓ JSON is valid!");
    } catch (e) {
      handleError(e);
    }
  }

  function handleError(e) {
    const msg = e.message || "Invalid JSON";
    setStatus("✗ " + msg, "error");
    outputEl.innerHTML = '<span class="hl-null">' + escapeHtml(msg) + "</span>";
    updateLineNumbers("", outputLinesEl);
    updateOutputMeta("");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // -------------------------
  //  Tree View
  // -------------------------
  function buildTree(data) {
    treeEl.innerHTML = "";
    treeEl.appendChild(createTreeNode(data));
  }

  function createTreeNode(value, key) {
    const wrapper = document.createElement("div");

    if (value !== null && typeof value === "object") {
      const isArray = Array.isArray(value);
      const entries = isArray ? value : Object.entries(value);
      const count = isArray ? value.length : Object.keys(value).length;
      const openBracket = isArray ? "[" : "{";
      const closeBracket = isArray ? "]" : "}";

      // Header line
      const header = document.createElement("div");

      const toggle = document.createElement("button");
      toggle.className = "tree-toggle";
      toggle.textContent = "▼";
      toggle.addEventListener("click", () => {
        const collapsed = wrapper.classList.toggle("tree-collapsed");
        toggle.textContent = collapsed ? "▶" : "▼";
      });
      header.appendChild(toggle);

      if (key !== undefined) {
        const keySpan = document.createElement("span");
        keySpan.className = "tree-key";
        keySpan.textContent = '"' + key + '"';
        header.appendChild(keySpan);
        header.appendChild(document.createTextNode(": "));
      }

      const bracketOpen = document.createElement("span");
      bracketOpen.className = "tree-bracket";
      bracketOpen.textContent = openBracket;
      header.appendChild(bracketOpen);

      const badge = document.createElement("span");
      badge.className = "tree-badge";
      badge.textContent = count + (isArray ? " items" : " keys");
      header.appendChild(badge);

      wrapper.appendChild(header);

      // Children
      const childWrap = document.createElement("div");
      childWrap.className = "tree-node";

      if (isArray) {
        value.forEach((item, i) => {
          childWrap.appendChild(createTreeNode(item, i));
        });
      } else {
        Object.entries(value).forEach(([k, v]) => {
          childWrap.appendChild(createTreeNode(v, k));
        });
      }

      wrapper.appendChild(childWrap);

      // Closing bracket
      const closeLine = document.createElement("div");
      const bracketClose = document.createElement("span");
      bracketClose.className = "tree-bracket";
      bracketClose.textContent = closeBracket;
      closeLine.appendChild(bracketClose);
      wrapper.appendChild(closeLine);
    } else {
      // Primitive value
      const line = document.createElement("div");

      if (key !== undefined) {
        const keySpan = document.createElement("span");
        keySpan.className = "tree-key";
        keySpan.textContent = '"' + key + '"';
        line.appendChild(keySpan);
        line.appendChild(document.createTextNode(": "));
      }

      const valSpan = document.createElement("span");
      if (typeof value === "string") {
        valSpan.className = "tree-string";
        valSpan.textContent = '"' + value + '"';
      } else if (typeof value === "number") {
        valSpan.className = "tree-number";
        valSpan.textContent = value;
      } else if (typeof value === "boolean") {
        valSpan.className = "tree-boolean";
        valSpan.textContent = value;
      } else {
        valSpan.className = "tree-null";
        valSpan.textContent = "null";
      }
      line.appendChild(valSpan);
      wrapper.appendChild(line);
    }

    return wrapper;
  }

  // -------------------------
  //  Output Tabs
  // -------------------------
  function showTab(tabName) {
    document.querySelectorAll(".output-tabs .tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    outputFormatted.style.display = tabName === "formatted" ? "flex" : "none";
    outputTree.style.display = tabName === "tree" ? "block" : "none";
  }

  document.querySelectorAll(".output-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  });

  // -------------------------
  //  Conversions
  // -------------------------
  function runConversion(data) {
    if (!data) return;
    try {
      switch (currentConvertFormat) {
        case "xml":
          convertOutput.textContent = jsonToXml(data);
          break;
        case "csv":
          convertOutput.textContent = jsonToCsv(data);
          break;
        case "yaml":
          convertOutput.textContent = jsonToYaml(data);
          break;
      }
    } catch {
      convertOutput.textContent =
        "Could not convert to " + currentConvertFormat.toUpperCase();
    }
  }

  // JSON → XML
  function jsonToXml(obj, rootName) {
    rootName = rootName || "root";
    function convert(value, name) {
      if (value === null || value === undefined) {
        return "<" + name + " />";
      }
      if (Array.isArray(value)) {
        return value.map((item) => convert(item, "item")).join("\n");
      }
      if (typeof value === "object") {
        const inner = Object.entries(value)
          .map(([k, v]) => convert(v, k))
          .join("\n")
          .split("\n")
          .map((l) => "  " + l)
          .join("\n");
        return "<" + name + ">\n" + inner + "\n</" + name + ">";
      }
      return "<" + name + ">" + escapeHtml(String(value)) + "</" + name + ">";
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + convert(obj, rootName);
  }

  // JSON → CSV
  function jsonToCsv(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    if (data.length === 0) return "";
    // Flatten objects
    const flat = data.map((item) => {
      if (typeof item !== "object" || item === null) return { value: item };
      return flattenObject(item);
    });
    const headers = [...new Set(flat.flatMap(Object.keys))];
    const rows = flat.map((row) =>
      headers
        .map((h) => {
          let val = row[h];
          if (val === undefined || val === null) val = "";
          val = String(val);
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            val = '"' + val.replace(/"/g, '""') + '"';
          }
          return val;
        })
        .join(","),
    );
    return headers.join(",") + "\n" + rows.join("\n");
  }

  function flattenObject(obj, prefix) {
    prefix = prefix || "";
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? prefix + "." + key : key;
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  // JSON → YAML
  function jsonToYaml(data, indent) {
    indent = indent || 0;
    const pad = "  ".repeat(indent);
    if (data === null) return pad + "null";
    if (typeof data === "boolean") return pad + (data ? "true" : "false");
    if (typeof data === "number") return pad + data;
    if (typeof data === "string") {
      if (data.includes("\n") || data.includes(":") || data.includes("#")) {
        return pad + '"' + data.replace(/"/g, '\\"') + '"';
      }
      return pad + data;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) return pad + "[]";
      return data
        .map((item) => {
          const val = jsonToYaml(item, indent + 1).trimStart();
          return pad + "- " + val;
        })
        .join("\n");
    }
    if (typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length === 0) return pad + "{}";
      return keys
        .map((key) => {
          const value = data[key];
          if (value !== null && typeof value === "object") {
            return pad + key + ":\n" + jsonToYaml(value, indent + 1);
          }
          return pad + key + ": " + jsonToYaml(value, 0).trimStart();
        })
        .join("\n");
    }
    return pad + String(data);
  }

  // Convert tabs
  document.querySelectorAll(".convert-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".convert-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentConvertFormat = tab.dataset.convert;
      // Re-run conversion if we have valid JSON
      try {
        const parsed = JSON.parse(inputEl.value.trim());
        runConversion(parsed);
      } catch {
        convertOutput.textContent =
          "Paste valid JSON in the input above and click a conversion tab.";
      }
    });
  });

  // -------------------------
  //  Copy / Download / Clear / Upload
  // -------------------------
  btnCopy.addEventListener("click", () => {
    const text = outputEl.textContent;
    if (!text) {
      showToast("Nothing to copy");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard!"));
  });

  btnDownload.addEventListener("click", () => {
    const text = outputEl.textContent;
    if (!text) {
      showToast("Nothing to download");
      return;
    }
    downloadFile(text, "formatted.json", "application/json");
  });

  btnClear.addEventListener("click", () => {
    inputEl.value = "";
    outputEl.innerHTML = "";
    treeEl.innerHTML = "";
    updateLineNumbers("", inputLinesEl);
    updateLineNumbers("", outputLinesEl);
    setStatus("", "");
    updateMeta();
    updateOutputMeta("");
    convertOutput.textContent =
      "Paste JSON in the input above and click a conversion tab.";
  });

  btnUpload.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      inputEl.value = ev.target.result;
      updateLineNumbers(inputEl.value, inputLinesEl);
      updateMeta();
      setStatus("File loaded: " + file.name, "success");
      showToast("File loaded!");
    };
    reader.readAsText(file);
    fileInput.value = "";
  });

  btnSample.addEventListener("click", () => {
    const sample = {
      name: "JSON Formatter",
      version: "2.0.0",
      description: "A beautiful, minimalist JSON formatting tool",
      features: ["format", "validate", "minify", "tree-view", "convert"],
      settings: {
        theme: "dark",
        indentation: 4,
        syntaxHighlighting: true,
      },
      author: {
        name: "Developer",
        url: "https://example.com",
        social: {
          github: "https://github.com",
          twitter: "https://twitter.com",
        },
      },
      stats: {
        users: 150000,
        rating: 4.9,
        free: true,
      },
      tags: ["json", "formatter", "developer-tool", "open-source"],
    };
    inputEl.value = JSON.stringify(sample, null, 2);
    updateLineNumbers(inputEl.value, inputLinesEl);
    updateMeta();
    setStatus("Sample JSON loaded — click Format", "success");
  });

  btnConvertCopy.addEventListener("click", () => {
    const text = convertOutput.textContent;
    if (!text) {
      showToast("Nothing to copy");
      return;
    }
    navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
  });

  btnConvertDownload.addEventListener("click", () => {
    const text = convertOutput.textContent;
    if (!text) {
      showToast("Nothing to download");
      return;
    }
    const ext = currentConvertFormat === "yaml" ? "yaml" : currentConvertFormat;
    downloadFile(text, "converted." + ext, "text/plain");
  });

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -------------------------
  //  Event Bindings
  // -------------------------
  btnFormat.addEventListener("click", doFormat);
  btnMinify.addEventListener("click", doMinify);
  btnValidate.addEventListener("click", doValidate);

  // Input events
  inputEl.addEventListener("input", () => {
    updateLineNumbers(inputEl.value, inputLinesEl);
    updateMeta();
  });

  // Sync scroll for line numbers
  inputEl.addEventListener("scroll", () => {
    inputLinesEl.scrollTop = inputEl.scrollTop;
  });

  const outputPre = document.getElementById("json-output");
  outputPre.parentElement.addEventListener("scroll", () => {
    // Wait for output-formatted scroll
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl+Enter = format
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      doFormat();
    }
    // Ctrl+Shift+M = minify
    if (e.ctrlKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
      e.preventDefault();
      doMinify();
    }
  });

  // -------------------------
  //  Local Storage
  // -------------------------
  function saveToLocalStorage(data) {
    try {
      localStorage.setItem("jsonformatter_last", data);
    } catch {
      /* quota exceeded */
    }
  }

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem("jsonformatter_last");
      if (saved) {
        inputEl.value = saved;
        updateLineNumbers(saved, inputLinesEl);
        updateMeta();
      }
    } catch {
      /* no access */
    }
  }

  // -------------------------
  //  Init
  // -------------------------
  loadFromLocalStorage();
  updateMeta();
  updateLineNumbers(inputEl.value, inputLinesEl);
  updateLineNumbers("", outputLinesEl);
})();
