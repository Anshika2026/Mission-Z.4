let questions = [];
let current = 0;
let answers = [];
let startTime;

document.addEventListener("DOMContentLoaded", initQuiz);

async function initQuiz() {
  const chapterId = localStorage.getItem("chapterId");
  const userId = getUserId();
  const noteRes = await api("getNotes", { userId, chapterId });
  notes = noteRes.notes || {};
  const res = await api("getQuestions", { chapterId });

  questions = res.questions;
  answers = new Array(questions.length).fill(null);

  startTime = Date.now();

  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];

  // document.getElementById("question-number").innerText = `Question ${
  //   current + 1
  // }`;
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

  //   if (answers[current] === i) div.classList.add("selected");

  //   div.onclick = () => {
  //     answers[current] = i;
  //     renderQuestion();
  //   };

  //   container.appendChild(div);
  // });
  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerText = opt;

    if (answers[current] === i) {
      if (i === q.answer) {
        div.classList.add("correct");
      } else {
        div.classList.add("wrong");
      }
    }

    div.onclick = () => {
      answers[current] = i;
      renderQuestion();
    };

    container.appendChild(div);
  });
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

async function submitQuiz() {
  const userId = getUserId();
  const chapterId = localStorage.getItem("chapterId");

  let correct = 0;

  questions.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
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

  alert(`Score: ${score}/${total}`);

  window.location.href = "practice.html";
}

function exitQuiz() {
  window.location.href = "practice.html";
}
let notes = {};

// function toggleNote() {
//   document.getElementById("note-box").classList.toggle("hidden");

//   const existing = notes[current] || "";
//   document.getElementById("note-input").value = existing;
// }
function toggleNote() {
  const box = document.getElementById("note-box");
  box.classList.toggle("hidden");

  document.getElementById("note-input").value = notes[current] || "";
}

// function saveNote() {
//   const text = document.getElementById("note-input").value;
//   notes[current] = text;

//   document.getElementById("note-box").classList.add("hidden");
// }
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
