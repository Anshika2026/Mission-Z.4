let missionChart;
let primaryTargetCount = 0;

document.addEventListener("DOMContentLoaded", initMission);

async function initMission() {
  const userId = getUserId();
  if (!userId) return logout();

  document.getElementById("closeAddMission").onclick = () => {
    document.getElementById("add-mission-overlay").classList.add("hidden");
  };

  addPrimaryTargetRow(); // start with one block in the modal

  await loadMissionChart();
  await loadMissionReports();
}

/* ============ MODAL: ADD MISSION ============ */

function openAddMissionModal() {
  document.getElementById("add-mission-overlay").classList.remove("hidden");
}

function addPrimaryTargetRow() {
  const container = document.getElementById("primaryTargetsContainer");
  const blockId = "primary-" + primaryTargetCount++;

  const block = document.createElement("div");
  block.className = "primary-target-block";
  block.id = blockId;

  block.innerHTML = `
    <div class="primary-target-header">
      <input type="text" placeholder="Primary Target (e.g. Economics)" class="primary-name-input" />
      <button class="remove-primary-btn" onclick="document.getElementById('${blockId}').remove()">✖</button>
    </div>
    <div class="subtargets-list"></div>
    <button class="add-sub-btn" onclick="addSubTargetRow('${blockId}')">+ Add Sub-target</button>
  `;

  container.appendChild(block);
  addSubTargetRow(blockId); // start with one sub-target input
}

function addSubTargetRow(blockId) {
  const block = document.getElementById(blockId);
  const list = block.querySelector(".subtargets-list");

  const row = document.createElement("div");
  row.className = "subtarget-row";
  row.innerHTML = `
    <input type="text" placeholder="Sub-target (e.g. Chapter 1)" class="sub-name-input" />
    <button class="remove-sub-btn" onclick="this.parentElement.remove()">✖</button>
  `;

  list.appendChild(row);
}

async function saveMission() {
  const btn = document.getElementById("saveMissionBtn");
  const text = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");

  const missionName = document.getElementById("missionNameInput").value.trim();
  const deadline = document.getElementById("missionDeadlineInput").value;

  if (!missionName || !deadline) {
    alert("Please enter mission name and deadline");
    return;
  }

  const blocks = document.querySelectorAll(".primary-target-block");
  let targets = [];

  blocks.forEach((block) => {
    const name = block.querySelector(".primary-name-input").value.trim();
    if (!name) return;

    const subInputs = block.querySelectorAll(".sub-name-input");
    const subtargets = Array.from(subInputs)
      .map((inp) => inp.value.trim())
      .filter((v) => v);

    targets.push({ name, subtargets });
  });

  if (targets.length === 0) {
    alert("Please add at least one primary target");
    return;
  }

  btn.disabled = true;
  text.innerText = "Creating...";
  loader.classList.remove("hidden");

  const userId = getUserId();

  await api("createMission", {
    userId,
    missionName,
    deadline,
    targets: JSON.stringify(targets),
  });

  btn.disabled = false;
  text.innerText = "Create Mission";
  loader.classList.add("hidden");

  document.getElementById("add-mission-overlay").classList.add("hidden");
  document.getElementById("missionNameInput").value = "";
  document.getElementById("missionDeadlineInput").value = "";
  document.getElementById("primaryTargetsContainer").innerHTML = "";
  primaryTargetCount = 0;
  addPrimaryTargetRow();

  await loadMissionChart();
  await loadMissionReports();
}

/* ============ CHART ============ */

async function loadMissionChart() {
  const userId = getUserId();
  const res = await api("getMissionChart", { userId });

  const canvas = document.getElementById("missionChart");
  const ctx = canvas.getContext("2d");

  if (missionChart) missionChart.destroy();

  missionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: res.labels || [],
      datasets: [
        {
          label: "Success %",
          data: res.data || [],
          backgroundColor: (res.data || []).map((v) =>
            v >= 70 ? "#22c55e" : v >= 40 ? "#fbbf24" : "#ef4444",
          ),
          borderRadius: 8,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#fff",
          bodyColor: "#e2e8f0",
          callbacks: {
            label: (item) => `${item.raw}% complete`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: "#94a3b8", callback: (v) => v + "%" },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        x: {
          ticks: { color: "#94a3b8" },
          grid: { display: false },
        },
      },
    },
  });
}

/* ============ REPORT CARDS ============ */

async function loadMissionReports() {
  const userId = getUserId();
  const res = await api("getMissions", { userId });

  renderMissionReports(res.missions || []);
}

function renderMissionReports(missions) {
  const section = document.getElementById("missionReportsSection");
  window.currentMissionsData = missions;
  if (missions.length === 0) {
    section.innerHTML = `<div class="mission-empty-state">No missions yet. Click "Add New Mission" to get started.</div>`;
    return;
  }

  section.innerHTML = "";

  missions.forEach((m) => {
    const today = new Date();
    const deadlineDate = new Date(m.deadline);
    const isOverdue = deadlineDate < today && m.percent < 100;

    const card = document.createElement("div");
    card.className = "mission-card";

    // card.innerHTML = `
    //   <div class="mission-card-top">
    //     <div class="mission-title-block">
    //       <h4>${m.missionName}</h4>
    //       <div class="mission-deadline ${isOverdue ? "overdue" : ""}">
    //         Deadline: ${m.deadline}${isOverdue ? " (Overdue)" : ""}
    //       </div>
    //     </div>
    //     <div class="mission-percent-ring">
    //       <div class="mp-num">${m.percent}%</div>
    //       <div class="mp-lbl">Complete</div>
    //     </div>
    //   </div>

    //   <div class="mission-progress-track">
    //     <div class="mission-progress-fill" style="width:${m.percent}%"></div>
    //   </div>

    //   ${m.primaryTargets
    //     .map(
    //       (p) => `
    //     <div class="primary-target-report">
    //       <div class="ptr-header">
    //         <span>${p.name}</span>
    //         ${p.subtargets.length > 0 ? `<span class="ptr-percent">${p.percent}%</span>` : ""}
    //       </div>
    //       ${
    //         p.subtargets.length > 0
    //           ? p.subtargets
    //               .map(
    //                 (s) => `
    //             <div class="subtarget-check-row ${s.isCompleted ? "done" : ""}">
    //               <input type="checkbox" ${s.isCompleted ? "checked" : ""}
    //                 onchange="handleTargetToggle('${s.targetId}', this.checked)" />
    //               <span>${s.name}</span>
    //             </div>
    //           `,
    //               )
    //               .join("")
    //           : `
    //             <div class="subtarget-check-row ${p.isCompleted ? "done" : ""}">
    //               <input type="checkbox" ${p.isCompleted ? "checked" : ""}
    //                 onchange="handleTargetToggle('${p.targetId}', this.checked)" />
    //               <span>Mark as complete</span>
    //             </div>
    //           `
    //       }
    //     </div>
    //   `,
    //     )
    //     .join("")}
    // `;
    card.innerHTML = `
  <div class="mission-card-top">
    <div class="mission-title-block">
      <h4>${m.missionName}</h4>
      <div class="mission-deadline ${isOverdue ? "overdue" : ""}">
        Deadline: ${m.deadline}${isOverdue ? " (Overdue)" : ""}
      </div>
    </div>
    <div class="mission-actions">
      <button class="mission-download-btn" title="Download Report" onclick="downloadMissionReport('${m.missionId}')">⬇</button>
      <div class="mission-percent-ring">
        <div class="mp-num">${m.percent}%</div>
        <div class="mp-lbl">Complete</div>
      </div>
    </div>
  </div>

  <div class="mission-progress-track">
    <div class="mission-progress-fill" style="width:${m.percent}%"></div>
  </div>

  ${m.primaryTargets
    .map(
      (p) => `
    <div class="primary-target-report">
      <div class="ptr-header">
        <span>${p.name}</span>
        ${p.subtargets.length > 0 ? `<span class="ptr-percent">${p.percent}%</span>` : ""}
      </div>
      ${
        p.subtargets.length > 0
          ? p.subtargets
              .map(
                (s) => `
            <div class="subtarget-check-row ${s.isCompleted ? "done" : ""}">
              <input type="checkbox" ${s.isCompleted ? "checked" : ""}
                onchange="handleTargetToggle('${s.targetId}', this.checked)" />
              <span>${s.name}</span>
            </div>
          `,
              )
              .join("")
          : `
            <div class="subtarget-check-row ${p.isCompleted ? "done" : ""}">
              <input type="checkbox" ${p.isCompleted ? "checked" : ""}
                onchange="handleTargetToggle('${p.targetId}', this.checked)" />
              <span>Mark as complete</span>
            </div>
          `
      }
    </div>
  `,
    )
    .join("")}
`;
    section.appendChild(card);
  });
}

async function handleTargetToggle(targetId, isChecked) {
  await api("toggleMissionTarget", { targetId, completed: isChecked });
  await loadMissionChart();
  await loadMissionReports();
}
function downloadMissionReport(missionId) {
  const missions = window.currentMissionsData || [];
  const m = missions.find((mm) => mm.missionId === missionId);

  if (!m) return alert("Mission data not found");

  const userName = localStorage.getItem("userName") || "User";
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const deadlineDate = new Date(m.deadline);
  const isOverdue = deadlineDate < today && m.percent < 100;

  const html = `
    <html>
    <head>
      <title>${m.missionName} - Mission Report</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #111; }
        h1 { margin-bottom: 4px; }
        .meta { color: #555; margin-bottom: 24px; font-size: 13px; }
        .overdue { color: #dc2626; font-weight: 600; }
        .summary { display:flex; gap:16px; margin-bottom: 28px; }
        .summary div { flex:1; border:1px solid #ddd; border-radius:8px; padding:14px; text-align:center; }
        .summary .num { font-size:20px; font-weight:700; display:block; }
        .summary .lbl { font-size:11px; color:#666; text-transform:uppercase; }
        .bar-track { background:#eee; border-radius:10px; height:10px; width:100%; overflow:hidden; margin-bottom:24px; }
        .bar-fill { background:#22c55e; height:100%; }
        .primary-block { margin-bottom: 20px; }
        .primary-title { font-size:15px; font-weight:700; margin-bottom:8px; display:flex; justify-content:space-between; }
        table { width:100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #eee; font-size:13px; }
        th { background:#f5f5f5; }
        .done { color: #16a34a; font-weight:600; }
        .pending { color: #dc2626; font-weight:600; }
      </style>
    </head>
    <body>
      <h1>${m.missionName} — Mission Report</h1>
      <div class="meta">
        Generated for ${userName} on ${generatedOn} ·
        Deadline: ${m.deadline} ${isOverdue ? '<span class="overdue">(Overdue)</span>' : ""}
      </div>

      <div class="summary">
        <div><span class="num">${m.percent}%</span><span class="lbl">Overall Complete</span></div>
        <div><span class="num">${m.doneLeaves}/${m.totalLeaves}</span><span class="lbl">Targets Done</span></div>
        <div><span class="num">${m.primaryTargets.length}</span><span class="lbl">Primary Targets</span></div>
      </div>

      <div class="bar-track"><div class="bar-fill" style="width:${m.percent}%"></div></div>

      ${m.primaryTargets
        .map(
          (p) => `
        <div class="primary-block">
          <div class="primary-title">
            <span>${p.name}</span>
            ${p.subtargets.length > 0 ? `<span>${p.percent}%</span>` : ""}
          </div>
          <table>
            <tr><th>Sub-target</th><th>Status</th></tr>
            ${
              p.subtargets.length > 0
                ? p.subtargets
                    .map(
                      (s) => `
                    <tr>
                      <td>${s.name}</td>
                      <td class="${s.isCompleted ? "done" : "pending"}">${s.isCompleted ? "Completed" : "Pending"}</td>
                    </tr>
                  `,
                    )
                    .join("")
                : `
                    <tr>
                      <td>—</td>
                      <td class="${p.isCompleted ? "done" : "pending"}">${p.isCompleted ? "Completed" : "Pending"}</td>
                    </tr>
                  `
            }
          </table>
        </div>
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
