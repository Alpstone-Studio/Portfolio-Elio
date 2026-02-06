const scenes = document.querySelectorAll("[data-scene]");
const aboutSection = document.querySelector(".scene-about");
const aboutText = aboutSection?.querySelector(".about-text");
const aboutMedia = aboutSection?.querySelector(".media-stack");
const aboutImages = aboutSection?.querySelectorAll(".about-image") ?? [];
const aboutNames = aboutSection?.querySelectorAll("[data-about-name]") ?? [];
const workSection = document.querySelector(".scene-work");
const workCards = workSection?.querySelectorAll(".work-card") ?? [];
const workSubtitleShorts = workSection?.querySelector(".work-subtitle--shorts");
const workSubtitles = workSection?.querySelectorAll(".work-subtitle") ?? [];
const montageCards = workSection?.querySelectorAll(".work-grid--montages .work-card") ?? [];
const montageLastSpeed =
  montageCards.length > 0 ? Number(montageCards[montageCards.length - 1].dataset.speed) || 1 : 1;
const contactSection = document.querySelector(".scene-contact");
const contactAvatar = contactSection?.querySelector(".contact-avatar img");
const navLinks = document.querySelectorAll(".nav-link");
const pageNav = document.querySelector(".page-nav");
const navPill = pageNav?.querySelector(".nav-pill");
const navStack = pageNav?.querySelector(".nav-stack");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let workBaseOffset = 0;
let aboutActiveIndex = 0;
let navDesiredOpen = false;
let navIsOpen = false;
let navIsAnimating = false;
let navFallbackTimer = null;
let navShiftRetries = 0;
let navRecenterTimers = [];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};
const applyHardSnap = (progress, count, edgeBuffer = 0.25) => {
  if (count <= 1) {
    return progress;
  }
  const segment = 1 / count;
  const edge = segment * edgeBuffer;
  if (progress < edge || progress > 1 - edge) {
    return progress;
  }
  const targetIndex = clamp(Math.round(progress / segment), 0, count - 1);
  return (targetIndex + 0.5) * segment;
};
const getSectionProgress = (section, viewHeight) => {
  const rect = section.getBoundingClientRect();
  const scrollTop = window.scrollY || window.pageYOffset || 0;
  const start = scrollTop + rect.top;
  const end = start + rect.height - viewHeight;
  if (end <= start) {
    return 0;
  }
  return clamp((scrollTop - start) / (end - start), 0, 1);
};
const getViewportProgress = (section, viewHeight) => {
  const rect = section.getBoundingClientRect();
  const total = viewHeight + rect.height;
  if (total <= 0) {
    return 0;
  }
  return clamp((viewHeight - rect.top) / total, 0, 1);
};



const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        entry.target.classList.remove("is-hidden");
      } else if (entry.boundingClientRect.top < 0) {
        entry.target.classList.add("is-hidden");
      }
    });
  },
  {
    threshold: 0.1,
  }
);

scenes.forEach((scene) => observer.observe(scene));

const updateNavShift = () => {
  if (!navPill || !navStack) {
    return;
  }
  const active = navStack.querySelector(".nav-link.is-active");
  if (!active) {
    return;
  }
  const pillHeight = navPill.clientHeight;
  const activeHeight = active.offsetHeight;
  if ((pillHeight === 0 || activeHeight === 0) && navShiftRetries < 6) {
    navShiftRetries += 1;
    window.requestAnimationFrame(updateNavShift);
    return;
  }
  navShiftRetries = 0;
  const activeCenter = active.offsetTop + activeHeight / 2;
  const targetCenter = pillHeight / 2;
  const shift = activeCenter - targetCenter;
  navStack.style.setProperty("--nav-shift", `${shift.toFixed(2)}px`);
};

const setNavExpanded = (shouldOpen) => {
  if (!pageNav || !navPill) {
    return;
  }

  navIsAnimating = true;
  pageNav.classList.toggle("is-expanded", shouldOpen);

  const finish = () => {
    navIsAnimating = false;
    navIsOpen = shouldOpen;
    if (navDesiredOpen !== navIsOpen) {
      setNavExpanded(navDesiredOpen);
    }
  };

  const onTransitionEnd = (event) => {
    if (event.target !== navPill) {
      return;
    }
    if (!["max-height", "width", "height"].includes(event.propertyName)) {
      return;
    }
    navPill.removeEventListener("transitionend", onTransitionEnd);
    window.clearTimeout(navFallbackTimer);
    finish();
  };

  navPill.addEventListener("transitionend", onTransitionEnd);
  window.clearTimeout(navFallbackTimer);
  navFallbackTimer = window.setTimeout(finish, 450);
};

const requestNavExpanded = (open) => {
  if (!pageNav?.classList.contains("is-collapsed")) {
    return;
  }
  navDesiredOpen = open;
  if (navIsAnimating || navDesiredOpen === navIsOpen) {
    return;
  }
  setNavExpanded(navDesiredOpen);
};

const navLinkMap = new Map();
navLinks.forEach((link) => {
  const id = link.getAttribute("href")?.replace("#", "");
  if (id) {
    navLinkMap.set(id, link);
  }
});

if (navLinks.length) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      let bestEntry = null;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
          bestEntry = entry;
        }
      });

      if (bestEntry) {
        const link = navLinkMap.get(bestEntry.target.id);
        if (link) {
          navLinks.forEach((item) => item.classList.remove("is-active"));
          link.classList.add("is-active");
        }

        if (pageNav) {
          const isHero = bestEntry.target.id === "hero";
          pageNav.classList.toggle("is-hero", isHero);
          pageNav.classList.toggle("is-collapsed", !isHero);
          if (isHero) {
            navDesiredOpen = false;
            navIsOpen = false;
            navIsAnimating = false;
            pageNav.classList.remove("is-expanded");
          } else if (!navDesiredOpen) {
            pageNav.classList.remove("is-expanded");
            navIsOpen = false;
            navIsAnimating = false;
          }
        }

        window.requestAnimationFrame(updateNavShift);
      }
    },
    {
      threshold: [0.2, 0.45, 0.7],
      rootMargin: "-30% 0px -40% 0px",
    }
  );

  scenes.forEach((scene) => navObserver.observe(scene));
}

if (pageNav) {
  pageNav.addEventListener("mouseenter", () => requestNavExpanded(true));
  pageNav.addEventListener("mouseleave", () => requestNavExpanded(false));
}

const updateNavStateFallback = () => {
  if (!pageNav || !navLinks.length || !scenes.length) {
    return;
  }

  const viewHeight = window.innerHeight || 1;
  let bestScene = null;
  let bestScore = -1;

  scenes.forEach((scene) => {
    const rect = scene.getBoundingClientRect();
    const visible = Math.max(0, Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0));
    const score = visible / Math.max(rect.height, 1);
    if (score > bestScore) {
      bestScore = score;
      bestScene = scene;
    }
  });

  if (!bestScene) {
    return;
  }

  const link = navLinkMap.get(bestScene.id);
  if (link) {
    navLinks.forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
  }

  const isHero = bestScene.id === "hero";
  pageNav.classList.toggle("is-hero", isHero);
  pageNav.classList.toggle("is-collapsed", !isHero);
  if (isHero) {
    navDesiredOpen = false;
    navIsOpen = false;
    navIsAnimating = false;
    pageNav.classList.remove("is-expanded");
  } else if (!navDesiredOpen) {
    pageNav.classList.remove("is-expanded");
    navIsOpen = false;
    navIsAnimating = false;
  }

  window.requestAnimationFrame(updateNavShift);
};


const updateAboutVisuals = (progress) => {
  if (!aboutMedia) {
    return;
  }

  const textParallax = prefersReducedMotion ? 0 : lerp(10, -12, progress);
  const imageParallax = prefersReducedMotion ? 0 : lerp(90, -120, progress);
  if (aboutText) {
    aboutText.style.setProperty("--parallax-y-text", `${textParallax}px`);
  }
  aboutMedia.style.setProperty("--parallax-y", `${imageParallax}px`);

  if (!aboutImages.length) {
    return;
  }

  if (prefersReducedMotion || aboutImages.length === 1) {
    aboutImages.forEach((image, index) => {
      image.style.opacity = index === 0 ? "1" : "0";
    });
    aboutActiveIndex = 0;
    aboutNames.forEach((name) => {
      name.classList.toggle("is-highlight", Number(name.dataset.aboutName) === 0);
    });
    return;
  }

  const count = aboutImages.length;
  const visualProgress = applyHardSnap(progress, count);
  const segment = 1 / count;
  const fade = segment * 0.18;
  let activeIndex = 0;
  let activeOpacity = 0;

  aboutImages.forEach((image, index) => {
    const start = segment * index;
    const end = start + segment;
    const fadeInEnd = start + fade;
    const fadeOutStart = end - fade;
    let opacity = 0;

    if (visualProgress >= start && visualProgress <= end) {
      if (visualProgress <= fadeInEnd) {
        opacity = smoothstep(start, fadeInEnd, visualProgress);
      } else if (visualProgress >= fadeOutStart) {
        opacity = 1 - smoothstep(fadeOutStart, end, visualProgress);
      } else {
        opacity = 1;
      }
    }

    if (index === 0 && visualProgress <= fadeInEnd) {
      opacity = 1;
    }

    if (index === count - 1 && visualProgress >= fadeOutStart) {
      opacity = 1;
    }

    if (opacity > activeOpacity) {
      activeOpacity = opacity;
      activeIndex = index;
    }

    image.style.opacity = opacity.toFixed(3);
  });

  aboutActiveIndex = activeIndex;

  aboutNames.forEach((name) => {
    name.classList.toggle("is-highlight", Number(name.dataset.aboutName) === activeIndex);
  });
};

const updateWorkParallax = (progress) => {
  if (!workCards.length) {
    return;
  }

  const range = prefersReducedMotion ? 0 : 140;
  const baseOffset = lerp(range, -range, progress);
  workBaseOffset = baseOffset;
  workCards.forEach((card, index) => {
    const speed = Number(card.dataset.speed) || 1;
    const offset = baseOffset * speed;
    card.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
  });
};

const updateWorkSubtitles = () => {
  if (!workSubtitles.length) {
    return;
  }

  const stickyTop = window.innerHeight * 0.06;
  const fadeDistance = 60;
  const transitionRange = 160;
  workSubtitles.forEach((heading) => {
    const block = heading.closest(".work-block");
    if (!block) {
      return;
    }
    const sentinel = block.querySelector(".work-sticky-sentinel");
    if (!sentinel) {
      return;
    }
    const sentinelRect = sentinel.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const isSticky = sentinelRect.top <= stickyTop;
    const isFading = isSticky && blockRect.bottom <= stickyTop + fadeDistance;
    heading.classList.toggle("is-sticky", isSticky);
    heading.classList.toggle("is-fading", isFading);

    if (heading.classList.contains("work-subtitle--shorts")) {
      const distance = sentinelRect.top - stickyTop;
      const blend = clamp(1 - distance / transitionRange, 0, 1);
      const baseParallax = workBaseOffset * montageLastSpeed;
      const parallaxValue = baseParallax * (1 - blend);
      heading.style.setProperty("--subtitle-parallax", `${parallaxValue.toFixed(2)}px`);
    }
  });
};

const updateParallax = () => {
  const viewHeight = window.innerHeight || 1;

  if (aboutSection) {
    const progress = getSectionProgress(aboutSection, viewHeight);
    updateAboutVisuals(progress);
  }

  if (workSection) {
    const progress = getSectionProgress(workSection, viewHeight);
    updateWorkParallax(progress);
  }
  updateWorkSubtitles();

  if (contactSection && contactAvatar) {
    const progress = getViewportProgress(contactSection, viewHeight);
    const offset = prefersReducedMotion ? 0 : lerp(40, -40, progress);
    contactAvatar.style.setProperty("--avatar-parallax", `${offset.toFixed(2)}px`);
  }
};

let ticking = false;
const requestUpdate = () => {
  if (ticking) {
    return;
  }

  ticking = true;
  window.requestAnimationFrame(() => {
    updateParallax();
    updateNavStateFallback();
    ticking = false;
  });
};

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
const scheduleNavRecenter = () => {
  navRecenterTimers.forEach((timer) => window.clearTimeout(timer));
  navRecenterTimers = [0, 80, 200, 420].map((delay) =>
    window.setTimeout(() => {
      updateNavStateFallback();
      updateNavShift();
    }, delay)
  );
};
window.addEventListener("load", scheduleNavRecenter);
window.addEventListener("pageshow", scheduleNavRecenter);
updateParallax();
updateNavStateFallback();
