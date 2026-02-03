const scenes = document.querySelectorAll("[data-scene]");

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
    threshold: 0.3,
  }
);

scenes.forEach((scene) => observer.observe(scene));
