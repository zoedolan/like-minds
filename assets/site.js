const root = document.documentElement;

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
