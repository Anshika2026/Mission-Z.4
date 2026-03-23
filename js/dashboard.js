let prelimsChart, mainsChart, consistencyChart;

document.addEventListener("DOMContentLoaded", init);

function showWelcome() {
  const name = localStorage.getItem("userName");

  document.getElementById("welcomeUser").innerText =
    name && name !== "undefined" ? `Welcome ${name}` : "Welcome User";
}
async function init() {
  const userId = getUserId();
  if (!userId) return logout();
  showWelcome();
  await loadSubjects();
  await loadDashboardData();
  await loadStudyChart();
}
// async function loadChapters(type) {
//   const subjectId = document.getElementById(`${type}-subject`).value;
//   const userId = getUserId();

//   const res = await api("getChapters", { subjectId, userId });

//   const dropdown = document.getElementById(`${type}-chapter`);
//   dropdown.innerHTML = "";

//   res.chapters.forEach((ch) => {
//     const opt = document.createElement("option");
//     opt.value = ch.chapterId;

//     opt.textContent = ch.isCompleted ? `✅ ${ch.chapterName}` : ch.chapterName;

//     if (ch.isCompleted) {
//       opt.style.backgroundColor = "#22c55e";
//       opt.style.color = "white";
//     }

//     dropdown.appendChild(opt);
//   });
// }
async function loadSubjects() {
  const res = await api("getSubjects");

  const prelims = res.prelims;
  const mains = res.mains;

  // fillDropdown("prelims-subject", prelims);
  // fillDropdown("mains-subject", mains);
  fillDropdown("prelims-subject", prelims, window.completedChapters);
  fillDropdown("mains-subject", mains, window.completedChapters);
}

// function fillDropdown(id, data) {
//   const el = document.getElementById(id);
//   el.innerHTML = "";

//   data.forEach((item) => {
//     const opt = document.createElement("option");
//     opt.value = item.subjectId;
//     opt.textContent = item.subjectName;
//     el.appendChild(opt);
//   });
// }
function fillDropdown(id, data, completedSet = new Set()) {
  const el = document.getElementById(id);
  el.innerHTML = "";

  data.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.subjectId;

    const isDone = completedSet.has(item.subjectId);
    opt.textContent = isDone ? `✔ ${item.subjectName}` : item.subjectName;

    el.appendChild(opt);
  });
}

// async function loadDashboardData() {
//   const userId = getUserId();
//   const res = await api("getProgress", { userId });

//   renderCharts(res);
//   renderStats(res);
// }
async function loadDashboardData() {
  const userId = getUserId();
  const res = await api("getProgress", { userId });

  renderCharts(res);
  renderStats(res);

  window.completedChapters = new Set(res.completedChapters || []);
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

// async function markComplete(type) {
//   const userId = getUserId();

//   const subjectId = document.getElementById(`${type}-subject`).value;
//   const chapterId = document.getElementById(`${type}-chapter`).value;

//   // await api("updateProgress", { userId, subjectId, chapterId });

//   // loadDashboardData();
//   const res = await api("updateProgress", { userId, subjectId, chapterId });

//   await loadDashboardData();
//   await loadChapters(type);
// }
// async function markComplete(type) {
//   const btn = document.getElementById(`${type}Btn`);
//   const text = btn.querySelector(".btn-text");
//   const loader = btn.querySelector(".btn-loader");

//   text.classList.add("hidden");
//   loader.classList.remove("hidden");

//   const userId = getUserId();
//   const subjectId = document.getElementById(`${type}-subject`).value;
//   const chapterId = document.getElementById(`${type}-chapter`).value;

//   await api("updateProgress", { userId, subjectId, chapterId });

//   await loadDashboardData();

//   loader.classList.add("hidden");
//   text.classList.remove("hidden");
// }
async function markComplete(type) {
  const btn = event.target;

  const originalText = btn.innerText;
  btn.innerText = "Marking...";
  btn.disabled = true;

  const userId = getUserId();
  const subjectId = document.getElementById(`${type}-subject`).value;
  const chapterId = document.getElementById(`${type}-chapter`).value;

  await api("updateProgress", { userId, subjectId, chapterId });

  btn.innerText = originalText;
  btn.disabled = false;

  loadDashboardData();
}
// async function loadChapters(type) {
//   const subjectId = document.getElementById(`${type}-subject`).value;
//   const userId = getUserId();

//   const res = await api("getChapters", { subjectId, userId });

//   const dropdown = document.getElementById(`${type}-chapter`);
//   dropdown.innerHTML = "";

//   res.chapters.forEach((ch) => {
//     const opt = document.createElement("option");
//     opt.value = ch.chapterId;
//     opt.textContent = ch.chapterName;

//     if (ch.isCompleted) {
//       opt.style.backgroundColor = "#22c55e";
//       opt.style.color = "white";
//     }

//     dropdown.appendChild(opt);
//   });
// }

async function loadChapters(type) {
  const userId = getUserId();
  const subjectId = document.getElementById(`${type}-subject`).value;

  const res = await api("getChapters", { subjectId, userId });

  fillChapterDropdown(
    `${type}-chapter`,
    res.chapters,
    window.completedChapters || new Set()
  );
}

function fillChapterDropdown(id, chapters, completedSet) {
  const el = document.getElementById(id);
  el.innerHTML = "";

  chapters.forEach((ch) => {
    const opt = document.createElement("option");
    opt.value = ch.chapterId;

    const isDone = completedSet.has(ch.chapterId);

    opt.textContent = isDone ? `✔ ${ch.chapterName}` : ch.chapterName;

    el.appendChild(opt);
  });
}
async function saveHours() {
  const hours = document.getElementById("hoursInput").value;
  const userId = getUserId();
  const btn = document.getElementById("saveBtn");

  if (!hours) return alert("Enter hours");
  const originalText = btn.innerText;

  btn.innerText = "Saving...";
  btn.disabled = true;
  await api("saveStudyHours", { userId, hours });
  btn.innerText = originalText;
  btn.disabled = false;
  document.getElementById("hoursInput").value = "";

  loadStudyChart();
}
async function loadStudyChart() {
  const userId = getUserId();

  const res = await api("getStudyHours", { userId });

  const ctx = document.getElementById("consistencyChart");

  if (consistencyChart) consistencyChart.destroy();

  consistencyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: res.labels,
      datasets: [
        {
          label: "Study Hours",
          data: res.data,
        },
      ],
    },
  });
}
