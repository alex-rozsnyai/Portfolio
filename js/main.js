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

/* ── 08 In motion ─────────────────────────────────────────────────────────────
   The rail plays as one sequence: one clip at a time, and when it ends the next
   one starts. That is why the markup carries no `loop` attribute — a looping video
   never fires `ended`, and `ended` is the whole handover.

   Only the section being on screen starts it, and leaving stops it, so nothing is
   decoding behind a part of the page nobody is looking at. preload="none" means a
   visitor who never scrolls this far fetches none of it.

   Hovering a clip hands the sequence to that clip rather than fighting it, so the
   rail stays a single thread of playback however it is driven.

   Sound is never taken without being asked: the rail is muted, and the viewer is
   where a clip gets its audio. */
(function () {
  const section = document.getElementById("motion");
  if (!section) return;
  const reels = [...section.querySelectorAll(".reel-open")];
  if (!reels.length) return;

  const videos = reels.map((btn) => btn.querySelector("video"));
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = -1;
  let running = false;

  const mark = (i) => reels.forEach((btn, n) => btn.classList.toggle("is-playing", n === i));

  const start = (i) => {
    if (!running) return;
    const v = videos[i];
    if (active !== i && active >= 0) videos[active].pause();
    active = i;
    mark(i);
    // From the top, so a clip picked up mid-sequence is not joined halfway.
    if (v.currentTime > 0 && v.ended) v.currentTime = 0;
    v.play().catch(() => {});
  };

  // The handover. `ended` fires once per clip, and the next index wraps, so the rail
  // runs continuously for as long as the section is on screen.
  videos.forEach((v, i) =>
    v.addEventListener("ended", () => {
      v.currentTime = 0;
      start((i + 1) % videos.length);
    }),
  );

  const stop = () => {
    running = false;
    videos.forEach((v) => v.pause());
    mark(-1);
  };

  if (!still && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          running = true;
          start(active < 0 ? 0 : active);
        } else {
          stop();
        }
      },
      { threshold: 0.12 },
    ).observe(section);
  }

  // Hover and keyboard focus move the sequence rather than starting a second one.
  reels.forEach((btn, i) => {
    const take = () => { running = true; start(i); };
    btn.addEventListener("pointerenter", take);
    btn.addEventListener("focus", take);
  });

  // The viewer: the same clip, from the top, with sound and controls.
  const box = document.getElementById("vbox");
  const stage = box.querySelector("video");
  let lastFocus = null;

  const open = (btn) => {
    lastFocus = btn;
    stage.src = btn.querySelector("video").getAttribute("src");
    stage.currentTime = 0;
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // The rail would otherwise keep running behind a full-screen dialog, competing
    // with the clip actually being watched.
    stop();
    stage.play().catch(() => {});
    box.querySelector(".vbox-close").focus();
  };

  const close = () => {
    box.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    stage.pause();
    // Drop the source so it stops buffering behind a closed dialog.
    stage.removeAttribute("src");
    stage.load();
    if (lastFocus) lastFocus.focus();
  };

  reels.forEach((btn) => btn.addEventListener("click", () => open(btn)));
  box.querySelector(".vbox-close").addEventListener("click", close);
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box.getAttribute("aria-hidden") === "false") close();
  });
})();
