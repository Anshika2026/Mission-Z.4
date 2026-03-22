async function register() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();

  toggleLoading(true);
  const res = await api("register", { name, email });
  console.log("REGISTER RESPONSE:", res);
  if (res.success) {
    // localStorage.setItem("userId", res.userId);
    // localStorage.setItem("userName", res.name);
    localStorage.setItem("userId", res.userId);
    localStorage.setItem("userName", res.name || name);
    window.location.href = "dashboard.html";
  } else {
    alert(res.message);
  }

  toggleLoading(false);
}
function toggleLoading(isLoading) {
  const text = document.getElementById("btnText");
  const loader = document.getElementById("loader");

  if (!text || !loader) return;

  if (isLoading) {
    text.classList.add("hidden");
    loader.classList.remove("hidden");
  } else {
    text.classList.remove("hidden");
    loader.classList.add("hidden");
  }
}
