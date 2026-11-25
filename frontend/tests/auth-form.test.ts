import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";
import {
  emptyForgotPasswordDraft,
  toForgotPasswordPayload,
  toResetPasswordOtpPayload,
  validateForgotPasswordFields,
  validateLoginFields,
  validateRegisterDraft,
  validateRegisterFields,
  validateResetPasswordOtpFields,
} from "@/forms/auth/auth-form";
import {
  createSystemSettingsDraft,
  defaultSystemSettingsInput,
  hasSystemSettingsChanged,
  toSystemSettingsPayload,
} from "@/forms/settings/settings-form";

const ok = {
  fullName: "Nguyễn Văn A",
  email: "a@st.vju.ac.vn",
  studentCode: "",
  phone: "",
  password: "Password1",
  confirmPassword: "Password1",
};

test("validateRegisterDraft accepts a valid draft and rejects what the backend would reject", () => {
  assert.equal(validateRegisterDraft(ok), null);
  assert.match(validateRegisterDraft({ ...ok, fullName: "   " }) ?? "", /họ và tên/i);
  assert.match(validateRegisterDraft({ ...ok, phone: "090-abc" }) ?? "", /điện thoại/i);
  assert.equal(validateRegisterDraft({ ...ok, phone: "+84 (90) 123-4567" }), null);
  assert.match(validateRegisterDraft({ ...ok, password: "        ", confirmPassword: "        " }) ?? "", /khoảng trắng/i);
  assert.match(validateRegisterDraft({ ...ok, password: "short", confirmPassword: "short" }) ?? "", /tối thiểu 8/i);
  const long = "ạ".repeat(30); // 3 bytes each in UTF-8 = 90 bytes
  assert.match(validateRegisterDraft({ ...ok, password: long, confirmPassword: long }) ?? "", /quá dài/i);
  assert.match(validateRegisterDraft({ ...ok, confirmPassword: "Password2" }) ?? "", /không khớp/i);
  assert.match(validateRegisterDraft({ ...ok, studentCode: "x".repeat(51) }) ?? "", /mã sinh viên/i);
});

test("validateLoginFields, validateRegisterFields, and validateForgotPasswordFields return per-field inline errors", () => {
  const loginErrs = validateLoginFields({ email: "not-an-email", password: "" });
  assert.match(loginErrs.email ?? "", /định dạng/i);
  assert.match(loginErrs.password ?? "", /mật khẩu/i);
  assert.deepEqual(validateLoginFields({ email: "member@test.local", password: "secret" }), {});

  const regErrs = validateRegisterFields({ ...ok, fullName: "", email: "bad@", confirmPassword: "other" });
  assert.ok(regErrs.fullName);
  assert.ok(regErrs.email);
  assert.ok(regErrs.confirmPassword);
  assert.equal(regErrs.password, undefined);

  const forgotEmpty = validateForgotPasswordFields(emptyForgotPasswordDraft());
  assert.match(forgotEmpty.email ?? "", /email/i);
  assert.equal(forgotEmpty.studentCode, undefined);
  assert.equal(forgotEmpty.note, undefined);

  const forgotBounds = validateForgotPasswordFields({
    email: "a@st.vju.ac.vn",
    studentCode: "S".repeat(51),
    note: "n".repeat(501),
  });
  assert.equal(forgotBounds.email, undefined);
  assert.match(forgotBounds.studentCode ?? "", /50/);
  assert.match(forgotBounds.note ?? "", /500/);

  assert.deepEqual(
    toForgotPasswordPayload({ email: "  a@st.vju.ac.vn ", studentCode: "  ", note: " Quên MK " }),
    { email: "a@st.vju.ac.vn", studentCode: undefined, note: "Quên MK" },
  );

  const otpInvalid = validateResetPasswordOtpFields({
    email: "a@st.vju.ac.vn",
    otp: "12ab",
    newPassword: "short",
    confirmPassword: "other",
  });
  assert.match(otpInvalid.otp ?? "", /6 chữ số/);
  assert.match(otpInvalid.newPassword ?? "", /tối thiểu 8/);
  assert.match(otpInvalid.confirmPassword ?? "", /không khớp/);

  const otpValid = {
    email: "  a@st.vju.ac.vn ",
    otp: " 842916 ",
    newPassword: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
  };
  assert.deepEqual(validateResetPasswordOtpFields(otpValid), {});
  assert.deepEqual(toResetPasswordOtpPayload(otpValid), {
    email: "a@st.vju.ac.vn",
    otp: "842916",
    newPassword: "StrongPassword123!",
  });

  const baseSettings = {
    ...defaultSystemSettingsInput(),
    smtpPasswordConfigured: true,
    facebookAppSecretConfigured: false,
    facebookOauthConfigured: true,
    aiApiKeyConfigured: false,
    aiConfigured: false,
    googleSignInConfigured: false,
  };
  const draft = createSystemSettingsDraft(baseSettings);
  assert.equal(hasSystemSettingsChanged(draft, baseSettings), false);
  assert.equal(hasSystemSettingsChanged({ ...draft, otpExpiryMinutes: 10 }, baseSettings), true);
  assert.equal(hasSystemSettingsChanged({ ...draft, smtpPassword: "new-app-password" }, baseSettings), true);
  assert.equal(hasSystemSettingsChanged({ ...draft, facebookAppId: "1536758708287043" }, baseSettings), true);
  assert.equal(hasSystemSettingsChanged({ ...draft, facebookAppSecret: "secret-123" }, baseSettings), true);
  assert.equal(toSystemSettingsPayload({ ...draft, smtpHost: "  smtp.gmail.com  " }).smtpHost, "smtp.gmail.com");
  assert.equal(
    toSystemSettingsPayload({ ...draft, facebookAppId: "  1536758708287043  " }).facebookAppId,
    "1536758708287043",
  );
});

test("AuthModal forms use noValidate inline validation and stay within the 400-line limit", () => {
  const authDir = path.join(process.cwd(), "src/components/auth");
  for (const name of ["AuthModal.tsx", "AuthModalForgotForm.tsx", "AuthModalRegisterForm.tsx", "AuthModalBanner.tsx"]) {
    const src = fs.readFileSync(path.join(authDir, name), "utf8");
    const lineCount = src.split("\n").length;
    assert.ok(lineCount <= 400, `${name} exceeds 400 lines (${lineCount})`);
  }

  const modalSrc = fs.readFileSync(path.join(authDir, "AuthModal.tsx"), "utf8");
  const forgotSrc = fs.readFileSync(path.join(authDir, "AuthModalForgotForm.tsx"), "utf8");
  const regSrc = fs.readFileSync(path.join(authDir, "AuthModalRegisterForm.tsx"), "utf8");
  for (const src of [modalSrc, forgotSrc, regSrc]) {
    const formTags = src.match(/<form\b[^>]*>/g) ?? [];
    assert.ok(formTags.length > 0);
    for (const tag of formTags) {
      assert.match(tag, /\bnoValidate\b/, `Expected <form> tag to declare noValidate: ${tag}`);
    }
    assert.equal(/\bminLength=\{8\}/.test(src), false, "Must not use native minLength={8} browser popup");
    assert.equal(/<(?:Input|PasswordInput)\b[^>]*\brequired\b/.test(src), false, "Must not use native required on Input/PasswordInput");
  }

  assert.match(modalSrc, /TWO_FACTOR_REQUIRED/, "AuthModal must handle TWO_FACTOR_REQUIRED");
  assert.match(modalSrc, /Otp2FaChallengeModal/, "AuthModal must render Otp2FaChallengeModal");
  const clientSrc = fs.readFileSync(path.join(process.cwd(), "src/lib/api/client.ts"), "utf8");
  assert.match(clientSrc, /'\/auth\/2fa\/send'/);
  assert.match(clientSrc, /'\/auth\/2fa\/verify'/);

  const gsiSrc = fs.readFileSync(path.join(process.cwd(), "src/components/shared/GoogleSignInButton.tsx"), "utf8");
  assert.ok(gsiSrc.split("\n").length <= 400, "GoogleSignInButton.tsx must stay <= 400 lines");
  assert.equal(
    /signup_with/.test(gsiSrc),
    false,
    "GoogleSignInButton must not toggle signin_with/signup_with across tabs (prevents iframe re-render flicker)",
  );
  assert.match(modalSrc, /width=\{400\}/, "AuthModal must render GoogleSignInButton at full 400px column width");
});

test("errorMessage maps all Sprint 4 and 2FA error codes to Vietnamese descriptions", () => {
  const expectedCodes = [
    "TWO_FACTOR_REQUIRED",
    "TWO_FACTOR_ADMIN_ROLE_REQUIRED",
    "ATTENDANCE_LOCKED",
    "FEEDBACK_ATTENDANCE_REQUIRED",
    "EVENT_FEEDBACK_ALREADY_SUBMITTED",
    "INVALID_ACADEMIC_TERM",
    "INVALID_FACEBOOK_URL",
  ];
  for (const code of expectedCodes) {
    const msg = errorMessage(new ApiError("raw", 400, code));
    assert.notEqual(msg, "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.", `Expected explicit message for ${code}`);
    assert.ok(msg.length > 10, `Expected descriptive message for ${code}`);
  }
});
