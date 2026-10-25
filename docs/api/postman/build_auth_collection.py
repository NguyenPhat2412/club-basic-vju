"""Generates auth.postman_collection.json: black-box checks for sign-in with server-side sessions,
CSRF, admin-managed accounts (no self-registration), password change/reset, locking and rate limits.

Run: ./run_auth.sh [baseUrl]   (admin credentials from backend/springboot/.env.local or the local default)
"""
import json
from postman_common import collection, js, login, logout, problem, req, save, status

folders = []
NEW_PASSWORD = "NewPassword456!"
RESET_PASSWORD = "ResetByAdmin789!"

folders.append(("0. CSRF và phiên", [
    req("Lấy cookie CSRF", "GET", "/api/v1/auth/csrf",
        pre=js('const id = Date.now().toString(36) + Math.floor(Math.random()*1e4).toString(36);',
               'pm.collectionVariables.set("runId", id);',
               'pm.collectionVariables.set("memberEmail", "auth." + id + "@vju.local");',
               'pm.collectionVariables.set("memberPassword", "Password123!");',
               f'pm.collectionVariables.set("newPassword", "{NEW_PASSWORD}");',
               f'pm.collectionVariables.set("resetPassword", "{RESET_PASSWORD}");'),
        tests=js(status(204),
                 'const c = pm.response.headers.all().find(h => h.key.toLowerCase() === "set-cookie" && h.value.startsWith("XSRF-TOKEN="));',
                 'pm.test("đặt cookie XSRF-TOKEN", () => pm.expect(c).to.be.ok);',
                 'pm.test("XSRF-TOKEN đọc được bằng JavaScript (không HttpOnly)", () => pm.expect(c.value.toLowerCase()).to.not.include("httponly"));')),
    req("Chưa đăng nhập: /auth/me trả 401", "GET", "/api/v1/auth/me", tests=problem(401, "UNAUTHORIZED")),
]))

folders.append(("1. Đăng nhập", [
    req("Thiếu token CSRF bị chặn", "POST", "/api/v1/auth/login", '{"email":"{{adminEmail}}","password":"{{adminPassword}}"}', no_csrf=True,
        tests=problem(403, "CSRF_INVALID")),
    req("Sai mật khẩu", "POST", "/api/v1/auth/login", '{"email":"{{adminEmail}}","password":"WrongPassword!"}',
        tests=js(*problem(401, "INVALID_CREDENTIALS"), save("wrongBody", "JSON.stringify(pm.response.json())"))),
    req("Email không tồn tại: trả lời giống hệt sai mật khẩu", "POST", "/api/v1/auth/login", '{"email":"ghost.{{runId}}@vju.local","password":"WrongPassword!"}',
        tests=js(*problem(401, "INVALID_CREDENTIALS"),
                 'pm.test("không lộ email nào tồn tại", () => pm.expect(JSON.stringify(pm.response.json())).to.eql(pm.collectionVariables.get("wrongBody")));')),
    req("Thiếu mật khẩu", "POST", "/api/v1/auth/login", '{"email":"{{adminEmail}}"}', tests=problem(400, "VALIDATION_ERROR")),
    login("Admin đăng nhập (email viết hoa)", "adminEmailUpper", "adminPassword", extra=(
        'const b = pm.response.json();',
        'pm.test("trả về user, không có token trong body", () => { pm.expect(b.user.email).to.eql(pm.variables.get("adminEmail").toLowerCase()); pm.expect(b).to.not.have.property("tokens"); });',
        'const c = pm.response.headers.all().find(h => h.key.toLowerCase() === "set-cookie" && h.value.startsWith("CLUB_SESSION="));',
        'pm.test("cookie phiên HttpOnly + SameSite=Lax", () => { pm.expect(c.value).to.include("HttpOnly"); pm.expect(c.value).to.include("SameSite=Lax"); });',
        save("adminId", "b.user.id"))),
    req("Phiên hoạt động: /auth/me", "GET", "/api/v1/auth/me",
        tests=js(status(200), 'pm.test("đúng admin", () => pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get("adminId")));')),
    req("Không còn API tự đăng ký", "POST", "/api/v1/auth/register",
        '{"email":"self.{{runId}}@vju.local","password":"Password123!","fullName":"Self"}', tests=problem(404, "NOT_FOUND")),
]))

folders.append(("2. Admin tạo tài khoản", [
    req("Tạo tài khoản thành viên", "POST", "/api/v1/users",
        '{"email":"{{memberEmail}}","password":"{{memberPassword}}","fullName":"Thành viên Postman","studentCode":"PM-{{runId}}"}',
        tests=js(status(201), save("memberId"), 'const u = pm.response.json();',
                 'pm.test("ACTIVE, không lộ mật khẩu", () => { pm.expect(u.status).to.eql("ACTIVE"); pm.expect(pm.response.text()).to.not.include("Password123!"); pm.expect(u).to.not.have.property("passwordHash"); });')),
    req("Email trùng (khác hoa thường)", "POST", "/api/v1/users", '{"email":"AUTH.{{runId}}@VJU.LOCAL","password":"Password123!","fullName":"Dup"}',
        tests=problem(409, "EMAIL_ALREADY_EXISTS")),
    req("Mã sinh viên trùng", "POST", "/api/v1/users", '{"email":"other.{{runId}}@vju.local","password":"Password123!","fullName":"Dup","studentCode":"PM-{{runId}}"}',
        tests=problem(409, "STUDENT_CODE_ALREADY_EXISTS")),
    req("Email sai định dạng", "POST", "/api/v1/users", '{"email":"not-an-email","password":"Password123!","fullName":"X"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Mật khẩu < 8 ký tự", "POST", "/api/v1/users", '{"email":"short.{{runId}}@vju.local","password":"abc","fullName":"X"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Tự gán trạng thái/vai trò bị chặn", "POST", "/api/v1/users",
        '{"email":"mass.{{runId}}@vju.local","password":"Password123!","fullName":"X","status":"ACTIVE","role":"SYSTEM_ADMIN"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Tìm thấy tài khoản vừa tạo", "GET", "/api/v1/users", query=[("query", "{{runId}}")],
        tests=js(status(200), 'pm.test("có trong danh sách", () => pm.expect(pm.response.json().items.map(u => u.id)).to.include(pm.collectionVariables.get("memberId")));')),
]))

folders.append(("3. Phiên của thành viên", [
    login("Thành viên đăng nhập", "memberEmail", "memberPassword"),
    req("Xem hồ sơ của mình", "GET", "/api/v1/users/me", tests=js(status(200), 'pm.test("đúng thành viên", () => pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get("memberId")));')),
    req("Không xem được danh sách tài khoản", "GET", "/api/v1/users", tests=problem(403, "PERMISSION_DENIED")),
    req("Không tạo được tài khoản", "POST", "/api/v1/users", '{"email":"nope.{{runId}}@vju.local","password":"Password123!","fullName":"X"}', tests=problem(403, "PERMISSION_DENIED")),
    req("Không tự đặt lại mật khẩu người khác", "PATCH", "/api/v1/users/{{adminId}}/password", '{"newPassword":"Hacked12345!"}', tests=problem(403, "PERMISSION_DENIED")),
    req("Đổi mật khẩu: sai mật khẩu hiện tại", "POST", "/api/v1/auth/change-password", '{"currentPassword":"WrongPassword!","newPassword":"{{newPassword}}"}',
        tests=problem(400, "CURRENT_PASSWORD_INVALID")),
    req("Đổi mật khẩu: mật khẩu mới quá ngắn", "POST", "/api/v1/auth/change-password", '{"currentPassword":"{{memberPassword}}","newPassword":"short"}',
        tests=problem(400, "VALIDATION_ERROR")),
    req("Đổi mật khẩu thành công", "POST", "/api/v1/auth/change-password", '{"currentPassword":"{{memberPassword}}","newPassword":"{{newPassword}}"}', tests=js(status(204))),
    req("Phiên hiện tại vẫn dùng được sau khi đổi", "GET", "/api/v1/auth/me", tests=js(status(200))),
]))

folders.append(("4. Đăng xuất", [
    logout(),
    req("Sau đăng xuất: /auth/me trả 401", "GET", "/api/v1/auth/me", tests=problem(401, "UNAUTHORIZED")),
    req("Mật khẩu cũ không còn dùng được", "POST", "/api/v1/auth/login", '{"email":"{{memberEmail}}","password":"{{memberPassword}}"}', tests=problem(401, "INVALID_CREDENTIALS")),
    login("Mật khẩu mới đăng nhập được", "memberEmail", "newPassword"),
    logout("Thành viên đăng xuất"),
]))

folders.append(("5. Admin đặt lại mật khẩu và khoá", [
    login("Admin đăng nhập", "adminEmail", "adminPassword"),
    req("Đặt lại mật khẩu: quá ngắn", "PATCH", "/api/v1/users/{{memberId}}/password", '{"newPassword":"short"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Đặt lại mật khẩu: tài khoản không tồn tại", "PATCH", "/api/v1/users/00000000-0000-0000-0000-000000000000/password", '{"newPassword":"{{resetPassword}}"}',
        tests=problem(404, "USER_NOT_FOUND")),
    req("Đặt lại mật khẩu cho thành viên quên mật khẩu", "PATCH", "/api/v1/users/{{memberId}}/password", '{"newPassword":"{{resetPassword}}"}', tests=js(status(204))),
    req("Khoá tài khoản thành viên", "PATCH", "/api/v1/users/{{memberId}}/status", '{"status":"INACTIVE"}',
        tests=js(status(200), 'pm.test("INACTIVE", () => pm.expect(pm.response.json().status).to.eql("INACTIVE"));')),
    req("Bị khoá + đúng mật khẩu: báo tài khoản bị khoá", "POST", "/api/v1/auth/login", '{"email":"{{memberEmail}}","password":"{{resetPassword}}"}',
        tests=problem(403, "ACCOUNT_INACTIVE")),
    req("Bị khoá + sai mật khẩu: không lộ trạng thái", "POST", "/api/v1/auth/login", '{"email":"{{memberEmail}}","password":"WrongPassword!"}',
        tests=problem(401, "INVALID_CREDENTIALS")),
    login("Admin đăng nhập lại", "adminEmail", "adminPassword"),
    req("Mở khoá tài khoản", "PATCH", "/api/v1/users/{{memberId}}/status", '{"status":"ACTIVE"}', tests=js(status(200))),
    req("Mật khẩu trước khi đặt lại không còn dùng được", "POST", "/api/v1/auth/login", '{"email":"{{memberEmail}}","password":"{{newPassword}}"}',
        tests=problem(401, "INVALID_CREDENTIALS")),
    login("Mật khẩu admin đặt lại dùng được", "memberEmail", "resetPassword"),
    logout("Thành viên đăng xuất lần cuối"),
]))

folders.append(("6. Giới hạn đăng nhập (chạy cuối)", [
    req("Đăng nhập sai liên tục đến khi bị chặn", "POST", "/api/v1/auth/login", '{"email":"{{memberEmail}}","password":"Brute-force!"}',
        tests=js('const n = (pm.collectionVariables.get("bruteCount") || 0) + 1; pm.collectionVariables.set("bruteCount", n);',
                 'if (pm.response.code === 429) {',
                 '  pm.test("bị chặn sau " + n + " lần thử", () => pm.expect(n).to.be.at.most(70));',
                 '  pm.test("thông báo rate limit", () => pm.expect(pm.response.json().code).to.eql("RATE_LIMIT_EXCEEDED"));',
                 '} else if (n < 75) { pm.execution.setNextRequest(pm.info.requestName); }',
                 'else { pm.test("không bị chặn sau 75 lần", () => pm.expect.fail("no 429")); }')),
]))

coll = collection("auth", "VJU Club – Đăng nhập & tài khoản",
    "Session cookie (CLUB_SESSION) + CSRF (XSRF-TOKEN / X-XSRF-TOKEN); tài khoản do admin cấp; đổi/đặt lại mật khẩu; khoá tài khoản; rate limit. Cần baseUrl, adminEmail, adminPassword.",
    folders, [("baseUrl", "http://localhost:8080")])
coll["item"][0]["item"][0]["event"][0]["script"]["exec"].append('pm.collectionVariables.set("adminEmailUpper", pm.variables.get("adminEmail").toUpperCase());')
json.dump(coll, open("auth.postman_collection.json", "w"), ensure_ascii=False, indent=2)
print(sum(len(i) for _, i in folders), "requests")
