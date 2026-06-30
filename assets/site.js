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
  applications: new Map(),
  sources: new Map(),
  limits: new Map(),
};

async function loadEvidence() {
  if (!state.evidence) {
    state.evidence = await fetchJson("data/evidence.json");
    state.sources = byId(state.evidence.sources || state.evidence.public_evidence || []);
    state.limits = byId(state.evidence.claim_limits || []);
  }
  return state.evidence;
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
    kppPacket: packet.kppPacket,
    claimLimits: getClaimLimits(),
    membrane: verifyMembrane(packet),
  };
}

const ready = Promise.all([loadEvidence(), loadApplication("fai")]).then(() => {
  hydrateFaiHarness();
  return window.likeMinds;
});

window.likeMinds = {
  version: "like-minds.harness.v1",
  ready,
  loadApplication,
  getEvidence,
  getClaimLimits,
  listLenses,
  composeBriefing,
  exportKppPacket,
  verifyMembrane,
};

function renderBriefing(briefing) {
  const panel = document.querySelector("[data-briefing-panel]");
  if (!panel) return;
  const title = panel.querySelector("[data-briefing-title]");
  const body = panel.querySelector("[data-briefing-body]");
  const sources = panel.querySelector("[data-briefing-sources]");
  const next = panel.querySelector("[data-briefing-next]");
  if (title) title.textContent = `${briefing.title}: ${briefing.question}`;
  if (body) body.textContent = briefing.briefing;
  if (sources) {
    sources.replaceChildren(...briefing.sources.map((source) => {
      const anchor = document.createElement("a");
      anchor.href = source.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = source.label;
      return anchor;
    }));
  }
  if (next) next.textContent = `Next act: ${briefing.nextAct}`;
}

function hydrateFaiHarness() {
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
  if (packet.lenses && packet.lenses.length) {
    renderBriefing(composeBriefing({ applicationId: "fai", lensId: packet.lenses[0].id }));
  }
  const output = document.querySelector("[data-kpp-output]");
  if (output) {
    output.textContent = JSON.stringify(exportKppPacket("fai"), null, 2);
  }
}

function setActiveMark(id) {
  document.querySelectorAll("[data-mark]").forEach((item) => {
    item.toggleAttribute("data-active", item.dataset.mark === id);
  });
  const target = document.querySelector(`[data-panel="${id}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

document.querySelectorAll("[data-mark]").forEach((button) => {
  button.addEventListener("click", () => setActiveMark(button.dataset.mark));
});

const scrollRule = document.querySelector("[data-scroll-rule]");
if (scrollRule && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  function updateScrollRule() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    scrollRule.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    root.style.setProperty("--scroll-progress", String(Math.max(0, Math.min(1, progress))));
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
