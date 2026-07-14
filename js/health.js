let discomfortChart;

document.addEventListener("DOMContentLoaded", initHealth);

async function initHealth() {
  const userId = getUserId();
  if (!userId) return logout();
  document.getElementById("downloadHealthReportBtn").onclick =
    downloadHealthReport;
  document.getElementById("discomfortType").addEventListener("change", (e) => {
    document
      .getElementById("otherDiscomfortInput")
      .classList.toggle("hidden", e.target.value !== "Other");
  });

  document.getElementById("closeHealthReport").onclick = () => {
    document.getElementById("health-report-overlay").classList.add("hidden");
  };

  await loadHealthChart();
}

async function saveDiscomfort() {
  const btn = document.getElementById("saveDiscomfortBtn");
  const text = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");

  const typeSelect = document.getElementById("discomfortType").value;
  const otherVal = document.getElementById("otherDiscomfortInput").value.trim();
  const discomfortType =
    typeSelect === "Other" && otherVal ? otherVal : typeSelect;

  const hours = document.getElementById("discomfortHours").value;
  const time = document.getElementById("discomfortTime").value;

  if (!hours || !time) {
    alert("Please enter both hours and time");
    return;
  }

  btn.disabled = true;
  text.innerText = "Saving...";
  loader.classList.remove("hidden");

  const userId = getUserId();
  await api("saveDiscomfort", { userId, discomfortType, hours, time });

  btn.disabled = false;
  text.innerText = "Save Entry";
  loader.classList.add("hidden");

  document.getElementById("discomfortHours").value = "";
  document.getElementById("discomfortTime").value = "";
  document.getElementById("otherDiscomfortInput").value = "";

  loadHealthChart();
}

// async function loadHealthChart() {
//   const userId = getUserId();
//   const res = await api("getHealthChart", { userId });

//   const canvas = document.getElementById("discomfortChart");
//   const ctx = canvas.getContext("2d");

//   if (discomfortChart) discomfortChart.destroy();

//   const gradient = ctx.createLinearGradient(0, 0, 0, 320);
//   gradient.addColorStop(0, "rgba(239,68,68,0.45)");
//   gradient.addColorStop(0.5, "rgba(239,68,68,0.15)");
//   gradient.addColorStop(1, "rgba(239,68,68,0)");

//   const labels = (res.labels || []).map((d) =>
//     new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
//   );

//   discomfortChart = new Chart(ctx, {
//     type: "line",
//     data: {
//       labels,
//       datasets: [
//         {
//           label: "Discomfort Hours",
//           data: res.data || [],
//           borderColor: "#ef4444",
//           backgroundColor: gradient,
//           fill: true,
//           borderWidth: 2,
//           tension: 0.3,
//           pointRadius: 0,
//           pointHoverRadius: 6,
//           pointHoverBackgroundColor: "#ffffff",
//           pointHoverBorderColor: "#ef4444",
//           pointHoverBorderWidth: 3,
//         },
//       ],
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: { legend: { display: false } },
//       scales: {
//         x: {
//           grid: { display: false },
//           ticks: { color: "#94a3b8", maxTicksLimit: 10 },
//         },
//         y: {
//           beginAtZero: true,
//           grid: { color: "rgba(255,255,255,0.05)" },
//           ticks: { color: "#94a3b8" },
//         },
//       },
//     },
//   });
// }

async function loadHealthChart() {
  const userId = getUserId();
  const res = await api("getHealthChart", { userId });

  const canvas = document.getElementById("discomfortChart");
  const ctx = canvas.getContext("2d");

  if (discomfortChart) discomfortChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(239,68,68,0.45)");
  gradient.addColorStop(0.5, "rgba(239,68,68,0.15)");
  gradient.addColorStop(1, "rgba(239,68,68,0)");

  const rawLabels = res.labels || [];
  const entriesPerDay = res.entries || [];

  const labels = rawLabels.map((d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  );

  discomfortChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Discomfort Hours",
          data: res.data || [],
          borderColor: "#ef4444",
          backgroundColor: gradient,
          fill: true,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#ef4444",
          pointHoverRadius: 7,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#ef4444",
          pointHoverBorderWidth: 3,
        },
      ],
    },
    // options: {
    //   responsive: true,
    //   maintainAspectRatio: false,
    //   interaction: { mode: "index", intersect: false },
    //   plugins: {
    //     legend: { display: false },
    //     tooltip: {
    //       backgroundColor: "#111827",
    //       titleColor: "#ffffff",
    //       bodyColor: "#e2e8f0",
    //       displayColors: false,
    //       cornerRadius: 10,
    //       padding: 12,
    //       callbacks: {
    //         title: (items) => {
    //           const idx = items[0].dataIndex;
    //           return `Total: ${res.data[idx]}h`;
    //         },
    //         label: (item) => {
    //           const idx = item.dataIndex;
    //           const dayEntries = entriesPerDay[idx] || [];

    //           if (dayEntries.length === 0) return "No entries";

    //           return dayEntries.map(
    //             (en) => `${en.type} — ${en.hours}h @ ${en.time || "-"}`,
    //           );
    //         },
    //       },
    //     },
    //   },
    //   scales: {
    //     x: {
    //       grid: { display: false },
    //       ticks: { color: "#94a3b8", maxTicksLimit: 15 },
    //     },
    //     y: {
    //       beginAtZero: true,
    //       grid: { color: "rgba(255,255,255,0.05)" },
    //       ticks: { color: "#94a3b8" },
    //     },
    //   },
    // },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 40 }, // ← reserves room so tooltip isn't clipped
      },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#ffffff",
          bodyColor: "#e2e8f0",
          displayColors: false,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return `Total: ${res.data[idx]}h`;
            },
            label: (item) => {
              const idx = item.dataIndex;
              const dayEntries = entriesPerDay[idx] || [];

              if (dayEntries.length === 0) return "No entries";

              return dayEntries.map(
                (en) => `${en.type} — ${en.hours}h @ ${en.time || "-"}`,
              );
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", maxTicksLimit: 15 },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#94a3b8" },
        },
      },
    },
  });
}

async function viewHealthReport() {
  const overlay = document.getElementById("health-report-overlay");
  overlay.classList.remove("hidden");

  document.getElementById("healthBreakdownList").innerHTML =
    `<p style="color:#94a3b8; text-align:center; padding:10px 0;">Loading report...</p>`;
  document.getElementById("healthSummaryRow").innerHTML = "";
  document.getElementById("healthEntriesList").innerHTML = "";

  const userId = getUserId();
  const res = await api("getHealthReport", { userId });
  renderHealthReport(res);
}

function renderHealthReport(data) {
  document.getElementById("healthSummaryRow").innerHTML = `
    <div class="summary-tile">
      <span class="num" style="color:#ef4444">${data.totalHours || 0}h</span>
      <span class="lbl">Total Discomfort</span>
    </div>
    <div class="summary-tile">
      <span class="num">${data.majorDiscomfort || "-"}</span>
      <span class="lbl">Major Discomfort</span>
    </div>
    <div class="summary-tile">
      <span class="num">${data.avgTime || "-"}</span>
      <span class="lbl">Avg Time</span>
    </div>
  `;

  const breakdown = data.breakdown || [];
  const maxHours = breakdown.length ? breakdown[0].hours : 1;

  document.getElementById("healthBreakdownList").innerHTML =
    breakdown
      .map(
        (b) => `
    <div class="health-breakdown-row">
      <div>${b.type}</div>
      <div class="hb-bar-track">
        <div class="hb-bar-fill" style="width:${Math.round((b.hours / maxHours) * 100)}%"></div>
      </div>
      <div class="hb-hours">${b.hours}h</div>
    </div>
  `,
      )
      .join("") ||
    `<p style="color:#94a3b8; text-align:center;">No entries in the last ${data.days || 15} days</p>`;

  const entries = data.entries || [];
  document.getElementById("healthEntriesList").innerHTML = entries
    .map(
      (en) => `
    <div class="chapter-row-report">
      <div class="chapter-name-cell">${en.type}</div>
      <div class="attempts-cell">${en.date} · ${en.time || "-"}</div>
      <div><span class="status-badge weak">${en.hours}h</span></div>
    </div>
  `,
    )
    .join("");
  window.currentHealthReportData = data;
}

function downloadHealthReport() {
  const data = window.currentHealthReportData;
  if (!data) return alert("Report not loaded yet");

  const userName = localStorage.getItem("userName") || "User";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const breakdown = data.breakdown || [];
  const entries = data.entries || [];

  const html = `
    <html>
    <head>
      <title>Health Report</title>
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
        .section-title { font-size:15px; font-weight:700; margin-top:22px; margin-bottom:10px; }
        .bar-track { background:#eee; border-radius:10px; height:8px; width:100%; overflow:hidden; }
        .bar-fill { background:#ef4444; height:100%; }
        .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; }
        .bar-row .type { width:140px; }
        .bar-row .hrs { width:50px; text-align:right; font-weight:600; color:#ef4444; }
      </style>
    </head>
    <body>
      <h1>Health Report</h1>
      <div class="meta">Generated for ${userName} on ${dateStr} · Last ${data.days || 15} days</div>

      <div class="summary">
        <div><span class="num">${data.totalHours || 0}h</span><span class="lbl">Total Discomfort</span></div>
        <div><span class="num">${data.majorDiscomfort || "-"}</span><span class="lbl">Major Discomfort</span></div>
        <div><span class="num">${data.avgTime || "-"}</span><span class="lbl">Avg Time</span></div>
      </div>

      <div class="section-title">Discomfort Breakdown</div>
      ${
        breakdown.length
          ? breakdown
              .map((b) => {
                const maxHours = breakdown[0].hours || 1;
                const pct = Math.round((b.hours / maxHours) * 100);
                return `
                <div class="bar-row">
                  <div class="type">${b.type}</div>
                  <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                  <div class="hrs">${b.hours}h</div>
                </div>
              `;
              })
              .join("")
          : `<p>No entries in the last ${data.days || 15} days</p>`
      }

      <div class="section-title">Entry Log</div>
      <table>
        <tr><th>Date</th><th>Discomfort</th><th>Hours</th><th>Time</th></tr>
        ${entries
          .map(
            (en) => `
          <tr>
            <td>${en.date}</td>
            <td>${en.type}</td>
            <td>${en.hours}h</td>
            <td>${en.time || "-"}</td>
          </tr>
        `,
          )
          .join("")}
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}
