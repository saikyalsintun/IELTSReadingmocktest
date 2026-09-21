/* =========================================================
   IELTS READING PRACTICE WEBSITE
   app.js
========================================================= */


/* =========================================================
   CONFIGURATION
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

    /* Login */

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /* Logout */

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }


    /* Start test */

    const startTestButton =
        document.getElementById("startTestButton");

    if (startTestButton) {

        startTestButton.addEventListener(
            "click",
            startTest
        );

    }


    /* Back dashboard */

    const backDashboard =
        document.getElementById(
            "backToDashboardButton"
        );

    if (backDashboard) {

        backDashboard.addEventListener(
            "click",
            showDashboard
        );

    }


    /* Exit test */

    const exitTestButton =
        document.getElementById(
            "exitTestButton"
        );

    if (exitTestButton) {

        exitTestButton.addEventListener(
            "click",
            confirmExitTest
        );

    }


    /* Submit */

    const submitTestButton =
        document.getElementById(
            "submitTestButton"
        );

    if (submitTestButton) {

        submitTestButton.addEventListener(
            "click",
            confirmSubmitTest
        );

    }


    /* Confirm cancel */

    const confirmCancelButton =
        document.getElementById(
            "confirmCancelButton"
        );

    if (confirmCancelButton) {

        confirmCancelButton.addEventListener(
            "click",
            closeConfirmModal
        );

    }


    /* Confirm submit */

    const confirmSubmitButton =
        document.getElementById(
            "confirmSubmitButton"
        );

    if (confirmSubmitButton) {

        confirmSubmitButton.addEventListener(
            "click",
            () => {

                closeConfirmModal();

                submitTest();

            }
        );

    }


    /* Result dashboard */

    const returnDashboardButton =
        document.getElementById(
            "returnDashboardButton"
        );

    if (returnDashboardButton) {

        returnDashboardButton.addEventListener(
            "click",
            showDashboard
        );

    }


    /* Previous */

    const previousButton =
        document.getElementById(
            "previousPartButton"
        );

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            previousPart
        );

    }


    /* Next */

    const nextButton =
        document.getElementById(
            "nextPartButton"
        );

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            nextPart
        );

    }


    /* Vocabulary close */

    const closeVocabularyButton =
        document.getElementById(
            "closeVocabularyButton"
        );

    if (closeVocabularyButton) {

        closeVocabularyButton.addEventListener(
            "click",
            closeVocabularyPopup
        );

    }


    /* Click outside vocabulary */

    document.addEventListener(
        "click",
        (event) => {

            const popup =
                document.getElementById(
                    "vocabularyPopup"
                );

            if (!popup) return;

            if (
                !popup.classList.contains("hidden") &&
                !popup.contains(event.target) &&
                !event.target.classList.contains(
                    "vocabulary-word"
                )
            ) {

                closeVocabularyPopup();

            }

        }
    );


    /* Save answers whenever user changes an input */

    document.addEventListener(
        "change",
        handleAnswerChange
    );

    document.addEventListener(
        "input",
        handleAnswerChange
    );

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    const username =
        document.getElementById(
            "username"
        ).value.trim();

    const password =
        document.getElementById(
            "password"
        ).value;

    const message =
        document.getElementById(
            "loginMessage"
        );

    if (!username || !password) {

        showLoginMessage(
            "Please enter your username and password.",
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
                    username,
                    password
                }
            );

        if (
            !response ||
            response.success !== true
        ) {

            throw new Error(
                response?.message ||
                "Login failed."
            );

        }

        currentUser =
            response.student ||
            response.user ||
            response.data;

        if (!currentUser) {

            currentUser = {
                username
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

        console.error(error);

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

    const savedUser =
        localStorage.getItem(
            "ieltsReadingUser"
        );

    if (!savedUser) {

        showScreen("loginScreen");

        return;

    }

    try {

        currentUser =
            JSON.parse(savedUser);

        showDashboard();

    } catch (error) {

        console.error(error);

        localStorage.removeItem(
            "ieltsReadingUser"
        );

        showScreen("loginScreen");

    }

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

    localStorage.removeItem(
        "ieltsReadingAnswers"
    );

    showScreen("loginScreen");

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
   DASHBOARD USER
========================================================= */

function updateDashboardUser() {

    const usernameElement =
        document.getElementById(
            "dashboardUsername"
        );

    if (!usernameElement) return;

    usernameElement.textContent =
        currentUser?.username ||
        currentUser?.Username ||
        "-";

}


/* =========================================================
   TEST CARDS
========================================================= */

function renderTestCards() {

    const container =
        document.getElementById(
            "testList"
        );

    if (!container) return;

    container.innerHTML = "";

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

        card.dataset.testNumber = i;

        card.innerHTML = `
            <div class="test-card-top">
                <div class="test-number">
                    ${i}
                </div>

                <span class="test-status">
                    Reading
                </span>
            </div>

            <div>
                <h3>
                    IELTS Reading Test ${i}
                </h3>

                <p>
                    Academic Reading Practice
                </p>
            </div>

            <div class="test-card-footer">
                <span>
                    60 minutes
                </span>

                <span class="test-start">
                    Start →
                </span>
            </div>
        `;

        card.addEventListener(
            "click",
            () => openTest(i)
        );

        container.appendChild(card);

    }


    const countLabel =
        document.getElementById(
            "testCountLabel"
        );

    if (countLabel) {

        countLabel.textContent =
            `${CONFIG.TEST_COUNT} Tests`;

    }

}


/* =========================================================
   LOAD TEST
========================================================= */

async function openTest(testNumber) {

    setLoading(
        true,
        `Loading Test ${testNumber}...`
    );

    try {

        const url =
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json`;

        const response =
            await fetch(
                `${url}?t=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Test${testNumber}.json could not be loaded.`
            );

        }

        const testData =
            await response.json();

        validateTest(testData);

        currentTest =
            testData;

        currentTestNumber =
            testNumber;

        studentAnswers = {};

        currentPartIndex = 0;

        testSubmitted = false;

        testStarted = false;

        scoreData = null;

        saveAnswersToStorage();

        showTestIntroduction();

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Unable to load the test.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   VALIDATE TEST
========================================================= */

function validateTest(test) {

    if (!test) {

        throw new Error(
            "Test JSON is empty."
        );

    }

    if (!test.testId) {

        throw new Error(
            "Test JSON is missing testId."
        );

    }

    if (!Array.isArray(test.parts)) {

        throw new Error(
            "Test JSON is missing parts."
        );

    }

    if (test.parts.length === 0) {

        throw new Error(
            "Test has no parts."
        );

    }

    test.parts.forEach(
        (part, index) => {

            if (!part.passage) {

                throw new Error(
                    `Part ${index + 1} has no passage.`
                );

            }

            if (
                !Array.isArray(
                    part.passage.paragraphs
                )
            ) {

                throw new Error(
                    `Part ${index + 1} has no paragraphs.`
                );

            }

            if (
                !Array.isArray(
                    part.questionGroups
                )
            ) {

                throw new Error(
                    `Part ${index + 1} has no questionGroups.`
                );

            }

        }
    );

}


/* =========================================================
   TEST INTRODUCTION
========================================================= */

function showTestIntroduction() {

    const title =
        document.getElementById(
            "introTestTitle"
        );

    const description =
        document.getElementById(
            "introTestDescription"
        );

    const duration =
        document.getElementById(
            "introDuration"
        );

    const questionCount =
        document.getElementById(
            "introQuestionCount"
        );

    const partCount =
        document.getElementById(
            "introPartCount"
        );

    if (title) {

        title.textContent =
            currentTest.title ||
            `IELTS Reading Test ${currentTestNumber}`;

    }

    if (description) {

        description.textContent =
            "Complete the IELTS Reading practice test within the allocated time.";

    }

    if (duration) {

        duration.textContent =
            `${currentTest.duration || CONFIG.DEFAULT_DURATION} minutes`;

    }

    if (questionCount) {

        questionCount.textContent =
            countTotalQuestions();

    }

    if (partCount) {

        partCount.textContent =
            currentTest.parts.length;

    }

    showScreen(
        "testIntroScreen"
    );

}


/* =========================================================
   START TEST
========================================================= */

function startTest() {

    if (!currentTest) return;

    testStarted = true;

    testSubmitted = false;

    testStartTime =
        Date.now();

    testElapsedSeconds = 0;

    const duration =
        Number(
            currentTest.duration ||
            CONFIG.DEFAULT_DURATION
        );

    remainingSeconds =
        duration * 60;

    showScreen(
        "testScreen"
    );

    renderCurrentPart();

    renderQuestionNavigator();

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
            () => {

                if (
                    testSubmitted ||
                    !testStarted
                ) {

                    return;

                }

                remainingSeconds--;

                testElapsedSeconds++;

                updateTimerDisplay();

                if (
                    remainingSeconds <= 0
                ) {

                    remainingSeconds = 0;

                    updateTimerDisplay();

                    autoSubmitTest();

                }

            },
            1000
        );

}


/* =========================================================
   STOP TIMER
========================================================= */

function stopTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;

    }

}


/* =========================================================
   TIMER DISPLAY
========================================================= */

function updateTimerDisplay() {

    const timer =
        document.getElementById(
            "timer"
        );

    if (!timer) return;

    const minutes =
        Math.floor(
            remainingSeconds / 60
        );

    const seconds =
        remainingSeconds % 60;

    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    timer.classList.remove(
        "warning",
        "danger"
    );

    if (
        remainingSeconds <= 300
    ) {

        timer.classList.add(
            "danger"
        );

    } else if (
        remainingSeconds <= 600
    ) {

        timer.classList.add(
            "warning"
        );

    }

}


/* =========================================================
   RENDER CURRENT PART
========================================================= */

function renderCurrentPart() {

    if (!currentTest) return;

    const part =
        currentTest.parts[
            currentPartIndex
        ];

    if (!part) return;

    renderPassage(part);

    renderQuestions(part);

    updatePartButtons();

    restoreAnswers();

    updateQuestionNavigator();

}


/* =========================================================
   RENDER PASSAGE
========================================================= */

function renderPassage(part) {

    const title =
        document.getElementById(
            "passageTitle"
        );

    const content =
        document.getElementById(
            "passageContent"
        );

    if (!content) return;

    if (title) {

        title.textContent =
            part.passage.title ||
            part.title ||
            "Reading Passage";

    }

    content.innerHTML = "";

    const paragraphs =
        part.passage.paragraphs ||
        [];

    paragraphs.forEach(
        paragraph => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "passage-paragraph";

            const label =
                document.createElement(
                    "span"
                );

            label.className =
                "paragraph-label";

            label.textContent =
                paragraph.id;

            div.appendChild(label);

            const textContainer =
                document.createElement(
                    "span"
                );

            textContainer.innerHTML =
                highlightVocabulary(
                    escapeHTML(
                        paragraph.text ||
                        ""
                    )
                );

            div.appendChild(
                textContainer
            );

            content.appendChild(div);

        }
    );


    /* Vocabulary clicks */

    content
        .querySelectorAll(
            ".vocabulary-word"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        const word =
                            element.dataset.word;

                        showVocabularyPopup(
                            word,
                            event
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
        Object.keys(vocabulary).length === 0
    ) {

        return text;

    }

    const words =
        Object.keys(vocabulary)
            .sort(
                (a, b) =>
                    b.length - a.length
            );

    if (words.length === 0) {

        return text;

    }

    const escapedWords =
        words.map(
            word =>
                escapeRegExp(word)
        );

    const regex =
        new RegExp(
            `\\b(${escapedWords.join("|")})\\b`,
            "gi"
        );

    return text.replace(
        regex,
        match => {

            const key =
                findVocabularyKey(
                    match
                );

            if (!key) {

                return match;

            }

            return `
                <span
                    class="vocabulary-word"
                    data-word="${escapeAttribute(key)}"
                >
                    ${match}
                </span>
            `;

        }
    );

}


/* =========================================================
   FIND VOCABULARY KEY
========================================================= */

function findVocabularyKey(word) {

    const lower =
        String(word)
            .toLowerCase();

    const key =
        Object.keys(vocabulary)
            .find(
                item =>
                    item.toLowerCase() === lower
            );

    return key || null;

}


/* =========================================================
   LOAD VOCABULARY
========================================================= */

async function loadVocabulary() {

    try {

        const response =
            await fetch(
                `${CONFIG.VOCABULARY_FILE}?t=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            console.warn(
                "Vocabulary file could not be loaded."
            );

            vocabulary = {};

            return;

        }

        const data =
            await response.json();

        /*
           Expected format:

           {
             "words": {
               "cultivation": {
                 "meaning": "...",
                 "simpleMeaning": "..."
               }
             }
           }
        */

        vocabulary =
            data.words ||
            {};

    } catch (error) {

        console.warn(
            "Vocabulary loading failed:",
            error
        );

        vocabulary = {};

    }

}


/* =========================================================
   VOCABULARY POPUP
========================================================= */

function showVocabularyPopup(
    word,
    event
) {

    const entry =
        vocabulary[word];

    if (!entry) return;

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    const wordElement =
        document.getElementById(
            "vocabularyWord"
        );

    const meaning =
        document.getElementById(
            "vocabularyMeaning"
        );

    const simpleMeaning =
        document.getElementById(
            "vocabularySimpleMeaning"
        );

    if (!popup) return;

    if (wordElement) {

        wordElement.textContent =
            word;

    }

    if (meaning) {

        meaning.textContent =
            entry.meaning ||
            "";

    }

    if (simpleMeaning) {

        simpleMeaning.textContent =
            entry.simpleMeaning ||
            "";

    }

    popup.classList.remove(
        "hidden"
    );

    positionVocabularyPopup(
        popup,
        event
    );

}


/* =========================================================
   POSITION VOCABULARY POPUP
========================================================= */

function positionVocabularyPopup(
    popup,
    event
) {

    const margin = 12;

    let left =
        event.clientX + margin;

    let top =
        event.clientY + margin;

    const rect =
        popup.getBoundingClientRect();

    if (
        left + rect.width >
        window.innerWidth - margin
    ) {

        left =
            event.clientX -
            rect.width -
            margin;

    }

    if (
        top + rect.height >
        window.innerHeight - margin
    ) {

        top =
            event.clientY -
            rect.height -
            margin;

    }

    left =
        Math.max(
            margin,
            left
        );

    top =
        Math.max(
            margin,
            top
        );

    popup.style.left =
        `${left}px`;

    popup.style.top =
        `${top}px`;

}


/* =========================================================
   CLOSE VOCABULARY
========================================================= */

function closeVocabularyPopup() {

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (popup) {

        popup.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   RENDER QUESTIONS
========================================================= */

function renderQuestions(part) {

    const content =
        document.getElementById(
            "questionContent"
        );

    const partTitle =
        document.getElementById(
            "questionPartTitle"
        );

    if (!content) return;

    content.innerHTML = "";

    if (partTitle) {

        partTitle.textContent =
            `Part ${part.partNumber}: ${part.title}`;

    }

    const groups =
        part.questionGroups ||
        [];

    groups.forEach(
        (group, groupIndex) => {

            const groupElement =
                document.createElement(
                    "div"
                );

            groupElement.className =
                "question-group";

            groupElement.dataset.groupIndex =
                groupIndex;

            const instruction =
                document.createElement(
                    "div"
                );

            instruction.className =
                "question-instructions";

            instruction.innerHTML = `
                <strong>
                    Questions ${escapeHTML(
                        group.questionRange || ""
                    )}
                </strong>
                <br>
                ${escapeHTML(
                    group.instructions || ""
                )}
            `;

            groupElement.appendChild(
                instruction
            );


            switch (group.type) {

                case "true_false_not_given":

                    renderTrueFalseNotGiven(
                        group,
                        groupElement
                    );

                    break;


                case "yes_no_not_given":

                    renderYesNoNotGiven(
                        group,
                        groupElement
                    );

                    break;


                case "fill_blank":

                    renderFillBlank(
                        group,
                        groupElement
                    );

                    break;


                case "summary_completion":

                    renderSummaryCompletion(
                        group,
                        groupElement
                    );

                    break;


                case "multiple_choice":

                    renderMultipleChoice(
                        group,
                        groupElement
                    );

                    break;


                case "multiple_choice_multiple":

                    renderMultipleChoiceMultiple(
                        group,
                        groupElement
                    );

                    break;


                case "matching_headings":

                    renderMatchingHeadings(
                        group,
                        groupElement
                    );

                    break;


                case "matching_information":

                    renderMatchingInformation(
                        group,
                        groupElement
                    );

                    break;


                case "matching_features":

                    renderMatchingFeatures(
                        group,
                        groupElement
                    );

                    break;


                case "answer_box":

                    renderAnswerBox(
                        group,
                        groupElement
                    );

                    break;


                default:

                    renderUnsupportedGroup(
                        group,
                        groupElement
                    );

            }

            content.appendChild(
                groupElement
            );

        }
    );

}


/* =========================================================
   TRUE / FALSE / NOT GIVEN
========================================================= */

function renderTrueFalseNotGiven(
    group,
    container
) {

    const questions =
        group.questions || [];

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const select =
                createSelect(
                    question.number,
                    [
                        "",
                        "TRUE",
                        "FALSE",
                        "NOT GIVEN"
                    ]
                );

            item.appendChild(
                select
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   YES / NO / NOT GIVEN
========================================================= */

function renderYesNoNotGiven(
    group,
    container
) {

    const questions =
        group.questions || [];

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const select =
                createSelect(
                    question.number,
                    [
                        "",
                        "YES",
                        "NO",
                        "NOT GIVEN"
                    ]
                );

            item.appendChild(
                select
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(
    group,
    container
) {

    const questions =
        group.questions || [];

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "text";

            input.className =
                "answer-input";

            input.dataset.questionNumber =
                question.number;

            input.autocomplete =
                "off";

            input.placeholder =
                "Type your answer";

            item.appendChild(
                input
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummaryCompletion(
    group,
    container
) {

    const summary =
        group.summary || "";

    const summaryElement =
        document.createElement(
            "div"
        );

    summaryElement.className =
        "question-item summary-question";

    let html =
        escapeHTML(summary);

    const blanks =
        group.blanks || [];

    blanks.forEach(
        blank => {

            const number =
                blank.number;

            const placeholder =
                `___Q${number}___`;

            /*
               If summary uses ________, replace
               each blank in sequence.
            */

        }
    );


    /*
       Replace underscores one by one.
    */

    let blankIndex = 0;

    html =
        html.replace(
            /_{3,}|\[number\]|\{number\}|Qnumber/gi,
            () => {

                if (
                    blankIndex >=
                    blanks.length
                ) {

                    return "________";

                }

                const number =
                    blanks[
                        blankIndex
                    ].number;

                blankIndex++;

                return `
                    <input
                        type="text"
                        class="inline-answer-input"
                        data-question-number="${number}"
                        autocomplete="off"
                        aria-label="Answer ${number}"
                    >
                `;

            }
        );


    /*
       If the summary contains normal underscores,
       the regex above handles them.
    */

    summaryElement.innerHTML =
        `<div class="question-text">${html}</div>`;


    /*
       If there are blanks but no placeholders were
       found, show the blanks below the summary.
    */

    if (
        blanks.length > 0 &&
        !summaryElement.querySelector(
            "[data-question-number]"
        )
    ) {

        const fallback =
            document.createElement(
                "div"
            );

        fallback.style.marginTop =
            "15px";

        blanks.forEach(
            blank => {

                const input =
                    document.createElement(
                        "input"
                    );

                input.type =
                    "text";

                input.className =
                    "inline-answer-input";

                input.dataset.questionNumber =
                    blank.number;

                input.placeholder =
                    `${blank.number}`;

                fallback.appendChild(
                    input
                );

            }
        );

        summaryElement.appendChild(
            fallback
        );

    }

    container.appendChild(
        summaryElement
    );

}


/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(
    group,
    container
) {

    const questions =
        group.questions || [];

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const options =
                document.createElement(
                    "div"
                );

            options.className =
                "options-list";

            (question.options ||
                group.options ||
                []
            ).forEach(
                option => {

                    const label =
                        document.createElement(
                            "label"
                        );

                    label.className =
                        "option-item";

                    label.innerHTML = `
                        <input
                            type="radio"
                            name="question_${question.number}"
                            value="${escapeAttribute(
                                option.letter
                            )}"
                            data-question-number="${question.number}"
                        >

                        <span class="option-letter">
                            ${escapeHTML(
                                option.letter
                            )}
                        </span>

                        <span class="option-text">
                            ${escapeHTML(
                                option.text
                            )}
                        </span>
                    `;

                    options.appendChild(
                        label
                    );

                }
            );

            item.appendChild(
                options
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MULTIPLE CHOICE - TWO ANSWERS
=========================================================

   IMPORTANT:

   Your Test1.json has:

   Question 27 = A
   Question 28 = D

   But the order should NOT matter.

   Therefore:

   27 A + 28 D = correct
   27 D + 28 A = correct

   The JSON structure stays unchanged.
========================================================= */

function renderMultipleChoiceMultiple(
    group,
    container
) {

    const questions =
        group.questions || [];

    const options =
        group.options || [];

    questions.forEach(
        (question, index) => {

            const item =
                createQuestionItem(
                    question,
                    false
                );

            const label =
                document.createElement(
                    "div"
                );

            label.className =
                "question-text";

            label.innerHTML = `
                <strong>
                    Answer ${index + 1}
                </strong>
            `;

            item.insertBefore(
                label,
                item.firstChild
            );


            const select =
                document.createElement(
                    "select"
                );

            select.className =
                "answer-select multiple-answer-select";

            select.dataset.questionNumber =
                question.number;

            const blankOption =
                document.createElement(
                    "option"
                );

            blankOption.value = "";

            blankOption.textContent =
                "Select an answer";

            select.appendChild(
                blankOption
            );


            options.forEach(
                option => {

                    const optionElement =
                        document.createElement(
                            "option"
                        );

                    optionElement.value =
                        option.letter;

                    optionElement.textContent =
                        `${option.letter}. ${option.text}`;

                    select.appendChild(
                        optionElement
                    );

                }
            );


            item.appendChild(
                select
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MATCHING HEADINGS
========================================================= */

function renderMatchingHeadings(
    group,
    container
) {

    const headings =
        group.headings || [];

    const questions =
        group.questions || [];

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const select =
                document.createElement(
                    "select"
                );

            select.className =
                "answer-select";

            select.dataset.questionNumber =
                question.number;

            addEmptyOption(
                select,
                "Select a heading"
            );

            headings.forEach(
                heading => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        heading.id;

                    option.textContent =
                        `${heading.id}. ${heading.text}`;

                    select.appendChild(
                        option
                    );

                }
            );

            item.appendChild(
                select
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MATCHING INFORMATION
========================================================= */

function renderMatchingInformation(
    group,
    container
) {

    const questions =
        group.questions || [];

    const letters =
        getParagraphLetters();

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const select =
                document.createElement(
                    "select"
                );

            select.className =
                "answer-select";

            select.dataset.questionNumber =
                question.number;

            addEmptyOption(
                select,
                "Select paragraph"
            );

            letters.forEach(
                letter => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        letter;

                    option.textContent =
                        `Paragraph ${letter}`;

                    select.appendChild(
                        option
                    );

                }
            );

            item.appendChild(
                select
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MATCHING FEATURES
========================================================= */

function renderMatchingFeatures(
    group,
    container
) {

    const questions =
        group.questions || [];

    const letters =
        getParagraphLetters();

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            const select =
                document.createElement(
                    "select"
                );

            select.className =
                "answer-select";

            select.dataset.questionNumber =
                question.number;

            addEmptyOption(
                select,
                "Select paragraph"
            );

            letters.forEach(
                letter => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        letter;

                    option.textContent =
                        `Paragraph ${letter}`;

                    select.appendChild(
                        option
                    );

                }
            );

            item.appendChild(
                select
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   ANSWER BOX
========================================================= */

function renderAnswerBox(
    group,
    container
) {

    const questions =
        group.questions || [];

    questions.forEach(
        question => {

            const item =
                createQuestionItem(
                    question
                );

            /*
               IMPORTANT:
               Only ONE input is created.

               This fixes the duplicate-input problem
               from the previous app.js.
            */

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "text";

            input.className =
                "answer-input";

            input.dataset.questionNumber =
                question.number;

            input.autocomplete =
                "off";

            input.placeholder =
                "Enter your answer";

            item.appendChild(
                input
            );

            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   UNSUPPORTED QUESTION TYPE
========================================================= */

function renderUnsupportedGroup(
    group,
    container
) {

    const error =
        document.createElement(
            "div"
        );

    error.className =
        "question-item";

    error.innerHTML = `
        <div class="question-text">
            Unsupported question type:
            <strong>
                ${escapeHTML(
                    group.type || "unknown"
                )}
            </strong>
        </div>
    `;

    container.appendChild(
        error
    );

}


/* =========================================================
   CREATE QUESTION ITEM
========================================================= */

function createQuestionItem(
    question,
    includeQuestionText = true
) {

    const item =
        document.createElement(
            "div"
        );

    item.className =
        "question-item";

    item.id =
        `question-${question.number}`;

    item.dataset.questionNumber =
        question.number;


    if (includeQuestionText) {

        const text =
            document.createElement(
                "div"
            );

        text.className =
            "question-text";

        text.innerHTML = `
            <span class="question-number-label">
                ${question.number}.
            </span>
            ${escapeHTML(
                question.text || ""
            )}
        `;

        item.appendChild(
            text
        );

    }

    return item;

}


/* =========================================================
   SELECT HELPERS
========================================================= */

function createSelect(
    questionNumber,
    values
) {

    const select =
        document.createElement(
            "select"
        );

    select.className =
        "answer-select";

    select.dataset.questionNumber =
        questionNumber;

    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                value ||
                "Select an answer";

            select.appendChild(
                option
            );

        }
    );

    return select;

}


function addEmptyOption(
    select,
    text
) {

    const option =
        document.createElement(
            "option"
        );

    option.value = "";

    option.textContent =
        text;

    select.appendChild(
        option
    );

}


/* =========================================================
   GET PARAGRAPH LETTERS
========================================================= */

function getParagraphLetters() {

    if (!currentTest) return [];

    const part =
        currentTest.parts[
            currentPartIndex
        ];

    if (!part) return [];

    return (
        part.passage?.paragraphs ||
        []
    ).map(
        paragraph =>
            paragraph.id
    );

}


/* =========================================================
   ANSWER CHANGE
========================================================= */

function handleAnswerChange(event) {

    const element =
        event.target;

    if (
        !element.matches(
            "[data-question-number]"
        )
    ) {

        return;

    }

    const number =
        Number(
            element.dataset.questionNumber
        );

    if (!number) return;

    let value = "";

    if (
        element.type ===
        "radio"
    ) {

        if (!element.checked) {

            return;

        }

        value =
            element.value;

    } else if (
        element.type ===
        "checkbox"
    ) {

        value =
            element.checked
                ? element.value
                : "";

    } else {

        value =
            element.value;

    }

    studentAnswers[number] =
        value;

    saveAnswersToStorage();

    updateQuestionNavigator();

}


/* =========================================================
   SAVE ALL VISIBLE ANSWERS
========================================================= */

function saveAllVisibleAnswers() {

    const elements =
        document.querySelectorAll(
            "[data-question-number]"
        );

    elements.forEach(
        element => {

            const number =
                Number(
                    element.dataset.questionNumber
                );

            if (!number) return;


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

                return;

            }


            if (
                element.type ===
                "checkbox"
            ) {

                if (
                    element.checked
                ) {

                    studentAnswers[number] =
                        element.value;

                }

                return;

            }


            studentAnswers[number] =
                element.value;

        }
    );

    saveAnswersToStorage();

}


/* =========================================================
   RESTORE ANSWERS
========================================================= */

function restoreAnswers() {

    const elements =
        document.querySelectorAll(
            "[data-question-number]"
        );

    elements.forEach(
        element => {

            const number =
                Number(
                    element.dataset.questionNumber
                );

            const saved =
                studentAnswers[number];

            if (
                saved === undefined ||
                saved === null
            ) {

                return;

            }


            if (
                element.type ===
                "radio"
            ) {

                element.checked =
                    element.value ===
                    saved;

                return;

            }


            if (
                element.type ===
                "checkbox"
            ) {

                element.checked =
                    element.value ===
                    saved;

                return;

            }


            element.value =
                saved;

        }
    );

    updateQuestionNavigator();

}


/* =========================================================
   LOCAL STORAGE ANSWERS
========================================================= */

function saveAnswersToStorage() {

    if (
        !currentTestNumber
    ) {

        return;

    }

    const storageKey =
        `ieltsAnswers_${currentTestNumber}`;

    localStorage.setItem(
        storageKey,
        JSON.stringify(
            studentAnswers
        )
    );

}


/* =========================================================
   LOAD SAVED ANSWERS
========================================================= */

function loadSavedAnswers() {

    if (
        !currentTestNumber
    ) {

        return {};

    }

    const storageKey =
        `ieltsAnswers_${currentTestNumber}`;

    const saved =
        localStorage.getItem(
            storageKey
        );

    if (!saved) {

        return {};

    }

    try {

        return JSON.parse(
            saved
        );

    } catch {

        return {};

    }

}


/* =========================================================
   RENDER QUESTION NAVIGATOR
========================================================= */

function renderQuestionNavigator() {

    const container =
        document.getElementById(
            "questionNavigator"
        );

    if (!container) return;

    container.innerHTML = "";

    const numbers =
        getAllQuestionNumbers();

    numbers.forEach(
        number => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "question-number";

            button.dataset.questionNumber =
                number;

            button.textContent =
                number;

            button.addEventListener(
                "click",
                () =>
                    jumpToQuestion(
                        number
                    )
            );

            container.appendChild(
                button
            );

        }
    );

    updateQuestionNavigator();

}


/* =========================================================
   UPDATE QUESTION NAVIGATOR
========================================================= */

function updateQuestionNavigator() {

    const buttons =
        document.querySelectorAll(
            ".question-number"
        );

    buttons.forEach(
        button => {

            const number =
                Number(
                    button.dataset.questionNumber
                );

            button.classList.remove(
                "answered"
            );

            if (
                isQuestionAnswered(
                    number
                )
            ) {

                button.classList.add(
                    "answered"
                );

            }

        }
    );

}


/* =========================================================
   QUESTION ANSWER CHECK
========================================================= */

function isQuestionAnswered(
    number
) {

    const answer =
        studentAnswers[number];

    if (
        answer === undefined ||
        answer === null
    ) {

        return false;

    }

    return String(
        answer
    ).trim() !== "";

}


/* =========================================================
   JUMP TO QUESTION
========================================================= */

function jumpToQuestion(
    number
) {

    const location =
        findQuestionLocation(
            number
        );

    if (!location) return;

    if (
        location.partIndex !==
        currentPartIndex
    ) {

        currentPartIndex =
            location.partIndex;

        renderCurrentPart();

    }

    setTimeout(
        () => {

            const element =
                document.getElementById(
                    `question-${number}`
                );

            if (!element) return;

            element.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            document
                .querySelectorAll(
                    ".question-item"
                )
                .forEach(
                    item =>
                        item.classList.remove(
                            "active-question"
                        )
                );

            element.classList.add(
                "active-question"
            );

        },
        50
    );

}


/* =========================================================
   FIND QUESTION LOCATION
========================================================= */

function findQuestionLocation(
    number
) {

    if (!currentTest) return null;

    for (
        let partIndex = 0;
        partIndex <
        currentTest.parts.length;
        partIndex++
    ) {

        const part =
            currentTest.parts[
                partIndex
            ];

        for (
            const group of
            part.questionGroups || []
        ) {

            for (
                const question of
                group.questions || []
            ) {

                if (
                    Number(
                        question.number
                    ) === Number(number)
                ) {

                    return {
                        partIndex,
                        group,
                        question
                    };

                }

            }

            for (
                const blank of
                group.blanks || []
            ) {

                if (
                    Number(
                        blank.number
                    ) === Number(number)
                ) {

                    return {
                        partIndex,
                        group,
                        question: blank
                    };

                }

            }

        }

    }

    return null;

}


/* =========================================================
   ALL QUESTION NUMBERS
========================================================= */

function getAllQuestionNumbers() {

    if (!currentTest) return [];

    const numbers = [];

    currentTest.parts.forEach(
        part => {

            (part.questionGroups || [])
                .forEach(
                    group => {

                        (group.questions || [])
                            .forEach(
                                question => {

                                    numbers.push(
                                        Number(
                                            question.number
                                        )
                                    );

                                }
                            );


                        (group.blanks || [])
                            .forEach(
                                blank => {

                                    numbers.push(
                                        Number(
                                            blank.number
                                        )
                                    );

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
        (a, b) =>
            a - b
    );

}


/* =========================================================
   COUNT QUESTIONS
========================================================= */

function countTotalQuestions() {

    return getAllQuestionNumbers()
        .length;

}


/* =========================================================
   PART NAVIGATION
========================================================= */

function nextPart() {

    saveAllVisibleAnswers();

    if (!currentTest) return;

    if (
        currentPartIndex <
        currentTest.parts.length - 1
    ) {

        currentPartIndex++;

        renderCurrentPart();

        scrollTestPanelsToTop();

    } else {

        confirmSubmitTest();

    }

}


function previousPart() {

    saveAllVisibleAnswers();

    if (!currentTest) return;

    if (
        currentPartIndex > 0
    ) {

        currentPartIndex--;

        renderCurrentPart();

        scrollTestPanelsToTop();

    }

}


/* =========================================================
   UPDATE PART BUTTONS
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

        const isLast =
            currentPartIndex ===
            currentTest.parts.length - 1;

        next.textContent =
            isLast
                ? "Submit Test"
                : "Next →";

    }

}


/* =========================================================
   SCROLL PANELS TOP
========================================================= */

function scrollTestPanelsToTop() {

    const passage =
        document.getElementById(
            "passagePanel"
        );

    const questions =
        document.getElementById(
            "questionPanel"
        );

    if (passage) {

        passage.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

    if (questions) {

        questions.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


/* =========================================================
   CONFIRM SUBMIT
========================================================= */

function confirmSubmitTest() {

    if (
        testSubmitted
    ) {

        return;

    }

    saveAllVisibleAnswers();

    const title =
        document.getElementById(
            "confirmTitle"
        );

    const message =
        document.getElementById(
            "confirmMessage"
        );

    if (title) {

        title.textContent =
            "Submit Test?";

    }

    if (message) {

        const answered =
            Object.values(
                studentAnswers
            )
                .filter(
                    value =>
                        String(value)
                            .trim() !== ""
                )
                .length;

        const total =
            countTotalQuestions();

        message.textContent =
            `You have answered ${answered} of ${total} questions. Are you sure you want to submit?`;

    }

    openConfirmModal();

}


/* =========================================================
   CONFIRM EXIT
========================================================= */

function confirmExitTest() {

    if (!testStarted) {

        showDashboard();

        return;

    }

    const title =
        document.getElementById(
            "confirmTitle"
        );

    const message =
        document.getElementById(
            "confirmMessage"
        );

    if (title) {

        title.textContent =
            "Exit Test?";

    }

    if (message) {

        message.textContent =
            "Your current test session will be left. Are you sure you want to exit?";

    }

    const submitButton =
        document.getElementById(
            "confirmSubmitButton"
        );

    if (submitButton) {

        submitButton.textContent =
            "Exit";

        submitButton.onclick =
            () => {

                closeConfirmModal();

                stopTimer();

                showDashboard();

            };

    }

    openConfirmModal();

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

        modal.classList.remove(
            "hidden"
        );

    }

}


function closeConfirmModal() {

    const modal =
        document.getElementById(
            "confirmModal"
        );

    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

    const submitButton =
        document.getElementById(
            "confirmSubmitButton"
        );

    if (submitButton) {

        submitButton.textContent =
            "Submit";

        submitButton.onclick =
            () => {

                closeConfirmModal();

                submitTest();

            };

    }

}


/* =========================================================
   AUTO SUBMIT
========================================================= */

function autoSubmitTest() {

    if (
        testSubmitted
    ) {

        return;

    }

    showToast(
        "Time is up. Your test is being submitted.",
        "error"
    );

    submitTest();

}


/* =========================================================
   SUBMIT TEST
========================================================= */

async function submitTest() {

    if (
        testSubmitted
    ) {

        return;

    }

    saveAllVisibleAnswers();

    testSubmitted = true;

    testStarted = false;

    stopTimer();

    testElapsedSeconds =
        calculateTimeUsed();

    setLoading(
        true,
        "Checking your answers..."
    );

    try {

        scoreData =
            calculateScore();

        await saveResultToAPI(
            scoreData
        );

        clearCurrentTestAnswers();

        renderResult(
            scoreData
        );

        showScreen(
            "resultScreen"
        );

    } catch (error) {

        console.error(error);

        /*
           Even if saving to Google Sheets fails,
           show the local result.
        */

        scoreData =
            calculateScore();

        renderResult(
            scoreData
        );

        showScreen(
            "resultScreen"
        );

        showToast(
            "Result calculated, but saving to the server failed.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   CALCULATE TIME USED
========================================================= */

function calculateTimeUsed() {

    if (!testStartTime) {

        return testElapsedSeconds;

    }

    const duration =
        Number(
            currentTest.duration ||
            CONFIG.DEFAULT_DURATION
        ) * 60;

    const elapsed =
        Math.floor(
            (
                Date.now() -
                testStartTime
            ) / 1000
        );

    return Math.min(
        duration,
        Math.max(
            0,
            elapsed
        )
    );

}


/* =========================================================
   SCORE CALCULATION
========================================================= */

function calculateScore() {

    let totalScore = 0;

    let totalQuestions =
        countTotalQuestions();

    const partScores = [];

    currentTest.parts.forEach(
        part => {

            let partScore = 0;

            /*
               Normal questions
            */

            (part.questionGroups || [])
                .forEach(
                    group => {

                        /*
                           =====================================
                           SPECIAL:
                           multiple_choice_multiple

                           Example:

                           Q27 correct = A
                           Q28 correct = D

                           Student:

                           Q27 = D
                           Q28 = A

                           should still receive 2/2.
                           =====================================
                        */

                        if (
                            group.type ===
                            "multiple_choice_multiple"
                        ) {

                            const questions =
                                group.questions ||
                                [];

                            const correctAnswers =
                                questions
                                    .map(
                                        question =>
                                            normalizeAnswer(
                                                question.answer
                                            )
                                    )
                                    .filter(
                                        answer =>
                                            answer !== ""
                                    )
                                    .sort();

                            const studentGroupAnswers =
                                questions
                                    .map(
                                        question =>
                                            normalizeAnswer(
                                                studentAnswers[
                                                    question.number
                                                ]
                                            )
                                    )
                                    .filter(
                                        answer =>
                                            answer !== ""
                                    )
                                    .sort();

                            /*
                               Compare the sets.

                               A,D == D,A
                            */

                            if (
                                correctAnswers.length ===
                                studentGroupAnswers.length &&
                                arraysEqual(
                                    correctAnswers,
                                    studentGroupAnswers
                                )
                            ) {

                                partScore +=
                                    questions.length;

                            }

                            return;

                        }


                        /*
                           =====================================
                           NORMAL QUESTIONS
                           =====================================
                        */

                        (group.questions || [])
                            .forEach(
                                question => {

                                    const correct =
                                        question.answer;

                                    const student =
                                        studentAnswers[
                                            question.number
                                        ];

                                    if (
                                        answersMatch(
                                            student,
                                            correct
                                        )
                                    ) {

                                        partScore++;

                                    }

                                }
                            );


                        /*
                           =====================================
                           SUMMARY BLANKS
                           =====================================
                        */

                        (group.blanks || [])
                            .forEach(
                                blank => {

                                    const correct =
                                        blank.answer;

                                    const student =
                                        studentAnswers[
                                            blank.number
                                        ];

                                    if (
                                        answersMatch(
                                            student,
                                            correct
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

            totalScore +=
                partScore;

        }
    );


    const band =
        calculateIELTSBand(
            totalScore
        );


    return {

        totalScore,

        totalQuestions,

        band,

        partScores,

        timeUsed:
            testElapsedSeconds

    };

}


/* =========================================================
   ANSWER MATCH
========================================================= */

function answersMatch(
    student,
    correct
) {

    if (
        student === undefined ||
        student === null ||
        correct === undefined ||
        correct === null
    ) {

        return false;

    }

    const studentNormalized =
        normalizeAnswer(
            student
        );

    const correctNormalized =
        normalizeAnswer(
            correct
        );

    return (
        studentNormalized !== "" &&
        studentNormalized ===
        correctNormalized
    );

}


/* =========================================================
   NORMALIZE ANSWER
========================================================= */

function normalizeAnswer(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value)
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

    if (
        a.length !==
        b.length
    ) {

        return false;

    }

    for (
        let i = 0;
        i < a.length;
        i++
    ) {

        if (
            a[i] !== b[i]
        ) {

            return false;

        }

    }

    return true;

}


/* =========================================================
   IELTS BAND
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
    if (score >= 1) return 1.0;

    return 0.0;

}


/* =========================================================
   SAVE RESULT TO GOOGLE APPS SCRIPT
========================================================= */

async function saveResultToAPI(
    result
) {

    if (!currentUser) {

        throw new Error(
            "No logged-in student."
        );

    }

    const username =
        currentUser.username ||
        currentUser.Username ||
        "";

    const studentID =
        currentUser.studentID ||
        currentUser.StudentID ||
        currentUser.id ||
        currentUser.ID ||
        "";

    const partScores =
        result.partScores || [];

    const payload = {

        studentID,

        username,

        testName:
            currentTest.title ||
            `IELTS Reading Test ${currentTestNumber}`,

        part1:
            partScores[0] || 0,

        part2:
            partScores[1] || 0,

        part3:
            partScores[2] || 0,

        part4:
            partScores[3] || 0,

        totalScore:
            result.totalScore,

        totalQuestions:
            result.totalQuestions,

        band:
            result.band,

        timeUsed:
            formatTime(
                result.timeUsed
            ),

        submittedAt:
            new Date().toISOString()

    };


    const response =
        await apiRequest(
            "saveResult",
            payload
        );

    if (
        !response ||
        response.success !== true
    ) {

        throw new Error(
            response?.message ||
            "Could not save result."
        );

    }

    return response;

}


/* =========================================================
   RESULT SCREEN
========================================================= */

function renderResult(
    result
) {

    const testName =
        document.getElementById(
            "resultTestName"
        );

    const score =
        document.getElementById(
            "resultScore"
        );

    const band =
        document.getElementById(
            "resultBand"
        );

    const totalQuestions =
        document.getElementById(
            "resultTotalQuestions"
        );

    const correct =
        document.getElementById(
            "resultCorrect"
        );

    const timeUsed =
        document.getElementById(
            "resultTimeUsed"
        );

    if (testName) {

        testName.textContent =
            currentTest.title ||
            `IELTS Reading Test ${currentTestNumber}`;

    }

    if (score) {

        score.textContent =
            `${result.totalScore} / ${result.totalQuestions}`;

    }

    if (band) {

        band.textContent =
            Number(result.band)
                .toFixed(1);

    }

    if (totalQuestions) {

        totalQuestions.textContent =
            result.totalQuestions;

    }

    if (correct) {

        correct.textContent =
            result.totalScore;

    }

    if (timeUsed) {

        timeUsed.textContent =
            formatTime(
                result.timeUsed
            );

    }


    renderPartScores(
        result.partScores
    );

}


/* =========================================================
   PART SCORES
========================================================= */

function renderPartScores(
    scores
) {

    const container =
        document.getElementById(
            "partScores"
        );

    if (!container) return;

    container.innerHTML = "";

    const totalParts =
        currentTest?.parts?.length ||
        0;

    for (
        let i = 0;
        i < Math.max(
            4,
            totalParts
        );
        i++
    ) {

        const score =
            scores?.[i] || 0;

        const part =
            currentTest?.parts?.[i];

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "part-score";

        div.innerHTML = `
            <span>
                ${part
                    ? `Part ${i + 1}`
                    : `Part ${i + 1}`}
            </span>

            <strong>
                ${score}
            </strong>
        `;

        container.appendChild(
            div
        );

    }

}


/* =========================================================
   CLEAR ANSWERS
========================================================= */

function clearCurrentTestAnswers() {

    if (!currentTestNumber) return;

    localStorage.removeItem(
        `ieltsAnswers_${currentTestNumber}`
    );

}


/* =========================================================
   HISTORY
========================================================= */

async function loadHistory() {

    const container =
        document.getElementById(
            "historyContainer"
        );

    if (!container) return;

    container.innerHTML = `
        <div class="history-loading">
            Loading score history...
        </div>
    `;

    try {

        const username =
            currentUser?.username ||
            currentUser?.Username ||
            "";

        const studentID =
            currentUser?.studentID ||
            currentUser?.StudentID ||
            currentUser?.id ||
            "";

        const response =
            await apiRequest(
                "getHistory",
                {
                    username,
                    studentID
                }
            );

        if (
            !response ||
            response.success !== true
        ) {

            throw new Error(
                response?.message ||
                "Could not load history."
            );

        }

        const history =
            response.results ||
            response.history ||
            response.data ||
            [];

        renderHistory(
            history
        );

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="history-empty">
                Unable to load score history.
            </div>
        `;

    }

}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory(
    history
) {

    const container =
        document.getElementById(
            "historyContainer"
        );

    if (!container) return;

    if (
        !Array.isArray(history) ||
        history.length === 0
    ) {

        container.innerHTML = `
            <div class="history-empty">
                No test results yet.
            </div>
        `;

        return;

    }


    const rows =
        history.map(
            result => {

                const testName =
                    result.TestName ||
                    result.testName ||
                    "-";

                const totalScore =
                    result.TotalScore ??
                    result.totalScore ??
                    0;

                const totalQuestions =
                    result.TotalQuestions ??
                    result.totalQuestions ??
                    0;

                const band =
                    result.Band ??
                    result.band ??
                    0;

                const timeUsed =
                    result.TimeUsed ||
                    result.timeUsed ||
                    "-";

                const timestamp =
                    result.Timestamp ||
                    result.timestamp ||
                    result.SubmittedAt ||
                    result.submittedAt ||
                    "";

                return `
                    <tr>
                        <td>
                            ${escapeHTML(
                                testName
                            )}
                        </td>

                        <td>
                            ${totalScore}
                            /
                            ${totalQuestions}
                        </td>

                        <td>
                            <span class="history-band">
                                ${Number(
                                    band
                                ).toFixed(1)}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(
                                timeUsed
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                timestamp
                            )}
                        </td>
                    </tr>
                `;

            }
        )
        .join("");


    container.innerHTML = `
        <div style="overflow-x:auto;">
            <table class="history-table">

                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Score</th>
                        <th>Band</th>
                        <th>Time</th>
                        <th>Date</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>
        </div>
    `;

}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(
    action,
    data = {}
) {

    /*
       First try POST.
    */

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
                        JSON.stringify({
                            action,
                            ...data
                        })
                }
            );

        const text =
            await response.text();

        let json;

        try {

            json =
                JSON.parse(text);

        } catch {

            throw new Error(
                "The API returned an invalid response."
            );

        }

        if (json) {

            return json;

        }

    } catch (postError) {

        console.warn(
            "POST API request failed. Trying GET...",
            postError
        );

    }


    /*
       GET fallback.
    */

    const params =
        new URLSearchParams();

    params.set(
        "action",
        action
    );

    Object.keys(data)
        .forEach(
            key => {

                const value =
                    data[key];

                if (
                    value !== undefined &&
                    value !== null
                ) {

                    params.set(
                        key,
                        typeof value ===
                        "object"
                            ? JSON.stringify(
                                value
                            )
                            : String(value)
                    );

                }

            }
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

    } catch {

        throw new Error(
            "The API returned an invalid response."
        );

    }

}


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(
    screenId
) {

    const screens =
        document.querySelectorAll(
            ".screen"
        );

    screens.forEach(
        screen => {

            screen.classList.add(
                "hidden"
            );

        }
    );

    const target =
        document.getElementById(
            screenId
        );

    if (target) {

        target.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
    visible,
    message = "Loading..."
) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );

    const text =
        document.getElementById(
            "loadingText"
        );

    if (!overlay) return;

    if (text) {

        text.textContent =
            message;

    }

    if (visible) {

        overlay.classList.remove(
            "hidden"
        );

    } else {

        overlay.classList.add(
            "hidden"
        );

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

    if (!element) return;

    element.textContent =
        message || "";

    element.className =
        "message";

    if (type === "error") {

        element.style.color =
            "#c62828";

    } else if (
        type === "success"
    ) {

        element.style.color =
            "#16803c";

    } else {

        element.style.color =
            "";

    }

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = ""
) {

    const toast =
        document.getElementById(
            "toast"
        );

    const text =
        document.getElementById(
            "toastMessage"
        );

    if (!toast) return;

    if (text) {

        text.textContent =
            message;

    }

    toast.className =
        "toast";

    if (type) {

        toast.classList.add(
            type
        );

    }

    toast.classList.remove(
        "hidden"
    );

    clearTimeout(
        vocabularyPopupTimeout
    );

    vocabularyPopupTimeout =
        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

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

    const minutes =
        Math.floor(
            seconds / 60
        );

    const remaining =
        seconds % 60;

    return `
        ${String(minutes).padStart(2, "0")}:
        ${String(remaining).padStart(2, "0")}
    `.replace(
        /\s/g,
        ""
    );

}


/* =========================================================
   FORMAT DATE
========================================================= */

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

        return String(value);

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


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(value ?? "")
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
   EXPORT FOR DEBUGGING
========================================================= */

window.IELTSReading = {

    openTest,

    startTest,

    submitTest,

    calculateScore,

    showDashboard,

    logout,

    getCurrentTest: () =>
        currentTest,

    getAnswers: () =>
        studentAnswers

};
