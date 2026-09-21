/* =========================================================
   IELTS READING PRACTICE WEBSITE
   COMPLETE app.js
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const CONFIG = {

    API_URL:
        "https://script.google.com/macros/s/AKfycbzkYktZQFtycRgG3K6Hi6MsvUtP8RsqOq6QxB598FVYefGmpe_oS3R518GZ0821bNbYtw/exec",

    TEST_FOLDER:
        "./tests/",

    VOCABULARY_FILE:
        "./data/vocabulary.json",

    TEST_COUNT:
        20,

    DEFAULT_DURATION:
        60
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

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


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        setupGlobalEvents();

        await loadVocabulary();

        restoreLogin();

    }
);


/* =========================================================
   GLOBAL EVENTS
   ========================================================= */

function setupGlobalEvents() {

    const loginForm =
        document.querySelector("#loginForm") ||
        document.querySelector('form[action*="login"]') ||
        document.querySelector("form");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    addClick(
        "logoutButton",
        logout
    );

    addClick(
        "startTestButton",
        startTest
    );

    addClick(
        "backToDashboardButton",
        showDashboard
    );

    addClick(
        "testBackButton",
        confirmExitTest
    );

    addClick(
        "submitTestButton",
        confirmSubmitTest
    );

    addClick(
        "previousPartButton",
        previousPart
    );

    addClick(
        "nextPartButton",
        nextPart
    );

    addClick(
        "returnDashboardButton",
        showDashboard
    );

    addClick(
        "retakeTestButton",
        function () {

            if (currentTest) {
                startTest();
            }

        }
    );

    addClick(
        "refreshHistoryButton",
        loadHistory
    );

    addClick(
        "closeVocabularyPopup",
        closeVocabularyPopup
    );

    addClick(
        "closeConfirmModal",
        closeConfirmModal
    );

    addClick(
        "cancelSubmitButton",
        closeConfirmModal
    );

    addClick(
        "confirmSubmitButton",
        submitTest
    );


    document.addEventListener(
        "click",
        function (event) {

            if (
                event.target.closest(
                    ".vocabulary-word"
                )
            ) {
                return;
            }

            const popup =
                document.getElementById(
                    "vocabularyPopup"
                );

            if (
                popup &&
                popup.style.display !== "none" &&
                !popup.contains(event.target)
            ) {

                closeVocabularyPopup();

            }

        }
    );
}


/* =========================================================
   ADD CLICK HELPER
   ========================================================= */

function addClick(
    id,
    handler
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.addEventListener(
            "click",
            handler
        );
    }
}


/* =========================================================
   FIND USERNAME INPUT
   ========================================================= */

function findUsernameInput() {

    const selectors = [

        "#username",

        "#Username",

        "#userName",

        "#loginUsername",

        "#loginUser",

        "#studentUsername",

        'input[name="username"]',

        'input[name="Username"]',

        'input[name="user"]',

        'input[name="userName"]',

        'input[autocomplete="username"]',

        'input[type="text"]'

    ];


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );

        if (element) {
            return element;
        }
    }

    return null;
}


/* =========================================================
   FIND PASSWORD INPUT
   ========================================================= */

function findPasswordInput() {

    const selectors = [

        "#password",

        "#Password",

        "#loginPassword",

        "#studentPassword",

        'input[name="password"]',

        'input[name="Password"]',

        'input[name="pass"]',

        'input[type="password"]',

        'input[autocomplete="current-password"]'

    ];


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );

        if (element) {
            return element;
        }
    }

    return null;
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    const usernameInput =
        findUsernameInput();

    const passwordInput =
        findPasswordInput();


    const username =
        usernameInput
            ? String(
                usernameInput.value || ""
            ).trim()
            : "";


    const password =
        passwordInput
            ? String(
                passwordInput.value || ""
            )
            : "";


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

        const response =
            await apiRequest(
                "login",
                {
                    username:
                        username,

                    password:
                        password
                }
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
            response.data ||
            null;


        if (!currentUser) {

            currentUser = {
                username:
                    username
            };
        }


        if (!currentUser.username) {

            currentUser.username =
                username;
        }


        localStorage.setItem(
            "ieltsReadingUser",
            JSON.stringify(
                currentUser
            )
        );


        showLoginMessage(
            "",
            ""
        );


        await showDashboard();


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
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

        const saved =
            localStorage.getItem(
                "ieltsReadingUser"
            );


        if (saved) {

            currentUser =
                JSON.parse(
                    saved
                );


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


    showScreen(
        "loginScreen"
    );
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


    showScreen(
        "loginScreen"
    );


    const username =
        findUsernameInput();

    const password =
        findPasswordInput();


    if (username) {
        username.value = "";
    }

    if (password) {
        password.value = "";
    }


    showLoginMessage(
        "",
        ""
    );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function showDashboard() {

    stopTimer();

    testStarted = false;

    testSubmitted = false;


    showScreen(
        "dashboardScreen"
    );


    updateDashboardUser();

    renderTestCards();

    await loadHistory();
}


/* =========================================================
   UPDATE DASHBOARD USER
   ========================================================= */

function updateDashboardUser() {

    const possibleIds = [

        "dashboardUsername",

        "studentName",

        "loggedInUsername",

        "welcomeUsername",

        "currentUsername"

    ];


    for (
        const id of possibleIds
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            element.textContent =
                currentUser?.username ||
                "Student";
        }
    }
}


/* =========================================================
   TEST CARDS
   ========================================================= */

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
            document.createElement(
                "div"
            );


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

                <span>
                    60 minutes
                </span>

                <span>
                    40 questions
                </span>

            </div>

        `;


        card.addEventListener(
            "click",
            function () {

                openTest(i);

            }
        );


        box.appendChild(
            card
        );
    }
}


/* =========================================================
   OPEN TEST
   ========================================================= */

async function openTest(
    testNumber
) {

    setLoading(
        true,
        "Loading test..."
    );


    try {

        const url =
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`;


        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Test${testNumber}.json could not be loaded. HTTP ${response.status}`
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


        loadSavedAnswers();


        currentPartIndex = 0;

        testSubmitted = false;


        showTestIntroduction();


    } catch (error) {

        console.error(
            "TEST LOAD ERROR:",
            error
        );


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
            "Invalid test JSON."
        );
    }


    test.parts.forEach(
        function(part, index) {

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

                part.questionGroups =
                    [];
            }


            part.questionGroups.forEach(
                function(group) {

                    if (
                        !Array.isArray(
                            group.questions
                        )
                    ) {

                        group.questions =
                            [];
                    }

                }
            );

        }
    );
}


/* =========================================================
   INTRODUCTION
   ========================================================= */

function showTestIntroduction() {

    showScreen(
        "introScreen"
    );


    setText(
        "introTestNumber",
        currentTest.testId ||
        `Test ${currentTestNumber}`
    );


    setText(
        "introTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );


    setText(
        "introDuration",
        `${currentTest.duration || CONFIG.DEFAULT_DURATION} minutes`
    );


    setText(
        "introQuestions",
        countTotalQuestions()
    );


    setText(
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


    /*
     * IMPORTANT:
     * Clear current in-memory answers,
     * then restore saved answers for this test.
     */

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


    showScreen(
        "testScreen"
    );


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
        setInterval(
            function() {

                remainingSeconds--;

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

    const possibleIds = [

        "timer",

        "timerDisplay",

        "testTimer"

    ];


    for (
        const id of possibleIds
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                formatTime(
                    remainingSeconds
                );

            break;
        }
    }
}


/* =========================================================
   CURRENT PART
   ========================================================= */

function renderCurrentPart() {

    if (!currentTest) {
        return;
    }


    const part =
        currentTest.parts[
            currentPartIndex
        ];


    if (!part) {
        return;
    }


    setText(
        "testHeaderTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );


    setText(
        "testHeaderPart",
        `Part ${
            part.partNumber ||
            currentPartIndex + 1
        }`
    );


    setText(
        "passagePartLabel",
        `Part ${
            part.partNumber ||
            currentPartIndex + 1
        }`
    );


    setText(
        "passageTitle",
        part.passage.title ||
        ""
    );


    setText(
        "questionsPartLabel",
        `Questions ${questionRangeForPart(part)}`
    );


    setText(
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


/* =========================================================
   QUESTION RANGE
   ========================================================= */

function questionRangeForPart(part) {

    const numbers = [];


    (
        part.questionGroups ||
        []
    ).forEach(
        function(group) {

            (
                group.questions ||
                []
            ).forEach(
                function(question) {

                    const number =
                        Number(
                            question.number
                        );

                    if (
                        Number.isFinite(
                            number
                        )
                    ) {

                        numbers.push(
                            number
                        );
                    }

                }
            );

        }
    );


    if (!numbers.length) {
        return "";
    }


    return (
        `${Math.min(...numbers)}-${Math.max(...numbers)}`
    );
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
            passage.paragraphs ||
            []
        )
        .map(
            function(paragraph) {

                return `

                    <p class="passage-paragraph">

                        <span class="paragraph-label">
                            ${escapeHTML(
                                paragraph.id ||
                                ""
                            )}
                        </span>

                        ${highlightVocabulary(
                            paragraph.text ||
                            ""
                        )}

                    </p>

                `;

            }
        )
        .join("");


    box
        .querySelectorAll(
            ".vocabulary-word"
        )
        .forEach(
            function(element) {

                element.addEventListener(
                    "click",
                    function(event) {

                        event.stopPropagation();

                        showVocabularyPopup(
                            element.dataset.word,
                            element
                        );

                    }
                );

            }
        );
}


/* =========================================================
   VOCABULARY HIGHLIGHT
   ========================================================= */

function highlightVocabulary(text) {

    if (
        !vocabulary ||
        !Object.keys(vocabulary).length
    ) {

        return escapeHTML(text);
    }


    let result =
        escapeHTML(text);


    const words =
        Object.keys(vocabulary)
            .sort(
                function(a, b) {

                    return (
                        b.length -
                        a.length
                    );

                }
            );


    for (
        const word of words
    ) {

        const regex =
            new RegExp(
                `(?<![A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
                "gi"
            );


        result =
            result.replace(
                regex,
                function(match) {

                    return `

                        <span
                            class="vocabulary-word"
                            data-word="${escapeAttribute(match)}"
                        >
                            ${match}
                        </span>

                    `;

                }
            );
    }


    return result;
}


/* =========================================================
   LOAD VOCABULARY
   ========================================================= */

async function loadVocabulary() {

    vocabulary = {};


    try {

        const response =
            await fetch(
                `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
                {
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            return;
        }


        const data =
            await response.json();


        vocabulary =
            data.words ||
            data ||
            {};


    } catch (error) {

        console.info(
            "Vocabulary unavailable."
        );

        vocabulary = {};
    }
}


/* =========================================================
   VOCABULARY POPUP
   ========================================================= */

function showVocabularyPopup(
    word,
    target
) {

    if (
        !vocabulary ||
        !Object.keys(vocabulary).length
    ) {
        return;
    }


    const key =
        Object.keys(vocabulary)
            .find(
                function(item) {

                    return (
                        item.toLowerCase() ===
                        String(word).toLowerCase()
                    );

                }
            );


    if (!key) {
        return;
    }


    const item =
        vocabulary[key] ||
        {};


    const popup =
        document.getElementById(
            "vocabularyPopup"
        );


    if (!popup) {
        return;
    }


    setText(
        "vocabularyWord",
        word
    );


    setText(
        "vocabularyMeaning",
        item.meaning ||
        "Meaning not available."
    );


    setText(
        "vocabularySimpleMeaning",
        item.simpleMeaning ||
        ""
    );


    popup.style.display =
        "block";


    popup.style.left =
        "50%";

    popup.style.bottom =
        "30px";

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
}


/* =========================================================
   RENDER QUESTIONS
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
        part.questionGroups ||
        []
    ).forEach(
        function(group) {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "question-group";


            wrapper.innerHTML = `

                <h3 class="question-group-title">

                    ${
                        group.questionRange
                            ? `Questions ${escapeHTML(
                                group.questionRange
                            )}`
                            : ""
                    }

                </h3>

                ${
                    group.instructions
                        ? `
                            <p class="question-instructions">
                                ${escapeHTML(
                                    group.instructions
                                )}
                            </p>
                        `
                        : ""
                }

            `;


            const content =
                document.createElement(
                    "div"
                );


            wrapper.appendChild(
                content
            );


            switch (
                normalizeQuestionType(
                    group.type
                )
            ) {

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

        }
    );


    restoreAnswers();
}


/* =========================================================
   NORMALIZE QUESTION TYPE
   ========================================================= */

function normalizeQuestionType(type) {

    return String(
        type || ""
    )
    .trim()
    .toLowerCase()
    .replace(
        /-/g,
        "_"
    )
    .replace(
        /\s+/g,
        "_"
    );
}


/* =========================================================
   TRUE / FALSE / NOT GIVEN
   ========================================================= */

function renderTrueFalseNotGiven(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

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

        }
    );
}


/* =========================================================
   YES / NO / NOT GIVEN
   ========================================================= */

function renderYesNoNotGiven(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

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

        }
    );
}


/* =========================================================
   FILL BLANK
   ========================================================= */

function renderFillBlank(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML = `

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${question.number}"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Type your answer"
                >

            `;


            attachInputListener(
                control
            );


            box.appendChild(
                item
            );

        }
    );
}


/* =========================================================
   SUMMARY COMPLETION
   ========================================================= */

function renderSummaryCompletion(
    box,
    group
) {

    const summary =
        document.createElement(
            "div"
        );


    summary.className =
        "summary-box";


    const questions =
        group.questions ||
        [];


    let text =
        group.summary ||
        group.text ||
        group.passageText ||
        "";


    let html =
        escapeHTML(text);


    /*
     * -------------------------------------------------------
     * FORMAT 1
     * {{23}}
     * {23}
     * [23]
     * -------------------------------------------------------
     */

    html =
        html.replace(
            /\{\{(\d+)\}\}|\{(\d+)\}|\[(\d+)\]/g,
            function(
                match,
                a,
                b,
                c
            ) {

                const number =
                    Number(
                        a ||
                        b ||
                        c
                    );


                const question =
                    questions.find(
                        function(q) {

                            return (
                                Number(
                                    q.number
                                ) ===
                                number
                            );

                        }
                    );


                if (!question) {
                    return match;
                }


                return createSummaryInput(
                    question.number
                );

            }
        );


    /*
     * -------------------------------------------------------
     * FORMAT 2
     * ______
     * ________
     * -------------------------------------------------------
     */

    let blankIndex = 0;


    html =
        html.replace(
            /_{2,}/g,
            function() {

                const question =
                    questions[
                        blankIndex
                    ];


                blankIndex++;


                if (!question) {

                    return "________";
                }


                return createSummaryInput(
                    question.number
                );

            }
        );


    summary.innerHTML =
        html;


    /*
     * -------------------------------------------------------
     * FALLBACK
     *
     * If there were no placeholders at all,
     * create answer boxes below the summary.
     * -------------------------------------------------------
     */

    const existingInputs =
        summary.querySelectorAll(
            "[data-question-number]"
        );


    if (
        existingInputs.length === 0 &&
        questions.length > 0
    ) {

        const answerArea =
            document.createElement(
                "div"
            );


        answerArea.className =
            "summary-answer-area";


        questions.forEach(
            function(question) {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "summary-answer-row";


                row.innerHTML = `

                    <label>

                        <strong>
                            ${question.number}.
                        </strong>

                        <input
                            type="text"
                            class="summary-answer-input"
                            data-question-number="${question.number}"
                            autocomplete="off"
                            spellcheck="false"
                        >

                    </label>

                `;


                answerArea.appendChild(
                    row
                );

            }
        );


        summary.appendChild(
            answerArea
        );
    }


    attachInputListener(
        summary
    );


    box.appendChild(
        summary
    );
}


/* =========================================================
   CREATE SUMMARY INPUT
   ========================================================= */

function createSummaryInput(
    questionNumber
) {

    return `

        <input
            type="text"
            class="summary-answer-input"
            data-question-number="${questionNumber}"
            autocomplete="off"
            spellcheck="false"
            aria-label="Answer for question ${questionNumber}"
        >

    `;
}


/* =========================================================
   MULTIPLE CHOICE
   ========================================================= */

function renderMultipleChoice(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            const options =
                getQuestionOptions(
                    question,
                    group,
                    [
                        "options",
                        "choices",
                        "answerOptions"
                    ]
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
                item
            );

        }
    );
}


/* =========================================================
   MULTIPLE CHOICE MULTIPLE
   ========================================================= */

function renderMultipleChoiceMultiple(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            const options =
                getQuestionOptions(
                    question,
                    group,
                    [
                        "options",
                        "choices",
                        "answerOptions"
                    ]
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
                item
            );

        }
    );
}


/* =========================================================
   MATCHING HEADINGS
   ========================================================= */

function renderMatchingHeadings(
    box,
    group
) {

    const options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "choices",
                "answerOptions",
                "headings"
            ]
        );


    renderMatchingSelects(
        box,
        group,
        options
    );
}


/* =========================================================
   MATCHING INFORMATION
   ========================================================= */

function renderMatchingInformation(
    box,
    group
) {

    let options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "choices",
                "answerOptions",
                "paragraphs",
                "letters"
            ]
        );


    /*
     * If JSON does not contain options,
     * use paragraph IDs automatically.
     */

    if (!options.length) {

        options =
            getParagraphLetters();
    }


    renderMatchingSelects(
        box,
        group,
        options
    );
}


/* =========================================================
   MATCHING FEATURES
   ========================================================= */

function renderMatchingFeatures(
    box,
    group
) {

    const options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "choices",
                "answerOptions",
                "features",
                "letters"
            ]
        );


    renderMatchingSelects(
        box,
        group,
        options
    );
}


/* =========================================================
   GENERIC MATCHING SELECTS
   ========================================================= */

function renderMatchingSelects(
    box,
    group,
    groupOptions
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            /*
             * Question-specific options
             * have priority.
             */

            const questionOptions =
                getQuestionOptions(
                    question,
                    null,
                    [
                        "options",
                        "choices",
                        "answerOptions",
                        "headings",
                        "features",
                        "letters"
                    ]
                );


            const options =
                questionOptions.length
                    ? questionOptions
                    : groupOptions;


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
                item
            );

        }
    );
}


/* =========================================================
   ANSWER BOX
   ========================================================= */

function renderAnswerBox(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function(question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML = `

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${question.number}"
                    autocomplete="off"
                    spellcheck="false"
                >

            `;


            attachInputListener(
                control
            );


            box.appendChild(
                item
            );

        }
    );
}


/* =========================================================
   UNSUPPORTED GROUP
   ========================================================= */

function renderUnsupportedGroup(
    box,
    group
) {

    console.warn(
        "Unsupported question type:",
        group.type
    );


    (
        group.questions ||
        []
    ).forEach(
        function(question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML = `

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${question.number}"
                    autocomplete="off"
                    spellcheck="false"
                >

            `;


            attachInputListener(
                control
            );


            box.appendChild(
                item
            );

        }
    );
}


/* =========================================================
   CREATE QUESTION ITEM
   ========================================================= */

function createQuestionItem(
    question,
    options = null
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
                question.text ||
                question.question ||
                ""
            )}

        </div>

        <div class="question-control">
        </div>

    `;


    const control =
        wrapper.querySelector(
            ".question-control"
        );


    if (
        Array.isArray(options) &&
        options.length
    ) {

        control.innerHTML =
            options
                .map(
                    function(option) {

                        const normalized =
                            normalizeOption(
                                option
                            );


                        return `

                            <label class="option-item">

                                <input
                                    type="radio"
                                    name="q${question.number}"
                                    value="${escapeAttribute(
                                        normalized.value
                                    )}"
                                    data-question-number="${question.number}"
                                >

                                <span>
                                    ${escapeHTML(
                                        normalized.text
                                    )}
                                </span>

                            </label>

                        `;

                    }
                )
                .join("");


        control
            .querySelectorAll(
                "input"
            )
            .forEach(
                function(input) {

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
   GET QUESTION OPTIONS
   ========================================================= */

function getQuestionOptions(
    question,
    group,
    keys = []
) {

    const found = [];


    /*
     * -------------------------------------------------------
     * Question-level options
     * -------------------------------------------------------
     */

    if (question) {

        for (
            const key of keys
        ) {

            if (
                Array.isArray(
                    question[key]
                ) &&
                question[key].length
            ) {

                return question[key];
            }
        }


        const questionFallbacks = [

            "optionList",

            "answerChoices",

            "items",

            "choicesList"

        ];


        for (
            const key of questionFallbacks
        ) {

            if (
                Array.isArray(
                    question[key]
                ) &&
                question[key].length
            ) {

                return question[key];
            }
        }

    }


    /*
     * -------------------------------------------------------
     * Group-level options
     * -------------------------------------------------------
     */

    if (group) {

        for (
            const key of keys
        ) {

            if (
                Array.isArray(
                    group[key]
                ) &&
                group[key].length
            ) {

                return group[key];
            }
        }


        const groupFallbacks = [

            "optionList",

            "answerChoices",

            "items",

            "choicesList"

        ];


        for (
            const key of groupFallbacks
        ) {

            if (
                Array.isArray(
                    group[key]
                ) &&
                group[key].length
            ) {

                return group[key];
            }
        }

    }


    /*
     * -------------------------------------------------------
     * Collect options from questions.
     * -------------------------------------------------------
     */

    if (group?.questions) {

        group.questions.forEach(
            function(q) {

                const allKeys = [
                    ...keys,

                    "optionList",

                    "answerChoices",

                    "items",

                    "choicesList"
                ];


                allKeys.forEach(
                    function(key) {

                        if (
                            Array.isArray(
                                q[key]
                            )
                        ) {

                            q[key].forEach(
                                function(option) {

                                    const alreadyExists =
                                        found.some(
                                            existing =>
                                                JSON.stringify(
                                                    existing
                                                ) ===
                                                JSON.stringify(
                                                    option
                                                )
                                        );


                                    if (
                                        !alreadyExists
                                    ) {

                                        found.push(
                                            option
                                        );
                                    }

                                }
                            );

                        }

                    }
                );

            }
        );
    }


    return found;
}


/* =========================================================
   NORMALIZE OPTION
   ========================================================= */

function normalizeOption(
    option
) {

    if (
        option === null ||
        option === undefined
    ) {

        return {
            value: "",
            text: ""
        };
    }


    if (
        typeof option ===
        "string" ||
        typeof option ===
        "number"
    ) {

        return {

            value:
                String(option),

            text:
                String(option)

        };
    }


    if (
        typeof option ===
        "object"
    ) {

        const value =
            option.letter ??
            option.value ??
            option.id ??
            option.key ??
            option.code ??
            option.text ??
            option.label ??
            option.name ??
            "";


        const text =
            option.text ??
            option.label ??
            option.name ??
            option.title ??
            option.value ??
            option.letter ??
            option.id ??
            option.key ??
            option.code ??
            "";


        return {

            value:
                String(value),

            text:
                String(text)

        };
    }


    return {

        value: "",

        text: ""

    };
}


/* =========================================================
   CREATE SELECT OPTIONS
   ========================================================= */

function createSelectOptions(
    options
) {

    let html = `

        <select
            class="question-control-select"
        >

            <option value="">
                - Select -
            </option>

    `;


    if (
        !Array.isArray(options)
    ) {

        options = [];
    }


    options.forEach(
        function(option) {

            const normalized =
                normalizeOption(
                    option
                );


            if (
                !normalized.value &&
                !normalized.text
            ) {

                return;
            }


            html += `

                <option
                    value="${escapeAttribute(
                        normalized.value
                    )}"
                >
                    ${escapeHTML(
                        normalized.text
                    )}
                </option>

            `;

        }
    );


    html += `

        </select>

    `;


    return html;
}


/* =========================================================
   INPUT LISTENER
   ========================================================= */

function attachInputListener(
    container
) {

    container
        .querySelectorAll(
            "input"
        )
        .forEach(
            function(input) {

                input.addEventListener(
                    "input",
                    handleAnswerChange
                );

                input.addEventListener(
                    "change",
                    handleAnswerChange
                );

            }
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
        element.type ===
        "radio"
    ) {

        if (
            element.checked
        ) {

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
        .forEach(
            function(element) {

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

                    studentAnswers[number] =
                        element.value;

                }

            }
        );


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
        .forEach(
            function(element) {

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
                        normalizeAnswer(
                            element.value
                        ) ===
                        normalizeAnswer(
                            value
                        );


                } else {

                    element.value =
                        value;

                }

            }
        );


    updateQuestionNavigator();
}


/* =========================================================
   LOCAL ANSWER STORAGE
   ========================================================= */

function saveAnswersToStorage() {

    if (!currentTestNumber) {
        return;
    }


    try {

        localStorage.setItem(
            getAnswerStorageKey(),

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
            getAnswerStorageKey();


        const raw =
            localStorage.getItem(
                key
            );


        if (raw) {

            const saved =
                JSON.parse(
                    raw
                );


            if (
                saved &&
                typeof saved ===
                "object"
            ) {

                studentAnswers =
                    saved;
            }

        }

    } catch (error) {

        console.warn(
            "Could not load saved answers:",
            error
        );

        studentAnswers = {};
    }
}


function getAnswerStorageKey() {

    const student =
        currentUser?.studentId ||
        currentUser?.studentID ||
        currentUser?.StudentID ||
        currentUser?.id ||
        currentUser?.ID ||
        currentUser?.username ||
        "student";


    return (
        `ieltsAnswers_${student}_${currentTestNumber}`
    );
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
                function(number) {

                    return `

                        <button
                            type="button"
                            class="question-nav-item"
                            data-question-nav="${number}"
                        >
                            ${number}
                        </button>

                    `;

                }
            )
            .join("");


    nav
        .querySelectorAll(
            "button"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        jumpToQuestion(
                            Number(
                                button.dataset.questionNav
                            )
                        );

                    }
                );

            }
        );


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
        .forEach(
            function(button) {

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

            }
        );
}


function isQuestionAnswered(
    number
) {

    const value =
        studentAnswers[number];


    return (
        value !== undefined &&
        value !== null &&
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


    if (!element) {
        return;
    }


    const question =
        element.closest(
            ".question"
        );


    (
        question ||
        element
    ).scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });
}


/* =========================================================
   GET ALL QUESTION NUMBERS
   ========================================================= */

function getAllQuestionNumbers() {

    const numbers = [];


    (
        currentTest?.parts ||
        []
    ).forEach(
        function(part) {

            (
                part.questionGroups ||
                []
            ).forEach(
                function(group) {

                    (
                        group.questions ||
                        []
                    ).forEach(
                        function(question) {

                            const number =
                                Number(
                                    question.number
                                );


                            if (
                                Number.isFinite(
                                    number
                                )
                            ) {

                                numbers.push(
                                    number
                                );
                            }

                        }
                    );

                }
            );

        }
    );


    return [
        ...new Set(
            numbers
        )
    ].sort(
        function(a, b) {

            return a - b;

        }
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


/* =========================================================
   SCROLL
   ========================================================= */

function scrollTestPanelsToTop() {

    [
        "passagePanel",
        "questionsPanel"
    ]
    .forEach(
        function(id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.scrollTop = 0;
            }

        }
    );
}


/* =========================================================
   SUBMIT CONFIRMATION
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


    const answer =
        confirm(
            "Leave this test? Your current test will not be submitted."
        );


    if (answer) {

        stopTimer();

        showDashboard();
    }
}


/* =========================================================
   CONFIRM MODAL
   ========================================================= */

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


/* =========================================================
   AUTO SUBMIT
   ========================================================= */

function autoSubmitTest() {

    if (testSubmitted) {
        return;
    }


    showToast(
        "Time is up. Your test is being submitted."
    );


    submitTest();
}


/* =========================================================
   SUBMIT TEST
   ========================================================= */

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
   CALCULATE TIME
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
   CALCULATE SCORE
   ========================================================= */

function calculateScore() {

    let total = 0;

    const partScores = [];


    (
        currentTest.parts ||
        []
    ).forEach(
        function(part) {

            let partScore = 0;


            (
                part.questionGroups ||
                []
            ).forEach(
                function(group) {

                    const questions =
                        group.questions ||
                        [];


                    /*
                     * Normal scoring.
                     */

                    questions.forEach(
                        function(question) {

                            const given =
                                studentAnswers[
                                    question.number
                                ];


                            if (
                                answersMatch(
                                    given,
                                    question.answer
                                )
                            ) {

                                partScore++;

                            }

                        }
                    );

                }
            );


            partScores.push(
                partScore
            );


            total +=
                partScore;

        }
    );


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


/* =========================================================
   ANSWER MATCH
   ========================================================= */

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


    /*
     * If the correct answer is an array,
     * accept any listed valid answer.
     */

    if (
        Array.isArray(
            correct
        )
    ) {

        return correct.some(
            function(answer) {

                return (
                    normalizeAnswer(
                        given
                    ) ===
                    normalizeAnswer(
                        answer
                    )
                );

            }
        );
    }


    /*
     * Some JSON may use:
     *
     * {
     *   answer: "A",
     *   acceptedAnswers: [...]
     * }
     *
     * handled elsewhere if needed.
     */


    return (
        normalizeAnswer(
            given
        ) ===
        normalizeAnswer(
            correct
        )
    );
}


/* =========================================================
   NORMALIZE ANSWER
   ========================================================= */

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


/* =========================================================
   IELTS BAND
   ========================================================= */

function calculateIELTSBand(
    score
) {

    if (score >= 39)
        return 9.0;

    if (score >= 37)
        return 8.5;

    if (score >= 35)
        return 8.0;

    if (score >= 33)
        return 7.5;

    if (score >= 30)
        return 7.0;

    if (score >= 27)
        return 6.5;

    if (score >= 23)
        return 6.0;

    if (score >= 19)
        return 5.5;

    if (score >= 15)
        return 5.0;

    if (score >= 13)
        return 4.5;

    if (score >= 10)
        return 4.0;

    if (score >= 8)
        return 3.5;

    if (score >= 6)
        return 3.0;

    if (score >= 4)
        return 2.5;

    if (score >= 2)
        return 2.0;

    if (score === 1)
        return 1.0;

    return 0;
}


/* =========================================================
   SAVE RESULT TO API
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


        console.log(
            "SAVE RESULT RESPONSE:",
            response
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
   RESULT SCREEN
   ========================================================= */

function renderResult() {

    showScreen(
        "resultScreen"
    );


    setText(
        "resultTestTitle",
        currentTest?.title ||
        `Test ${currentTestNumber}`
    );


    setText(
        "resultScore",
        scoreData.totalScore
    );


    setText(
        "resultTotal",
        `/ ${scoreData.totalQuestions}`
    );


    setText(
        "resultBand",
        Number(
            scoreData.band
        ).toFixed(1)
    );


    setText(
        "resultTime",
        scoreData.timeUsed
    );


    renderPartScores();
}


/* =========================================================
   PART SCORES
   ========================================================= */

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
                function(
                    score,
                    index
                ) {

                    return `

                        <div class="part-score">

                            <span class="part-score-label">
                                Part ${index + 1}
                            </span>

                            <span class="part-score-value">
                                ${score}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");
}


/* =========================================================
   CLEAR ANSWERS
   ========================================================= */

function clearCurrentTestAnswers() {

    try {

        localStorage.removeItem(
            getAnswerStorageKey()
        );

    } catch (error) {

        console.warn(
            "Could not clear saved answers:",
            error
        );
    }


    studentAnswers = {};
}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {

    if (!currentUser) {
        return;
    }


    const body =
        document.getElementById(
            "historyTableBody"
        );


    if (!body) {
        return;
    }


    try {

        const studentId =
            currentUser.studentId ||
            currentUser.studentID ||
            currentUser.StudentID ||
            currentUser.id ||
            currentUser.ID ||
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

        console.warn(
            "History could not be loaded:",
            error
        );


        renderHistory(
            []
        );
    }
}


/* =========================================================
   RENDER HISTORY
   ========================================================= */

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


    if (
        !history ||
        !history.length
    ) {

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
                function(result) {

                    return `

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

                    `;

                }
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

    console.log(
        "API REQUEST:",
        action,
        data
    );


    /*
     * =====================================================
     * GET REQUEST
     * =====================================================
     */

    try {

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


        const getUrl =
            `${CONFIG.API_URL}?${params.toString()}`;


        const response =
            await fetch(
                getUrl,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
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

            throw new Error(
                "The API returned invalid JSON."
            );
        }


        /*
         * Return normal API response.
         */

        if (
            json &&
            json.message !==
                "Unknown action"
        ) {

            return json;
        }


    } catch (getError) {

        console.warn(
            "GET API request failed:",
            getError
        );
    }


    /*
     * =====================================================
     * POST FALLBACK
     * =====================================================
     */

    try {

        const body = {

            action:
                action,

            data:
                data || {}

        };


        const response =
            await fetch(
                CONFIG.API_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify(
                            body
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

            throw new Error(
                "The API returned invalid JSON."
            );
        }


        return json;


    } catch (postError) {

        console.error(
            "POST API request failed:",
            postError
        );


        throw postError;
    }
}


/* =========================================================
   SCREEN
   ========================================================= */

function showScreen(
    id
) {

    document
        .querySelectorAll(
            ".screen"
        )
        .forEach(
            function(element) {

                element.style.display =
                    "none";

            }
        );


    const element =
        document.getElementById(
            id
        );


    if (!element) {

        console.warn(
            `Screen not found: ${id}`
        );

        return;
    }


    if (
        id ===
        "loginScreen"
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

    const possibleIds = [

        "loginMessage",

        "loginError",

        "errorMessage"

    ];


    let element = null;


    for (
        const id of possibleIds
    ) {

        const found =
            document.getElementById(
                id
            );


        if (found) {

            element = found;

            break;
        }
    }


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
    message
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


    setTimeout(
        function() {

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
            Number(
                seconds
            ) || 0
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    if (hours) {

        return (

            `${String(
                hours
            ).padStart(
                2,
                "0"
            )}:` +

            `${String(
                minutes
            ).padStart(
                2,
                "0"
            )}:` +

            `${String(
                secs
            ).padStart(
                2,
                "0"
            )}`

        );
    }


    return (

        `${String(
            minutes
        ).padStart(
            2,
            "0"
        )}:` +

        `${String(
            secs
        ).padStart(
            2,
            "0"
        )}`

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
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );
    }


    return date.toLocaleString();
}


/* =========================================================
   GET PARAGRAPH LETTERS
   ========================================================= */

function getParagraphLetters() {

    const part =
        currentTest?.parts?.[
            currentPartIndex
        ];


    const paragraphs =
        part?.passage?.paragraphs ||
        [];


    const letters =
        paragraphs
            .map(
                function(paragraph) {

                    return (
                        paragraph.id ||
                        ""
                    ).trim();

                }
            )
            .filter(
                Boolean
            );


    /*
     * Return unique paragraph IDs.
     */

    return [
        ...new Set(
            letters
        )
    ];
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? "";
    }
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

    return String(
        value
    )
    .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


/* =========================================================
   DEBUG EXPORT
   ========================================================= */

window.IELTSReading = {

    openTest:
        openTest,

    startTest:
        startTest,

    submitTest:
        submitTest,

    calculateScore:
        calculateScore,

    showDashboard:
        showDashboard,

    logout:
        logout,

    getCurrentTest:
        function() {

            return currentTest;

        },

    getAnswers:
        function() {

            return studentAnswers;

        },

    getCurrentUser:
        function() {

            return currentUser;

        }

};


/* =========================================================
   END OF app.js
   ========================================================= */
