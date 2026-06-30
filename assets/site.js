const root = document.documentElement;

const pathPrefix = (() => {
  const path = window.location.pathname;
  const marker = "/like-minds/";
  const markerIndex = path.indexOf(marker);
  if (markerIndex >= 0) return path.slice(0, markerIndex + marker.length);
  return path.includes("/fai/") ? "../" : "./";
})();

function resolveUrl(relative) {
  return new URL(relative, new URL(pathPrefix, window.location.origin + window.location.pathname)).href;
}

async function fetchJson(relative) {
  const response = await fetch(resolveUrl(relative), { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${relative}: ${response.status}`);
  return response.json();
}

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

const state = {
  evidence: null,
  portal: null,
  applications: new Map(),
  sources: new Map(),
  limits: new Map(),
  scenes: new Map(),
  askRooms: new Map(),
};

async function loadEvidence() {
  if (!state.evidence) {
    state.evidence = await fetchJson("data/evidence.json");
    state.sources = byId(state.evidence.sources || state.evidence.public_evidence || []);
    state.limits = byId(state.evidence.claim_limits || []);
  }
  return state.evidence;
}

async function loadPortalScenes() {
  if (!state.portal) {
    state.portal = await fetchJson("data/portal-scenes.json");
    state.scenes = byId(state.portal.scenes || []);
    state.askRooms = byId(state.portal.askRooms || []);
  }
  return state.portal;
}

async function loadApplication(id = "fai") {
  await loadEvidence();
  if (!state.applications.has(id)) {
    state.applications.set(id, await fetchJson(`data/applications/${id}.json`));
  }
  return state.applications.get(id);
}

function getEvidence(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  return list.map((id) => state.sources.get(id)).filter(Boolean);
}

function getClaimLimits(ids) {
  const source = ids ? (Array.isArray(ids) ? ids : [ids]) : Array.from(state.limits.keys());
  return source.map((id) => state.limits.get(id)).filter(Boolean);
}

function listLenses(applicationId = "fai") {
  const packet = state.applications.get(applicationId);
  return packet ? packet.lenses || [] : [];
}

function verifyMembrane(packet) {
  const claims = packet && Array.isArray(packet.claims) ? packet.claims : [];
  const unsourced = claims
    .filter((claim) => !Array.isArray(claim.sourceIds) || claim.sourceIds.length === 0)
    .map((claim) => claim.id || claim.text);
  const unbounded = claims
    .filter((claim) => !Array.isArray(claim.limitIds) || claim.limitIds.length === 0)
    .map((claim) => claim.id || claim.text);
  return {
    ok: unsourced.length === 0 && unbounded.length === 0,
    unsourced,
    unbounded,
  };
}

function composeBriefing({ applicationId = "fai", lensId = "origin", audience = "reviewer" } = {}) {
  const packet = state.applications.get(applicationId);
  if (!packet) throw new Error(`Application not loaded: ${applicationId}`);
  const lens = (packet.lenses || []).find((item) => item.id === lensId) || (packet.lenses || [])[0];
  if (!lens) throw new Error(`No lenses found for ${applicationId}`);
  const claims = (packet.claims || []).filter((claim) => (lens.claimIds || []).includes(claim.id));
  const sourceIds = new Set([...(lens.sourceIds || []), ...claims.flatMap((claim) => claim.sourceIds || [])]);
  const limitIds = new Set([...(lens.limitIds || []), ...claims.flatMap((claim) => claim.limitIds || [])]);
  return {
    schema: "like-minds.briefing.v1",
    audience,
    applicationId,
    lensId: lens.id,
    title: lens.label,
    question: lens.question,
    thesis: packet.thesis,
    briefing: lens.briefing,
    claims,
    sources: getEvidence([...sourceIds]),
    claimLimits: getClaimLimits([...limitIds]),
    nextAct: lens.nextAct || packet.kppPacket?.nextAct || "Inspect the public sources and choose a responsible next act.",
  };
}

function exportKppPacket(applicationId = "fai") {
  const packet = state.applications.get(applicationId);
  if (!packet) throw new Error(`Application not loaded: ${applicationId}`);
  return {
    schema: "like-minds.kpp_export.v1",
    applicationId,
    thesis: packet.thesis,
    character: packet.character || [],
    method: packet.method,
    kppPacket: packet.kppPacket,
    claimLimits: getClaimLimits(),
    membrane: verifyMembrane(packet),
  };
}

function renderSourceChip(source) {
  const anchor = document.createElement("a");
  anchor.href = source.href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.textContent = source.label;
  return anchor;
}

function renderBriefing(briefing) {
  const panel = document.querySelector("[data-briefing-panel]");
  if (!panel) return;
  const label = panel.querySelector("[data-briefing-label]");
  const title = panel.querySelector("[data-briefing-title]");
  const body = panel.querySelector("[data-briefing-body]");
  const claims = panel.querySelector("[data-briefing-claims]");
  const sources = panel.querySelector("[data-briefing-sources]");
  const next = panel.querySelector("[data-briefing-next]");
  if (label) label.textContent = briefing.title;
  if (title) title.textContent = briefing.question;
  if (body) body.textContent = briefing.briefing;
  if (claims) {
    claims.replaceChildren(...briefing.claims.slice(0, 3).map((claim) => {
      const item = document.createElement("span");
      item.textContent = claim.text;
      return item;
    }));
  }
  if (sources) sources.replaceChildren(...briefing.sources.map(renderSourceChip));
  if (next) next.textContent = `Next act: ${briefing.nextAct}`;
}

function hydrateFaiRoom() {
  const packet = state.applications.get("fai");
  if (!packet) return;
  const buttons = document.querySelector("[data-lens-buttons]");
  if (buttons) {
    buttons.replaceChildren(...(packet.lenses || []).map((lens, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lens-button";
      button.dataset.lensId = lens.id;
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${lens.label}</strong><small>${lens.question}</small>`;
      button.addEventListener("click", () => {
        buttons.querySelectorAll(".lens-button").forEach((item) => item.toggleAttribute("data-active", item === button));
        renderBriefing(composeBriefing({ applicationId: "fai", lensId: lens.id }));
      });
      if (index === 0) button.dataset.active = "";
      return button;
    }));
  }
  if (packet.lenses && packet.lenses.length) renderBriefing(composeBriefing({ applicationId: "fai", lensId: packet.lenses[0].id }));
  const output = document.querySelector("[data-kpp-output]");
  if (output) output.textContent = JSON.stringify(exportKppPacket("fai"), null, 2);
}

function renderScene(scene) {
  const stage = document.querySelector("[data-scene-stage]");
  if (!stage || !scene) return;
  const label = stage.querySelector("[data-scene-label]");
  const title = stage.querySelector("[data-scene-title]");
  const body = stage.querySelector("[data-scene-body]");
  const consequence = stage.querySelector("[data-scene-consequence]");
  const sources = stage.querySelector("[data-scene-sources]");
  if (label) label.textContent = scene.label;
  if (title) title.textContent = scene.title;
  if (body) body.textContent = scene.body;
  if (consequence) consequence.textContent = scene.consequence;
  if (sources) sources.replaceChildren(...getEvidence(scene.sourceIds || []).map(renderSourceChip));
}

function hydrateSceneRail() {
  const rail = document.querySelector("[data-scene-buttons]");
  if (!rail || !state.portal) return;
  const scenes = (state.portal.scenes || []).slice(0, 8);
  rail.replaceChildren(...scenes.map((scene, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene-button";
    button.dataset.sceneId = scene.id;
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${scene.label}</strong>`;
    button.addEventListener("click", () => {
      rail.querySelectorAll(".scene-button").forEach((item) => item.toggleAttribute("data-active", item === button));
      renderScene(scene);
    });
    if (index === 0) button.dataset.active = "";
    return button;
  }));
  if (scenes[0]) renderScene(scenes[0]);
}

function hydrateSourceConstellations() {
  document.querySelectorAll("[data-source-constellation]").forEach((container) => {
    const ids = document.body.dataset.page === "fai"
      ? ["vybn-law-about", "rhode-writing-sample", "wellspring", "kpp", "fai-announcement"]
      : ["vybn-law-about", "memoir-room", "rhode-writing-sample", "wellspring", "kpp", "somewhere", "memoir-jump"];
    const sources = getEvidence(ids);
    if (!sources.length) return;
    container.replaceChildren(...sources.map((source) => {
      const anchor = document.createElement("a");
      anchor.className = "source-node";
      anchor.href = source.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      const title = document.createElement("strong");
      title.textContent = source.label;
      const desc = document.createElement("span");
      desc.textContent = source.description;
      anchor.append(title, desc);
      return anchor;
    }));
  });
}

function activeAskRoom(consoleEl) {
  const active = consoleEl.querySelector(".ask-room[data-active]");
  return active?.dataset.askRoom || "witness";
}

function composeAskPrompt(consoleEl) {
  const roomId = activeAskRoom(consoleEl);
  const room = state.askRooms.get(roomId) || state.askRooms.get("witness");
  const context = consoleEl.querySelector("[data-ask-context]")?.value.trim();
  const sourceList = getEvidence(["vybn-law-about", "rhode-writing-sample", "wellspring", "kpp", "somewhere", "fai-announcement"])
    .map((source) => `- ${source.label}: ${source.href}`)
    .join("\n");
  return [
    room?.prompt || "Read the public like-minds portal for Zoe Dolan + Vybn and answer from public sources only.",
    context ? `\nPublic context from reviewer:\n${context}` : "",
    "\nUse only public sources. Preserve these claim terms: not legal advice; no FAI endorsement unless FAI says otherwise; no private continuity export; no AI legal personhood claim; no public proof-of-consciousness claim.",
    `\nPublic source trail:\n${sourceList}`,
    "\nReturn: (1) what becomes visible, (2) what source supports it, (3) what a responsible next act would be."
  ].filter(Boolean).join("\n");
}

function hydrateAskConsoles() {
  document.querySelectorAll(".ask-console").forEach((consoleEl) => {
    consoleEl.querySelectorAll(".ask-room").forEach((button) => {
      button.addEventListener("click", () => {
        consoleEl.querySelectorAll(".ask-room").forEach((item) => item.toggleAttribute("data-active", item === button));
      });
    });
    const compose = consoleEl.querySelector("[data-compose-ask]");
    const output = consoleEl.querySelector("[data-ask-output]");
    if (compose && output) {
      compose.addEventListener("click", () => {
        output.textContent = composeAskPrompt(consoleEl);
      });
    }
  });
}

function setActiveMark(id) {
  document.querySelectorAll("[data-mark]").forEach((item) => {
    item.toggleAttribute("data-active", item.dataset.mark === id);
  });
  const target = document.querySelector(`[data-panel="${id}"]`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.querySelectorAll("[data-mark]").forEach((button) => {
  button.addEventListener("click", () => setActiveMark(button.dataset.mark));
});

const ready = Promise.all([loadEvidence(), loadPortalScenes(), loadApplication("fai")]).then(() => {
  hydrateSceneRail();
  hydrateFaiRoom();
  hydrateSourceConstellations();
  hydrateAskConsoles();
  return window.likeMinds;
});

window.likeMinds = {
  version: "like-minds.portal.v2",
  ready,
  loadApplication,
  loadPortalScenes,
  getEvidence,
  getClaimLimits,
  listLenses,
  composeBriefing,
  exportKppPacket,
  verifyMembrane,
};

const scrollRule = document.querySelector("[data-scroll-rule]");
if (scrollRule && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  function updateScrollRule() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const clamped = Math.max(0, Math.min(1, progress));
    scrollRule.style.transform = `scaleX(${clamped})`;
    root.style.setProperty("--scroll-progress", String(clamped));
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollRule);
      ticking = true;
    }
  }, { passive: true });
  updateScrollRule();
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const source = document.querySelector(button.dataset.copy);
    if (!source) return;
    await navigator.clipboard.writeText(source.textContent.trim());
    button.dataset.copied = "true";
    setTimeout(() => {
      delete button.dataset.copied;
    }, 1800);
  });
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  root.dataset.reduceMotion = "true";
}
