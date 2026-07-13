let questions = [];
let current = 0;
let answers = [];
let startTime;
let visited = [];
let targetSeconds = 0;
let remainingSeconds = 0;
let timerInterval = null;
document.addEventListener("DOMContentLoaded", initQuiz);
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("chat-input");

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChat();
  });
});
async function initQuiz() {
  const chapterId = localStorage.getItem("chapterId");
  const userId = getUserId();
  const noteRes = await api("getNotes", { userId, chapterId });
  notes = noteRes.notes || {};
  const res = await api("getQuestions", { chapterId });

  questions = res.questions;
  answers = new Array(questions.length).fill(null);
  visited = new Array(questions.length).fill(false);
  startTime = Date.now();

  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];
  visited[current] = true;
  document.getElementById("question-number").innerText = `Question ${
    current + 1
  }/${questions.length}`;

  document.getElementById("question-text").innerText = q.question;

  const container = document.getElementById("options-container");
  container.innerHTML = "";

  // q.options.forEach((opt, i) => {
  //   const div = document.createElement("div");
  //   div.className = "option";
  //   div.innerText = opt;

  //   if (answers[current] === i) {
  //     if (i === q.answer) {
  //       div.classList.add("correct");
  //     } else {
  //       div.classList.add("wrong");
  //     }
  //   }

  //   div.onclick = () => {
  //     answers[current] = i;
  //     renderQuestion();
  //   };

  //   container.appendChild(div);
  // });

  const isLocked = answers[current] !== null;

  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerText = opt;

    if (isLocked) {
      // Selected option: green if correct, red if wrong
      if (answers[current] === i) {
        div.classList.add(i === q.answer ? "correct" : "wrong");
      }
      // Always reveal the actual correct answer once locked
      if (i === q.answer) {
        div.classList.add("correct");
      }
      div.classList.add("locked");
    } else {
      div.onclick = () => {
        answers[current] = i;
        renderQuestion();
      };
    }

    container.appendChild(div);
  });

  renderPalette();
}

function nextQuestion() {
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (current > 0) {
    current--;
    renderQuestion();
  }
}

function skipQuestion() {
  nextQuestion();
}

// async function submitQuiz() {
//   const btn = document.getElementById("submitBtn");
//   const text = document.getElementById("submitText");
//   const loader = document.getElementById("submitLoader");

//   btn.disabled = true;
//   text.innerText = "Submitting...";
//   loader.classList.remove("hidden");

//   const userId = getUserId();
//   const chapterId = localStorage.getItem("chapterId");

//   let correct = 0;

//   questions.forEach((q, i) => {
//     if (answers[i] === q.answer) correct++;
//   });

//   const total = questions.length;
//   const score = correct;
//   const timeTaken = Math.floor((Date.now() - startTime) / 1000);

//   await api("submitTest", {
//     userId,
//     chapterId,
//     score,
//     total,
//     timeTaken,
//   });

//   alert(`Score: ${score}/${total}`);
//   window.location.href = "practice.html";
// }

async function submitQuiz() {
  if (timerInterval) clearInterval(timerInterval);

  const btn = document.getElementById("submitBtn");
  const text = document.getElementById("submitText");
  const loader = document.getElementById("submitLoader");

  btn.disabled = true;
  text.innerText = "Submitting...";
  loader.classList.remove("hidden");

  const userId = getUserId();
  const chapterId = localStorage.getItem("chapterId");

  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questions.forEach((q, i) => {
    if (answers[i] === null) {
      skipped++;
    } else if (answers[i] === q.answer) {
      correct++;
    } else {
      wrong++;
    }
  });

  const total = questions.length;
  const score = correct;
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);

  await api("submitTest", {
    userId,
    chapterId,
    score,
    total,
    timeTaken,
  });

  showReport({ correct, wrong, skipped, total, timeTaken });
}

function showReport({ correct, wrong, skipped, total, timeTaken }) {
  const percent = total ? Math.round((correct / total) * 100) : 0;

  document.getElementById("statCorrect").innerText = correct;
  document.getElementById("statWrong").innerText = wrong;
  document.getElementById("statSkipped").innerText = skipped;
  document.getElementById("statTime").innerText = formatTime(timeTaken);
  document.getElementById("reportPercent").innerText = `${percent}%`;
  document.getElementById("reportScoreLine").innerText =
    `You scored ${correct} / ${total}`;

  const ring = document.getElementById("ringFill");
  const circumference = 327;
  const offset = circumference - (percent / 100) * circumference;

  ring.style.stroke =
    percent >= 70 ? "#22c55e" : percent >= 40 ? "#fbbf24" : "#ef4444";

  // reset then animate
  ring.style.transition = "none";
  ring.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => {
    ring.style.transition =
      "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.3s";
    ring.style.strokeDashoffset = offset;
  });

  document.getElementById("report-overlay").classList.remove("hidden");

  document.getElementById("reportContinueBtn").onclick = () => {
    window.location.href = "practice.html";
  };
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// function exitQuiz() {
//   window.location.href = "practice.html";
// }

function exitQuiz() {
  if (timerInterval) clearInterval(timerInterval);
  window.location.href = "practice.html";
}
let notes = {};

function toggleNote() {
  const box = document.getElementById("note-box");
  box.classList.toggle("hidden");

  document.getElementById("note-input").value = notes[current] || "";
}

async function saveNote() {
  const text = document.getElementById("note-input").value;

  const userId = getUserId();
  const chapterId = localStorage.getItem("chapterId");

  notes[current] = text;

  await api("saveNote", {
    userId,
    chapterId,
    questionIndex: current,
    note: text,
  });

  document.getElementById("note-box").classList.add("hidden");
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  const currentQ = questions[current].question;

  const res = await api("chat", {
    query: text,
    question: currentQ,
  });

  addMessage(res.reply, "bot");
}

function addMessage(text, type) {
  const chatBody = document.getElementById("chat-body");

  const div = document.createElement("div");
  div.className = "chat-msg " + type;
  div.innerText = text;

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function toggleChat() {
  const chat = document.getElementById("chatbot");

  if (chat.classList.contains("chat-hidden")) {
    chat.classList.remove("chat-hidden");
  } else {
    chat.classList.add("chat-hidden");
  }
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  const typingId = addTyping();

  try {
    const res = await api("chat", { query: text });

    removeTyping(typingId);
    addMessage(res.reply || "No response", "bot");
  } catch (err) {
    removeTyping(typingId);
    addMessage("Something went wrong", "bot");
  }
}

function addTyping() {
  const chatBody = document.getElementById("chat-body");

  const div = document.createElement("div");
  div.className = "chat-msg bot typing";
  div.id = "typing-" + Date.now();

  div.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;

  return div.id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
function renderPalette() {
  const container = document.getElementById("question-palette");
  container.innerHTML = `<div class="palette-title">Questions</div>`;

  questions.forEach((q, i) => {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.innerText = i + 1;

    if (answers[i] !== null) {
      btn.classList.add(answers[i] === q.answer ? "correct" : "wrong");
    } else if (visited[i]) {
      btn.classList.add("skipped");
    } else {
      btn.classList.add("unattempted");
    }

    if (i === current) btn.classList.add("active");

    btn.onclick = () => goToQuestion(i);

    container.appendChild(btn);
  });
}
function goToQuestion(index) {
  current = index;
  renderQuestion();
}

document.addEventListener("DOMContentLoaded", setupTimeTarget);

function setupTimeTarget() {
  const overlay = document.getElementById("time-setup-overlay");
  const opts = document.querySelectorAll(".time-opt");
  const customInput = document.getElementById("custom-time-input");
  const customBtn = document.getElementById("customTimeBtn");

  opts.forEach((btn) => {
    btn.onclick = () => {
      const mins = parseInt(btn.dataset.mins, 10);
      overlay.classList.add("hidden");
      startTimer(mins);
    };
  });

  customBtn.onclick = () => {
    const mins = parseInt(customInput.value, 10);
    if (!mins || mins <= 0) {
      alert("Enter a valid number of minutes");
      return;
    }
    overlay.classList.add("hidden");
    startTimer(mins);
  };

  document.getElementById("extend5Btn").onclick = () => extendTimer(5);
  document.getElementById("extend10Btn").onclick = () => extendTimer(10);
  document.getElementById("continueBtn").onclick = () => {
    document.getElementById("time-warning-overlay").classList.add("hidden");
  };
}

function startTimer(minutes) {
  targetSeconds = minutes * 60;
  remainingSeconds = targetSeconds;

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      showTimeWarning();
    }
  }, 1000);
}

function showTimeWarning() {
  document.getElementById("time-warning-overlay").classList.remove("hidden");
}

function extendTimer(minutes) {
  remainingSeconds = minutes * 60;
  document.getElementById("time-warning-overlay").classList.add("hidden");

  timerInterval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      showTimeWarning();
    }
  }, 1000);
}
