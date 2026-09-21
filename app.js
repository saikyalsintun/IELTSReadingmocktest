/* =========================================================
   IELTS READING PRACTICE WEBSITE
   COMPLETE app.js
========================================================= */

const CONFIG = {
    API_URL:
        "https://script.google.com/macros/s/AKfycbzkYktZQFtycRgG3K6Hi6MsvUtP8RsqOq6QxB598FVYefGmpe_oS3R518GZ0821bNbYtw/exec",

    TEST_FOLDER: "./tests/",

    VOCABULARY_FILE: "./data/vocabulary.json",

    TEST_COUNT: 20,

    DEFAULT_DURATION: 60
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

        /*
         * Vocabulary is OPTIONAL.
         *
         * If vocabulary.json doesn't exist,
         * the website continues normally.
         */

        await loadVocabulary();

        restoreLogin();
    }
);


/* =========================================================
   GLOBAL EVENT SETUP
========================================================= */

function setupGlobalEvents() {

    /*
     * Login
     */

    const loginForm =
        document.querySelector(
            "#loginForm"
        ) ||
        document.querySelector(
            'form[action*="login"]'
        ) ||
        document.querySelector(
            "form"
        );

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    /*
     * Buttons
     */

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


    /*
     * Click outside vocabulary popup
     */

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
   ADD CLICK HELPER
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
   FIND LOGIN INPUT
========================================================= */

function findUsernameInput() {

    /*
     * Try all common IDs/names.
     */

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

async function handleLogin(
    event
) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    /*
     * Find fields robustly.
     */

    const usernameInput =
        findUsernameInput();

    const passwordInput =
        findPasswordInput();


    /*
     * IMPORTANT DEBUG INFORMATION
     */

    console.log(
        "Username input:",
        usernameInput
    );

    console.log(
        "Password input:",
        passwordInput
    );


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


    console.log(
        "Login username:",
        username
    );

    console.log(
        "Login password entered:",
        password
            ? "YES"
            : "NO"
    );


    /*
     * Username validation
     */

    if (!username) {

        showLoginMessage(
            "Username is required.",
            "error"
        );

        return;
    }


    /*
     * Password validation
     */

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
         * Send login request.
         */

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


        console.log(
            "LOGIN API RESPONSE:",
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


        /*
         * Save returned student object.
         */

        currentUser =
            response.student ||
            response.user ||
            response.data ||
            null;


        /*
         * If Apps Script doesn't return
         * the full student object,
         * still create one.
         */

        if (!currentUser) {

            currentUser = {

                username:
                    username
            };
        }


        /*
         * Make absolutely sure username
         * is available.
         */

        if (
            !currentUser.username
        ) {

            currentUser.username =
                username;
        }


        /*
         * Store login.
         */

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

            if (
                !part.passage
            ) {

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


    studentAnswers = {};


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
        ) *
        60;


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

function questionRangeForPart(
    part
) {

    const numbers = [];


    (
        part.questionGroups ||
        []
    )
    .forEach(
        function (group) {

            (
                group.questions ||
                []
            )
            .forEach(
                function (question) {

                    numbers.push(
                        Number(
                            question.number
                        )
                    );
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
   VOCABULARY HIGHLIGHT
========================================================= */

function highlightVocabulary(
    text
) {

    /*
     * If vocabulary.json doesn't exist,
     * simply return normal text.
     */

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
   VOCABULARY FILE
========================================================= */

async function loadVocabulary() {

    /*
     * IMPORTANT:
     *
     * vocabulary.json does NOT have to exist.
     *
     * No error is shown to the student.
     */

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

            console.info(
                "Vocabulary file not found. Vocabulary feature disabled."
            );

            return;
        }


        const data =
            await response.json();


        vocabulary =
            data.words ||
            data ||
            {};


    } catch (error) {

        /*
         * Do NOT show an error.
         */

        console.info(
            "Vocabulary file is not available yet. Continuing without vocabulary."
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


    /*
     * Keep popup inside viewport.
     */

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
    )
    .forEach(
        function (group) {

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

                <p class="question-instructions">

                    ${escapeHTML(
                        group.instructions ||
                        ""
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


            switch (
                group.type
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
   TRUE FALSE NOT GIVEN
========================================================= */

function renderTrueFalseNotGiven(
    box,
    group
) {

    (
        group.questions ||
        []
    )
    .forEach(
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
   YES NO NOT GIVEN
========================================================= */

function renderYesNoNotGiven(
    box,
    group
) {

    (
        group.questions ||
        []
    )
    .forEach(
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
    )
    .forEach(
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


    let text =
        group.summary ||
        group.text ||
        "";


    const questions =
        group.questions ||
        [];


    let index = 0;


    text =
        escapeHTML(
            text
        )
        .replace(
            /_{2,}/g,
            function () {

                const question =
                    questions[index++];


                if (!question) {

                    return "________";
                }


                return `

                    <input
                        type="text"
                        class="summary-answer-input"
                        data-question-number="${question.number}"
                    >

                `;
            }
        );


    summary.innerHTML =
        text;


    attachInputListener(
        summary
    );


    box.appendChild(
        summary
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
        group.questions ||
        []
    )
    .forEach(
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
                    question.options ||
                    group.options ||
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
     * IMPORTANT:
     *
     * Q27 = one select
     * Q28 = one select
     *
     * Example:
     *
     * Q27 -> A
     * Q28 -> D
     *
     * A/D and D/A are accepted.
     */

    (
        group.questions ||
        []
    )
    .forEach(
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
        group.options ||
        group.headings ||
        [];


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

    const options =
        group.options ||
        getParagraphLetters();


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
        group.options ||
        [];


    renderMatchingSelects(
        box,
        group,
        options
    );
}


/* =========================================================
   GENERIC MATCHING
========================================================= */

function renderMatchingSelects(
    box,
    group,
    options
) {

    (
        group.questions ||
        []
    )
    .forEach(
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
    )
    .forEach(
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

    (
        group.questions ||
        []
    )
    .forEach(
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
   CREATE QUESTION
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


    if (options) {

        control.innerHTML =
            options
                .map(
                    function (option) {

                        return `

                            <label class="option-item">

                                <input
                                    type="radio"
                                    name="q${question.number}"
                                    value="${escapeAttribute(option)}"
                                    data-question-number="${question.number}"
                                >

                                <span>
                                    ${escapeHTML(option)}
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
   SELECT OPTIONS
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
    )
    .forEach(
        function (option) {

            let value = "";

            let text = "";


            if (
                typeof option ===
                "object"
            ) {

                value =
                    option.letter ??
                    option.value ??
                    option.id ??
                    option.text ??
                    "";

                text =
                    option.text ??
                    option.label ??
                    option.value ??
                    option.letter ??
                    "";

            } else {

                value =
                    option;

                text =
                    option;
            }


            html += `

                <option
                    value="${escapeAttribute(value)}"
                >
                    ${escapeHTML(text)}
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
            function (element) {

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
                        element.value !==
                        ""
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
   RESTORE ANSWERS
========================================================= */

function restoreAnswers() {

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
            }
        );


    updateQuestionNavigator();
}


/* =========================================================
   LOCAL ANSWER STORAGE
========================================================= */

function saveAnswersToStorage() {

    if (
        !currentTestNumber
    ) {

        return;
    }


    try {

        const key =
            getAnswerStorageKey();


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
            getAnswerStorageKey();


        const raw =
            localStorage.getItem(
                key
            );


        if (raw) {

            studentAnswers =
                JSON.parse(
                    raw
                ) || {};
        }

    } catch (error) {

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
                function (number) {

                    return `

                        <button
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


function isQuestionAnswered(
    number
) {

    const value =
        studentAnswers[
            number
        ];


    return (
        value !== undefined &&
        String(
            value
        ).trim() !== ""
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
            behavior:
                "smooth",

            block:
                "center"
        });
    }
}


/* =========================================================
   GET QUESTION NUMBERS
========================================================= */

function getAllQuestionNumbers() {

    const numbers = [];


    (
        currentTest?.parts ||
        []
    )
    .forEach(
        function (part) {

            (
                part.questionGroups ||
                []
            )
            .forEach(
                function (group) {

                    (
                        group.questions ||
                        []
                    )
                    .forEach(
                        function (question) {

                            numbers.push(
                                Number(
                                    question.number
                                )
                            );
                        }
                    );
                }
            );
        }
    );


    return numbers.sort(
        function (
            a,
            b
        ) {

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
   SCORE
========================================================= */

function calculateScore() {

    let total = 0;


    const partScores = [];


    (
        currentTest.parts ||
        []
    )
    .forEach(
        function (part) {

            let partScore = 0;


            (
                part.questionGroups ||
                []
            )
            .forEach(
                function (group) {

                    const questions =
                        group.questions ||
                        [];


                    /*
                     * SPECIAL CASE:
                     *
                     * multiple_choice_multiple
                     *
                     * Example:
                     *
                     * Correct:
                     * Q27 = A
                     * Q28 = D
                     *
                     * Student:
                     * Q27 = D
                     * Q28 = A
                     *
                     * This is ALSO correct.
                     */

                    if (
                        group.type ===
                        "multiple_choice_multiple"
                    ) {

                        const correct =
                            questions
                                .map(
                                    function (
                                        question
                                    ) {

                                        return String(
                                            question.answer ??
                                            ""
                                        )
                                        .trim()
                                        .toUpperCase();
                                    }
                                )
                                .filter(
                                    Boolean
                                )
                                .sort();


                        const given =
                            questions
                                .map(
                                    function (
                                        question
                                    ) {

                                        return String(
                                            studentAnswers[
                                                question.number
                                            ] ??
                                            ""
                                        )
                                        .trim()
                                        .toUpperCase();
                                    }
                                )
                                .filter(
                                    Boolean
                                )
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
                            function (
                                question
                            ) {

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


    const normalizedGiven =
        normalizeAnswer(
            given
        );


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
   ARRAY EQUAL
========================================================= */

function arraysEqual(
    a,
    b
) {

    return (
        a.length ===
        b.length &&

        a.every(
            function (
                value,
                index
            ) {

                return (
                    value ===
                    b[index]
                );
            }
        )
    );
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


        console.log(
            "HISTORY RESPONSE:",
            response
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
                function (
                    result
                ) {

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
        {
            action:
                action,

            data:
                data
        }
    );


    /*
     * =====================================================
     * METHOD 1 — GET
     * =====================================================
     *
     * Google Apps Script is much more reliable with
     * simple GET requests from GitHub Pages because
     * cross-origin POST requests can trigger CORS issues.
     */

    try {

        const params =
            new URLSearchParams();


        params.set(
            "action",
            action
        );


        /*
         * Send the complete data object.
         */

        params.set(
            "data",
            JSON.stringify(
                data || {}
            )
        );


        const getUrl =
            `${CONFIG.API_URL}?${params.toString()}`;


        console.log(
            "API GET:",
            getUrl
        );


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


        console.log(
            "API GET RESPONSE:",
            text
        );


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
         * If API understands the request,
         * return it immediately.
         */

        if (
            json &&
            json.success !== false &&
            json.message !==
                "Unknown action"
        ) {

            return json;
        }


        /*
         * If server explicitly says unknown action,
         * try POST below.
         */

    } catch (getError) {

        console.warn(
            "GET API request failed:",
            getError
        );
    }


    /*
     * =====================================================
     * METHOD 2 — POST JSON
     * =====================================================
     */

    try {

        const body = {

            action:
                action,

            data:
                data || {}
        };


        console.log(
            "API POST BODY:",
            body
        );


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


        console.log(
            "API POST RESPONSE:",
            text
        );


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
   GET PARAGRAPH LETTERS
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
                function (
                    paragraph
                ) {

                    return paragraph.id;
                }
            )
            .filter(
                Boolean
            ) ||
        []
    );
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
        }
};
