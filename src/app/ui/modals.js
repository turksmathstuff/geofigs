// Generic app modal: one DOM block (#appModal) backs every text prompt,
// number prompt, and notice dialog. Only one modal is open at a time; opening
// a new one cancels the previous.

let refs = null;
let active = null; // { kind, resolve, validate }

function ensureRefs() {
  if (refs) {
    return refs;
  }
  const byId = (id) => document.getElementById(id);
  refs = {
    modal: byId("appModal"),
    backdrop: byId("appModalBackdrop"),
    dialog: byId("appModalDialog"),
    title: byId("appModalTitle"),
    message: byId("appModalMessage"),
    inputLabel: byId("appModalInputLabel"),
    input: byId("appModalInput"),
    help: byId("appModalHelp"),
    error: byId("appModalError"),
    cancel: byId("appModalCancel"),
    submit: byId("appModalSubmit"),
  };
  if (!refs.modal) {
    return refs;
  }

  refs.backdrop.addEventListener("click", () => cancelActiveModal());
  refs.cancel.addEventListener("click", () => cancelActiveModal());
  refs.dialog.addEventListener("submit", (evt) => {
    evt.preventDefault();
    if (!active) {
      return;
    }
    if (active.kind === "notice") {
      closeActiveModal(undefined);
      return;
    }
    const raw = refs.input.value;
    if (active.validate) {
      const result = active.validate(raw);
      if (!result.ok) {
        refs.error.textContent = result.message;
        refs.error.hidden = false;
        refs.input.focus();
        refs.input.select();
        return;
      }
      closeActiveModal(result.value);
      return;
    }
    closeActiveModal(raw);
  });
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && active) {
      evt.preventDefault();
      cancelActiveModal();
    }
  });
  return refs;
}

function cancelActiveModal() {
  if (!active) {
    return;
  }
  closeActiveModal(active.kind === "notice" ? undefined : null);
}

function closeActiveModal(value) {
  if (!active) {
    return;
  }
  refs.modal.hidden = true;
  const { resolve } = active;
  active = null;
  resolve(value);
}

function openModal(config) {
  const els = ensureRefs();
  if (!els.modal) {
    return Promise.resolve(config.kind === "notice" ? undefined : null);
  }
  cancelActiveModal();

  els.title.textContent = config.title;
  els.message.textContent = config.message || "";
  els.message.hidden = !config.message;
  els.help.textContent = config.help || "";
  els.help.hidden = !config.help;
  els.error.textContent = "";
  els.error.hidden = true;

  const hasInput = config.kind !== "notice";
  els.inputLabel.textContent = config.label || "";
  els.inputLabel.hidden = !hasInput;
  els.input.hidden = !hasInput;
  els.input.type = config.inputType || "text";
  if (config.inputType === "number") {
    els.input.min = config.min ?? "";
    els.input.max = config.max ?? "";
    els.input.step = config.step ?? "1";
  } else {
    els.input.removeAttribute("min");
    els.input.removeAttribute("max");
    els.input.removeAttribute("step");
  }
  els.input.value = hasInput ? String(config.initial ?? "") : "";
  els.cancel.hidden = config.kind === "notice";
  els.submit.textContent = config.submitLabel || "OK";

  els.modal.hidden = false;
  queueMicrotask(() => {
    if (hasInput) {
      els.input.focus();
      els.input.select();
    } else {
      els.submit.focus();
    }
  });
  return new Promise((resolve) => {
    active = { kind: config.kind, resolve, validate: config.validate || null };
  });
}

export function isModalOpen() {
  return !!active;
}

/**
 * Prompt for a line of text. Resolves to the raw string on submit, or null on
 * cancel (backdrop, Cancel button, Escape).
 */
export function openTextModal({ title, label = "", initial = "", help = "", submitLabel = "OK" }) {
  return openModal({ kind: "text", title, label, initial, help, submitLabel });
}

/**
 * Prompt for an integer in [min, max]. Resolves to the number, or null on
 * cancel. Out-of-range input shows an inline error and keeps the modal open.
 */
export function openNumberModal({ title, label = "", initial = "", min, max, submitLabel = "OK" }) {
  return openModal({
    kind: "number",
    title,
    label,
    initial,
    min,
    max,
    inputType: "number",
    submitLabel,
    validate: (raw) => {
      const n = Number(String(raw).trim());
      if (!Number.isInteger(n) || (min != null && n < min) || (max != null && n > max)) {
        return { ok: false, message: `Enter an integer from ${min} to ${max}.` };
      }
      return { ok: true, value: n };
    },
  });
}

/**
 * Modal replacement for alert(). Resolves when dismissed; safe to call
 * without awaiting.
 */
export function showNotice(message, { title = "Heads up" } = {}) {
  return openModal({ kind: "notice", title, message, submitLabel: "OK" });
}
