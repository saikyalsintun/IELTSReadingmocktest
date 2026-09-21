// ============================================================
// IELTS READING - ADMIN PANEL
// ============================================================

const ADMIN_CONFIG = {
    API_URL:
        "https://script.google.com/macros/s/AKfycbzkYktZQFtycRgG3K6Hi6MsvUtP8RsqOq6QxB598FVYefGmpe_oS3R518GZ0821bNbYtw/exec"
};

let adminToken = null;
let students = [];

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    setupAdminEvents();
});

// ============================================================
// EVENTS
// ============================================================

function setupAdminEvents() {

    const loginForm = document.getElementById("adminLoginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", handleAdminLogin);
    }

    const createForm = document.getElementById("createStudentForm");

    if (createForm) {
        createForm.addEventListener("submit", handleCreateStudent);
    }

    const logoutButton = document.getElementById("adminLogout");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutAdmin);
    }

    const refreshButton = document.getElementById("refreshStudents");

    if (refreshButton) {
        refreshButton.addEventListener("click", loadStudents);
    }

    showAdminLogin();
}

// ============================================================
// ADMIN LOGIN
// ============================================================

async function handleAdminLogin(event) {

    event.preventDefault();

    const username =
        document.getElementById("adminUsername").value.trim();

    const password =
        document.getElementById("adminPassword").value;

    if (!username || !password) {
        showAdminMessage(
            "Please enter your admin username and password.",
            "error"
        );
        return;
    }

    setAdminLoading(true);

    try {

        const response = await apiRequest("adminLogin", {
            username: username,
            password: password
        });

        if (!response || !response.success) {
            throw new Error(
                response?.message || "Invalid admin username or password."
            );
        }

        adminToken = response.token;

        sessionStorage.setItem(
            "ieltsAdminToken",
            adminToken
        );

        sessionStorage.setItem(
            "ieltsAdminUsername",
            username
        );

        showAdminPanel();

        await loadStudents();

    } catch (error) {

        console.error("Admin login error:", error);

        showAdminMessage(
            error.message || "Admin login failed.",
            "error"
        );

    } finally {

        setAdminLoading(false);
    }
}

// ============================================================
// CREATE STUDENT
// ============================================================

async function handleCreateStudent(event) {

    event.preventDefault();

    if (!adminToken) {
        showAdminLogin();
        return;
    }

    const username =
        document.getElementById("studentUsername").value.trim();

    const password =
        document.getElementById("studentPassword").value;

    if (!username) {
        showAdminMessage(
            "Please enter a student username.",
            "error"
        );
        return;
    }

    if (!password) {
        showAdminMessage(
            "Please enter a student password.",
            "error"
        );
        return;
    }

    if (password.length < 6) {
        showAdminMessage(
            "Password must be at least 6 characters.",
            "error"
        );
        return;
    }

    setAdminLoading(true);

    try {

        const response = await apiRequest("adminCreateStudent", {

            token: adminToken,

            username: username,

            password: password
        });

        if (!response || !response.success) {
            throw new Error(
                response?.message || "Could not create student."
            );
        }

        showAdminMessage(
            `Student "${username}" was created successfully.`,
            "success"
        );

        document.getElementById(
            "createStudentForm"
        ).reset();

        await loadStudents();

    } catch (error) {

        console.error(
            "Create student error:",
            error
        );

        showAdminMessage(
            error.message || "Could not create student.",
            "error"
        );

    } finally {

        setAdminLoading(false);
    }
}

// ============================================================
// LOAD STUDENTS
// ============================================================

async function loadStudents() {

    if (!adminToken) {
        return;
    }

    const tableBody =
        document.getElementById("studentsTableBody");

    if (tableBody) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    Loading students...
                </td>
            </tr>
        `;
    }

    try {

        const response = await apiRequest(
            "adminGetStudents",
            {
                token: adminToken
            }
        );

        if (!response || !response.success) {

            if (
                response &&
                response.message &&
                response.message.toLowerCase().includes("token")
            ) {
                logoutAdmin();
                return;
            }

            throw new Error(
                response?.message || "Could not load students."
            );
        }

        students = response.students || [];

        renderStudents();

    } catch (error) {

        console.error(
            "Load students error:",
            error
        );

        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="error-cell">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================================
// RENDER STUDENTS
// ============================================================

function renderStudents() {

    const tableBody =
        document.getElementById("studentsTableBody");

    if (!tableBody) {
        return;
    }

    if (!students.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    No students found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = students.map(student => {

        const status =
            student.status || "Active";

        const isActive =
            status.toLowerCase() === "active";

        return `
            <tr>

                <td>
                    ${escapeHTML(student.studentId || "")}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(student.username || "")}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(student.createdAt || "-")}
                </td>

                <td>
                    ${escapeHTML(student.lastLogin || "Never")}
                </td>

                <td>

                    <span class="status-badge ${
                        isActive
                            ? "status-active"
                            : "status-inactive"
                    }">

                        ${escapeHTML(status)}

                    </span>

                </td>

                <td>

                    <button
                        class="admin-action-button"
                        onclick="toggleStudentStatus(
                            '${escapeJS(student.studentId)}',
                            '${escapeJS(status)}'
                        )"
                    >
                        ${
                            isActive
                                ? "Deactivate"
                                : "Activate"
                        }
                    </button>

                    <button
                        class="admin-action-button reset-button"
                        onclick="resetStudentPassword(
                            '${escapeJS(student.studentId)}',
                            '${escapeJS(student.username)}'
                        )"
                    >
                        Reset Password
                    </button>

                </td>

            </tr>
        `;

    }).join("");
}

// ============================================================
// ACTIVATE / DEACTIVATE
// ============================================================

async function toggleStudentStatus(
    studentId,
    currentStatus
) {

    if (!adminToken) {
        showAdminLogin();
        return;
    }

    const newStatus =
        currentStatus.toLowerCase() === "active"
            ? "Inactive"
            : "Active";

    const confirmed = confirm(
        `Change this student's status to ${newStatus}?`
    );

    if (!confirmed) {
        return;
    }

    setAdminLoading(true);

    try {

        const response = await apiRequest(
            "adminUpdateStudentStatus",
            {
                token: adminToken,
                studentId: studentId,
                status: newStatus
            }
        );

        if (!response || !response.success) {
            throw new Error(
                response?.message ||
                "Could not update student status."
            );
        }

        showAdminMessage(
            `Student status changed to ${newStatus}.`,
            "success"
        );

        await loadStudents();

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );

        showAdminMessage(
            error.message ||
            "Could not update student status.",
            "error"
        );

    } finally {

        setAdminLoading(false);
    }
}

// ============================================================
// RESET PASSWORD
// ============================================================

async function resetStudentPassword(
    studentId,
    username
) {

    if (!adminToken) {
        showAdminLogin();
        return;
    }

    const newPassword = prompt(
        `Enter a new password for ${username}:\n\nMinimum 6 characters.`
    );

    if (newPassword === null) {
        return;
    }

    if (newPassword.length < 6) {

        showAdminMessage(
            "Password must be at least 6 characters.",
            "error"
        );

        return;
    }

    setAdminLoading(true);

    try {

        const response = await apiRequest(
            "adminResetPassword",
            {
                token: adminToken,
                studentId: studentId,
                password: newPassword
            }
        );

        if (!response || !response.success) {
            throw new Error(
                response?.message ||
                "Could not reset password."
            );
        }

        showAdminMessage(
            `Password for ${username} was changed successfully.`,
            "success"
        );

    } catch (error) {

        console.error(
            "Reset password error:",
            error
        );

        showAdminMessage(
            error.message ||
            "Could not reset password.",
            "error"
        );

    } finally {

        setAdminLoading(false);
    }
}

// ============================================================
// LOGOUT
// ============================================================

function logoutAdmin() {

    adminToken = null;
    students = [];

    sessionStorage.removeItem(
        "ieltsAdminToken"
    );

    sessionStorage.removeItem(
        "ieltsAdminUsername"
    );

    showAdminLogin();
}

// ============================================================
// UI
// ============================================================

function showAdminLogin() {

    const loginScreen =
        document.getElementById("adminLoginScreen");

    const adminPanel =
        document.getElementById("adminPanel");

    if (loginScreen) {
        loginScreen.style.display = "flex";
    }

    if (adminPanel) {
        adminPanel.style.display = "none";
    }

    const savedToken =
        sessionStorage.getItem(
            "ieltsAdminToken"
        );

    if (savedToken) {

        adminToken = savedToken;

        showAdminPanel();

        loadStudents();
    }
}

function showAdminPanel() {

    const loginScreen =
        document.getElementById("adminLoginScreen");

    const adminPanel =
        document.getElementById("adminPanel");

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    if (adminPanel) {
        adminPanel.style.display = "block";
    }

    const adminName =
        document.getElementById("adminName");

    const savedUsername =
        sessionStorage.getItem(
            "ieltsAdminUsername"
        );

    if (adminName && savedUsername) {
        adminName.textContent =
            savedUsername;
    }
}

function setAdminLoading(isLoading) {

    const loading =
        document.getElementById("adminLoading");

    if (loading) {
        loading.style.display =
            isLoading ? "flex" : "none";
    }
}

function showAdminMessage(
    message,
    type = "info"
) {

    const element =
        document.getElementById("adminMessage");

    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;

    element.className =
        `admin-message ${type}`;

    element.style.display = "block";

    setTimeout(() => {

        element.style.display = "none";

    }, 4000);
}

// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(action, data = {}) {

    const payload = {
        action: action,
        data: data
    };

    // ----------------------------------------
    // POST
    // ----------------------------------------

    try {

        const response = await fetch(
            ADMIN_CONFIG.API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body: JSON.stringify(payload)
            }
        );

        const text =
            await response.text();

        if (text) {

            const json =
                JSON.parse(text);

            return json;
        }

    } catch (postError) {

        console.warn(
            "POST request failed. Trying GET...",
            postError
        );
    }

    // ----------------------------------------
    // GET FALLBACK
    // ----------------------------------------

    const params =
        new URLSearchParams();

    params.set(
        "action",
        action
    );

    params.set(
        "data",
        JSON.stringify(data)
    );

    const response =
        await fetch(
            `${ADMIN_CONFIG.API_URL}?${params.toString()}`
        );

    const text =
        await response.text();

    if (!text) {
        throw new Error(
            "Empty response from server."
        );
    }

    return JSON.parse(text);
}

// ============================================================
// SECURITY / HTML HELPERS
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJS(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}
