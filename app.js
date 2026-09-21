/* =========================================================
   IELTS READING PRACTICE WEBSITE
   COMPLETE app.js
   ---------------------------------------------------------
   Supports:

   - true_false_not_given
   - yes_no_not_given
   - fill_blank
   - summary_completion
   - multiple_choice
   - multiple_choice_multiple
   - matching_headings
   - matching_information
   - matching_features
   - answer_box

   NEW:

   SUMMARY COMPLETION
   -> Drag and drop word bank into blanks

   MATCHING FEATURES
   -> Drag and drop A-G/topic into each question

   Also supports click-to-select on mobile.
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

let currentPartIndex = 0;

let studentAnswers = {};

let vocabulary = {};

let timerInterval = null;

let remainingSeconds = 0;

let testStartTime = null;

let testElapsedSeconds = 0;

let testStarted = false;

let testSubmitted = false;

let scoreData = null;


/*
 * Used for click-to-place drag/drop.
 */
let selectedDragOption = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        injectDragDropStyles();

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
        document.querySelector(
            "#loginForm"
        ) ||
        document.querySelector(
            'form[action*="login"]'
        );


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
                !popup.contains(
                    event.target
                )
            ) {

                closeVocabularyPopup();

            }

        }
    );

}


/* =========================================================
   ADD CLICK
========================================================= */

function addClick(
    id,
    handler
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.addEventListener(
            "click",
            handler
        );

    }

}


/* =========================================================
   LOGIN INPUTS
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

        'input[autocomplete="username"]'

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

async function handleLogin(
    event
) {

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

        setLoading(
            false
        );

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

    currentPartIndex = 0;

    testStarted = false;

    testSubmitted = false;


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

    const ids = [

        "dashboardUsername",

        "studentName",

        "loggedInUsername",

        "welcomeUsername",

        "currentUsername"

    ];


    ids.forEach(
        function (id) {

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
    );

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


        validateTest(
            data
        );


        currentTest =
            data;


        currentTestNumber =
            testNumber;


        studentAnswers = {};

        currentPartIndex = 0;

        testSubmitted = false;


        loadSavedAnswers();


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

        setLoading(
            false
        );

    }

}


/* =========================================================
   VALIDATE TEST
========================================================= */

function validateTest(
    test
) {

    if (
        !test ||
        !Array.isArray(
            test.parts
        ) ||
        !test.parts.length
    ) {

        throw new Error(
            "Invalid test JSON."
        );

    }


    test.parts.forEach(
        function (
            part,
            index
        ) {

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
                function (group) {

                    if (
                        !Array.isArray(
                            group.questions
                        )
                    ) {

                        group.questions =
                            [];

                    }


                    if (
                        !Array.isArray(
                            group.blanks
                        )
                    ) {

                        group.blanks =
                            [];

                    }

                }
            );

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
            function () {

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

    const ids = [

        "timer",

        "timerDisplay",

        "testTimer"

    ];


    for (
        const id of ids
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
        `Questions ${
            questionRangeForPart(
                part
            )
        }`
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
   Includes both questions AND blanks.
========================================================= */

function questionRangeForPart(
    part
) {

    const numbers = [];


    (
        part.questionGroups ||
        []
    ).forEach(
        function (group) {

            (
                group.questions ||
                []
            ).forEach(
                function (question) {

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


            /*
             * SUMMARY COMPLETION
             *
             * Q23-26 are stored here.
             */

            (
                group.blanks ||
                []
            ).forEach(
                function (blank) {

                    const number =
                        Number(
                            blank.number
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


    return `${Math.min(...numbers)}-${Math.max(...numbers)}`;

}


/* =========================================================
   PASSAGE
========================================================= */

function renderPassage(
    passage
) {

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
            function (paragraph) {

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
            function (element) {

                element.addEventListener(
                    "click",
                    function (event) {

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
   VOCABULARY
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

        vocabulary = {};

    }

}


function highlightVocabulary(
    text
) {

    if (
        !vocabulary ||
        !Object.keys(
            vocabulary
        ).length
    ) {

        return escapeHTML(
            text
        );

    }


    let result =
        escapeHTML(
            text
        );


    const words =
        Object.keys(
            vocabulary
        )
        .sort(
            function (
                a,
                b
            ) {

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
                function (match) {

                    return `

                        <span
                            class="vocabulary-word"
                            data-word="${escapeAttribute(
                                match
                            )}"
                        >
                            ${match}
                        </span>

                    `;

                }
            );

    }


    return result;

}


function showVocabularyPopup(
    word
) {

    if (
        !vocabulary ||
        !Object.keys(
            vocabulary
        ).length
    ) {

        return;

    }


    const key =
        Object.keys(
            vocabulary
        )
        .find(
            function (item) {

                return (
                    item.toLowerCase() ===
                    String(
                        word
                    ).toLowerCase()
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

function renderQuestions(
    part
) {

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
        function (group) {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "question-group";


            wrapper.innerHTML = `

                ${
                    group.questionRange
                        ? `
                            <h3 class="question-group-title">
                                Questions ${escapeHTML(
                                    group.questionRange
                                )}
                            </h3>
                        `
                        : ""
                }

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


            const type =
                normalizeQuestionType(
                    group.type
                );


            switch (type) {

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

                    break;

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

function normalizeQuestionType(
    type
) {

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
        function (question) {

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
        function (question) {

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
        function (question) {

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
   ---------------------------------------------------------
   NEW:
   Drag words into blanks.
========================================================= */

function renderSummaryCompletion(
    box,
    group
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "drag-summary-container";


    /*
     * Your JSON uses:
     *
     * "blanks": [...]
     */

    const blanks =
        group.blanks &&
        group.blanks.length
            ? group.blanks
            : group.questions || [];


    /*
     * -----------------------------------------------------
     * WORD BANK
     * -----------------------------------------------------
     *
     * Preferred:
     *
     * group.options
     *
     * or:
     *
     * group.words
     *
     * or:
     *
     * group.wordBank
     *
     *
     * If none exists, the answer values are used as a
     * fallback so your current Test1.json still works.
     *
     * For a proper IELTS-style test, put distractors
     * inside "options" in the JSON.
     */

    let options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "choices",
                "answerOptions",
                "words",
                "wordBank"
            ]
        );


    /*
     * If there is no word bank, create one from
     * the answers in blanks.
     */

    if (!options.length) {

        options =
            blanks
                .map(
                    function (blank) {

                        return blank.answer;

                    }
                )
                .filter(
                    function (answer) {

                        return (
                            answer !==
                            undefined &&
                            answer !==
                            null &&
                            String(
                                answer
                            ).trim() !== ""
                        );

                    }
                );

    }


    /*
     * Remove duplicate words.
     */

    options =
        uniqueOptions(
            options
        );


    /*
     * -----------------------------------------------------
     * WORD BANK UI
     * -----------------------------------------------------
     */

    const bank =
        document.createElement(
            "div"
        );


    bank.className =
        "drag-summary-bank";


    bank.innerHTML = `

        <div class="drag-bank-title">
            Given words:
        </div>

    `;


    const optionContainer =
        document.createElement(
            "div"
        );


    optionContainer.className =
        "drag-summary-options";


    options.forEach(
        function (
            option,
            index
        ) {

            const normalized =
                normalizeOption(
                    option
                );


            if (
                !normalized.text
            ) {

                return;

            }


            const word =
                document.createElement(
                    "div"
                );


            word.className =
                "summary-drag-word";


            word.draggable =
                true;


            word.dataset.value =
                normalized.value ||
                normalized.text;


            word.dataset.text =
                normalized.text;


            word.dataset.dragId =
                `summary-word-${Date.now()}-${index}`;


            word.textContent =
                normalized.text;


            setupDragOption(
                word
            );


            optionContainer.appendChild(
                word
            );

        }
    );


    bank.appendChild(
        optionContainer
    );


    container.appendChild(
        bank
    );


    /*
     * -----------------------------------------------------
     * SUMMARY
     * -----------------------------------------------------
     */

    const summary =
        document.createElement(
            "div"
        );


    summary.className =
        "drag-summary-text";


    let text =
        group.summary ||
        group.text ||
        group.passageText ||
        "";


    let html =
        escapeHTML(
            text
        );


    /*
     * Support:
     *
     * {{23}}
     * {23}
     * [23]
     */

    html =
        html.replace(
            /\{\{(\d+)\}\}|\{(\d+)\}|\[(\d+)\]/g,
            function (
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


                const blank =
                    blanks.find(
                        function (item) {

                            return (
                                Number(
                                    item.number
                                ) ===
                                number
                            );

                        }
                    );


                if (!blank) {

                    return match;

                }


                return createSummaryDropZone(
                    number
                );

            }
        );


    /*
     * Support normal:
     *
     * ________
     */

    let blankIndex = 0;


    html =
        html.replace(
            /_{2,}/g,
            function () {

                const blank =
                    blanks[
                        blankIndex
                    ];


                blankIndex++;


                if (!blank) {

                    return "________";

                }


                return createSummaryDropZone(
                    blank.number
                );

            }
        );


    summary.innerHTML =
        html;


    container.appendChild(
        summary
    );


    /*
     * -----------------------------------------------------
     * FALLBACK
     *
     * If no blanks were detected in summary.
     * -----------------------------------------------------
     */

    const zones =
        summary.querySelectorAll(
            ".summary-drop-zone"
        );


    if (
        zones.length === 0 &&
        blanks.length
    ) {

        const fallback =
            document.createElement(
                "div"
            );


        fallback.className =
            "summary-fallback";


        blanks.forEach(
            function (blank) {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "summary-fallback-row";


                row.innerHTML = `

                    <strong>
                        ${blank.number}.
                    </strong>

                    ${createSummaryDropZone(
                        blank.number
                    )}

                `;


                fallback.appendChild(
                    row
                );

            }
        );


        container.appendChild(
            fallback
        );

    }


    box.appendChild(
        container
    );


    /*
     * Setup drop zones AFTER they are inserted.
     */

    container
        .querySelectorAll(
            ".summary-drop-zone"
        )
        .forEach(
            function (zone) {

                setupDropZone(
                    zone,
                    Number(
                        zone.dataset.questionNumber
                    )
                );

            }
        );


    restoreDragDropAnswers();

}


/* =========================================================
   CREATE SUMMARY DROP ZONE
========================================================= */

function createSummaryDropZone(
    questionNumber
) {

    return `

        <span
            class="summary-drop-zone"
            data-question-number="${questionNumber}"
        >

            <span class="summary-drop-placeholder">
                Drop answer
            </span>

        </span>

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
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            const options =
                question.options ||
                group.options ||
                [];


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

    /*
     * Your current JSON represents Q27 and Q28
     * as two separate answer slots.
     *
     * This keeps that format.
     */

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            const options =
                question.options ||
                group.options ||
                [];


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

    let options =
        group.options ||
        group.headings ||
        [];


    /*
     * Some JSON uses:
     *
     * headings: [
     *   {
     *      id: "i",
     *      text: "..."
     *   }
     * ]
     */

    if (!Array.isArray(options)) {

        options = [];

    }


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
        group.options ||
        group.letters ||
        group.paragraphs ||
        [];


    if (!Array.isArray(options)) {

        options = [];

    }


    /*
     * If no options exist,
     * use current passage paragraph IDs.
     */

    if (!options.length) {

        options =
            getCurrentPassageOptions();

    }


    renderMatchingSelects(
        box,
        group,
        options
    );

}


/* =========================================================
   MATCHING FEATURES
   ---------------------------------------------------------
   NEW:
   DRAG & DROP
========================================================= */

function renderMatchingFeatures(
    box,
    group
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "drag-matching-container";


    /*
     * -----------------------------------------------------
     * OPTIONS
     * -----------------------------------------------------
     *
     * Preferred:
     *
     * group.options
     *
     * Example:
     *
     * [
     *   {
     *      "letter": "B",
     *      "text": "B. History Comparison"
     *   }
     * ]
     *
     * If options don't exist, A-G are automatically created
     * from passage paragraphs.
     */

    let options =
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


    if (!options.length) {

        options =
            getCurrentPassageOptions();

    }


    options =
        uniqueOptions(
            options
        );


    /*
     * -----------------------------------------------------
     * OPTION BANK
     * -----------------------------------------------------
     */

    const bank =
        document.createElement(
            "div"
        );


    bank.className =
        "drag-option-bank";


    bank.innerHTML = `

        <div class="drag-bank-title">
            Drag the correct paragraph/topic:
        </div>

    `;


    const optionsContainer =
        document.createElement(
            "div"
        );


    optionsContainer.className =
        "drag-options";


    options.forEach(
        function (
            option,
            index
        ) {

            const normalized =
                normalizeOption(
                    option
                );


            if (
                !normalized.text
            ) {

                return;

            }


            const draggable =
                document.createElement(
                    "div"
                );


            draggable.className =
                "drag-option";


            draggable.draggable =
                true;


            draggable.dataset.value =
                normalized.value;


            draggable.dataset.text =
                normalized.text;


            draggable.dataset.dragId =
                `feature-${Date.now()}-${index}`;


            draggable.innerHTML = `

                <span class="drag-option-handle">
                    ☰
                </span>

                <span>
                    ${escapeHTML(
                        normalized.text
                    )}
                </span>

            `;


            setupDragOption(
                draggable
            );


            optionsContainer.appendChild(
                draggable
            );

        }
    );


    bank.appendChild(
        optionsContainer
    );


    container.appendChild(
        bank
    );


    /*
     * -----------------------------------------------------
     * QUESTIONS
     * -----------------------------------------------------
     */

    const questionsContainer =
        document.createElement(
            "div"
        );


    questionsContainer.className =
        "drag-questions";


    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const questionBox =
                document.createElement(
                    "div"
                );


            questionBox.className =
                "drag-question";


            questionBox.dataset.questionNumber =
                question.number;


            /*
             * DROP AREA ABOVE QUESTION
             */

            const dropZone =
                document.createElement(
                    "div"
                );


            dropZone.className =
                "drag-drop-zone";


            dropZone.dataset.questionNumber =
                question.number;


            dropZone.innerHTML = `

                <span class="drop-placeholder">
                    Drag and drop answer here
                </span>

            `;


            setupDropZone(
                dropZone,
                question.number
            );


            /*
             * QUESTION
             */

            const questionText =
                document.createElement(
                    "div"
                );


            questionText.className =
                "drag-question-text";


            questionText.innerHTML = `

                <span class="question-number">
                    ${question.number}.
                </span>

                ${escapeHTML(
                    question.text ||
                    question.question ||
                    ""
                )}

            `;


            questionBox.appendChild(
                dropZone
            );


            questionBox.appendChild(
                questionText
            );


            questionsContainer.appendChild(
                questionBox
            );

        }
    );


    container.appendChild(
        questionsContainer
    );


    box.appendChild(
        container
    );


    restoreDragDropAnswers();

}


/* =========================================================
   SETUP DRAG OPTION
========================================================= */

function setupDragOption(
    element
) {

    element.addEventListener(
        "dragstart",
        function (event) {

            selectedDragOption =
                element;


            event.dataTransfer.effectAllowed =
                "copy";


            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({

                    value:
                        element.dataset.value,

                    text:
                        element.dataset.text

                })
            );


            element.classList.add(
                "dragging"
            );

        }
    );


    element.addEventListener(
        "dragend",
        function () {

            element.classList.remove(
                "dragging"
            );

        }
    );


    /*
     * Click support.
     *
     * Very useful on mobile.
     *
     * Student clicks a word/topic,
     * then clicks the destination.
     */

    element.addEventListener(
        "click",
        function () {

            document
                .querySelectorAll(
                    ".drag-option.selected, .summary-drag-word.selected"
                )
                .forEach(
                    function (item) {

                        item.classList.remove(
                            "selected"
                        );

                    }
                );


            element.classList.add(
                "selected"
            );


            selectedDragOption =
                element;

        }
    );

}


/* =========================================================
   SETUP DROP ZONE
========================================================= */

function setupDropZone(
    zone,
    questionNumber
) {

    /*
     * DESKTOP DRAG
     */

    zone.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            event.dataTransfer.dropEffect =
                "copy";


            zone.classList.add(
                "drag-over"
            );

        }
    );


    zone.addEventListener(
        "dragleave",
        function () {

            zone.classList.remove(
                "drag-over"
            );

        }
    );


    zone.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();


            zone.classList.remove(
                "drag-over"
            );


            const raw =
                event.dataTransfer.getData(
                    "text/plain"
                );


            if (!raw) {

                return;

            }


            try {

                const data =
                    JSON.parse(
                        raw
                    );


                placeDragAnswer(
                    zone,
                    questionNumber,
                    data.value,
                    data.text
                );


            } catch (error) {

                console.error(
                    "Drag/drop error:",
                    error
                );

            }

        }
    );


    /*
     * MOBILE CLICK
     */

    zone.addEventListener(
        "click",
        function () {

            if (!selectedDragOption) {

                return;

            }


            const option =
                selectedDragOption;


            placeDragAnswer(
                zone,
                questionNumber,
                option.dataset.value,
                option.dataset.text
            );


            option.classList.remove(
                "selected"
            );


            selectedDragOption =
                null;

        }
    );

}


/* =========================================================
   PLACE DRAG ANSWER
========================================================= */

function placeDragAnswer(
    zone,
    questionNumber,
    value,
    text
) {

    if (!zone) {

        return;

    }


    /*
     * Save answer.
     */

    studentAnswers[
        questionNumber
    ] =
        value;


    /*
     * Show answer.
     */

    zone.innerHTML = `

        <div class="dropped-answer">

            <span class="dropped-answer-text">
                ${escapeHTML(
                    text
                )}
            </span>

            <button
                type="button"
                class="remove-dropped-answer"
                aria-label="Remove answer"
            >
                ×
            </button>

        </div>

    `;


    zone.classList.add(
        "has-answer"
    );


    /*
     * Remove answer.
     */

    const removeButton =
        zone.querySelector(
            ".remove-dropped-answer"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                delete studentAnswers[
                    questionNumber
                ];


                zone.classList.remove(
                    "has-answer"
                );


                zone.innerHTML = `

                    <span class="drop-placeholder">
                        Drag and drop answer here
                    </span>

                `;


                saveAnswersToStorage();

                updateQuestionNavigator();

            }
        );

    }


    saveAnswersToStorage();

    updateQuestionNavigator();

}


/* =========================================================
   RESTORE DRAG/DROP ANSWERS
========================================================= */

function restoreDragDropAnswers() {

    document
        .querySelectorAll(
            ".drag-drop-zone, .summary-drop-zone"
        )
        .forEach(
            function (zone) {

                const number =
                    Number(
                        zone.dataset.questionNumber
                    );


                const saved =
                    studentAnswers[
                        number
                    ];


                if (
                    saved === undefined ||
                    saved === null ||
                    String(
                        saved
                    ).trim() === ""
                ) {

                    return;

                }


                const option =
                    findVisibleOption(
                        saved
                    );


                if (option) {

                    placeDragAnswer(
                        zone,
                        number,
                        option.value,
                        option.text
                    );

                }

            }
        );

}


/* =========================================================
   FIND VISIBLE OPTION
========================================================= */

function findVisibleOption(
    value
) {

    const target =
        normalizeAnswer(
            value
        );


    const elements =
        document.querySelectorAll(
            ".drag-option, .summary-drag-word"
        );


    for (
        const element of elements
    ) {

        const elementValue =
            normalizeAnswer(
                element.dataset.value
            );


        const elementText =
            normalizeAnswer(
                element.dataset.text ||
                element.textContent
            );


        if (
            elementValue === target ||
            elementText === target
        ) {

            return {

                value:
                    element.dataset.value ||
                    element.dataset.text,

                text:
                    element.dataset.text ||
                    element.textContent.trim()

            };

        }

    }


    /*
     * Fallback.
     */

    return {

        value:
            String(value),

        text:
            String(value)

    };

}


/* =========================================================
   MATCHING SELECTS
   For older matching question types.
========================================================= */

function renderMatchingSelects(
    box,
    group,
    options
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
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
        function (question) {

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
        function (question) {

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
        Array.isArray(
            radioOptions
        )
    ) {

        control.innerHTML =
            radioOptions
                .map(
                    function (option) {

                        return `

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

                        `;

                    }
                )
                .join("");


        control
            .querySelectorAll(
                "input"
            )
            .forEach(
                function (input) {

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
   QUESTION OPTIONS
========================================================= */

function getQuestionOptions(
    question,
    group,
    keys
) {

    /*
     * Question-level options.
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

    }


    /*
     * Group-level options.
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

    }


    return [];

}


/* =========================================================
   NORMALIZE OPTION
========================================================= */

function normalizeOption(
    option
) {

    if (
        option === undefined ||
        option === null
    ) {

        return {

            value: "",
            text: ""

        };

    }


    if (
        typeof option === "string" ||
        typeof option === "number"
    ) {

        return {

            value:
                String(option),

            text:
                String(option)

        };

    }


    if (
        typeof option === "object"
    ) {

        const value =
            option.value ??
            option.letter ??
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
   UNIQUE OPTIONS
========================================================= */

function uniqueOptions(
    options
) {

    const seen =
        new Set();


    const result = [];


    (
        options ||
        []
    ).forEach(
        function (option) {

            const normalized =
                normalizeOption(
                    option
                );


            const key =
                normalizeAnswer(
                    normalized.value ||
                    normalized.text
                );


            if (!key) {

                return;

            }


            if (
                seen.has(
                    key
                )
            ) {

                return;

            }


            seen.add(
                key
            );


            result.push(
                option
            );

        }
    );


    return result;

}


/* =========================================================
   CURRENT PASSAGE OPTIONS
========================================================= */

function getCurrentPassageOptions() {

    if (!currentTest) {

        return [];

    }


    const part =
        currentTest.parts[
            currentPartIndex
        ];


    if (!part) {

        return [];

    }


    const paragraphs =
        part.passage?.paragraphs ||
        [];


    return paragraphs.map(
        function (paragraph) {

            return {

                value:
                    String(
                        paragraph.id ||
                        ""
                    ),

                text:
                    String(
                        paragraph.id ||
                        ""
                    )

            };

        }
    );

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
                Select...
            </option>

    `;


    (
        options ||
        []
    ).forEach(
        function (option) {

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
            function (input) {

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
   SAVE ALL VISIBLE ANSWERS
========================================================= */

function saveAllVisibleAnswers() {

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(
            function (element) {

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

                    if (
                        element.checked
                    ) {

                        studentAnswers[number] =
                            element.value;

                    }

                } else if (
                    element.tagName === "INPUT" ||
                    element.tagName === "SELECT"
                ) {

                    /*
                     * Don't overwrite a drag/drop answer
                     * with an empty value.
                     */

                    if (
                        element.value !== ""
                    ) {

                        studentAnswers[number] =
                            element.value;

                    }

                }

            }
        );


    saveAnswersToStorage();

}


/* =========================================================
   RESTORE NORMAL ANSWERS
========================================================= */

function restoreAnswers() {

    document
        .querySelectorAll(
            "input[data-question-number], select[data-question-number]"
        )
        .forEach(
            function (element) {

                const number =
                    Number(
                        element.dataset.questionNumber
                    );


                const value =
                    studentAnswers[
                        number
                    ];


                if (
                    value === undefined
                ) {

                    return;

                }


                if (
                    element.type === "radio"
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


    /*
     * Restore drag/drop after normal controls.
     */

    restoreDragDropAnswers();

    updateQuestionNavigator();

}


/* =========================================================
   LOCAL STORAGE KEY
========================================================= */

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
   SAVE ANSWERS
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


/* =========================================================
   LOAD SAVED ANSWERS
========================================================= */

function loadSavedAnswers() {

    try {

        const raw =
            localStorage.getItem(
                getAnswerStorageKey()
            );


        if (raw) {

            const saved =
                JSON.parse(
                    raw
                );


            if (
                saved &&
                typeof saved === "object"
            ) {

                studentAnswers =
                    saved;

            }

        }

    } catch (error) {

        console.warn(
            "Could not load answers:",
            error
        );


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


    const numbers =
        getAllQuestionNumbers();


    nav.innerHTML =
        numbers
            .map(
                function (number) {

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
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

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


/* =========================================================
   GET ALL QUESTION NUMBERS
   ---------------------------------------------------------
   IMPORTANT:
   Includes group.blanks.
   This fixes the old:

   1 2 3 ... 22 27 28...

   problem.

   It now shows:

   1 2 3 ... 22 23 24 25 26 27 28...
========================================================= */

function getAllQuestionNumbers() {

    const numbers = [];


    (
        currentTest?.parts ||
        []
    ).forEach(
        function (part) {

            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    (
                        group.questions ||
                        []
                    ).forEach(
                        function (question) {

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


                    /*
                     * SUMMARY COMPLETION
                     */

                    (
                        group.blanks ||
                        []
                    ).forEach(
                        function (blank) {

                            const number =
                                Number(
                                    blank.number
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
    ]
    .sort(
        function (
            a,
            b
        ) {

            return a - b;

        }
    );

}


/* =========================================================
   UPDATE NAVIGATOR
========================================================= */

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
            function (button) {

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


/* =========================================================
   IS ANSWERED
========================================================= */

function isQuestionAnswered(
    number
) {

    const value =
        studentAnswers[
            number
        ];


    return (
        value !== undefined &&
        value !== null &&
        String(
            value
        ).trim() !== ""
    );

}


/* =========================================================
   JUMP TO QUESTION
========================================================= */

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
            ".question, .drag-question"
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
   NEXT PART
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


/* =========================================================
   PREVIOUS PART
========================================================= */

function previousPart() {

    saveAllVisibleAnswers();


    if (
        currentPartIndex > 0
    ) {

        currentPartIndex--;

        renderCurrentPart();

    }

}


/* =========================================================
   PART BUTTONS
========================================================= */

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

        if (
            currentPartIndex ===
            currentTest.parts.length - 1
        ) {

            next.textContent =
                "Submit Test →";

        } else {

            next.textContent =
                "Next Part →";

        }

    }

}


/* =========================================================
   SCROLL PANELS
========================================================= */

function scrollTestPanelsToTop() {

    [
        "passagePanel",
        "questionsPanel"
    ]
    .forEach(
        function (id) {

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
   CONFIRM SUBMIT
========================================================= */

function confirmSubmitTest() {

    if (testSubmitted) {

        return;

    }


    openConfirmModal();

}


/* =========================================================
   CONFIRM EXIT
========================================================= */

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
   MODAL
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
   TIME USED
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
   SCORE
========================================================= */

function calculateScore() {

    let total = 0;

    const partScores = [];


    (
        currentTest.parts ||
        []
    ).forEach(
        function (part) {

            let partScore = 0;


            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    /*
                     * Normal:
                     *
                     * group.questions
                     *
                     * Summary:
                     *
                     * group.blanks
                     */

                    const questions =
                        group.questions &&
                        group.questions.length
                            ? group.questions
                            : group.blanks ||
                              [];


                    questions.forEach(
                        function (question) {

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
   COUNT QUESTIONS
========================================================= */

function countTotalQuestions() {

    return getAllQuestionNumbers()
        .length;

}


/* =========================================================
   ANSWERS MATCH
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


    const normalizedGiven =
        normalizeAnswer(
            given
        );


    /*
     * Multiple accepted answers.
     */

    if (
        Array.isArray(
            correct
        )
    ) {

        return correct.some(
            function (answer) {

                return (
                    normalizeAnswer(
                        answer
                    ) ===
                    normalizedGiven
                );

            }
        );

    }


    return (
        normalizedGiven ===
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
            "SAVE RESULT:",
            response
        );


    } catch (error) {

        console.error(
            "SAVE RESULT ERROR:",
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
                function (
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
            "History error:",
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
                function (result) {

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

    /*
     * First try GET.
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
                data
            )
        );


        const response =
            await fetch(
                `${CONFIG.API_URL}?${params.toString()}`,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        const text =
            await response.text();


        const json =
            JSON.parse(
                text
            );


        return json;


    } catch (getError) {

        console.warn(
            "GET API failed. Trying POST...",
            getError
        );

    }


    /*
     * POST fallback.
     */

    try {

        const body = {

            action:
                action,

            data:
                data

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


        return JSON.parse(
            text
        );


    } catch (error) {

        console.error(
            "POST API request failed:",
            error
        );


        throw error;

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
            function (element) {

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

    const ids = [

        "loginMessage",

        "loginError",

        "errorMessage"

    ];


    let element = null;


    for (
        const id of ids
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

        console.log(
            message
        );

        return;

    }


    element.textContent =
        message;


    element.style.display =
        "block";


    setTimeout(
        function () {

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
   INJECT DRAG/DROP CSS
   ---------------------------------------------------------
   You do NOT need to put this CSS into style.css.
   This app.js automatically adds it.
========================================================= */

function injectDragDropStyles() {

    if (
        document.getElementById(
            "dragDropStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "dragDropStyles";


    style.textContent = `

        /* =============================================
           DRAG/DROP GENERAL
        ============================================= */

        .drag-matching-container,
        .drag-summary-container {

            width: 100%;

            box-sizing: border-box;

        }


        /* =============================================
           OPTION BANK
        ============================================= */

        .drag-option-bank,
        .drag-summary-bank {

            background: #f7f8fa;

            border: 1px solid #d8dde5;

            border-radius: 12px;

            padding: 16px;

            margin-bottom: 20px;

        }


        .drag-bank-title {

            font-size: 15px;

            font-weight: 700;

            color: #20242a;

            margin-bottom: 12px;

        }


        .drag-options,
        .drag-summary-options {

            display: flex;

            flex-wrap: wrap;

            gap: 10px;

        }


        /* =============================================
           MATCHING OPTION
        ============================================= */

        .drag-option,
        .summary-drag-word {

            display: inline-flex;

            align-items: center;

            gap: 6px;

            background: #ffffff;

            border: 1px solid #cbd2db;

            border-radius: 8px;

            padding: 10px 13px;

            cursor: grab;

            user-select: none;

            font-size: 14px;

            line-height: 1.4;

            transition:
                background .15s ease,
                border-color .15s ease,
                transform .15s ease;

        }


        .drag-option:hover,
        .summary-drag-word:hover {

            border-color: #2563eb;

            transform: translateY(-1px);

        }


        .drag-option.dragging,
        .summary-drag-word.dragging {

            opacity: .45;

        }


        .drag-option.selected,
        .summary-drag-word.selected {

            border-color: #2563eb;

            background: #eff6ff;

            box-shadow:
                0 0 0 2px rgba(
                    37,
                    99,
                    235,
                    .12
                );

        }


        .drag-option-handle {

            opacity: .5;

            font-size: 13px;

        }


        /* =============================================
           MATCHING QUESTION
        ============================================= */

        .drag-question {

            background: #ffffff;

            border: 1px solid #e1e5ea;

            border-radius: 12px;

            padding: 16px;

            margin-bottom: 18px;

        }


        /* =============================================
           DROP ZONE
        ============================================= */

        .drag-drop-zone {

            width: 100%;

            min-height: 50px;

            box-sizing: border-box;

            border: 2px dashed #b8c1cc;

            border-radius: 8px;

            background: #fafbfc;

            display: flex;

            align-items: center;

            padding: 8px 12px;

            margin-bottom: 13px;

            transition:
                border-color .15s ease,
                background .15s ease;

        }


        .drag-drop-zone.drag-over {

            border-color: #2563eb;

            background: #eff6ff;

        }


        .drag-drop-zone.has-answer {

            border-style: solid;

            border-color: #9aa4b2;

            background: #f8fafc;

        }


        .drop-placeholder {

            color: #8a95a3;

            font-size: 14px;

        }


        .drag-question-text {

            font-size: 16px;

            line-height: 1.6;

        }


        /* =============================================
           DROPPED ANSWER
        ============================================= */

        .dropped-answer {

            width: 100%;

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 10px;

        }


        .dropped-answer-text {

            font-weight: 600;

            color: #20242a;

            line-height: 1.4;

        }


        .remove-dropped-answer {

            flex-shrink: 0;

            border: none;

            background: transparent;

            color: #b42318;

            font-size: 21px;

            line-height: 1;

            cursor: pointer;

            padding: 3px 7px;

        }


        /* =============================================
           SUMMARY
        ============================================= */

        .drag-summary-text {

            font-size: 16px;

            line-height: 2.3;

            color: #20242a;

        }


        .summary-drop-zone {

            display: inline-flex;

            vertical-align: middle;

            align-items: center;

            justify-content: center;

            min-width: 125px;

            min-height: 38px;

            box-sizing: border-box;

            margin:
                0 5px;

            padding:
                3px 8px;

            border:
                2px dashed #adb7c3;

            border-radius: 7px;

            background: #fafbfc;

            cursor: pointer;

        }


        .summary-drop-zone.drag-over {

            border-color: #2563eb;

            background: #eff6ff;

        }


        .summary-drop-zone.has-answer {

            border-style: solid;

            border-color: #9aa4b2;

            background: #f8fafc;

        }


        .summary-drop-placeholder {

            color: #8a95a3;

            font-size: 13px;

            white-space: nowrap;

        }


        .summary-drop-zone
        .dropped-answer-text {

            font-size: 14px;

        }


        .summary-fallback {

            margin-top: 20px;

        }


        .summary-fallback-row {

            display: flex;

            align-items: center;

            gap: 10px;

            margin-bottom: 12px;

        }


        /* =============================================
           MOBILE
        ============================================= */

        @media (
            max-width: 700px
        ) {

            .drag-options,
            .drag-summary-options {

                display: grid;

                grid-template-columns:
                    1fr;

            }


            .drag-option,
            .summary-drag-word {

                width: 100%;

                box-sizing: border-box;

            }


            .drag-summary-text {

                font-size: 15px;

                line-height: 2.1;

            }


            .summary-drop-zone {

                min-width: 100px;

            }


            .drag-question-text {

                font-size: 15px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   PUBLIC DEBUG API
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
        function () {

            return currentTest;

        },

    getAnswers:
        function () {

            return studentAnswers;

        },

    getCurrentUser:
        function () {

            return currentUser;

        },

    getQuestionNumbers:
        function () {

            return getAllQuestionNumbers();

        }

};


/* =========================================================
   END OF app.js
========================================================= */
