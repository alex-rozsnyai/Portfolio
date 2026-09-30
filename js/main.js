(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav background on scroll ---------- */
  const nav = document.querySelector(".site-nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- count-up stats ---------- */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const start = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add("in", "in-view");
      el.querySelectorAll("[data-count]").forEach(countUp);
      el.querySelectorAll(".timing-fill").forEach((bar, i) => {
        bar.style.transitionDelay = 0.15 + i * 0.1 + "s";
        bar.style.width = bar.dataset.w + "%";
      });
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".reveal-up, .gallery-card, #scale-chart").forEach((el) => io.observe(el));

  /* ---------- plate filters ---------- */
  const plates = [...document.querySelectorAll(".plate")];
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      plates.forEach((p) => p.classList.toggle("hide", f !== "all" && p.dataset.cat !== f));
    });
  });

  /* ---------- lightbox ---------- */
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector("img");
  const lbTitle = lb.querySelector(".lightbox-cap b");
  const lbSub = lb.querySelector(".lightbox-cap span");
  const lbCount = lb.querySelector(".lightbox-count");
  let current = 0;
  let lastFocus = null;

  const visible = () => plates.filter((p) => !p.classList.contains("hide"));

  const show = (i) => {
    const list = visible();
    current = (i + list.length) % list.length;
    const p = list[current];
    const img = p.querySelector("img");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbTitle.textContent = p.querySelector("figcaption b").textContent;
    lbSub.textContent = p.querySelector("figcaption span").textContent;
    lbCount.textContent = String(current + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
  };

  const open = (plate) => {
    lastFocus = plate;
    show(visible().indexOf(plate));
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus();
  };

  const close = () => {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  plates.forEach((p) => p.addEventListener("click", () => open(p)));
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", () => show(current - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => show(current + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lightbox-stage")) close(); });

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  // basic swipe on touch screens
  let sx = null;
  lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    sx = null;
  });
})();
