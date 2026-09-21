/* IELTS Reading Practice - complete frontend */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbzkYktZQFtycRgG3K6Hi6MsvUtP8RsqOq6QxB598FVYefGmpe_oS3R518GZ0821bNbYtw/exec",
    TEST_FOLDER: "./tests/",
    VOCABULARY_FILE: "./data/vocabulary.json",
    TEST_COUNT: 20,
    DEFAULT_DURATION: 60
};

let currentUser = null;
let currentTest = null;
let currentTestNumber = null;
let vocabulary = {};
let studentAnswers = {};
let currentPartIndex = 0;
let timerInterval = null;
let remainingSeconds = 0;
let testStarted = false;
let testSubmitted = false;
let testStartTime = null;
let testElapsedSeconds = 0;
let scoreData = null;
let vocabularyPopupTimeout = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    setupGlobalEvents();
    await loadVocabulary();
    restoreLogin();
});


/* =========================================================
   GLOBAL EVENTS
========================================================= */

function setupGlobalEvents() {

    const q = id => document.getElementById(id);

    const on = (id, event, fn) => {
        const element = q(id);
        if (element) {
            element.addEventListener(event, fn);
        }
    };

    on("loginForm", "submit", handleLogin);
    on("logoutButton", "click", logout);
    on("startTestButton", "click", startTest);
    on("backToDashboardButton", "click", showDashboard);
    on("testBackButton", "click", confirmExitTest);
    on("submitTestButton", "click", confirmSubmitTest);
    on("previousPartButton", "click", previousPart);
    on("nextPartButton", "click", nextPart);
    on("returnDashboardButton", "click", showDashboard);

    on("retakeTestButton", "click", () => {
        if (currentTest) {
            startTest();
        }
    });

    on("refreshHistoryButton", "click", loadHistory);
    on("closeVocabularyPopup", "click", closeVocabularyPopup);
    on("closeConfirmModal", "click", closeConfirmModal);
    on("cancelSubmitButton", "click", closeConfirmModal);
    on("confirmSubmitButton", "click", submitTest);

    document.addEventListener("click", event => {

        if (event.target.closest(".vocabulary-word")) {
            return;
        }

        const popup =
            document.getElementById("vocabularyPopup");

        if (
            popup &&
            popup.style.display !== "none" &&
            !popup.contains(event.target)
        ) {
            closeVocabularyPopup();
        }
    });
}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    const usernameInput =
        document.getElementById("username");

    const passwordInput =
        document.getElementById("password");

    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    console.log(
        "Login username:",
        username
    );

    console.log(
        "Login password entered:",
        password ? "YES" : "NO"
    );

    if (!username) {

        showLoginMessage(
            "Username is required.",
            "error"
        );

        return;
    }

    if (!password) {

        showLoginMessage(
            "Password is required.",
            "error"
        );

        return;
    }

    setLoading(
        true,
        "Logging in..."
    );

    try {

        /*
         * IMPORTANT:
         *
         * Code.gs expects:
         *
         * {
         *   action: "login",
         *   data: {
         *      username: "...",
         *      password: "..."
         *   }
         * }
         */

        const response =
            await apiRequest(
                "login",
                {
                    username: username,
                    password: password
                }
            );

        console.log(
            "Login API response:",
            response
        );

        if (
            !response ||
            response.success !== true
        ) {

            throw new Error(
                response?.message ||
                "Invalid username or password."
            );
        }

        currentUser =
            response.student ||
            response.user ||
            response.data;

        if (!currentUser) {

            currentUser = {
                username: username
            };
        }

        localStorage.setItem(
            "ieltsReadingUser",
            JSON.stringify(currentUser)
        );

        showLoginMessage(
            "",
            ""
        );

        await showDashboard();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showLoginMessage(
            error.message ||
            "Unable to login.",
            "error"
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   RESTORE LOGIN
========================================================= */

function restoreLogin() {

    try {

        const raw =
            localStorage.getItem(
                "ieltsReadingUser"
            );

        if (raw) {

            currentUser =
                JSON.parse(raw);

            if (
                currentUser &&
                currentUser.username
            ) {

                showDashboard();
                return;
            }
        }

    } catch (error) {

        console.warn(
            "Could not restore login:",
            error
        );
    }

    showScreen("loginScreen");
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    stopTimer();

    currentUser = null;
    currentTest = null;
    currentTestNumber = null;

    studentAnswers = {};

    localStorage.removeItem(
        "ieltsReadingUser"
    );

    showScreen("loginScreen");

    const username =
        document.getElementById("username");

    const password =
        document.getElementById("password");

    if (username) {
        username.value = "";
    }

    if (password) {
        password.value = "";
    }

    showLoginMessage("", "");
}


/* =========================================================
   DASHBOARD
========================================================= */

async function showDashboard() {

    stopTimer();

    testStarted = false;
    testSubmitted = false;

    showScreen("dashboardScreen");

    updateDashboardUser();

    renderTestCards();

    await loadHistory();
}


function updateDashboardUser() {

    const element =
        document.getElementById(
            "dashboardUsername"
        );

    if (element) {

        element.textContent =
            currentUser?.username ||
            "Student";
    }
}


function renderTestCards() {

    const box =
        document.getElementById(
            "testCards"
        );

    if (!box) {
        return;
    }

    box.innerHTML = "";

    for (
        let i = 1;
        i <= CONFIG.TEST_COUNT;
        i++
    ) {

        const card =
            document.createElement("div");

        card.className =
            "test-card";

        card.dataset.testNumber =
            i;

        card.innerHTML = `
            <div class="test-card-number">
                Test ${i}
            </div>

            <h3>
                IELTS Reading Test ${i}
            </h3>

            <div class="test-card-info">
                <span>60 minutes</span>
                <span>40 questions</span>
            </div>
        `;

        card.addEventListener(
            "click",
            () => openTest(i)
        );

        box.appendChild(card);
    }
}


/* =========================================================
   OPEN TEST
========================================================= */

async function openTest(testNumber) {

    setLoading(
        true,
        "Loading test..."
    );

    try {

        const response =
            await fetch(
                `${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Test${testNumber}.json could not be loaded (${response.status}).`
            );
        }

        const data =
            await response.json();

        validateTest(data);

        currentTest =
            data;

        currentTestNumber =
            testNumber;

        studentAnswers = {};

        currentPartIndex = 0;

        testSubmitted = false;

        showTestIntroduction();

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not load test."
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   VALIDATE TEST
========================================================= */

function validateTest(test) {

    if (
        !test ||
        !Array.isArray(test.parts) ||
        !test.parts.length
    ) {

        throw new Error(
            "Invalid test JSON: parts are missing."
        );
    }

    test.parts.forEach(
        (part, index) => {

            if (!part.passage) {

                throw new Error(
                    `Part ${index + 1} is missing passage.`
                );
            }

            if (
                !Array.isArray(
                    part.questionGroups
                )
            ) {

                part.questionGroups = [];
            }
        }
    );
}


/* =========================================================
   TEST INTRODUCTION
========================================================= */

function showTestIntroduction() {

    showScreen(
        "introScreen"
    );

    const set = (id, value) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    set(
        "introTestNumber",
        currentTest.testId ||
        `Test ${currentTestNumber}`
    );

    set(
        "introTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );

    set(
        "introDuration",
        `${currentTest.duration || CONFIG.DEFAULT_DURATION} minutes`
    );

    set(
        "introQuestions",
        countTotalQuestions()
    );

    set(
        "introParts",
        currentTest.parts.length
    );
}


/* =========================================================
   START TEST
========================================================= */

function startTest() {

    if (!currentTest) {
        return;
    }

    studentAnswers = {};

    loadSavedAnswers();

    currentPartIndex = 0;

    testStarted = true;
    testSubmitted = false;

    testStartTime =
        Date.now();

    remainingSeconds =
        (
            Number(
                currentTest.duration
            ) ||
            CONFIG.DEFAULT_DURATION
        ) * 60;

    testElapsedSeconds = 0;

    showScreen("testScreen");

    renderCurrentPart();

    startTimer();
}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    stopTimer();

    updateTimerDisplay();

    timerInterval =
        setInterval(() => {

            remainingSeconds--;

            updateTimerDisplay();

            if (
                remainingSeconds <= 0
            ) {

                remainingSeconds = 0;

                stopTimer();

                autoSubmitTest();
            }

        }, 1000);
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

    const element =
        document.getElementById(
            "timer"
        );

    if (element) {

        element.textContent =
            formatTime(
                remainingSeconds
            );
    }
}


/* =========================================================
   RENDER CURRENT PART
========================================================= */

function renderCurrentPart() {

    if (!currentTest) {
        return;
    }

    const part =
        currentTest.parts[
            currentPartIndex
        ];

    const set = (id, value) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    set(
        "testHeaderTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );

    set(
        "testHeaderPart",
        `Part ${
            part.partNumber ||
            currentPartIndex + 1
        }`
    );

    set(
        "passagePartLabel",
        `Part ${
            part.partNumber ||
            currentPartIndex + 1
        }`
    );

    set(
        "passageTitle",
        part.passage.title || ""
    );

    set(
        "questionsPartLabel",
        `Questions ${questionRangeForPart(part)}`
    );

    set(
        "partIndicator",
        `Part ${
            currentPartIndex + 1
        } of ${
            currentTest.parts.length
        }`
    );

    renderPassage(
        part.passage
    );

    renderQuestions(
        part
    );

    renderQuestionNavigator();

    updatePartButtons();

    scrollTestPanelsToTop();
}


function questionRangeForPart(part) {

    const numbers = [];

    (
        part.questionGroups || []
    ).forEach(group => {

        (
            group.questions || []
        ).forEach(question => {

            numbers.push(
                Number(question.number)
            );
        });
    });

    if (!numbers.length) {
        return "";
    }

    return `${Math.min(...numbers)}-${Math.max(...numbers)}`;
}


/* =========================================================
   PASSAGE
========================================================= */

function renderPassage(passage) {

    const box =
        document.getElementById(
            "passageContent"
        );

    if (!box) {
        return;
    }

    box.innerHTML =
        (
            passage.paragraphs || []
        )
        .map(
            paragraph => `
                <p class="passage-paragraph">
                    <span class="paragraph-label">
                        ${escapeHTML(
                            paragraph.id || ""
                        )}
                    </span>

                    ${highlightVocabulary(
                        paragraph.text || ""
                    )}
                </p>
            `
        )
        .join("");

    box
        .querySelectorAll(
            ".vocabulary-word"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    showVocabularyPopup(
                        element.dataset.word,
                        element
                    );
                }
            );
        });
}


function highlightVocabulary(text) {

    let result =
        escapeHTML(text);

    const words =
        Object.keys(vocabulary)
            .sort(
                (a, b) =>
                    b.length - a.length
            );

    for (
        const word of words
    ) {

        const regex =
            new RegExp(
                `(?<![A-Za-z])(${escapeRegExp(
                    word
                )})(?![A-Za-z])`,
                "gi"
            );

        result =
            result.replace(
                regex,
                match => `
                    <span
                        class="vocabulary-word"
                        data-word="${escapeAttribute(
                            match
                        )}"
                    >
                        ${match}
                    </span>
                `
            );
    }

    return result;
}


/* =========================================================
   VOCABULARY
========================================================= */

function findVocabularyKey(word) {

    const target =
        String(word).toLowerCase();

    return (
        Object.keys(vocabulary)
            .find(
                key =>
                    key.toLowerCase() ===
                    target
            ) ||
        word
    );
}


async function loadVocabulary() {

    try {

        const response =
            await fetch(
                `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Vocabulary file returned ${response.status}`
            );
        }

        const data =
            await response.json();

        vocabulary =
            data.words ||
            data ||
            {};

    } catch (error) {

        vocabulary = {};

        console.warn(
            "Vocabulary file could not be loaded.",
            error
        );
    }
}


function showVocabularyPopup(
    word,
    target
) {

    const key =
        findVocabularyKey(word);

    const item =
        vocabulary[key] || {};

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (!popup) {
        return;
    }

    const wordElement =
        document.getElementById(
            "vocabularyWord"
        );

    const meaningElement =
        document.getElementById(
            "vocabularyMeaning"
        );

    const simpleElement =
        document.getElementById(
            "vocabularySimpleMeaning"
        );

    if (wordElement) {
        wordElement.textContent =
            word;
    }

    if (meaningElement) {

        meaningElement.textContent =
            item.meaning ||
            "Meaning not available.";
    }

    if (simpleElement) {

        simpleElement.textContent =
            item.simpleMeaning ||
            "";
    }

    popup.style.display =
        "block";

    positionVocabularyPopup(
        target
    );

    clearTimeout(
        vocabularyPopupTimeout
    );

    vocabularyPopupTimeout =
        setTimeout(
            closeVocabularyPopup,
            7000
        );
}


function positionVocabularyPopup(
    target
) {

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (!popup || !target) {
        return;
    }

    popup.style.left = "50%";
    popup.style.bottom = "30px";
    popup.style.transform =
        "translateX(-50%)";
}


function closeVocabularyPopup() {

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (popup) {
        popup.style.display =
            "none";
    }

    clearTimeout(
        vocabularyPopupTimeout
    );
}


/* =========================================================
   QUESTIONS
========================================================= */

function renderQuestions(part) {

    const box =
        document.getElementById(
            "questionsContent"
        );

    if (!box) {
        return;
    }

    box.innerHTML = "";

    (
        part.questionGroups || []
    )
    .forEach(group => {

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "question-group";

        const title =
            group.questionRange
                ? `Questions ${escapeHTML(
                    group.questionRange
                )}`
                : "";

        wrapper.innerHTML = `
            <h3 class="question-group-title">
                ${title}
            </h3>

            <p class="question-instructions">
                ${escapeHTML(
                    group.instructions || ""
                )}
            </p>
        `;

        const content =
            document.createElement(
                "div"
            );

        wrapper.appendChild(
            content
        );

        switch (group.type) {

            case "true_false_not_given":
                renderTrueFalseNotGiven(
                    content,
                    group
                );
                break;

            case "yes_no_not_given":
                renderYesNoNotGiven(
                    content,
                    group
                );
                break;

            case "fill_blank":
                renderFillBlank(
                    content,
                    group
                );
                break;

            case "summary_completion":
                renderSummaryCompletion(
                    content,
                    group
                );
                break;

            case "multiple_choice":
                renderMultipleChoice(
                    content,
                    group
                );
                break;

            case "multiple_choice_multiple":
                renderMultipleChoiceMultiple(
                    content,
                    group
                );
                break;

            case "matching_headings":
                renderMatchingHeadings(
                    content,
                    group
                );
                break;

            case "matching_information":
                renderMatchingInformation(
                    content,
                    group
                );
                break;

            case "matching_features":
                renderMatchingFeatures(
                    content,
                    group
                );
                break;

            case "answer_box":
                renderAnswerBox(
                    content,
                    group
                );
                break;

            default:
                renderUnsupportedGroup(
                    content,
                    group
                );
        }

        box.appendChild(
            wrapper
        );
    });

    restoreAnswers();
}


/* =========================================================
   TRUE / FALSE / NOT GIVEN
========================================================= */

function renderTrueFalseNotGiven(
    box,
    group
) {

    (
        group.questions || []
    )
    .forEach(question => {

        box.appendChild(
            createQuestionItem(
                question,
                [
                    "TRUE",
                    "FALSE",
                    "NOT GIVEN"
                ]
            )
        );
    });
}


/* =========================================================
   YES / NO / NOT GIVEN
========================================================= */

function renderYesNoNotGiven(
    box,
    group
) {

    (
        group.questions || []
    )
    .forEach(question => {

        box.appendChild(
            createQuestionItem(
                question,
                [
                    "YES",
                    "NO",
                    "NOT GIVEN"
                ]
            )
        );
    });
}


/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(
    box,
    group
) {

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        element.querySelector(
            ".question-control"
        ).innerHTML = `
            <input
                type="text"
                data-question-number="${question.number}"
                placeholder="Type your answer"
            >
        `;

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummaryCompletion(
    box,
    group
) {

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "summary-box";

    let text =
        group.summary ||
        group.text ||
        group.instructions ||
        "";

    let index = 0;

    text =
        escapeHTML(text)
            .replace(
                /_{2,}/g,
                () => {

                    const question =
                        (
                            group.questions ||
                            []
                        )[index++];

                    return `
                        <input
                            type="text"
                            data-question-number="${
                                question
                                    ? question.number
                                    : ""
                            }"
                            placeholder="Answer"
                        >
                    `;
                }
            );

    wrapper.innerHTML =
        text;

    box.appendChild(
        wrapper
    );
}


/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(
    box,
    group
) {

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        const control =
            element.querySelector(
                ".question-control"
            );

        control.innerHTML =
            createSelectOptions(
                question.options || []
            );

        const select =
            control.querySelector(
                "select"
            );

        if (select) {

            select.dataset.questionNumber =
                question.number;

            select.addEventListener(
                "change",
                handleAnswerChange
            );
        }

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   MULTIPLE CHOICE - TWO SEPARATE QUESTIONS
========================================================= */

function renderMultipleChoiceMultiple(
    box,
    group
) {

    /*
     * Example:
     *
     * Q27 -> A
     * Q28 -> D
     *
     * Each question gets ONE select.
     *
     * Scoring later treats the answers
     * as an unordered pair.
     */

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        const control =
            element.querySelector(
                ".question-control"
            );

        control.innerHTML =
            createSelectOptions(
                group.options ||
                question.options ||
                []
            );

        const select =
            control.querySelector(
                "select"
            );

        if (select) {

            select.dataset.questionNumber =
                question.number;

            select.addEventListener(
                "change",
                handleAnswerChange
            );
        }

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   MATCHING HEADINGS
========================================================= */

function renderMatchingHeadings(
    box,
    group
) {

    const options =
        group.options ||
        group.headings ||
        [];

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        const control =
            element.querySelector(
                ".question-control"
            );

        control.innerHTML =
            createSelectOptions(
                options
            );

        const select =
            control.querySelector(
                "select"
            );

        if (select) {

            select.dataset.questionNumber =
                question.number;

            select.addEventListener(
                "change",
                handleAnswerChange
            );
        }

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   MATCHING INFORMATION
========================================================= */

function renderMatchingInformation(
    box,
    group
) {

    const options =
        group.options ||
        getParagraphLetters();

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        const control =
            element.querySelector(
                ".question-control"
            );

        control.innerHTML =
            createSelectOptions(
                options
            );

        const select =
            control.querySelector(
                "select"
            );

        if (select) {

            select.dataset.questionNumber =
                question.number;

            select.addEventListener(
                "change",
                handleAnswerChange
            );
        }

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   MATCHING FEATURES
========================================================= */

function renderMatchingFeatures(
    box,
    group
) {

    const options =
        group.options || [];

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        const control =
            element.querySelector(
                ".question-control"
            );

        control.innerHTML =
            createSelectOptions(
                options
            );

        const select =
            control.querySelector(
                "select"
            );

        if (select) {

            select.dataset.questionNumber =
                question.number;

            select.addEventListener(
                "change",
                handleAnswerChange
            );
        }

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   ANSWER BOX
========================================================= */

function renderAnswerBox(
    box,
    group
) {

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        element.querySelector(
            ".question-control"
        ).innerHTML = `
            <input
                type="text"
                data-question-number="${question.number}"
                placeholder="Your answer"
            >
        `;

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   UNSUPPORTED QUESTION
========================================================= */

function renderUnsupportedGroup(
    box,
    group
) {

    (
        group.questions || []
    )
    .forEach(question => {

        const element =
            createQuestionItem(
                question
            );

        element.querySelector(
            ".question-control"
        ).innerHTML = `
            <input
                type="text"
                data-question-number="${question.number}"
                placeholder="Your answer"
            >
        `;

        box.appendChild(
            element
        );
    });
}


/* =========================================================
   QUESTION ITEM
========================================================= */

function createQuestionItem(
    question,
    radioOptions = null
) {

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "question";

    wrapper.dataset.questionNumber =
        question.number;

    wrapper.innerHTML = `
        <div class="question-text">

            <span class="question-number">
                ${question.number}.
            </span>

            ${escapeHTML(
                question.text || ""
            )}

        </div>

        <div class="question-control">
        </div>
    `;

    const control =
        wrapper.querySelector(
            ".question-control"
        );

    if (radioOptions) {

        control.innerHTML =
            radioOptions
                .map(
                    option => `
                        <label class="option-item">

                            <input
                                type="radio"
                                name="q${question.number}"
                                value="${escapeAttribute(
                                    option
                                )}"
                                data-question-number="${question.number}"
                            >

                            <span>
                                ${escapeHTML(
                                    option
                                )}
                            </span>

                        </label>
                    `
                )
                .join("");

        control
            .querySelectorAll("input")
            .forEach(
                input => {

                    input.addEventListener(
                        "change",
                        handleAnswerChange
                    );
                }
            );
    }

    return wrapper;
}


/* =========================================================
   SELECT OPTIONS
========================================================= */

function createSelect(
    options
) {

    return createSelectOptions(
        options
    );
}


function createSelectOptions(
    options
) {

    const result = [
        `<option value="">Select...</option>`
    ];

    (
        options || []
    )
    .forEach(option => {

        let value;
        let text;

        if (
            typeof option ===
            "object"
        ) {

            value =
                option.letter ??
                option.value ??
                option.id ??
                option.text;

            text =
                option.text ??
                option.label ??
                option.value ??
                option.letter;

        } else {

            value = option;
            text = option;
        }

        result.push(`
            <option value="${escapeAttribute(
                value
            )}">
                ${escapeHTML(
                    text
                )}
            </option>
        `);
    });

    return `
        <select
            class="question-control-select"
            data-question-number=""
        >
            ${result.join("")}
        </select>
    `;
}


function addEmptyOption(
    select
) {

    if (
        select &&
        !select.querySelector(
            'option[value=""]'
        )
    ) {

        select.insertAdjacentHTML(
            "afterbegin",
            '<option value="">Select...</option>'
        );
    }
}


/* =========================================================
   PARAGRAPH LETTERS
========================================================= */

function getParagraphLetters() {

    return (
        currentTest
            ?.parts
            ?.[
                currentPartIndex
            ]
            ?.passage
            ?.paragraphs
            ?.map(
                paragraph =>
                    paragraph.id
            )
            .filter(Boolean) ||
        []
    );
}


/* =========================================================
   ANSWER CHANGE
========================================================= */

function handleAnswerChange(
    event
) {

    const element =
        event.target;

    const number =
        Number(
            element.dataset.questionNumber
        );

    if (!number) {
        return;
    }

    if (
        element.type === "radio"
    ) {

        if (element.checked) {

            studentAnswers[number] =
                element.value;
        }

    } else {

        studentAnswers[number] =
            element.value;
    }

    saveAnswersToStorage();

    updateQuestionNavigator();
}


/* =========================================================
   SAVE VISIBLE ANSWERS
========================================================= */

function saveAllVisibleAnswers() {

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(element => {

            const number =
                Number(
                    element.dataset.questionNumber
                );

            if (!number) {
                return;
            }

            if (
                element.type ===
                "radio"
            ) {

                if (
                    element.checked
                ) {

                    studentAnswers[number] =
                        element.value;
                }

            } else if (
                element.tagName ===
                    "SELECT" ||
                element.tagName ===
                    "INPUT"
            ) {

                if (
                    element.value !== ""
                ) {

                    studentAnswers[number] =
                        element.value;
                }
            }
        });

    saveAnswersToStorage();
}


/* =========================================================
   RESTORE ANSWERS
========================================================= */

function restoreAnswers() {

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(element => {

            const number =
                Number(
                    element.dataset.questionNumber
                );

            const value =
                studentAnswers[number];

            if (
                value === undefined
            ) {

                return;
            }

            if (
                element.type ===
                "radio"
            ) {

                element.checked =
                    element.value ===
                    value;

            } else {

                element.value =
                    value;
            }
        });

    updateQuestionNavigator();
}


/* =========================================================
   ANSWERS STORAGE
========================================================= */

function saveAnswersToStorage() {

    if (!currentTestNumber) {
        return;
    }

    try {

        const key =
            `ieltsAnswers_${
                currentUser?.studentId ||
                currentUser?.studentID ||
                currentUser?.username ||
                "student"
            }_${currentTestNumber}`;

        localStorage.setItem(
            key,
            JSON.stringify(
                studentAnswers
            )
        );

    } catch (error) {

        console.warn(
            "Could not save answers:",
            error
        );
    }
}


function loadSavedAnswers() {

    try {

        const key =
            `ieltsAnswers_${
                currentUser?.studentId ||
                currentUser?.studentID ||
                currentUser?.username ||
                "student"
            }_${currentTestNumber}`;

        const raw =
            localStorage.getItem(
                key
            );

        if (raw) {

            studentAnswers =
                JSON.parse(raw) || {};
        }

    } catch (error) {

        studentAnswers = {};
    }
}


/* =========================================================
   QUESTION NAVIGATOR
========================================================= */

function renderQuestionNavigator() {

    const nav =
        document.getElementById(
            "questionNavigator"
        );

    if (!nav) {
        return;
    }

    nav.innerHTML =
        getAllQuestionNumbers()
            .map(
                number => `
                    <button
                        class="question-nav-item"
                        data-question-nav="${number}"
                    >
                        ${number}
                    </button>
                `
            )
            .join("");

    nav
        .querySelectorAll("button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    jumpToQuestion(
                        Number(
                            button.dataset.questionNav
                        )
                    )
            );
        });

    updateQuestionNavigator();
}


function updateQuestionNavigator() {

    const nav =
        document.getElementById(
            "questionNavigator"
        );

    if (!nav) {
        return;
    }

    nav
        .querySelectorAll(
            "[data-question-nav]"
        )
        .forEach(button => {

            const number =
                Number(
                    button.dataset.questionNav
                );

            button.classList.toggle(
                "answered",
                isQuestionAnswered(
                    number
                )
            );
        });
}


function isQuestionAnswered(
    number
) {

    const value =
        studentAnswers[number];

    return (
        value !== undefined &&
        String(value).trim() !== ""
    );
}


function jumpToQuestion(
    number
) {

    const element =
        document.querySelector(
            `[data-question-number="${number}"]`
        );

    if (element) {

        element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


/* =========================================================
   QUESTION HELPERS
========================================================= */

function findQuestionLocation(
    number
) {

    for (
        let i = 0;
        i < (
            currentTest?.parts ||
            []
        ).length;
        i++
    ) {

        for (
            const group of
            currentTest.parts[i]
                .questionGroups ||
            []
        ) {

            if (
                (
                    group.questions ||
                    []
                )
                .some(
                    question =>
                        Number(
                            question.number
                        ) ===
                        Number(number)
                )
            ) {

                return i;
            }
        }
    }

    return -1;
}


function getAllQuestionNumbers() {

    const numbers = [];

    (
        currentTest?.parts ||
        []
    )
    .forEach(part => {

        (
            part.questionGroups ||
            []
        )
        .forEach(group => {

            (
                group.questions ||
                []
            )
            .forEach(question => {

                numbers.push(
                    Number(
                        question.number
                    )
                );
            });
        });
    });

    return numbers.sort(
        (a, b) => a - b
    );
}


function countTotalQuestions() {

    return getAllQuestionNumbers()
        .length;
}


/* =========================================================
   PART NAVIGATION
========================================================= */

function nextPart() {

    saveAllVisibleAnswers();

    if (
        currentPartIndex <
        currentTest.parts.length - 1
    ) {

        currentPartIndex++;

        renderCurrentPart();

    } else {

        confirmSubmitTest();
    }
}


function previousPart() {

    saveAllVisibleAnswers();

    if (
        currentPartIndex > 0
    ) {

        currentPartIndex--;

        renderCurrentPart();
    }
}


function updatePartButtons() {

    const previous =
        document.getElementById(
            "previousPartButton"
        );

    const next =
        document.getElementById(
            "nextPartButton"
        );

    if (previous) {

        previous.disabled =
            currentPartIndex === 0;
    }

    if (next) {

        next.textContent =
            currentPartIndex ===
            currentTest.parts.length - 1
                ? "Submit Test →"
                : "Next Part →";
    }
}


function scrollTestPanelsToTop() {

    [
        "passagePanel",
        "questionsPanel"
    ]
    .forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.scrollTop = 0;
        }
    });
}


/* =========================================================
   SUBMIT / EXIT
========================================================= */

function confirmSubmitTest() {

    if (testSubmitted) {
        return;
    }

    openConfirmModal();
}


function confirmExitTest() {

    if (
        !testStarted ||
        testSubmitted
    ) {

        showDashboard();

        return;
    }

    if (
        confirm(
            "Leave this test? Your current test will not be submitted."
        )
    ) {

        stopTimer();

        showDashboard();
    }
}


function openConfirmModal() {

    const modal =
        document.getElementById(
            "confirmModal"
        );

    if (modal) {
        modal.style.display =
            "flex";
    }
}


function closeConfirmModal() {

    const modal =
        document.getElementById(
            "confirmModal"
        );

    if (modal) {
        modal.style.display =
            "none";
    }
}


function autoSubmitTest() {

    if (testSubmitted) {
        return;
    }

    showToast(
        "Time is up. Your test will be submitted automatically."
    );

    submitTest();
}


async function submitTest() {

    if (testSubmitted) {
        return;
    }

    saveAllVisibleAnswers();

    closeConfirmModal();

    stopTimer();

    testSubmitted = true;

    testElapsedSeconds =
        calculateTimeUsed();

    scoreData =
        calculateScore();

    await saveResultToAPI();

    renderResult();

    clearCurrentTestAnswers();
}


/* =========================================================
   TIME
========================================================= */

function calculateTimeUsed() {

    if (!testStartTime) {
        return 0;
    }

    return Math.max(
        0,
        Math.floor(
            (
                Date.now() -
                testStartTime
            ) / 1000
        )
    );
}


/* =========================================================
   SCORING
========================================================= */

function calculateScore() {

    let total = 0;

    const partScores = [];

    (
        currentTest.parts ||
        []
    )
    .forEach(part => {

        let partScore = 0;

        (
            part.questionGroups ||
            []
        )
        .forEach(group => {

            const questions =
                group.questions || [];

            /*
             * Q27-Q28:
             *
             * Q27 = A
             * Q28 = D
             *
             * A/D and D/A are both accepted.
             */

            if (
                group.type ===
                "multiple_choice_multiple"
            ) {

                const correct =
                    questions
                        .map(
                            question =>
                                String(
                                    question.answer ??
                                    ""
                                )
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                        .sort();

                const given =
                    questions
                        .map(
                            question =>
                                String(
                                    studentAnswers[
                                        question.number
                                    ] ??
                                    ""
                                )
                                .trim()
                                .toUpperCase()
                        )
                        .filter(Boolean)
                        .sort();

                if (
                    correct.length ===
                        questions.length &&
                    arraysEqual(
                        correct,
                        given
                    )
                ) {

                    partScore +=
                        questions.length;
                }

            } else {

                questions.forEach(
                    question => {

                        if (
                            answersMatch(
                                studentAnswers[
                                    question.number
                                ],
                                question.answer
                            )
                        ) {

                            partScore++;
                        }
                    }
                );
            }
        });

        partScores.push(
            partScore
        );

        total +=
            partScore;
    });

    return {

        totalScore:
            total,

        totalQuestions:
            countTotalQuestions(),

        partScores:
            partScores,

        band:
            calculateIELTSBand(
                total
            ),

        timeUsed:
            formatTime(
                testElapsedSeconds
            )
    };
}


function answersMatch(
    given,
    correct
) {

    if (
        given === undefined ||
        given === null ||
        correct === undefined ||
        correct === null
    ) {

        return false;
    }

    const givenNormalized =
        normalizeAnswer(
            given
        );

    if (
        Array.isArray(correct)
    ) {

        return correct.some(
            answer =>
                normalizeAnswer(
                    answer
                ) ===
                givenNormalized
        );
    }

    return (
        givenNormalized ===
        normalizeAnswer(
            correct
        )
    );
}


function normalizeAnswer(
    value
) {

    return String(
        value ?? ""
    )
    .trim()
    .replace(
        /\s+/g,
        " "
    )
    .toLowerCase();
}


function arraysEqual(
    a,
    b
) {

    return (
        a.length ===
        b.length &&
        a.every(
            (value, index) =>
                value ===
                b[index]
        )
    );
}


/* =========================================================
   IELTS ACADEMIC READING BAND
========================================================= */

function calculateIELTSBand(
    score
) {

    if (score >= 39) return 9.0;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8.0;
    if (score >= 33) return 7.5;
    if (score >= 30) return 7.0;
    if (score >= 27) return 6.5;
    if (score >= 23) return 6.0;
    if (score >= 19) return 5.5;
    if (score >= 15) return 5.0;
    if (score >= 13) return 4.5;
    if (score >= 10) return 4.0;
    if (score >= 8) return 3.5;
    if (score >= 6) return 3.0;
    if (score >= 4) return 2.5;
    if (score >= 2) return 2.0;
    if (score === 1) return 1.0;

    return 0;
}


/* =========================================================
   SAVE RESULT
========================================================= */

async function saveResultToAPI() {

    if (!currentUser) {
        return;
    }

    const studentId =
        currentUser.studentId ||
        currentUser.studentID ||
        currentUser.StudentID ||
        currentUser.id ||
        currentUser.ID ||
        "";

    const resultData = {

        studentId:
            studentId,

        username:
            currentUser.username ||
            "",

        testName:
            currentTest?.title ||
            `Test ${currentTestNumber}`,

        part1:
            scoreData?.partScores?.[0] ||
            0,

        part2:
            scoreData?.partScores?.[1] ||
            0,

        part3:
            scoreData?.partScores?.[2] ||
            0,

        part4:
            scoreData?.partScores?.[3] ||
            0,

        totalScore:
            scoreData?.totalScore ||
            0,

        totalQuestions:
            scoreData?.totalQuestions ||
            0,

        band:
            scoreData?.band ||
            0,

        timeUsed:
            scoreData?.timeUsed ||
            "",

        submittedAt:
            new Date().toISOString()
    };

    try {

        const response =
            await apiRequest(
                "saveResult",
                resultData
            );

        if (
            !response?.success
        ) {

            console.warn(
                "Result save failed:",
                response?.message
            );
        }

    } catch (error) {

        console.error(
            "Result save error:",
            error
        );
    }
}


/* =========================================================
   RESULT
========================================================= */

function renderResult() {

    showScreen(
        "resultScreen"
    );

    const set = (
        id,
        value
    ) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                value;
        }
    };

    set(
        "resultTestTitle",
        currentTest?.title ||
        `Test ${currentTestNumber}`
    );

    set(
        "resultScore",
        scoreData.totalScore
    );

    set(
        "resultTotal",
        `/ ${scoreData.totalQuestions}`
    );

    set(
        "resultBand",
        Number(
            scoreData.band
        ).toFixed(1)
    );

    set(
        "resultTime",
        scoreData.timeUsed
    );

    renderPartScores();

    const status =
        document.getElementById(
            "resultSaveStatus"
        );

    if (status) {

        status.textContent =
            "Result submitted.";
    }
}


function renderPartScores() {

    const box =
        document.getElementById(
            "partScores"
        );

    if (!box) {
        return;
    }

    box.innerHTML =
        scoreData.partScores
            .map(
                (score, index) => `
                    <div class="part-score">

                        <span class="part-score-label">
                            Part ${index + 1}
                        </span>

                        <span class="part-score-value">
                            ${score}
                        </span>

                    </div>
                `
            )
            .join("");
}


function clearCurrentTestAnswers() {

    try {

        const key =
            `ieltsAnswers_${
                currentUser?.studentId ||
                currentUser?.studentID ||
                currentUser?.username ||
                "student"
            }_${currentTestNumber}`;

        localStorage.removeItem(
            key
        );

    } catch (error) {
        console.warn(error);
    }

    studentAnswers = {};
}


/* =========================================================
   HISTORY
========================================================= */

async function loadHistory() {

    const body =
        document.getElementById(
            "historyTableBody"
        );

    if (
        !body ||
        !currentUser
    ) {

        return;
    }

    try {

        const studentId =
            currentUser.studentId ||
            currentUser.studentID ||
            currentUser.StudentID ||
            currentUser.id ||
            "";

        const response =
            await apiRequest(
                "getHistory",
                {
                    username:
                        currentUser.username ||
                        "",

                    studentId:
                        studentId
                }
            );

        if (
            !response?.success
        ) {

            throw new Error(
                response?.message ||
                "Could not load history."
            );
        }

        renderHistory(
            response.history ||
            []
        );

    } catch (error) {

        console.error(
            "History error:",
            error
        );

        renderHistory([]);
    }
}


function renderHistory(
    history
) {

    const body =
        document.getElementById(
            "historyTableBody"
        );

    const empty =
        document.getElementById(
            "noHistoryMessage"
        );

    if (!body) {
        return;
    }

    if (!history.length) {

        body.innerHTML = "";

        if (empty) {
            empty.style.display =
                "block";
        }

        return;
    }

    if (empty) {
        empty.style.display =
            "none";
    }

    body.innerHTML =
        history
            .map(
                result => `
                    <tr>

                        <td>
                            ${escapeHTML(
                                formatDate(
                                    result.timestamp ||
                                    result.submittedAt
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result.testName ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result.totalScore ??
                                0
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result.totalQuestions ??
                                0
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result.band ??
                                0
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result.timeUsed ||
                                ""
                            )}
                        </td>

                    </tr>
                `
            )
            .join("");
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(
    action,
    data = {}
) {

    /*
     * IMPORTANT:
     *
     * Code.gs expects:
     *
     * POST:
     *
     * {
     *   action: "login",
     *   data: {
     *      username: "...",
     *      password: "..."
     *   }
     * }
     */

    const requestBody = {

        action:
            action,

        data:
            data || {}
    };


    /* =====================================================
       POST
    ===================================================== */

    try {

        const response =
            await fetch(
                CONFIG.API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );

        const text =
            await response.text();

        let json;

        try {

            json =
                JSON.parse(
                    text
                );

        } catch (error) {

            console.error(
                "Invalid POST response:",
                text
            );

            throw new Error(
                "The API returned an invalid response."
            );
        }

        return json;

    } catch (postError) {

        console.warn(
            "POST API request failed. Trying GET...",
            postError
        );
    }


    /* =====================================================
       GET FALLBACK
    ===================================================== */

    const params =
        new URLSearchParams();

    params.set(
        "action",
        action
    );

    params.set(
        "data",
        JSON.stringify(
            data || {}
        )
    );

    const response =
        await fetch(
            `${CONFIG.API_URL}?${params.toString()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

    const text =
        await response.text();

    try {

        return JSON.parse(
            text
        );

    } catch (error) {

        console.error(
            "Invalid GET response:",
            text
        );

        throw new Error(
            "The API returned an invalid response."
        );
    }
}


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(
    id
) {

    document
        .querySelectorAll(
            ".screen"
        )
        .forEach(
            element => {

                element.style.display =
                    "none";
            }
        );

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    if (
        id === "loginScreen"
    ) {

        element.style.display =
            "flex";

    } else {

        element.style.display =
            "block";
    }
}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
    show,
    text = "Loading..."
) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );

    const loadingText =
        document.getElementById(
            "loadingText"
        );

    if (loadingText) {

        loadingText.textContent =
            text;
    }

    if (overlay) {

        overlay.style.display =
            show
                ? "flex"
                : "none";
    }
}


/* =========================================================
   LOGIN MESSAGE
========================================================= */

function showLoginMessage(
    message,
    type = ""
) {

    const element =
        document.getElementById(
            "loginMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        `form-message ${type}`;

    element.style.display =
        message
            ? "block"
            : "none";
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            "toast"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.style.display =
        "block";

    clearTimeout(
        vocabularyPopupTimeout
    );

    vocabularyPopupTimeout =
        setTimeout(
            () => {

                element.style.display =
                    "none";

            },
            3500
        );
}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Number(seconds) || 0
        );

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        Math.floor(
            seconds % 60
        );

    if (hours) {

        return (
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(secs).padStart(2, "0")}`
        );
    }

    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}`
    );
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }

    return date.toLocaleString();
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


/* =========================================================
   ESCAPE REGEX
========================================================= */

function escapeRegExp(
    value
) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}


/* =========================================================
   DEBUG EXPORT
========================================================= */

window.IELTSReading = {

    openTest,

    startTest,

    submitTest,

    calculateScore,

    showDashboard,

    logout,

    getCurrentTest:
        () => currentTest,

    getAnswers:
        () => studentAnswers
};
