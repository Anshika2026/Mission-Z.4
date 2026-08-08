function initNavbar() {
  const name = localStorage.getItem("userName") || "User";
  const userId = localStorage.getItem("userId") || "-";
  const initials = getInitials(name);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  set("userInitials", initials);
  set("userInitialsLarge", initials);
  set("dropdownUserName", name);
  set("dropdownUserId", `Member ID: ${userId}`);

  highlightActiveLink();

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("userDropdown");
    const btn = document.getElementById("userAvatarBtn");
    if (menu && !menu.classList.contains("hidden")) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add("hidden");
      }
    }
  });
}

function getInitials(name) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toggleUserMenu() {
  document.getElementById("userDropdown").classList.toggle("hidden");
}

function toggleMobileMenu() {
  document.getElementById("mobileSidebar").classList.add("open");
  document.getElementById("mobileOverlay").classList.remove("hidden");
}

function closeMobileMenu() {
  document.getElementById("mobileSidebar").classList.remove("open");
  document.getElementById("mobileOverlay").classList.add("hidden");
}

function highlightActiveLink() {
  const page = window.location.pathname.split("/").pop() || "dashboard.html";

  document
    .querySelectorAll(".nav-link, .mobile-sidebar-links a")
    .forEach((link) => {
      const href = link.getAttribute("href").split("#")[0];
      if (href === page) link.classList.add("active");
    });
}

document.addEventListener("DOMContentLoaded", initNavbar);
