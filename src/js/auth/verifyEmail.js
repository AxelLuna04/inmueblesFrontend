// src/js/auth/verifyEmail.js
import { initFooter } from "../shared/footer.js";
import { resendVerificationRequest } from "../../api/authService.js";

import {
  showNotif,
  NOTIF_GREEN,
  NOTIF_RED,
  NOTIF_ORANGE,
} from "../../utils/notifications.js";

document.addEventListener("DOMContentLoaded", () => {
  initFooter();

  const notification = document.getElementById("notification");
  const resendBtn = document.getElementById("resendBtn");
  if (!resendBtn) return;

  resendBtn.addEventListener("click", async () => {
    const correo = localStorage.getItem("pendingVerifyEmail");

    if (!correo) {
      showNotif(
        notification,
        "No pude detectar tu correo. Vuelve a registrarte o inicia sesión para reenviar el enlace.",
        NOTIF_ORANGE,
        6000
      );
      return;
    }

    const oldText = resendBtn.innerHTML;
    resendBtn.innerHTML = "Enviando…";
    resendBtn.disabled = true;

    try {
      const res = await resendVerificationRequest(correo);
      showNotif(
        notification,
        res?.mensaje || "Si el correo existe y no está verificado, se envió un nuevo enlace.",
        NOTIF_GREEN,
        5000
      );
    } catch (err) {
      console.error(err);
      if (err?.name === "ErrorApi") {
        showNotif(notification, err.message || "No se pudo reenviar el correo.", NOTIF_RED, 5000);
        return;
      }
      showNotif(notification, "No se pudo reenviar el correo.", NOTIF_RED, 5000);
    } finally {
      resendBtn.innerHTML = oldText;
      resendBtn.disabled = false;
    }
  });
});
