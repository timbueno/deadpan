(() => {
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

      if (!visual) {
        return;
      }

      opener = button;
      lightboxMedia.replaceChildren(visual.cloneNode(true));
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
