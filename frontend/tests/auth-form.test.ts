import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRegisterDraft } from "@/forms/auth/auth-form";

const ok = { fullName: "Nguyễn Văn A", email: "a@st.vju.ac.vn", studentCode: "", phone: "", password: "Password1", confirmPassword: "Password1" };

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
