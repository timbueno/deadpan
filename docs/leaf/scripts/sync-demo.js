(() => {
  const demo = document.querySelector(".sync-demo");
  if (!demo) return;

  const playLink = demo.querySelector(".sync-demo-play");
  const video = demo.querySelector("video");
  const error = demo.querySelector(".sync-demo-error");

  playLink.addEventListener("click", async (event) => {
    // Preserve the link's normal behavior for opening a new tab or window.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    error.hidden = true;
    video.poster = playLink.querySelector("img").src;
    video.src = video.dataset.src;
    video.hidden = false;
    playLink.hidden = true;
    video.focus();

    try {
      await video.play();
    } catch {
      error.textContent = "Use the video controls to play, or watch on YouTube.";
      error.hidden = false;
    }
  });

  video.addEventListener("error", () => {
    error.textContent = "Video unavailable. Watch on YouTube instead.";
    error.hidden = false;
  });
  video.addEventListener("playing", () => { error.hidden = true; });
})();
