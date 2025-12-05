export function enablePasswordToggle(toggleSelector, inputSelector) {
    const toggle = document.querySelector(toggleSelector);
    const input = document.querySelector(inputSelector);

    if (!toggle || !input) return;

    toggle.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        toggle.classList.toggle("fa-eye", !isPassword);
        toggle.classList.toggle("fa-eye-slash", isPassword);
    });
}