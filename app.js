/* ============================================================
   IELTS READING WEBSITE
   app.js
   ============================================================

   GOOGLE APPS SCRIPT API
   ============================================================ */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzkYktZQFtycRgG3K6Hi6MsvUtP8RsqOq6QxB598FVYefGmpe_oS3R518GZ0821bNbYtw/exec";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const CONFIG = {
  testFolder: "./tests/",
  vocabularyFile: "./data/vocabulary.json",

  testCount: 20,

  durationMinutes: 60,

  storageKeys: {
    user: "ieltsReadingUser",
    currentTest: "ieltsReadingCurrentTest",
    answers: "ieltsReadingAnswers",
    startTime: "ieltsReadingStartTime",
    remainingTime: "ieltsReadingRemainingTime"
  }
};


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let currentUser = null;
let currentTest = null;
let currentTestNumber = null;

let vocabulary = {};
let studentAnswers = {};

let timerInterval = null;
let remainingSeconds = CONFIG.durationMinutes * 60;

let testStarted = false;
let testSubmitted = false;

let scoreData = {
  part1: 0,
  part2: 0,
  part3: 0,
  part4: 0,
  total: 0,
  totalQuestions: 0,
  band: 0
};


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  await loadVocabulary();

  restoreLogin();

  setupGlobalEvents();
});


/* ============================================================
   GLOBAL EVENTS
   ============================================================ */

function setupGlobalEvents() {

  document.addEventListener("click", event => {

    const testButton = event.target.closest("[data-test-number]");

    if (testButton) {
      const number = Number(testButton.dataset.testNumber);

      if (number) {
        openTest(number);
      }
    }

    const logoutButton = event.target.closest("[data-action='logout']");

    if (logoutButton) {
      logout();
    }

    const historyButton = event.target.closest("[data-action='history']");

    if (historyButton) {
      showHistory();
    }

    const dashboardButton =
      event.target.closest("[data-action='dashboard']");

    if (dashboardButton) {
      showDashboard();
    }

    const startButton =
      event.target.closest("[data-action='start-test']");

    if (startButton) {
      startCurrentTest();
    }

    const submitButton =
      event.target.closest("[data-action='submit-test']");

    if (submitButton) {
      submitTest();
    }

    const nextButton =
      event.target.closest("[data-action='next-part']");

    if (nextButton) {
      goToNextPart();
    }

    const previousButton =
      event.target.closest("[data-action='previous-part']");

    if (previousButton) {
      goToPreviousPart();
    }

    const vocabularyWord =
      event.target.closest("[data-vocabulary-word]");

    if (vocabularyWord) {
      showVocabulary(
        vocabularyWord.dataset.vocabularyWord
      );
    }

  });


  document.addEventListener("change", event => {

    const answerElement =
      event.target.closest("[data-question-number]");

    if (!answerElement) return;

    const number =
      answerElement.dataset.questionNumber;

    saveAnswerFromElement(answerElement, number);
  });


  document.addEventListener("input", event => {

    const answerElement =
      event.target.closest("[data-question-number]");

    if (!answerElement) return;

    const number =
      answerElement.dataset.questionNumber;

    saveAnswerFromElement(answerElement, number);
  });

}


/* ============================================================
   LOGIN
   ============================================================ */

async function login(username, password) {

  username = String(username || "").trim();
  password = String(password || "");

  if (!username || !password) {
    showMessage("Please enter your username and password.", "error");
    return false;
  }

  setLoading(true);

  try {

    const response = await apiRequest("login", {
      username: username,
      password: password
    });

    if (!response || response.success === false) {
      showMessage(
        response?.message || "Invalid username or password.",
        "error"
      );

      setLoading(false);
      return false;
    }

    currentUser = {
      studentId:
        response.studentId ||
        response.StudentID ||
        response.data?.studentId ||
        "",

      username:
        response.username ||
        response.Username ||
        response.data?.username ||
        username
    };

    localStorage.setItem(
      CONFIG.storageKeys.user,
      JSON.stringify(currentUser)
    );

    setLoading(false);

    showDashboard();

    return true;

  } catch (error) {

    console.error("Login error:", error);

    showMessage(
      "Unable to connect to the server.",
      "error"
    );

    setLoading(false);

    return false;
  }
}


/* ============================================================
   LOGOUT
   ============================================================ */

function logout() {

  stopTimer();

  currentUser = null;
  currentTest = null;
  currentTestNumber = null;

  studentAnswers = {};

  localStorage.removeItem(
    CONFIG.storageKeys.user
  );

  localStorage.removeItem(
    CONFIG.storageKeys.currentTest
  );

  localStorage.removeItem(
    CONFIG.storageKeys.answers
  );

  localStorage.removeItem(
    CONFIG.storageKeys.startTime
  );

  localStorage.removeItem(
    CONFIG.storageKeys.remainingTime
  );

  showLoginScreen();
}


/* ============================================================
   RESTORE LOGIN
   ============================================================ */

function restoreLogin() {

  const saved =
    localStorage.getItem(
      CONFIG.storageKeys.user
    );

  if (!saved) {
    showLoginScreen();
    return;
  }

  try {

    currentUser = JSON.parse(saved);

    if (
      currentUser &&
      currentUser.username
    ) {
      showDashboard();
    } else {
      showLoginScreen();
    }

  } catch {

    localStorage.removeItem(
      CONFIG.storageKeys.user
    );

    showLoginScreen();
  }
}


/* ============================================================
   LOGIN SCREEN
   ============================================================ */

function showLoginScreen() {

  stopTimer();

  const app =
    document.querySelector("#app");

  if (!app) return;

  app.innerHTML = `
    <div class="login-page">

      <div class="login-card">

        <h1>IELTS Reading</h1>

        <p class="login-subtitle">
          Reading Practice Platform
        </p>

        <form id="loginForm">

          <div class="form-group">
            <label>Username</label>

            <input
              id="loginUsername"
              type="text"
              autocomplete="username"
              placeholder="Enter username"
              required
            >
          </div>

          <div class="form-group">
            <label>Password</label>

            <input
              id="loginPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Enter password"
              required
            >
          </div>

          <button
            type="submit"
            class="primary-button"
          >
            Login
          </button>

        </form>

        <div id="loginMessage"></div>

      </div>

    </div>
  `;

  const form =
    document.querySelector("#loginForm");

  if (form) {

    form.addEventListener("submit", async event => {

      event.preventDefault();

      const username =
        document.querySelector("#loginUsername").value;

      const password =
        document.querySelector("#loginPassword").value;

      await login(username, password);
    });

  }

}


/* ============================================================
   DASHBOARD
   ============================================================ */

async function showDashboard() {

  stopTimer();

  const app =
    document.querySelector("#app");

  if (!app) return;

  app.innerHTML = `
    <div class="dashboard">

      <header class="dashboard-header">

        <div>
          <h1>IELTS Reading</h1>

          <p>
            Welcome,
            <strong>
              ${escapeHTML(currentUser?.username || "")}
            </strong>
          </p>
        </div>

        <div class="dashboard-actions">

          <button
            data-action="history"
            class="secondary-button"
          >
            Score History
          </button>

          <button
            data-action="logout"
            class="secondary-button"
          >
            Logout
          </button>

        </div>

      </header>

      <main>

        <div class="dashboard-title">
          <h2>Choose a Reading Test</h2>

          <p>
            Select a test to begin your IELTS Reading practice.
          </p>
        </div>

        <div
          id="testGrid"
          class="test-grid"
        >
          ${createTestCards()}
        </div>

      </main>

    </div>
  `;

  loadTestHistoryForDashboard();
}


/* ============================================================
   TEST CARDS
   ============================================================ */

function createTestCards() {

  let html = "";

  for (
    let i = 1;
    i <= CONFIG.testCount;
    i++
  ) {

    html += `
      <div class="test-card">

        <div class="test-card-number">
          TEST ${i}
        </div>

        <div class="test-card-status"
             id="test-status-${i}">
          Not Started
        </div>

        <button
          data-test-number="${i}"
          class="primary-button"
        >
          Start Test
        </button>

      </div>
    `;
  }

  return html;
}


/* ============================================================
   DASHBOARD HISTORY
   ============================================================ */

async function loadTestHistoryForDashboard() {

  if (!currentUser) return;

  try {

    const response =
      await apiRequest("getHistory", {
        studentId: currentUser.studentId,
        username: currentUser.username
      });

    const results =
      normalizeResults(response);

    results.forEach(result => {

      const testNumber =
        extractTestNumber(result.testName);

      if (!testNumber) return;

      const status =
        document.querySelector(
          `#test-status-${testNumber}`
        );

      if (!status) return;

      status.innerHTML = `
        Completed<br>
        ${result.totalScore}/${result.totalQuestions || 40}
        <br>
        Band ${result.band}
      `;

    });

  } catch (error) {

    console.warn(
      "Unable to load dashboard history:",
      error
    );

  }

}


/* ============================================================
   OPEN TEST
   ============================================================ */

async function openTest(testNumber) {

  if (!currentUser) {
    showLoginScreen();
    return;
  }

  currentTestNumber = testNumber;

  showLoadingScreen(
    `Loading Test ${testNumber}...`
  );

  try {

    const response =
      await fetch(
        `${CONFIG.testFolder}Test${testNumber}.json`,
        {
          cache: "no-cache"
        }
      );

    if (!response.ok) {
      throw new Error(
        `Test${testNumber}.json not found`
      );
    }

    currentTest =
      await response.json();

    validateTestJSON(currentTest);

    localStorage.setItem(
      CONFIG.storageKeys.currentTest,
      String(testNumber)
    );

    studentAnswers = {};

    localStorage.removeItem(
      CONFIG.storageKeys.answers
    );

    showTestIntroduction();

  } catch (error) {

    console.error(error);

    showErrorScreen(
      `Unable to load Test ${testNumber}.json`
    );
  }

}


/* ============================================================
   TEST VALIDATION
   ============================================================ */

function validateTestJSON(test) {

  if (!test) {
    throw new Error("Test JSON is empty.");
  }

  if (!test.testId) {
    throw new Error("Missing testId.");
  }

  if (!Array.isArray(test.parts)) {
    throw new Error(
      "Test JSON must contain a parts array."
    );
  }

  test.parts.forEach(part => {

    if (!part.passage) {
      throw new Error(
        `Part ${part.partNumber} has no passage.`
      );
    }

    if (!Array.isArray(part.questionGroups)) {
      throw new Error(
        `Part ${part.partNumber} has no questionGroups.`
      );
    }

  });

}


/* ============================================================
   TEST INTRODUCTION
   ============================================================ */

function showTestIntroduction() {

  const app =
    document.querySelector("#app");

  if (!app) return;

  app.innerHTML = `

    <div class="test-introduction">

      <div class="intro-card">

        <h1>
          ${escapeHTML(currentTest.title)}
        </h1>

        <div class="intro-information">

          <div>
            <strong>Duration</strong>
            <span>
              ${currentTest.duration || 60} minutes
            </span>
          </div>

          <div>
            <strong>Parts</strong>
            <span>
              ${currentTest.parts.length}
            </span>
          </div>

          <div>
            <strong>Questions</strong>
            <span>
              ${countQuestions(currentTest)}
            </span>
          </div>

        </div>

        <div class="intro-instructions">

          <h3>Before you begin</h3>

          <ul>
            <li>You have ${currentTest.duration || 60} minutes.</li>
            <li>Read each passage carefully.</li>
            <li>Answer all questions.</li>
            <li>Your answers will be marked automatically.</li>
            <li>The test will submit automatically when time reaches zero.</li>
          </ul>

        </div>

        <button
          data-action="start-test"
          class="primary-button start-button"
        >
          START TEST
        </button>

        <button
          data-action="dashboard"
          class="secondary-button"
        >
          Back to Dashboard
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   START TEST
   ============================================================ */

function startCurrentTest() {

  if (!currentTest) return;

  testStarted = true;
  testSubmitted = false;

  studentAnswers = {};

  const savedAnswers =
    localStorage.getItem(
      CONFIG.storageKeys.answers
    );

  if (savedAnswers) {

    try {
      studentAnswers =
        JSON.parse(savedAnswers);
    } catch {
      studentAnswers = {};
    }

  }

  remainingSeconds =
    (currentTest.duration || CONFIG.durationMinutes) * 60;

  localStorage.setItem(
    CONFIG.storageKeys.startTime,
    String(Date.now())
  );

  localStorage.setItem(
    CONFIG.storageKeys.remainingTime,
    String(remainingSeconds)
  );

  renderTest();

  startTimer();
}


/* ============================================================
   RENDER TEST
   ============================================================ */

function renderTest() {

  const app =
    document.querySelector("#app");

  if (!app || !currentTest) return;

  const totalQuestions =
    countQuestions(currentTest);

  app.innerHTML = `

    <div class="exam-container">

      <header class="exam-header">

        <div class="exam-title">
          <strong>
            ${escapeHTML(currentTest.title)}
          </strong>
        </div>

        <div
          id="timer"
          class="exam-timer"
        >
          ${formatTime(remainingSeconds)}
        </div>

        <button
          data-action="submit-test"
          class="submit-button"
        >
          Submit Test
        </button>

      </header>


      <div class="exam-body">

        <section
          id="passagePanel"
          class="passage-panel"
        >

          <div class="panel-header">
            <span id="passagePartTitle">
              Reading Passage
            </span>
          </div>

          <div
            id="passageContent"
            class="passage-content"
          ></div>

        </section>


        <section
          id="questionPanel"
          class="question-panel"
        >

          <div class="panel-header">
            <span>Questions</span>
          </div>

          <div
            id="questionContent"
            class="question-content"
          ></div>

        </section>

      </div>


      <footer class="exam-footer">

        <div
          id="questionNavigator"
          class="question-navigator"
        ></div>

        <div class="part-navigation">

          <button
            data-action="previous-part"
            class="secondary-button"
          >
            Previous
          </button>

          <span id="partIndicator"></span>

          <button
            data-action="next-part"
            class="secondary-button"
          >
            Next
          </button>

        </div>

      </footer>

    </div>
  `;

  renderPart(0);

  createQuestionNavigator();

  updateQuestionNavigator();
}


/* ============================================================
   CURRENT PART
   ============================================================ */

let currentPartIndex = 0;


function renderPart(partIndex) {

  if (!currentTest) return;

  if (
    partIndex < 0 ||
    partIndex >= currentTest.parts.length
  ) {
    return;
  }

  currentPartIndex = partIndex;

  const part =
    currentTest.parts[partIndex];

  renderPassage(part);

  renderQuestionGroups(part);

  updatePartIndicator();

  updatePartNavigation();

  updateQuestionNavigator();
}


/* ============================================================
   RENDER PASSAGE
   ============================================================ */

function renderPassage(part) {

  const title =
    document.querySelector(
      "#passagePartTitle"
    );

  const content =
    document.querySelector(
      "#passageContent"
    );

  if (!content) return;

  if (title) {

    title.textContent =
      `Part ${part.partNumber}: ${part.title || ""}`;

  }

  const passage =
    part.passage;

  let html = "";

  if (passage.title) {

    html += `
      <h2 class="passage-title">
        ${escapeHTML(passage.title)}
      </h2>
    `;

  }

  if (
    Array.isArray(passage.paragraphs)
  ) {

    passage.paragraphs.forEach(
      paragraph => {

        html += `
          <div
            class="passage-paragraph"
            data-paragraph="${escapeHTML(paragraph.id)}"
          >

            ${
              paragraph.id
                ? `
                  <div class="paragraph-label">
                    ${escapeHTML(paragraph.id)}
                  </div>
                `
                : ""
            }

            <p>
              ${processVocabulary(
                paragraph.text
              )}
            </p>

          </div>
        `;

      }
    );

  } else if (passage.text) {

    html += `
      <div class="passage-text">
        ${processVocabulary(passage.text)}
      </div>
    `;

  }

  content.innerHTML = html;

}


/* ============================================================
   VOCABULARY PROCESSING
   ============================================================ */

function processVocabulary(text) {

  if (!text) return "";

  let escaped =
    escapeHTML(text);

  const words =
    Object.keys(vocabulary);

  if (!words.length) {
    return escaped;
  }

  words.sort(
    (a, b) =>
      b.length - a.length
  );

  words.forEach(word => {

    const safeWord =
      escapeRegExp(word);

    const regex =
      new RegExp(
        `\\b(${safeWord})\\b`,
        "gi"
      );

    escaped =
      escaped.replace(
        regex,
        match => `
          <span
            class="vocabulary-word"
            data-vocabulary-word="${escapeAttribute(word)}"
          >
            ${match}
          </span>
        `
      );

  });

  return escaped;
}


/* ============================================================
   VOCABULARY LOADING
   ============================================================ */

async function loadVocabulary() {

  try {

    const response =
      await fetch(
        CONFIG.vocabularyFile,
        {
          cache: "no-cache"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Vocabulary file not found."
      );
    }

    const data =
      await response.json();

    vocabulary =
      data.words || {};

  } catch (error) {

    console.warn(
      "Vocabulary could not be loaded:",
      error
    );

    vocabulary = {};
  }

}


/* ============================================================
   VOCABULARY POPUP
   ============================================================ */

function showVocabulary(word) {

  const key =
    findVocabularyKey(word);

  if (!key) return;

  const item =
    vocabulary[key];

  removeVocabularyPopup();

  const popup =
    document.createElement("div");

  popup.id =
    "vocabularyPopup";

  popup.className =
    "vocabulary-popup";

  popup.innerHTML = `

    <div class="vocabulary-popup-header">

      <strong>
        ${escapeHTML(
          item.word || key
        )}
      </strong>

      <button
        type="button"
        id="closeVocabulary"
      >
        ×
      </button>

    </div>

    ${
      item.simpleMeaning
        ? `
          <div class="vocabulary-simple">
            ${escapeHTML(
              item.simpleMeaning
            )}
          </div>
        `
        : ""
    }

    ${
      item.meaning
        ? `
          <div class="vocabulary-meaning">
            ${escapeHTML(
              item.meaning
            )}
          </div>
        `
        : ""
    }

  `;

  document.body.appendChild(popup);

  document
    .querySelector("#closeVocabulary")
    ?.addEventListener(
      "click",
      removeVocabularyPopup
    );

}


function removeVocabularyPopup() {

  document
    .querySelector(
      "#vocabularyPopup"
    )
    ?.remove();

}


function findVocabularyKey(word) {

  const lower =
    String(word)
      .toLowerCase();

  return Object.keys(vocabulary)
    .find(
      key =>
        key.toLowerCase() === lower
    );
}


/* ============================================================
   RENDER QUESTION GROUPS
   ============================================================ */

function renderQuestionGroups(part) {

  const container =
    document.querySelector(
      "#questionContent"
    );

  if (!container) return;

  let html = "";

  part.questionGroups.forEach(
    (group, index) => {

      html += `
        <section
          class="question-group"
          data-group-index="${index}"
        >

          <div class="question-group-header">

            <h3>
              ${formatQuestionType(
                group.type
              )}
            </h3>

            ${
              group.questionRange
                ? `
                  <span>
                    Questions ${escapeHTML(
                      group.questionRange
                    )}
                  </span>
                `
                : ""
            }

          </div>

          ${
            group.instructions
              ? `
                <div class="question-instructions">
                  ${escapeHTML(
                    group.instructions
                  )}
                </div>
              `
              : ""
          }

          ${renderQuestionGroup(group)}

        </section>
      `;

    }
  );

  container.innerHTML = html;

  restoreAnswersToUI();

}


/* ============================================================
   QUESTION TYPE
   ============================================================ */

function formatQuestionType(type) {

  const names = {

    true_false_not_given:
      "TRUE / FALSE / NOT GIVEN",

    yes_no_not_given:
      "YES / NO / NOT GIVEN",

    fill_blank:
      "Complete the Sentences",

    summary_completion:
      "Summary Completion",

    multiple_choice:
      "Multiple Choice",

    multiple_choice_multiple:
      "Multiple Choice",

    matching_headings:
      "Matching Headings",

    matching_information:
      "Matching Information",

    matching_features:
      "Matching Features",

    answer_box:
      "Choose the Correct Answer from the Box"

  };

  return (
    names[type] ||
    type
      .replaceAll("_", " ")
      .toUpperCase()
  );
}


/* ============================================================
   QUESTION GROUP RENDERER
   ============================================================ */

function renderQuestionGroup(group) {

  switch (group.type) {

    case "true_false_not_given":
      return renderTrueFalseNotGiven(group);

    case "yes_no_not_given":
      return renderYesNoNotGiven(group);

    case "fill_blank":
      return renderFillBlank(group);

    case "summary_completion":
      return renderSummaryCompletion(group);

    case "multiple_choice":
      return renderMultipleChoice(group);

    case "multiple_choice_multiple":
      return renderMultipleChoiceMultiple(group);

    case "matching_headings":
      return renderMatchingHeadings(group);

    case "matching_information":
      return renderMatchingInformation(group);

    case "matching_features":
      return renderMatchingFeatures(group);

    case "answer_box":
      return renderAnswerBox(group);

    default:
      return `
        <div class="unsupported-question">
          Unsupported question type:
          ${escapeHTML(group.type)}
        </div>
      `;
  }

}


/* ============================================================
   TRUE / FALSE / NOT GIVEN
   ============================================================ */

function renderTrueFalseNotGiven(group) {

  return group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${escapeHTML(question.text)}

        </div>

        <div class="question-options">

          ${renderRadio(
            question.number,
            "TRUE"
          )}

          ${renderRadio(
            question.number,
            "FALSE"
          )}

          ${renderRadio(
            question.number,
            "NOT GIVEN"
          )}

        </div>

      </div>

    `)
    .join("");

}


/* ============================================================
   YES / NO / NOT GIVEN
   ============================================================ */

function renderYesNoNotGiven(group) {

  return group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${escapeHTML(question.text)}

        </div>

        <div class="question-options">

          ${renderRadio(
            question.number,
            "YES"
          )}

          ${renderRadio(
            question.number,
            "NO"
          )}

          ${renderRadio(
            question.number,
            "NOT GIVEN"
          )}

        </div>

      </div>

    `)
    .join("");

}


/* ============================================================
   FILL BLANK
   ============================================================ */

function renderFillBlank(group) {

  return group.questions
    .map(question => `

      <div
        class="question fill-blank-question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${renderBlankText(
            question.text,
            question.number
          )}

        </div>

      </div>

    `)
    .join("");

}


function renderBlankText(text, number) {

  const safeText =
    escapeHTML(text);

  const blankRegex =
    /_{2,}|<blank>|<BLANK>/gi;

  if (blankRegex.test(safeText)) {

    return safeText.replace(
      blankRegex,
      `
        <input
          type="text"
          class="blank-input"
          data-question-number="${number}"
          autocomplete="off"
        >
      `
    );

  }

  return `
    ${safeText}

    <input
      type="text"
      class="blank-input"
      data-question-number="${number}"
      autocomplete="off"
    >
  `;

}


/* ============================================================
   SUMMARY COMPLETION
   ============================================================ */

function renderSummaryCompletion(group) {

  let html = "";

  if (group.summary) {

    html += `
      <div class="summary-text">

        ${renderSummaryWithInputs(
          group.summary,
          group.questions
        )}

      </div>
    `;

  } else {

    html += group.questions
      .map(question => `

        <div class="question">

          <span class="question-number">
            ${question.number}.
          </span>

          ${renderBlankText(
            question.text,
            question.number
          )}

        </div>

      `)
      .join("");

  }

  return html;

}


function renderSummaryWithInputs(
  text,
  questions
) {

  let result =
    escapeHTML(text);

  questions.forEach(
    question => {

      const patterns = [
        `\\[${question.number}\\]`,
        `\\{${question.number}\\}`,
        `\\bQ${question.number}\\b`,
        `_{2,}`
      ];

      for (
        const pattern of patterns
      ) {

        const regex =
          new RegExp(
            pattern
          );

        if (regex.test(result)) {

          result =
            result.replace(
              regex,
              `
                <input
                  type="text"
                  class="blank-input"
                  data-question-number="${question.number}"
                  autocomplete="off"
                >
              `
            );

          break;
        }
      }

    }
  );

  return result;

}


/* ============================================================
   MULTIPLE CHOICE
   ============================================================ */

function renderMultipleChoice(group) {

  return group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${escapeHTML(question.text)}

        </div>

        <div class="multiple-choice-options">

          ${question.options
            .map(option => `

              <label class="choice-option">

                <input
                  type="radio"
                  name="question-${question.number}"
                  value="${escapeAttribute(option.letter)}"
                  data-question-number="${question.number}"
                >

                <span class="choice-letter">
                  ${escapeHTML(option.letter)}
                </span>

                <span>
                  ${escapeHTML(option.text)}
                </span>

              </label>

            `)
            .join("")}

        </div>

      </div>

    `)
    .join("");

}


/* ============================================================
   MULTIPLE CHOICE - MULTIPLE ANSWERS
   ============================================================ */

function renderMultipleChoiceMultiple(group) {

  return group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${escapeHTML(question.text)}

        </div>

        <div class="multiple-choice-options">

          ${question.options
            .map(option => `

              <label class="choice-option">

                <input
                  type="checkbox"
                  name="question-${question.number}"
                  value="${escapeAttribute(option.letter)}"
                  data-question-number="${question.number}"
                >

                <span class="choice-letter">
                  ${escapeHTML(option.letter)}
                </span>

                <span>
                  ${escapeHTML(option.text)}
                </span>

              </label>

            `)
            .join("")}

        </div>

      </div>

    `)
    .join("");

}


/* ============================================================
   MATCHING HEADINGS
   ============================================================ */

function renderMatchingHeadings(group) {

  let html = "";

  if (Array.isArray(group.headings)) {

    html += `
      <div class="heading-list">

        <h4>List of Headings</h4>

        ${group.headings
          .map(heading => `
            <div class="heading-item">

              <strong>
                ${escapeHTML(heading.id)}
              </strong>

              <span>
                ${escapeHTML(heading.text)}
              </span>

            </div>
          `)
          .join("")}

      </div>
    `;

  }

  html += group.questions
    .map(question => `

      <div
        class="question matching-question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          Paragraph
          <strong>
            ${escapeHTML(question.paragraph)}
          </strong>

        </div>

        <select
          data-question-number="${question.number}"
        >

          <option value="">
            Select heading
          </option>

          ${
            group.headings
              .map(heading => `
                <option
                  value="${escapeAttribute(heading.id)}"
                >
                  ${escapeHTML(heading.id)} -
                  ${escapeHTML(heading.text)}
                </option>
              `)
              .join("")
          }

        </select>

      </div>

    `)
    .join("");

  return html;

}


/* ============================================================
   MATCHING INFORMATION
   ============================================================ */

function renderMatchingInformation(group) {

  const paragraphs =
    currentTest
      ?.parts?.[currentPartIndex]
      ?.passage
      ?.paragraphs || [];

  let html = "";

  if (paragraphs.length) {

    html += `
      <div class="paragraph-options">

        <strong>
          Paragraphs:
        </strong>

        ${paragraphs
          .map(p => `
            <span>
              ${escapeHTML(p.id)}
            </span>
          `)
          .join("")}

      </div>
    `;

  }

  html += group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${escapeHTML(question.text)}

        </div>

        <select
          data-question-number="${question.number}"
        >

          <option value="">
            Select paragraph
          </option>

          ${paragraphs
            .map(p => `
              <option value="${escapeAttribute(p.id)}">
                ${escapeHTML(p.id)}
              </option>
            `)
            .join("")}

        </select>

      </div>

    `)
    .join("");

  return html;

}


/* ============================================================
   MATCHING FEATURES
   ============================================================ */

function renderMatchingFeatures(group) {

  let html = "";

  if (Array.isArray(group.features)) {

    html += `
      <div class="feature-list">

        ${group.features
          .map(feature => `
            <div class="feature-item">

              <strong>
                ${escapeHTML(feature.id)}
              </strong>

              <span>
                ${escapeHTML(feature.text)}
              </span>

            </div>
          `)
          .join("")}

      </div>
    `;

  }

  html += group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${escapeHTML(question.text)}

        </div>

        <select
          data-question-number="${question.number}"
        >

          <option value="">
            Select answer
          </option>

          ${group.features
            .map(feature => `
              <option value="${escapeAttribute(feature.id)}">
                ${escapeHTML(feature.id)} -
                ${escapeHTML(feature.text)}
              </option>
            `)
            .join("")}

        </select>

      </div>

    `)
    .join("");

  return html;

}


/* ============================================================
   ANSWER BOX
   ============================================================ */

function renderAnswerBox(group) {

  let html = "";

  if (Array.isArray(group.options)) {

    html += `
      <div class="answer-box">

        <h4>
          Choose from the box
        </h4>

        <div class="answer-box-options">

          ${group.options
            .map(option => `
              <span class="answer-box-item">
                ${escapeHTML(option)}
              </span>
            `)
            .join("")}

        </div>

      </div>
    `;

  }

  html += group.questions
    .map(question => `

      <div
        class="question"
        data-question-number="${question.number}"
      >

        <div class="question-text">

          <span class="question-number">
            ${question.number}.
          </span>

          ${renderBlankText(
            question.text,
            question.number
          )}

        </div>

        <select
          class="answer-box-select"
          data-question-number="${question.number}"
        >

          <option value="">
            Select answer
          </option>

          ${group.options
            .map(option => `
              <option value="${escapeAttribute(option)}">
                ${escapeHTML(option)}
              </option>
            `)
            .join("")}

        </select>

      </div>

    `)
    .join("");

  return html;

}


/* ============================================================
   RADIO HELPER
   ============================================================ */

function renderRadio(number, value) {

  return `
    <label class="choice-option">

      <input
        type="radio"
        name="question-${number}"
        value="${escapeAttribute(value)}"
        data-question-number="${number}"
      >

      <span>
        ${escapeHTML(value)}
      </span>

    </label>
  `;

}


/* ============================================================
   SAVE ANSWER
   ============================================================ */

function saveAnswerFromElement(
  element,
  number
) {

  if (!number) return;

  if (
    element.type === "radio"
  ) {

    if (!element.checked) return;

    studentAnswers[number] =
      element.value;

  }

  else if (
    element.type === "checkbox"
  ) {

    const checked =
      document.querySelectorAll(
        `input[name="question-${number}"]:checked`
      );

    studentAnswers[number] =
      Array.from(checked)
        .map(input => input.value);

  }

  else {

    studentAnswers[number] =
      element.value;

  }

  localStorage.setItem(
    CONFIG.storageKeys.answers,
    JSON.stringify(studentAnswers)
  );

  updateQuestionNavigator();

}


/* ============================================================
   RESTORE ANSWERS
   ============================================================ */

function restoreAnswersToUI() {

  Object.entries(
    studentAnswers
  ).forEach(
    ([number, answer]) => {

      if (Array.isArray(answer)) {

        answer.forEach(value => {

          const input =
            document.querySelector(
              `input[data-question-number="${number}"][value="${CSS.escape(value)}"]`
            );

          if (input) {
            input.checked = true;
          }

        });

        return;
      }

      const radio =
        document.querySelector(
          `input[type="radio"][data-question-number="${number}"][value="${CSS.escape(answer)}"]`
        );

      if (radio) {
        radio.checked = true;
        return;
      }

      const checkbox =
        document.querySelector(
          `input[type="checkbox"][data-question-number="${number}"][value="${CSS.escape(answer)}"]`
        );

      if (checkbox) {
        checkbox.checked = true;
        return;
      }

      const input =
        document.querySelector(
          `[data-question-number="${number}"]`
        );

      if (input) {
        input.value = answer;
      }

    }
  );

}


/* ============================================================
   QUESTION NAVIGATOR
   ============================================================ */

function createQuestionNavigator() {

  const navigator =
    document.querySelector(
      "#questionNavigator"
    );

  if (!navigator) return;

  const questions =
    getAllQuestions(currentTest);

  navigator.innerHTML =
    questions
      .map(question => `

        <button
          type="button"
          class="question-number-button"
          data-jump-question="${question.number}"
        >
          ${question.number}
        </button>

      `)
      .join("");

  navigator.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-jump-question]"
        );

      if (!button) return;

      const number =
        Number(
          button.dataset.jumpQuestion
        );

      jumpToQuestion(number);

    }
  );

}


function updateQuestionNavigator() {

  const buttons =
    document.querySelectorAll(
      "[data-jump-question]"
    );

  buttons.forEach(button => {

    const number =
      Number(
        button.dataset.jumpQuestion
      );

    const answer =
      studentAnswers[number];

    button.classList.toggle(
      "answered",
      hasAnswer(answer)
    );

  });

}


/* ============================================================
   JUMP TO QUESTION
   ============================================================ */

function jumpToQuestion(number) {

  const question =
    document.querySelector(
      `[data-question-number="${number}"]`
    );

  if (!question) {

    const allParts =
      currentTest.parts;

    for (
      let i = 0;
      i < allParts.length;
      i++
    ) {

      const contains =
        partContainsQuestion(
          allParts[i],
          number
        );

      if (contains) {

        renderPart(i);

        setTimeout(
          () => jumpToQuestion(number),
          50
        );

        return;
      }

    }

    return;
  }

  const wrapper =
    question.closest(".question") ||
    question;

  wrapper.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  wrapper.classList.add(
    "question-highlight"
  );

  setTimeout(
    () =>
      wrapper.classList.remove(
        "question-highlight"
      ),
    1200
  );

}


/* ============================================================
   NEXT / PREVIOUS PART
   ============================================================ */

function goToNextPart() {

  if (!currentTest) return;

  if (
    currentPartIndex <
    currentTest.parts.length - 1
  ) {

    renderPart(
      currentPartIndex + 1
    );

  }

}


function goToPreviousPart() {

  if (!currentTest) return;

  if (
    currentPartIndex > 0
  ) {

    renderPart(
      currentPartIndex - 1
    );

  }

}


function updatePartIndicator() {

  const element =
    document.querySelector(
      "#partIndicator"
    );

  if (!element || !currentTest) return;

  element.textContent =
    `Part ${currentPartIndex + 1} of ${currentTest.parts.length}`;

}


function updatePartNavigation() {

  const previous =
    document.querySelector(
      "[data-action='previous-part']"
    );

  const next =
    document.querySelector(
      "[data-action='next-part']"
    );

  if (previous) {

    previous.disabled =
      currentPartIndex === 0;

  }

  if (next) {

    next.disabled =
      currentPartIndex ===
      currentTest.parts.length - 1;

  }

}


/* ============================================================
   TIMER
   ============================================================ */

function startTimer() {

  stopTimer();

  updateTimerDisplay();

  timerInterval =
    setInterval(
      () => {

        if (!testStarted) return;

        remainingSeconds--;

        localStorage.setItem(
          CONFIG.storageKeys.remainingTime,
          String(remainingSeconds)
        );

        updateTimerDisplay();

        if (
          remainingSeconds <= 0
        ) {

          remainingSeconds = 0;

          stopTimer();

          autoSubmitTest();

        }

      },
      1000
    );

}


function stopTimer() {

  if (timerInterval) {

    clearInterval(
      timerInterval
    );

    timerInterval = null;

  }

}


function updateTimerDisplay() {

  const timer =
    document.querySelector(
      "#timer"
    );

  if (!timer) return;

  timer.textContent =
    formatTime(
      remainingSeconds
    );

  timer.classList.toggle(
    "warning",
    remainingSeconds <= 300
  );

  timer.classList.toggle(
    "danger",
    remainingSeconds <= 60
  );

}


function formatTime(seconds) {

  seconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const minutes =
    Math.floor(
      seconds / 60
    );

  const secs =
    seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

}


/* ============================================================
   SUBMIT TEST
   ============================================================ */

async function submitTest() {

  if (testSubmitted) return;

  const unanswered =
    countUnansweredQuestions();

  if (unanswered > 0) {

    const confirmed =
      window.confirm(
        `You have ${unanswered} unanswered question(s).\n\nAre you sure you want to submit?`
      );

    if (!confirmed) return;

  } else {

    const confirmed =
      window.confirm(
        "Are you sure you want to submit your test?"
      );

    if (!confirmed) return;

  }

  await finalizeTest(false);

}


/* ============================================================
   AUTO SUBMIT
   ============================================================ */

async function autoSubmitTest() {

  if (testSubmitted) return;

  alert(
    "Time is up. Your test will now be submitted automatically."
  );

  await finalizeTest(true);

}


/* ============================================================
   FINALIZE TEST
   ============================================================ */

async function finalizeTest(autoSubmitted) {

  if (testSubmitted) return;

  testSubmitted = true;
  testStarted = false;

  stopTimer();

  saveAllVisibleAnswers();

  const result =
    calculateScore();

  scoreData =
    result;

  showResultScreen(
    result,
    autoSubmitted
  );

  await saveResultToAPI(
    result
  );

}


/* ============================================================
   SAVE VISIBLE ANSWERS
   ============================================================ */

function saveAllVisibleAnswers() {

  const elements =
    document.querySelectorAll(
      "[data-question-number]"
    );

  elements.forEach(element => {

    const number =
      element.dataset.questionNumber;

    if (!number) return;

    saveAnswerFromElement(
      element,
      number
    );

  });

}


/* ============================================================
   SCORE CALCULATION
   ============================================================ */

function calculateScore() {

  let total = 0;

  const partScores = {};

  currentTest.parts.forEach(
    part => {

      let partScore = 0;

      const questions =
        getQuestionsFromPart(
          part
        );

      questions.forEach(
        question => {

          const studentAnswer =
            studentAnswers[
              question.number
            ];

          if (
            answersMatch(
              studentAnswer,
              question
            )
          ) {

            partScore++;

            total++;

          }

        }
      );

      partScores[
        `part${part.partNumber}`
      ] = partScore;

    }
  );

  const totalQuestions =
    countQuestions(
      currentTest
    );

  const band =
    calculateBand(
      total
    );

  return {

    part1:
      partScores.part1 || 0,

    part2:
      partScores.part2 || 0,

    part3:
      partScores.part3 || 0,

    part4:
      partScores.part4 || 0,

    total: total,

    totalQuestions:
      totalQuestions,

    band: band,

    timeUsed:
      calculateTimeUsed()

  };

}


/* ============================================================
   ANSWER COMPARISON
   ============================================================ */

function answersMatch(
  studentAnswer,
  question
) {

  if (
    studentAnswer === undefined ||
    studentAnswer === null
  ) {
    return false;
  }


  /* Multiple answer question */

  if (
    Array.isArray(
      question.answers
    )
  ) {

    if (
      !Array.isArray(
        studentAnswer
      )
    ) {
      return false;
    }

    const correct =
      normalizeArray(
        question.answers
      );

    const student =
      normalizeArray(
        studentAnswer
      );

    if (
      correct.length !==
      student.length
    ) {
      return false;
    }

    return correct.every(
      answer =>
        student.includes(answer)
    );

  }


  /* Normal answer */

  const correct =
    normalizeAnswer(
      question.answer
    );

  const student =
    normalizeAnswer(
      studentAnswer
    );

  return (
    correct === student
  );

}


/* ============================================================
   ANSWER NORMALIZATION
   ============================================================ */

function normalizeAnswer(answer) {

  if (
    answer === undefined ||
    answer === null
  ) {
    return "";
  }

  return String(answer)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

}


function normalizeArray(array) {

  return array
    .map(
      item =>
        normalizeAnswer(item)
    )
    .sort();

}


/* ============================================================
   IELTS READING BAND
   ============================================================ */

function calculateBand(score) {

  const table = [
    {
      min: 39,
      band: 9.0
    },
    {
      min: 37,
      band: 8.5
    },
    {
      min: 35,
      band: 8.0
    },
    {
      min: 33,
      band: 7.5
    },
    {
      min: 30,
      band: 7.0
    },
    {
      min: 27,
      band: 6.5
    },
    {
      min: 23,
      band: 6.0
    },
    {
      min: 19,
      band: 5.5
    },
    {
      min: 15,
      band: 5.0
    },
    {
      min: 13,
      band: 4.5
    },
    {
      min: 10,
      band: 4.0
    },
    {
      min: 8,
      band: 3.5
    },
    {
      min: 6,
      band: 3.0
    },
    {
      min: 4,
      band: 2.5
    },
    {
      min: 2,
      band: 2.0
    },
    {
      min: 1,
      band: 1.0
    }
  ];

  const result =
    table.find(
      item =>
        score >= item.min
    );

  return result
    ? result.band
    : 0;

}


/* ============================================================
   TIME USED
   ============================================================ */

function calculateTimeUsed() {

  const duration =
    (currentTest.duration ||
      CONFIG.durationMinutes) *
    60;

  const used =
    duration -
    remainingSeconds;

  return formatTime(
    Math.max(
      0,
      used
    )
  );

}


/* ============================================================
   RESULT SCREEN
   ============================================================ */

function showResultScreen(
  result,
  autoSubmitted
) {

  const app =
    document.querySelector(
      "#app"
    );

  if (!app) return;

  app.innerHTML = `

    <div class="result-page">

      <div class="result-card">

        <h1>Test Complete</h1>

        ${
          autoSubmitted
            ? `
              <div class="result-notice">
                Time expired. Your answers were submitted automatically.
              </div>
            `
            : ""
        }

        <div class="result-main-score">

          <span class="score-number">
            ${result.total}
          </span>

          <span class="score-total">
            / ${result.totalQuestions}
          </span>

        </div>

        <div class="result-band">

          <span>
            IELTS Reading Band
          </span>

          <strong>
            ${result.band.toFixed(1)}
          </strong>

        </div>

        <div class="result-parts">

          ${renderPartScore(
            "Part 1",
            result.part1
          )}

          ${renderPartScore(
            "Part 2",
            result.part2
          )}

          ${renderPartScore(
            "Part 3",
            result.part3
          )}

          ${renderPartScore(
            "Part 4",
            result.part4
          )}

        </div>

        <div class="result-time">

          Time Used:
          <strong>
            ${result.timeUsed}
          </strong>

        </div>

        <div class="result-actions">

          <button
            data-action="dashboard"
            class="primary-button"
          >
            Back to Dashboard
          </button>

          <button
            data-action="history"
            class="secondary-button"
          >
            Score History
          </button>

        </div>

        <div id="saveResultStatus">
          Saving result...
        </div>

      </div>

    </div>
  `;

}


function renderPartScore(
  title,
  score
) {

  return `
    <div class="part-score">

      <span>
        ${title}
      </span>

      <strong>
        ${score}
      </strong>

    </div>
  `;

}


/* ============================================================
   SAVE RESULT TO GOOGLE APPS SCRIPT
   ============================================================ */

async function saveResultToAPI(
  result
) {

  if (!currentUser) return;

  const payload = {

    resultId:
      generateResultID(),

    timestamp:
      new Date().toISOString(),

    studentId:
      currentUser.studentId || "",

    username:
      currentUser.username,

    testName:
      currentTest.testId ||
      `Test${currentTestNumber}`,

    part1:
      result.part1,

    part2:
      result.part2,

    part3:
      result.part3,

    part4:
      result.part4,

    totalScore:
      result.total,

    totalQuestions:
      result.totalQuestions,

    band:
      result.band,

    timeUsed:
      result.timeUsed,

    submittedAt:
      new Date().toISOString()

  };

  try {

    const response =
      await apiRequest(
        "saveResult",
        payload
      );

    const status =
      document.querySelector(
        "#saveResultStatus"
      );

    if (status) {

      if (
        response &&
        response.success !== false
      ) {

        status.textContent =
          "Result saved successfully.";

        status.className =
          "success-message";

      } else {

        status.textContent =
          response?.message ||
          "Result could not be saved.";

        status.className =
          "error-message";

      }

    }

  } catch (error) {

    console.error(
      "Save result error:",
      error
    );

    const status =
      document.querySelector(
        "#saveResultStatus"
      );

    if (status) {

      status.textContent =
        "Result calculated, but could not be saved to the server.";

      status.className =
        "error-message";

    }

  }

}


/* ============================================================
   SCORE HISTORY
   ============================================================ */

async function showHistory() {

  if (!currentUser) {
    showLoginScreen();
    return;
  }

  showLoadingScreen(
    "Loading score history..."
  );

  try {

    const response =
      await apiRequest(
        "getHistory",
        {
          studentId:
            currentUser.studentId,

          username:
            currentUser.username
        }
      );

    const results =
      normalizeResults(response);

    renderHistory(
      results
    );

  } catch (error) {

    console.error(
      "History error:",
      error
    );

    showErrorScreen(
      "Unable to load score history."
    );

  }

}


/* ============================================================
   RENDER HISTORY
   ============================================================ */

function renderHistory(
  results
) {

  const app =
    document.querySelector(
      "#app"
    );

  if (!app) return;

  const sorted =
    [...results].sort(
      (a, b) =>
        new Date(
          b.timestamp
        ) -
        new Date(
          a.timestamp
        )
    );

  const totalTests =
    sorted.length;

  const averageScore =
    totalTests
      ? (
          sorted.reduce(
            (sum, item) =>
              sum +
              Number(
                item.totalScore || 0
              ),
            0
          ) /
          totalTests
        ).toFixed(1)
      : "0.0";

  const averageBand =
    totalTests
      ? (
          sorted.reduce(
            (sum, item) =>
              sum +
              Number(
                item.band || 0
              ),
            0
          ) /
          totalTests
        ).toFixed(1)
      : "0.0";


  app.innerHTML = `

    <div class="history-page">

      <header class="dashboard-header">

        <div>

          <h1>
            Score History
          </h1>

          <p>
            ${escapeHTML(
              currentUser.username
            )}
          </p>

        </div>

        <div class="dashboard-actions">

          <button
            data-action="dashboard"
            class="secondary-button"
          >
            Dashboard
          </button>

          <button
            data-action="logout"
            class="secondary-button"
          >
            Logout
          </button>

        </div>

      </header>


      <div class="history-summary">

        <div class="summary-card">
          <span>Tests Completed</span>
          <strong>${totalTests}</strong>
        </div>

        <div class="summary-card">
          <span>Average Score</span>
          <strong>${averageScore}</strong>
        </div>

        <div class="summary-card">
          <span>Average Band</span>
          <strong>${averageBand}</strong>
        </div>

      </div>


      <div class="history-table-container">

        ${
          sorted.length
            ? `
              <table class="history-table">

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Test</th>
                    <th>Part 1</th>
                    <th>Part 2</th>
                    <th>Part 3</th>
                    <th>Part 4</th>
                    <th>Total</th>
                    <th>Band</th>
                    <th>Time</th>
                  </tr>

                </thead>

                <tbody>

                  ${sorted
                    .map(
                      result => `
                        <tr>

                          <td>
                            ${formatDate(
                              result.timestamp
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              result.testName
                            )}
                          </td>

                          <td>
                            ${result.part1}
                          </td>

                          <td>
                            ${result.part2}
                          </td>

                          <td>
                            ${result.part3}
                          </td>

                          <td>
                            ${result.part4}
                          </td>

                          <td>
                            <strong>
                              ${result.totalScore}/${result.totalQuestions || 40}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              ${Number(
                                result.band
                              ).toFixed(1)}
                            </strong>
                          </td>

                          <td>
                            ${escapeHTML(
                              result.timeUsed || "-"
                            )}
                          </td>

                        </tr>
                      `
                    )
                    .join("")}

                </tbody>

              </table>
            `
            : `
              <div class="empty-history">
                No completed tests yet.
              </div>
            `
        }

      </div>

    </div>
  `;

}


/* ============================================================
   API REQUEST
   ============================================================ */

async function apiRequest(
  action,
  data = {}
) {

  const payload = {
    action: action,
    ...data
  };


  /*
   * First try POST.
   */

  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    const text =
      await response.text();

    if (text) {

      try {

        return JSON.parse(
          text
        );

      } catch {

        return {
          success:
            response.ok,

          message:
            text
        };

      }

    }

  } catch (error) {

    console.warn(
      "POST API request failed:",
      error
    );

  }


  /*
   * Fallback to GET.
   */

  const query =
    new URLSearchParams();

  Object.entries(
    payload
  ).forEach(
    ([key, value]) => {

      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (
        typeof value === "object"
      ) {

        query.set(
          key,
          JSON.stringify(
            value
          )
        );

      } else {

        query.set(
          key,
          String(value)
        );

      }

    }
  );


  const response =
    await fetch(
      `${API_URL}?${query.toString()}`,
      {
        method: "GET",
        cache: "no-cache"
      }
    );

  const text =
    await response.text();

  try {

    return JSON.parse(
      text
    );

  } catch {

    return {
      success:
        response.ok,

      message:
        text
    };

  }

}


/* ============================================================
   NORMALIZE HISTORY RESULTS
   ============================================================ */

function normalizeResults(
  response
) {

  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response.map(
      normalizeResult
    );
  }

  if (
    Array.isArray(
      response.results
    )
  ) {

    return response.results.map(
      normalizeResult
    );

  }

  if (
    Array.isArray(
      response.data
    )
  ) {

    return response.data.map(
      normalizeResult
    );

  }

  return [];

}


function normalizeResult(
  result
) {

  return {

    resultId:
      result.resultId ??
      result.ResultID ??
      "",

    timestamp:
      result.timestamp ??
      result.Timestamp ??
      "",

    studentId:
      result.studentId ??
      result.StudentID ??
      "",

    username:
      result.username ??
      result.Username ??
      "",

    testName:
      result.testName ??
      result.TestName ??
      "",

    part1:
      Number(
        result.part1 ??
        result.Part1 ??
        0
      ),

    part2:
      Number(
        result.part2 ??
        result.Part2 ??
        0
      ),

    part3:
      Number(
        result.part3 ??
        result.Part3 ??
        0
      ),

    part4:
      Number(
        result.part4 ??
        result.Part4 ??
        0
      ),

    totalScore:
      Number(
        result.totalScore ??
        result.TotalScore ??
        0
      ),

    totalQuestions:
      Number(
        result.totalQuestions ??
        result.TotalQuestions ??
        40
      ),

    band:
      Number(
        result.band ??
        result.Band ??
        0
      ),

    timeUsed:
      result.timeUsed ??
      result.TimeUsed ??
      "",

    submittedAt:
      result.submittedAt ??
      result.SubmittedAt ??
      ""

  };

}


/* ============================================================
   QUESTION HELPERS
   ============================================================ */

function getAllQuestions(
  test
) {

  if (!test) return [];

  const result = [];

  test.parts.forEach(
    part => {

      part.questionGroups.forEach(
        group => {

          group.questions.forEach(
            question => {

              result.push({
                ...question,
                partNumber:
                  part.partNumber,

                type:
                  group.type
              });

            }
          );

        }
      );

    }
  );

  return result;

}


function getQuestionsFromPart(
  part
) {

  const result = [];

  part.questionGroups.forEach(
    group => {

      group.questions.forEach(
        question => {

          result.push({
            ...question,
            type:
              group.type
          });

        }
      );

    }
  );

  return result;

}


function countQuestions(
  test
) {

  return getAllQuestions(
    test
  ).length;

}


function countUnansweredQuestions() {

  const questions =
    getAllQuestions(
      currentTest
    );

  return questions.filter(
    question =>
      !hasAnswer(
        studentAnswers[
          question.number
        ]
      )
  ).length;

}


function hasAnswer(
  answer
) {

  if (
    answer === undefined ||
    answer === null
  ) {
    return false;
  }

  if (
    Array.isArray(answer)
  ) {
    return answer.length > 0;
  }

  return (
    String(answer).trim() !== ""
  );

}


function partContainsQuestion(
  part,
  number
) {

  return getQuestionsFromPart(
    part
  ).some(
    question =>
      Number(
        question.number
      ) === Number(number)
  );

}


/* ============================================================
   TEST NUMBER
   ============================================================ */

function extractTestNumber(
  testName
) {

  if (!testName) return null;

  const match =
    String(testName).match(
      /(\d+)/
    );

  return match
    ? Number(match[1])
    : null;

}


/* ============================================================
   RESULT ID
   ============================================================ */

function generateResultID() {

  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `R-${Date.now()}-${random}`;

}


/* ============================================================
   LOADING SCREEN
   ============================================================ */

function showLoadingScreen(
  message = "Loading..."
) {

  const app =
    document.querySelector(
      "#app"
    );

  if (!app) return;

  app.innerHTML = `

    <div class="loading-page">

      <div class="loading-spinner"></div>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;

}


/* ============================================================
   ERROR SCREEN
   ============================================================ */

function showErrorScreen(
  message
) {

  const app =
    document.querySelector(
      "#app"
    );

  if (!app) return;

  app.innerHTML = `

    <div class="error-page">

      <div class="error-card">

        <h2>
          Something went wrong
        </h2>

        <p>
          ${escapeHTML(message)}
        </p>

        <button
          data-action="dashboard"
          class="primary-button"
        >
          Back to Dashboard
        </button>

      </div>

    </div>
  `;

}


/* ============================================================
   MESSAGE
   ============================================================ */

function showMessage(
  message,
  type = "info"
) {

  const container =
    document.querySelector(
      "#loginMessage"
    );

  if (!container) {

    alert(message);

    return;
  }

  container.innerHTML = `
    <div class="${type}-message">
      ${escapeHTML(message)}
    </div>
  `;

}


/* ============================================================
   LOADING STATE
   ============================================================ */

function setLoading(
  loading
) {

  const button =
    document.querySelector(
      "#loginForm .primary-button"
    );

  if (!button) return;

  button.disabled =
    loading;

  button.textContent =
    loading
      ? "Logging in..."
      : "Login";

}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function formatDate(
  value
) {

  if (!value) return "-";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return escapeHTML(
      String(value)
    );
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );

}


/* ============================================================
   HTML SECURITY HELPERS
   ============================================================ */

function escapeHTML(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}


function escapeRegExp(
  value
) {

  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

}


/* ============================================================
   EXPORTS
   ============================================================ */

window.IELTSReading = {

  login,
  logout,

  openTest,

  showDashboard,
  showHistory,

  submitTest,

  calculateBand,

  calculateScore,

  loadVocabulary

};
