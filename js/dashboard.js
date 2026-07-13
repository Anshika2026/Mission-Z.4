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
async function loadSubjects() {
  const res = await api("getSubjects");

  const prelims = res.prelims;
  const mains = res.mains;

  // fillDropdown("prelims-subject", prelims);
  // fillDropdown("mains-subject", mains);
  fillDropdown("prelims-subject", prelims, window.completedChapters);
  fillDropdown("mains-subject", mains, window.completedChapters);
}
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

async function loadDashboardData() {
  const userId = getUserId();

  const res = await api("getProgress", { userId });

  console.log("Full Response:", res);
  console.log("Prelims:", res.prelimsChart);
  console.log("Mains:", res.mainsChart);

  renderCharts(res);
  renderStats(res);

  window.completedChapters = new Set(res.completedChapters || []);
}

function renderStats(data) {
  document.getElementById("prelimsCompletion").innerText =
    (data.prelimsCompletion ?? 0) + "%";

  document.getElementById("mainsCompletion").innerText =
    (data.mainsCompletion ?? 0) + "%";
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");

  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function createStudyChart(canvas, chartData, color) {
  const ctx = canvas.getContext("2d");

  const rgb = hexToRgb(color);

  const gradient = ctx.createLinearGradient(0, 0, 0, 350);

  gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.45)`);
  gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`);
  gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);

  const labels = chartData.labels.map((d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
  );

  return new Chart(ctx, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          data: chartData.datasets[0].data,

          borderColor: color,

          backgroundColor: gradient,

          fill: true,

          borderWidth: 2,

          tension: 0.3,

          pointRadius: 0,

          pointHoverRadius: 6,

          pointHoverBackgroundColor: "#ffffff",

          pointHoverBorderColor: color,

          pointHoverBorderWidth: 3,
        },
      ],
    },

    plugins: [
      {
        id: "glow",

        beforeDatasetsDraw(chart) {
          const { ctx } = chart;

          ctx.save();

          ctx.shadowColor = color;

          ctx.shadowBlur = 15;

          ctx.shadowOffsetX = 0;

          ctx.shadowOffsetY = 0;
        },

        afterDatasetsDraw(chart) {
          chart.ctx.restore();
        },
      },
    ],

    options: {
      responsive: true,

      maintainAspectRatio: false,

      interaction: {
        mode: "index",

        intersect: false,
      },

      animation: {
        duration: 1400,

        easing: "easeOutQuart",
      },

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          backgroundColor: "#111827",

          titleColor: "#ffffff",

          bodyColor: "#ffffff",

          displayColors: false,

          cornerRadius: 10,

          padding: 12,
        },
      },

      scales: {
        x: {
          grid: {
            display: false,
          },

          ticks: {
            color: "#94a3b8",

            maxRotation: 0,

            autoSkip: true,

            maxTicksLimit: 10,
          },

          border: {
            display: false,
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "rgba(255,255,255,0.05)",
          },

          ticks: {
            color: "#94a3b8",
          },

          border: {
            display: false,
          },
        },
      },
    },
  });
}

function renderCharts(data) {
  const canvas1 = document.getElementById("prelimsChart");
  const canvas2 = document.getElementById("mainsChart");
  const canvas3 = document.getElementById("consistencyChart");
  if (prelimsChart) prelimsChart.destroy();
  if (mainsChart) mainsChart.destroy();
  if (consistencyChart) consistencyChart.destroy();

  prelimsChart = createStudyChart(canvas1, data.prelimsChart, "#4ea5ff");

  mainsChart = createStudyChart(canvas2, data.mainsChart, "#4ade80");

  consistencyChart = createStudyChart(
    canvas3,
    data.consistencyChart,
    "#fb923c",
  );
}

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

async function loadChapters(type) {
  const userId = getUserId();
  const subjectId = document.getElementById(`${type}-subject`).value;

  const res = await api("getChapters", { subjectId, userId });

  fillChapterDropdown(
    `${type}-chapter`,
    res.chapters,
    window.completedChapters || new Set(),
  );
}

// function fillChapterDropdown(id, chapters, completedSet) {
//   const el = document.getElementById(id);
//   el.innerHTML = "";

//   chapters.forEach((ch) => {
//     const opt = document.createElement("option");
//     opt.value = ch.chapterId;

//     const isDone = completedSet.has(ch.chapterId);

//     opt.textContent = isDone ? `✔ ${ch.chapterName}` : ch.chapterName;

//     el.appendChild(opt);
//   });
// }

function fillChapterDropdown(id, chapters, completedSet) {
  const el = document.getElementById(id);
  el.innerHTML = "";

  const MAX_LENGTH = 70;

  chapters.forEach((ch) => {
    const opt = document.createElement("option");

    opt.value = ch.chapterId;

    const isDone = completedSet.has(ch.chapterId);

    let chapterName = ch.chapterName.trim();

    if (chapterName.length > MAX_LENGTH) {
      chapterName = chapterName.substring(0, MAX_LENGTH) + "...";
    }

    opt.textContent = isDone ? `✔ ${chapterName}` : chapterName;

    opt.title = ch.chapterName;

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

  const canvas = document.getElementById("consistencyChart");

  if (consistencyChart) consistencyChart.destroy();

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 350);

  gradient.addColorStop(0, "rgba(194, 32, 32, 0.45)");
  gradient.addColorStop(0.5, "rgba(246, 59, 59, 0.15)");
  gradient.addColorStop(1, "rgba(59,130,246,0)");

  const labels = res.labels.map((date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
  );

  consistencyChart = new Chart(ctx, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Study Hours",

          data: res.data,

          borderColor: "#fa1d1d",

          backgroundColor: gradient,

          fill: true,

          borderWidth: 2,

          tension: 0.3,

          pointRadius: 0,

          pointHoverRadius: 7,

          pointHoverBackgroundColor: "#ffffff",

          pointHoverBorderColor: "#3b82f6",

          pointHoverBorderWidth: 3,
        },
      ],
    },

    plugins: [
      {
        id: "glow",

        beforeDatasetsDraw(chart) {
          const { ctx } = chart;

          ctx.save();

          ctx.shadowColor = "#3b82f6";

          ctx.shadowBlur = 15;

          ctx.shadowOffsetX = 0;

          ctx.shadowOffsetY = 0;
        },

        afterDatasetsDraw(chart) {
          chart.ctx.restore();
        },
      },
    ],

    options: {
      responsive: true,

      maintainAspectRatio: false,

      interaction: {
        mode: "index",

        intersect: false,
      },

      animation: {
        duration: 1500,

        easing: "easeOutQuart",
      },

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          backgroundColor: "#111827",

          titleColor: "#ffffff",

          bodyColor: "#ffffff",

          displayColors: false,

          cornerRadius: 10,

          padding: 12,
        },
      },

      scales: {
        x: {
          grid: {
            display: false,
          },

          ticks: {
            color: "#94a3b8",

            maxRotation: 0,

            minRotation: 0,

            autoSkip: true,

            maxTicksLimit: 10,
          },

          border: {
            display: false,
          },
        },

        y: {
          beginAtZero: true,

          grid: {
            color: "rgba(255,255,255,0.05)",
          },

          ticks: {
            color: "#94a3b8",
          },

          border: {
            display: false,
          },
        },
      },
    },
  });
}

async function viewProgress(type) {
  const userId = getUserId();
  const overlay = document.getElementById("progress-report-overlay");

  document.getElementById("progressReportTitle").innerText =
    type === "prelims" ? "Prelims Progress Report" : "Mains Progress Report";

  overlay.classList.remove("hidden");
  document.getElementById("progressSubjectList").innerHTML =
    `<p style="color:#94a3b8; text-align:center; padding:20px;">Loading report...</p>`;
  document.getElementById("progressSummaryRow").innerHTML = "";

  const res = await api("getProgressReport", { userId, type });
  console.log("PROGRESS REPORT RESPONSE:", res);
  renderProgressReport(type, res);
}

function renderProgressReport(type, data) {
  const subjects = data.subjects || [];

  let totalChapters = 0,
    completedChapters = 0,
    totalAttempts = 0;

  subjects.forEach((s) => {
    totalChapters += s.totalChapters;
    completedChapters += s.completedChapters;
    s.chapters.forEach((c) => (totalAttempts += c.attempts));
  });

  const overallPercent = totalChapters
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  document.getElementById("progressSummaryRow").innerHTML = `
    <div class="summary-tile">
      <span class="num">${overallPercent}%</span>
      <span class="lbl">Overall</span>
    </div>
    <div class="summary-tile">
      <span class="num">${completedChapters}/${totalChapters}</span>
      <span class="lbl">Chapters Done</span>
    </div>
    <div class="summary-tile">
      <span class="num">${totalAttempts}</span>
      <span class="lbl">Tests Attempted</span>
    </div>
  `;

  const listEl = document.getElementById("progressSubjectList");
  listEl.innerHTML = "";

  if (subjects.length === 0) {
    listEl.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">No data available</p>`;
    window.currentReportData = null;
    return;
  }

  subjects.forEach((s, idx) => {
    const percent = s.totalChapters
      ? Math.round((s.completedChapters / s.totalChapters) * 100)
      : 0;

    const badgeClass =
      percent === 100 ? "complete" : percent === 0 ? "none" : "partial";

    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <div class="subject-card-header">
        <div class="subject-name-row">
          <div class="subject-name">${s.subjectName}
            <span style="font-weight:400; color:#94a3b8; font-size:12px;"> · ${s.completedChapters}/${s.totalChapters} chapters</span>
          </div>
          <div class="subject-progress-bar-track">
            <div class="subject-progress-bar-fill" style="width:${percent}%"></div>
          </div>
        </div>
        <span class="subject-percent-badge ${badgeClass}">${percent}%</span>
        <span class="chevron">▼</span>
      </div>
      <div class="chapter-table">
        ${s.chapters
          .map(
            (c) => `
          <div class="chapter-row-report">
            <div class="chapter-name-cell">${c.chapterName}</div>
            <div class="attempts-cell">${c.attempts} attempt${c.attempts === 1 ? "" : "s"}${c.accuracy !== null ? ` · ${c.accuracy}% acc.` : ""}</div>
            <div><span class="status-badge ${c.isCompleted ? "done" : "pending"}">${c.isCompleted ? "Completed" : "Pending"}</span></div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    card.querySelector(".subject-card-header").onclick = () => {
      card.classList.toggle("open");
    };

    listEl.appendChild(card);
  });

  window.currentReportData = {
    type,
    subjects,
    overallPercent,
    completedChapters,
    totalChapters,
    totalAttempts,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("closeProgressReport").onclick = () => {
    document.getElementById("progress-report-overlay").classList.add("hidden");
  };
  document.getElementById("downloadReportBtn").onclick = downloadProgressReport;
});

function downloadProgressReport() {
  const data = window.currentReportData;
  if (!data) return alert("Report not loaded yet");

  const userName = localStorage.getItem("userName") || "User";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const html = `
    <html>
    <head>
      <title>${data.type === "prelims" ? "Prelims" : "Mains"} Progress Report</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #111; }
        h1 { margin-bottom: 4px; }
        .meta { color: #555; margin-bottom: 24px; font-size: 13px; }
        .summary { display:flex; gap:16px; margin-bottom: 28px; }
        .summary div { flex:1; border:1px solid #ddd; border-radius:8px; padding:14px; text-align:center; }
        .summary .num { font-size:20px; font-weight:700; display:block; }
        .summary .lbl { font-size:11px; color:#666; text-transform:uppercase; }
        table { width:100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #eee; font-size:13px; }
        th { background:#f5f5f5; }
        .subject-title { font-size:15px; font-weight:700; margin-top:22px; margin-bottom:6px; }
        .done { color: #16a34a; font-weight:600; }
        .pending { color: #dc2626; font-weight:600; }
      </style>
    </head>
    <body>
      <h1>${data.type === "prelims" ? "Prelims" : "Mains"} Progress Report</h1>
      <div class="meta">Generated for ${userName} on ${dateStr}</div>

      <div class="summary">
        <div><span class="num">${data.overallPercent}%</span><span class="lbl">Overall Completion</span></div>
        <div><span class="num">${data.completedChapters}/${data.totalChapters}</span><span class="lbl">Chapters Done</span></div>
        <div><span class="num">${data.totalAttempts}</span><span class="lbl">Tests Attempted</span></div>
      </div>

      ${data.subjects
        .map(
          (s) => `
        <div class="subject-title">${s.subjectName} — ${s.completedChapters}/${s.totalChapters} chapters (${
          s.totalChapters
            ? Math.round((s.completedChapters / s.totalChapters) * 100)
            : 0
        }%)</div>
        <table>
          <tr><th>Chapter</th><th>Status</th><th>Attempts</th><th>Accuracy</th></tr>
          ${s.chapters
            .map(
              (c) => `
            <tr>
              <td>${c.chapterName}</td>
              <td class="${c.isCompleted ? "done" : "pending"}">${c.isCompleted ? "Completed" : "Pending"}</td>
              <td>${c.attempts}</td>
              <td>${c.accuracy !== null ? c.accuracy + "%" : "-"}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
      `,
        )
        .join("")}
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

async function viewWeakness() {
  const userId = getUserId();
  const overlay = document.getElementById("weakness-overlay");

  overlay.classList.remove("hidden");
  document.getElementById("weaknessSubjectList").innerHTML =
    `<p style="color:#94a3b8; text-align:center; padding:20px;">Analyzing performance...</p>`;
  document.getElementById("weaknessSummaryRow").innerHTML = "";
  document.getElementById("topWeakSection").innerHTML = "";

  const res = await api("getWeaknessReport", { userId });
  renderWeaknessReport(res);
}

function renderWeaknessReport(data) {
  const subjects = data.subjects || [];

  document.getElementById("weaknessSummaryRow").innerHTML = `
    <div class="summary-tile">
      <span class="num" style="color:#ef4444">${data.weakCount || 0}</span>
      <span class="lbl">Weak Chapters</span>
    </div>
    <div class="summary-tile">
      <span class="num">${data.avgAccuracyOverall || 0}%</span>
      <span class="lbl">Avg Accuracy</span>
    </div>
    <div class="summary-tile">
      <span class="num">${data.avgTimePerQOverall || 0}s</span>
      <span class="lbl">Avg Time / Ques</span>
    </div>
  `;

  const topWeakEl = document.getElementById("topWeakSection");

  if (data.topWeak && data.topWeak.length > 0) {
    topWeakEl.innerHTML = `
      <div class="top-weak-list">
        <h4>Top Areas Needing Work</h4>
        ${data.topWeak
          .map(
            (c) => `
          <div class="top-weak-item">
            <div>
              <div class="twi-name">${c.chapterName}</div>
              <div class="twi-sub">${c.subjectName}</div>
            </div>
            <div class="twi-stats">
              ${c.accuracy}% acc · ${c.timePerQ}s/ques
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } else {
    topWeakEl.innerHTML = `<p style="color:#22c55e; text-align:center; padding:10px 0;">No major weak areas detected 🎉</p>`;
  }

  const listEl = document.getElementById("weaknessSubjectList");
  listEl.innerHTML = "";

  if (subjects.length === 0) {
    listEl.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">No attempts recorded yet</p>`;
    return;
  }

  subjects.forEach((sub) => {
    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <div class="subject-card-header">
        <div class="subject-name-row">
          <div class="subject-name">${sub.subjectName}
            <span style="font-weight:400; color:#94a3b8; font-size:12px;"> · ${sub.chapters.length} chapter${sub.chapters.length === 1 ? "" : "s"} attempted</span>
          </div>
        </div>
        <span class="chevron">▼</span>
      </div>
      <div class="chapter-table">
        ${sub.chapters
          .map(
            (c) => `
          <div class="chapter-row-report">
            <div class="chapter-name-cell">${c.chapterName}</div>
            <div class="attempts-cell">${c.accuracy}% acc · ${c.timePerQ}s/ques · ${c.attempts} attempt${c.attempts === 1 ? "" : "s"}</div>
            <div><span class="status-badge ${c.status}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span></div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    card.querySelector(".subject-card-header").onclick = () => {
      card.classList.toggle("open");
    };

    listEl.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("closeWeaknessReport").onclick = () => {
    document.getElementById("weakness-overlay").classList.add("hidden");
  };
});
