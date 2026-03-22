function toggleTheme() {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");

  const theme = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("theme", theme);
}

function loadTheme() {
  const theme = localStorage.getItem("theme") || "dark";
  document.body.classList.add(theme);
}

function logout() {
  localStorage.removeItem("userId");
  document.cookie = "userId=;";
  window.location.href = "index.html";
}

function goToPractice() {
  window.location.href = "practice.html";
}

function goToDashboard() {
  window.location.href = "dashboard.html";
}

function getUserId() {
  return localStorage.getItem("userId");
}

window.onload = loadTheme;
