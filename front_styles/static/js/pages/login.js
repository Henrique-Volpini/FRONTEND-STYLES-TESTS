const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");
const loginForm = document.querySelector(".login-form");
const loginButton = document.querySelector(".login-button");

if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener("click", () => {
        const shouldShowPassword = passwordInput.type === "password";

        passwordInput.type = shouldShowPassword ? "text" : "password";
        passwordToggle.classList.toggle("is-visible", shouldShowPassword);
        passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));

        const accessibleLabel = shouldShowPassword ? "Ocultar senha" : "Mostrar senha";
        passwordToggle.setAttribute("aria-label", accessibleLabel);
        passwordToggle.title = accessibleLabel;
        passwordInput.focus({ preventScroll: true });
    });
}

if (loginForm && loginButton) {
    loginForm.addEventListener("submit", () => {
        loginButton.classList.add("is-loading");
        loginButton.setAttribute("aria-busy", "true");
    });
}
