let prelimsChart, mainsChart, consistencyChart;

document.addEventListener("DOMContentLoaded", init);

function showWelcome() {
  const name = localStorage.getItem("userName");

  document.getElementById("welcomeUser").innerText =
    name && name !== "undefined" ? `Welcome ${name}` : "Welcome User";
}
async function init() {
  // function showWelcome() {
  //   const name = localStorage.getItem("userName") || "User";
  //   document.getElementById("welcomeUser").innerText = `Welcome ${name}`;
  // }
  const userId = getUserId();
  if (!userId) return logout();
  showWelcome();
  await loadSubjects();
  await loadDashboardData();
}
async function loadChapters(type) {
  const subjectId = document.getElementById(`${type}-subject`).value;
  const userId = getUserId();

  const res = await api("getChapters", { subjectId, userId });

  const dropdown = document.getElementById(`${type}-chapter`);
  dropdown.innerHTML = "";

  res.chapters.forEach((ch) => {
    const opt = document.createElement("option");
    opt.value = ch.chapterId;

    opt.textContent = ch.isCompleted ? `✅ ${ch.chapterName}` : ch.chapterName;

    if (ch.isCompleted) {
      opt.style.backgroundColor = "#22c55e";
      opt.style.color = "white";
    }

    dropdown.appendChild(opt);
  });
}
async function loadSubjects() {
  const res = await api("getSubjects");

  const prelims = res.prelims;
  const mains = res.mains;

  fillDropdown("prelims-subject", prelims);
  fillDropdown("mains-subject", mains);
}

function fillDropdown(id, data) {
  const el = document.getElementById(id);
  el.innerHTML = "";

  data.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.subjectId;
    opt.textContent = item.subjectName;
    el.appendChild(opt);
  });
}

async function loadDashboardData() {
  const userId = getUserId();
  const res = await api("getProgress", { userId });

  renderCharts(res);
  renderStats(res);
}

// function renderStats(data) {
//   document.getElementById("completion").innerText = data.completion + "%";
//   document.getElementById("streak").innerText = data.streak + " Days";
// }
// function renderStats(data) {
//   document.getElementById("prelimsCompletion").innerText =
//     data.prelimsCompletion + "%";
//   document.getElementById("mainsCompletion").innerText =
//     data.mainsCompletion + "%";
// }
function renderStats(data) {
  document.getElementById("prelimsCompletion").innerText =
    (data.prelimsCompletion ?? 0) + "%";

  document.getElementById("mainsCompletion").innerText =
    (data.mainsCompletion ?? 0) + "%";
}

function renderCharts(data) {
  const ctx1 = document.getElementById("prelimsChart");
  const ctx2 = document.getElementById("mainsChart");
  const ctx3 = document.getElementById("consistencyChart");

  if (prelimsChart) prelimsChart.destroy();
  if (mainsChart) mainsChart.destroy();
  if (consistencyChart) consistencyChart.destroy();

  prelimsChart = new Chart(ctx1, {
    type: "line",
    data: data.prelimsChart,
  });

  mainsChart = new Chart(ctx2, {
    type: "line",
    data: data.mainsChart,
  });

  consistencyChart = new Chart(ctx3, {
    type: "line",
    data: data.consistencyChart,
  });
}

async function markComplete(type) {
  const userId = getUserId();

  const subjectId = document.getElementById(`${type}-subject`).value;
  const chapterId = document.getElementById(`${type}-chapter`).value;

  // await api("updateProgress", { userId, subjectId, chapterId });

  // loadDashboardData();
  const res = await api("updateProgress", { userId, subjectId, chapterId });

  await loadDashboardData();
  await loadChapters(type);
}
async function loadChapters(type) {
  const subjectId = document.getElementById(`${type}-subject`).value;
  const userId = getUserId();

  const res = await api("getChapters", { subjectId, userId });

  const dropdown = document.getElementById(`${type}-chapter`);
  dropdown.innerHTML = "";

  res.chapters.forEach((ch) => {
    const opt = document.createElement("option");
    opt.value = ch.chapterId;
    opt.textContent = ch.chapterName;

    if (ch.isCompleted) {
      opt.style.backgroundColor = "#22c55e";
      opt.style.color = "white";
    }

    dropdown.appendChild(opt);
  });
}
