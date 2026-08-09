document.addEventListener("click", (event) => {
  const button = event.target.closest(".collapse-btn");
  if (!button) {
    return;
  }

  const comment = button.closest(".comment");
  const collapsed = comment.classList.toggle("collapsed");
  button.setAttribute("aria-expanded", String(!collapsed));
  button.textContent = collapsed ? "[+]" : "[-]";
});
