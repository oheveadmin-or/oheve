const state = {
  imageFile: null,
  imageDataUrl: "",
  overlays: [],
  activeOverlayId: null,
};

const apiUrl = "https://api.anthropic.com/v1/messages";

const refs = {
  apiKey: document.getElementById("apiKey"),
  modelName: document.getElementById("modelName"),
  customPrompt: document.getElementById("customPrompt"),
  imageInput: document.getElementById("imageInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),
  previewImage: document.getElementById("previewImage"),
  overlayLayer: document.getElementById("overlayLayer"),
  overlayList: document.getElementById("overlayList"),
};

const defaultVisionPrompt = [
  "Analyse cette invitation de mariage et detecte les zones de texte visibles.",
  "Retourne UNIQUEMENT un JSON valide au format:",
  '{ "overlays": [',
  '  { "id": "title_1", "text": "Mariage de Sarah & David", "x_pct": 20, "y_pct": 14, "width_pct": 62, "height_pct": 10, "font_size_pct": 4.5, "font_family": "serif", "font_weight": "600", "color": "#ffffff", "text_align": "center" }',
  "] }",
  "Contraintes:",
  "- Les valeurs x_pct/y_pct/width_pct/height_pct sont en pourcentage (0 a 100).",
  "- Le texte doit rester lisible et coherent avec l'image.",
  "- Reponds sans markdown, sans commentaire, sans texte en dehors du JSON.",
].join("\n");

init();

function init() {
  refs.customPrompt.value = defaultVisionPrompt;
  refs.imageInput.addEventListener("change", onImageSelected);
  refs.analyzeBtn.addEventListener("click", onAnalyzeClick);
  refs.resetBtn.addEventListener("click", onResetClick);
  window.addEventListener("resize", renderOverlays);
}

function setStatus(message, type = "") {
  refs.status.textContent = message;
  refs.status.className = `status ${type}`.trim();
}

function onImageSelected(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  state.imageFile = file;
  state.overlays = [];
  state.activeOverlayId = null;
  refs.overlayList.innerHTML = "";
  refs.overlayLayer.innerHTML = "";

  const fileReader = new FileReader();
  fileReader.onload = () => {
    state.imageDataUrl = String(fileReader.result || "");
    refs.previewImage.src = state.imageDataUrl;
    refs.previewImage.style.display = "block";
    setStatus("Image chargee. Clique sur 'Analyser avec Claude Vision'.");
  };
  fileReader.onerror = () => {
    setStatus("Impossible de lire ce fichier image.", "error");
  };
  fileReader.readAsDataURL(file);
}

async function onAnalyzeClick() {
  if (!state.imageFile || !state.imageDataUrl) {
    setStatus("Selectionne une image avant l'analyse.", "error");
    return;
  }

  const apiKey = refs.apiKey.value.trim();
  if (!apiKey) {
    setStatus("Renseigne ta cle API Anthropic.", "error");
    return;
  }

  refs.analyzeBtn.disabled = true;
  setStatus("Analyse en cours via Claude Vision...");

  try {
    const mimeType = state.imageFile.type || "image/png";
    const base64Image = state.imageDataUrl.split(",")[1] || "";
    const promptText = refs.customPrompt.value.trim() || defaultVisionPrompt;
    const model = refs.modelName.value.trim() || "claude-3-5-sonnet-latest";

    const requestBody = {
      model,
      max_tokens: 1600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: promptText,
            },
          ],
        },
      ],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Erreur API (${response.status}): ${details}`);
    }

    const responseJson = await response.json();
    const overlays = parseOverlaysFromAnthropicResponse(responseJson);

    if (!overlays.length) {
      setStatus("Analyse terminee, mais aucune zone texte n'a ete detectee.", "error");
      return;
    }

    state.overlays = overlays;
    state.activeOverlayId = overlays[0].id;
    renderOverlays();
    renderOverlayEditor();
    setStatus(`Analyse terminee: ${overlays.length} overlays detectes.`, "success");
  } catch (error) {
    setStatus(String(error.message || error), "error");
  } finally {
    refs.analyzeBtn.disabled = false;
  }
}

function parseOverlaysFromAnthropicResponse(apiResponse) {
  const textBlocks = (apiResponse.content || []).filter((block) => block.type === "text");
  if (!textBlocks.length) {
    throw new Error("Reponse Claude invalide: bloc texte introuvable.");
  }

  const rawText = textBlocks.map((block) => block.text).join("\n").trim();
  const jsonText = extractJsonText(rawText);
  const parsed = JSON.parse(jsonText);

  if (!parsed.overlays || !Array.isArray(parsed.overlays)) {
    throw new Error("JSON Claude invalide: overlays[] manquant.");
  }

  return parsed.overlays.map((item, index) => normalizeOverlay(item, index));
}

function extractJsonText(rawText) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = rawText.indexOf("{");
  const lastBraceIndex = rawText.lastIndexOf("}");

  if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
    throw new Error("Impossible d'extraire un JSON de la reponse Claude.");
  }

  return rawText.slice(firstBraceIndex, lastBraceIndex + 1);
}

function normalizeOverlay(item, index) {
  const id = String(item.id || `overlay_${index + 1}`);
  return {
    id,
    text: String(item.text || ""),
    x_pct: clampPct(item.x_pct, 0),
    y_pct: clampPct(item.y_pct, 0),
    width_pct: clampPct(item.width_pct, 35),
    height_pct: clampPct(item.height_pct, 8),
    font_size_pct: clampPct(item.font_size_pct, 3.5),
    font_family: String(item.font_family || "serif"),
    font_weight: String(item.font_weight || "500"),
    color: String(item.color || "#ffffff"),
    text_align: sanitizeTextAlign(item.text_align),
  };
}

function clampPct(value, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, n));
}

function sanitizeTextAlign(value) {
  const candidate = String(value || "left").toLowerCase();
  if (candidate === "left" || candidate === "center" || candidate === "right") {
    return candidate;
  }
  return "left";
}

function renderOverlays() {
  refs.overlayLayer.innerHTML = "";
  if (!state.overlays.length || !refs.previewImage.naturalWidth) {
    return;
  }

  const containerRect = refs.previewImage.getBoundingClientRect();
  const widthPx = containerRect.width;
  const heightPx = containerRect.height;

  state.overlays.forEach((overlay) => {
    const box = document.createElement("div");
    box.className = `overlay-box${overlay.id === state.activeOverlayId ? " active" : ""}`;
    box.dataset.overlayId = overlay.id;
    box.textContent = overlay.text;

    // Conversion % -> px pour un positionnement parfait.
    box.style.left = `${pctToPx(overlay.x_pct, widthPx)}px`;
    box.style.top = `${pctToPx(overlay.y_pct, heightPx)}px`;
    box.style.width = `${pctToPx(overlay.width_pct, widthPx)}px`;
    box.style.height = `${pctToPx(overlay.height_pct, heightPx)}px`;

    box.style.fontSize = `${pctToPx(overlay.font_size_pct, heightPx)}px`;
    box.style.fontFamily = overlay.font_family;
    box.style.fontWeight = overlay.font_weight;
    box.style.color = overlay.color;
    box.style.textAlign = overlay.text_align;

    box.addEventListener("click", () => {
      state.activeOverlayId = overlay.id;
      renderOverlays();
      renderOverlayEditor();
    });

    refs.overlayLayer.appendChild(box);
  });
}

function pctToPx(percent, totalPx) {
  return (Number(percent) / 100) * totalPx;
}

function renderOverlayEditor() {
  refs.overlayList.innerHTML = "";
  if (!state.overlays.length) {
    refs.overlayList.innerHTML = "<p class='overlay-meta'>Aucun overlay pour le moment.</p>";
    return;
  }

  state.overlays.forEach((overlay) => {
    const item = document.createElement("article");
    item.className = `overlay-item${overlay.id === state.activeOverlayId ? " is-active" : ""}`;

    item.innerHTML = `
      <strong>${escapeHtml(overlay.id)}</strong>
      <p class="overlay-meta">x:${overlay.x_pct.toFixed(1)}% y:${overlay.y_pct.toFixed(1)}%
        w:${overlay.width_pct.toFixed(1)}% h:${overlay.height_pct.toFixed(1)}%</p>
      <label>Texte</label>
      <textarea data-field="text" data-id="${escapeHtml(overlay.id)}" rows="3">${escapeHtml(overlay.text)}</textarea>
      <label>Position / taille (%, separes par des virgules)</label>
      <input data-field="box" data-id="${escapeHtml(overlay.id)}" value="${overlay.x_pct},${overlay.y_pct},${overlay.width_pct},${overlay.height_pct}" />
      <label>Taille de police (%)</label>
      <input data-field="fontSize" data-id="${escapeHtml(overlay.id)}" value="${overlay.font_size_pct}" />
      <label>Couleur texte</label>
      <input data-field="color" data-id="${escapeHtml(overlay.id)}" value="${escapeHtml(overlay.color)}" />
      <label>Alignement (left / center / right)</label>
      <input data-field="align" data-id="${escapeHtml(overlay.id)}" value="${escapeHtml(overlay.text_align)}" />
    `;

    item.addEventListener("click", () => {
      state.activeOverlayId = overlay.id;
      renderOverlays();
      renderOverlayEditor();
    });

    refs.overlayList.appendChild(item);
  });

  refs.overlayList.querySelectorAll("textarea, input").forEach((field) => {
    field.addEventListener("input", onOverlayFieldChange);
  });
}

function onOverlayFieldChange(event) {
  const input = event.target;
  const overlayId = input.dataset.id;
  const field = input.dataset.field;
  const overlay = state.overlays.find((entry) => entry.id === overlayId);
  if (!overlay) {
    return;
  }

  if (field === "text") {
    overlay.text = input.value;
  } else if (field === "box") {
    const [x, y, w, h] = input.value.split(",").map((v) => Number(v.trim()));
    overlay.x_pct = clampPct(x, overlay.x_pct);
    overlay.y_pct = clampPct(y, overlay.y_pct);
    overlay.width_pct = clampPct(w, overlay.width_pct);
    overlay.height_pct = clampPct(h, overlay.height_pct);
  } else if (field === "fontSize") {
    overlay.font_size_pct = clampPct(input.value, overlay.font_size_pct);
  } else if (field === "color") {
    overlay.color = input.value.trim() || overlay.color;
  } else if (field === "align") {
    overlay.text_align = sanitizeTextAlign(input.value);
  }

  renderOverlays();
}

function onResetClick() {
  state.imageFile = null;
  state.imageDataUrl = "";
  state.overlays = [];
  state.activeOverlayId = null;

  refs.imageInput.value = "";
  refs.previewImage.src = "";
  refs.previewImage.style.display = "none";
  refs.overlayLayer.innerHTML = "";
  refs.overlayList.innerHTML = "";
  setStatus("Etat reinitialise.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
