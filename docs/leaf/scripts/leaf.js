(() => {
  const root = document.documentElement;
  const themeButtons = document.querySelectorAll("[data-color-scheme]");
  const themeSources = document.querySelectorAll(
    'source[media*="prefers-color-scheme: dark"]'
  );
  const validThemes = new Set(["auto", "light", "dark"]);

  const getSavedTheme = () => {
    try {
      const savedTheme = localStorage.getItem("leaf-color-scheme");
      return validThemes.has(savedTheme) ? savedTheme : "auto";
    } catch {
      return "auto";
    }
  };

  const mediaForForcedDark = (media) =>
    media
      .replace(/\s+and\s+\(prefers-color-scheme:\s*dark\)/, "")
      .replace(/\(prefers-color-scheme:\s*dark\)/, "all");

  themeSources.forEach((source) => {
    source.dataset.autoMedia = source.media;
  });

  const applyTheme = (theme, persist = false) => {
    const selectedTheme = validThemes.has(theme) ? theme : "auto";

    if (selectedTheme === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.dataset.theme = selectedTheme;
    }

    themeSources.forEach((source) => {
      if (selectedTheme === "auto") {
        source.media = source.dataset.autoMedia;
      } else if (selectedTheme === "dark") {
        source.media = mediaForForcedDark(source.dataset.autoMedia);
      } else {
        source.media = "not all";
      }
    });

    themeButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.colorScheme === selectedTheme)
      );
    });

    if (persist) {
      try {
        if (selectedTheme === "auto") {
          localStorage.removeItem("leaf-color-scheme");
        } else {
          localStorage.setItem("leaf-color-scheme", selectedTheme);
        }
      } catch {}
    }
  };

  applyTheme(getSavedTheme());

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.colorScheme, true);
    });
  });

  const lightbox = document.querySelector("#screenshot-lightbox");
  const lightboxMedia = lightbox?.querySelector(".screenshot-lightbox-media");
  const closeButton = lightbox?.querySelector(".screenshot-lightbox-close");
  const screenshotButtons = document.querySelectorAll(".feature-screenshot");

  if (!lightbox || !lightboxMedia || !closeButton) {
    return;
  }

  let opener = null;

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.classList.remove("screenshot-lightbox-open");
    lightboxMedia.replaceChildren();
    opener?.focus();
    opener = null;
  };

  screenshotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const visual = button.querySelector(".feature-screenshot-visual");
      const composition = button.querySelector(".feature-screenshot-composition");

      if (!visual) {
        return;
      }

      opener = button;

      if (composition) {
        const expandedComposition = composition.cloneNode(true);
        const sourceVisuals = composition.querySelectorAll(".feature-screenshot-visual");
        const expandedVisuals = expandedComposition.querySelectorAll(".feature-screenshot-visual");

        expandedVisuals.forEach((expandedVisual, index) => {
          expandedVisual.src = sourceVisuals[index].currentSrc || sourceVisuals[index].src;
          expandedVisual.loading = "eager";
          expandedVisual.closest("picture")?.querySelector("source")?.remove();
        });

        lightboxMedia.replaceChildren(expandedComposition);
      } else {
        const expandedVisual = visual.cloneNode(true);
        const expandedVisualShell = document.createElement("span");

        expandedVisual.src = visual.currentSrc || visual.src;
        expandedVisualShell.className = "screenshot-lightbox-visual";
        expandedVisualShell.append(expandedVisual);
        lightboxMedia.replaceChildren(expandedVisualShell);
      }

      lightbox.setAttribute(
        "aria-label",
        `Enlarged screenshot: ${button.dataset.screenshotTitle || "Leaf"}`
      );
      lightbox.hidden = false;
      document.body.classList.add("screenshot-lightbox-open");
      closeButton.focus();
    });
  });

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    }

    if (event.key === "Tab") {
      event.preventDefault();
      closeButton.focus();
    }
  });
})();
