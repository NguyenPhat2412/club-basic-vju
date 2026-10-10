"""Generates auth.postman_collection.json: black-box API checks for auth and refresh tokens."""
import json, uuid

def js(*lines): return list(lines)

def req(name, method, path, body=None, token=None, pre=None, tests=None, raw_auth=None):
    headers = [{"key": "Content-Type", "value": "application/json"}] if body is not None else []
    if token: headers.append({"key": "Authorization", "value": "Bearer {{" + token + "}}"})
    if raw_auth: headers.append({"key": "Authorization", "value": raw_auth})
    item = {"name": name, "request": {"method": method, "header": headers,
            "url": {"raw": "{{baseUrl}}" + path, "host": ["{{baseUrl}}"], "path": [p for p in path.strip("/").split("/")]}},
            "event": []}
    if body is not None:
        item["request"]["body"] = {"mode": "raw", "raw": body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)}
    if pre: item["event"].append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre}})
    if tests: item["event"].append({"listen": "test", "script": {"type": "text/javascript", "exec": tests}})
    return item

def status(code): return f'pm.test("status {code}", () => pm.response.to.have.status({code}));'
def code(c): return f'pm.test("code {c}", () => pm.expect(pm.response.json().code).to.eql("{c}"));'
def problem(s, c): return [status(s), code(c)]

ADMIN = "adminAccess"
folders = []

# ---------------------------------------------------------------- 1. Register
folders.append(("1. Đăng ký", [
    req("Đăng ký hợp lệ", "POST", "/api/v1/auth/register",
        '{"email":"{{emailMixed}}","password":"{{password}}","fullName":"Postman User","studentCode":"{{studentCode}}"}',
        pre=js('const id = Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36);',
               'pm.collectionVariables.set("runId", id);',
               'pm.collectionVariables.set("emailMixed", "Postman." + id + "@VJU.Local");',
               'pm.collectionVariables.set("email", ("postman." + id + "@vju.local"));',
               'pm.collectionVariables.set("email2", ("postman2." + id + "@vju.local"));',
               'pm.collectionVariables.set("studentCode", "PM-" + id);',
               'pm.collectionVariables.set("password", "Password123!");',
               'pm.collectionVariables.set("newPassword", "NewPassword456!");'),
        tests=js(status(201),
                 'const u = pm.response.json();',
                 'pm.collectionVariables.set("userId", u.id);',
                 'pm.test("email được chuẩn hoá chữ thường", () => pm.expect(u.email).to.eql(pm.collectionVariables.get("email")));',
                 'pm.test("không lộ password/passwordHash", () => { pm.expect(u).to.not.have.property("password"); pm.expect(u).to.not.have.property("passwordHash"); pm.expect(pm.response.text()).to.not.include("Password123!"); });',
                 'pm.test("status ACTIVE", () => pm.expect(u.status).to.eql("ACTIVE"));')),
    req("Đăng ký trùng email (khác hoa thường)", "POST", "/api/v1/auth/register",
        '{"email":"{{email}}","password":"{{password}}","fullName":"Dup"}', tests=problem(409, "EMAIL_ALREADY_EXISTS")),
    req("Đăng ký trùng mã sinh viên", "POST", "/api/v1/auth/register",
        '{"email":"other.{{runId}}@vju.local","password":"{{password}}","fullName":"Dup SV","studentCode":"{{studentCode}}"}',
        tests=problem(409, "STUDENT_CODE_ALREADY_EXISTS")),
    req("Đăng ký email sai định dạng", "POST", "/api/v1/auth/register",
        '{"email":"not-an-email","password":"{{password}}","fullName":"X"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Đăng ký mật khẩu < 8 ký tự", "POST", "/api/v1/auth/register",
        '{"email":"short.{{runId}}@vju.local","password":"abc","fullName":"X"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Đăng ký mật khẩu > 128 ký tự", "POST", "/api/v1/auth/register",
        json.dumps({"email": "long.{{runId}}@vju.local", "password": "p" * 129, "fullName": "X"}), tests=problem(400, "VALIDATION_ERROR")),
    req("Đăng ký thiếu fullName", "POST", "/api/v1/auth/register",
        '{"email":"nofn.{{runId}}@vju.local","password":"{{password}}"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Đăng ký tự gán quyền (mass assignment) bị chặn", "POST", "/api/v1/auth/register",
        '{"email":"mass.{{runId}}@vju.local","password":"{{password}}","fullName":"X","status":"ACTIVE","role":"SYSTEM_ADMIN"}',
        tests=problem(400, "VALIDATION_ERROR")),
    req("Đăng ký email có khoảng trắng đầu/cuối", "POST", "/api/v1/auth/register",
        '{"email":"  spaced.{{runId}}@vju.local ","password":"{{password}}","fullName":"X"}',
        tests=js('pm.test("ghi nhận hành vi: " + pm.response.code, () => pm.expect([201, 400]).to.include(pm.response.code));',
                 'pm.collectionVariables.set("spacedEmailStatus", pm.response.code);')),
    req("Đăng ký user thứ hai (dùng cho test sau)", "POST", "/api/v1/auth/register",
        '{"email":"{{email2}}","password":"{{password}}","fullName":"Second User"}',
        tests=js(status(201), 'pm.collectionVariables.set("userId2", pm.response.json().id);')),
]))

# ---------------------------------------------------------------- 2. Login
folders.append(("2. Đăng nhập", [
    req("Đăng nhập hợp lệ (email viết hoa)", "POST", "/api/v1/auth/login",
        '{"email":"{{emailMixed}}","password":"{{password}}"}',
        tests=js(status(200), 'const b = pm.response.json();',
                 'pm.test("có đủ access/refresh token và hạn dùng", () => { pm.expect(b.tokens.accessToken).to.be.a("string"); pm.expect(b.tokens.refreshToken).to.be.a("string"); pm.expect(new Date(b.tokens.accessTokenExpiresAt) > new Date()).to.be.true; pm.expect(new Date(b.tokens.refreshTokenExpiresAt) > new Date(b.tokens.accessTokenExpiresAt)).to.be.true; });',
                 'pm.test("access token hết hạn sau ~15 phút", () => { const mins = (new Date(b.tokens.accessTokenExpiresAt) - new Date()) / 60000; pm.expect(mins).to.be.within(13, 16); });',
                 'pm.test("trả về đúng user", () => pm.expect(b.user.id).to.eql(pm.collectionVariables.get("userId")));',
                 'pm.collectionVariables.set("access1", b.tokens.accessToken);',
                 'pm.collectionVariables.set("refresh1", b.tokens.refreshToken);')),
    req("Sai mật khẩu", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"WrongPassword!"}',
        tests=js(*problem(401, "INVALID_CREDENTIALS"), 'pm.collectionVariables.set("wrongPwBody", JSON.stringify(pm.response.json()));')),
    req("Email không tồn tại trả lỗi giống hệt sai mật khẩu", "POST", "/api/v1/auth/login",
        '{"email":"ghost.{{runId}}@vju.local","password":"WrongPassword!"}',
        tests=js(*problem(401, "INVALID_CREDENTIALS"),
                 'pm.test("không lộ email có tồn tại hay không", () => pm.expect(JSON.stringify(pm.response.json())).to.eql(pm.collectionVariables.get("wrongPwBody")));')),
    req("Thiếu mật khẩu", "POST", "/api/v1/auth/login", '{"email":"{{email}}"}', tests=problem(400, "VALIDATION_ERROR")),
    req("Body rỗng", "POST", "/api/v1/auth/login", '{}', tests=problem(400, "VALIDATION_ERROR")),
    req("JSON hỏng", "POST", "/api/v1/auth/login", '{"email":', tests=problem(400, "VALIDATION_ERROR")),
    req("SQL injection ở email", "POST", "/api/v1/auth/login", '{"email":"x\' OR \'1\'=\'1","password":"x\' OR \'1\'=\'1"}',
        tests=js('pm.test("không đăng nhập được (400/401)", () => pm.expect([400, 401]).to.include(pm.response.code));',
                 'pm.test("không trả token", () => pm.expect(pm.response.text()).to.not.include("accessToken"));')),
]))

# ---------------------------------------------------------------- 3. Access token
none_token = js(
    'const b64 = s => btoa(s).replace(/=+$/, "").replace(/\\+/g, "-").replace(/\\//g, "_");',
    'const header = b64(JSON.stringify({alg: "none", typ: "JWT"}));',
    'const payload = b64(JSON.stringify({sub: pm.collectionVariables.get("userId"), iss: "club-backend", exp: Math.floor(Date.now()/1000) + 600, iat: Math.floor(Date.now()/1000)}));',
    'pm.collectionVariables.set("noneToken", header + "." + payload + ".");')
tamper = js(
    'const t = pm.collectionVariables.get("access1").split(".");',
    'const b64 = s => btoa(s).replace(/=+$/, "").replace(/\\+/g, "-").replace(/\\//g, "_");',
    'const p = JSON.parse(atob(t[1].replace(/-/g, "+").replace(/_/g, "/")));',
    'p.sub = pm.collectionVariables.get("userId2");',
    'pm.collectionVariables.set("tamperedToken", t[0] + "." + b64(JSON.stringify(p)) + "." + t[2]);')
folders.append(("3. Access token", [
    req("GET /auth/me với access token", "GET", "/api/v1/auth/me", token="access1",
        tests=js(status(200), 'pm.test("đúng user", () => pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get("userId")));')),
    req("GET /users/me với access token", "GET", "/api/v1/users/me", token="access1", tests=js(status(200))),
    req("Không có token", "GET", "/api/v1/auth/me", tests=problem(401, "UNAUTHORIZED")),
    req("Token rác", "GET", "/api/v1/auth/me", raw_auth="Bearer not.a.jwt", tests=problem(401, "UNAUTHORIZED")),
    req("Sửa payload (đổi sub sang user khác) giữ chữ ký cũ", "GET", "/api/v1/auth/me", token="tamperedToken", pre=tamper,
        tests=problem(401, "UNAUTHORIZED")),
    req("Token alg=none (không chữ ký)", "GET", "/api/v1/auth/me", token="noneToken", pre=none_token,
        tests=problem(401, "UNAUTHORIZED")),
    req("Dùng refresh token làm access token", "GET", "/api/v1/auth/me", token="refresh1", tests=problem(401, "UNAUTHORIZED")),
    req("Scheme khác Bearer (Basic)", "GET", "/api/v1/auth/me", raw_auth="Basic {{access1}}", tests=js(status(401))),
]))

# ---------------------------------------------------------------- 4. Refresh
folders.append(("4. Refresh token", [
    req("Refresh hợp lệ (không cần access token)", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{refresh1}}"}',
        tests=js(status(200), 'const t = pm.response.json().tokens;',
                 'pm.test("cấp cặp token mới", () => { pm.expect(t.refreshToken).to.not.eql(pm.collectionVariables.get("refresh1")); pm.expect(t.accessToken).to.not.eql(pm.collectionVariables.get("access1")); });',
                 'pm.collectionVariables.set("access2", t.accessToken);', 'pm.collectionVariables.set("refresh2", t.refreshToken);')),
    req("Access token mới dùng được", "GET", "/api/v1/auth/me", token="access2", tests=js(status(200))),
    req("Dùng lại refresh token cũ bị từ chối", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{refresh1}}"}',
        tests=problem(401, "INVALID_REFRESH_TOKEN")),
    req("[Bảo mật] Sau khi refresh cũ bị dùng lại, refresh mới có còn dùng được?", "POST", "/api/v1/auth/refresh-token",
        '{"refreshToken":"{{refresh2}}"}',
        tests=js('pm.collectionVariables.set("reuseDetection", pm.response.code === 401 ? "YES" : "NO");',
                 'pm.test("ghi nhận: phát hiện dùng lại refresh token = " + pm.collectionVariables.get("reuseDetection"), () => pm.expect([200, 401]).to.include(pm.response.code));',
                 'if (pm.response.code === 200) { const t = pm.response.json().tokens; pm.collectionVariables.set("access2", t.accessToken); pm.collectionVariables.set("refresh2", t.refreshToken); }')),
    req("[Bảo mật] Access token cũ còn dùng được sau khi refresh?", "GET", "/api/v1/auth/me", token="access1",
        tests=js('pm.collectionVariables.set("oldAccessAfterRefresh", pm.response.code);',
                 'pm.test("ghi nhận: access token cũ trả " + pm.response.code, () => pm.expect([200, 401]).to.include(pm.response.code));')),
    req("Refresh token rác", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"garbage"}', tests=problem(401, "INVALID_REFRESH_TOKEN")),
    req("Refresh token rỗng", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":""}', tests=problem(400, "VALIDATION_ERROR")),
    req("Thiếu refreshToken", "POST", "/api/v1/auth/refresh-token", '{}', tests=problem(400, "VALIDATION_ERROR")),
    req("Gửi access token vào chỗ refresh token", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{access2}}"}',
        tests=problem(401, "INVALID_REFRESH_TOKEN")),
]))

# ---------------------------------------------------------------- 5. Logout
folders.append(("5. Logout", [
    req("Logout cần access token", "POST", "/api/v1/auth/logout", '{"refreshToken":"{{refresh2}}"}', tests=problem(401, "UNAUTHORIZED")),
    req("User 2 đăng nhập", "POST", "/api/v1/auth/login", '{"email":"{{email2}}","password":"{{password}}"}',
        tests=js(status(200), 'pm.collectionVariables.set("access2b", pm.response.json().tokens.accessToken);',
                 'pm.collectionVariables.set("refresh2b", pm.response.json().tokens.refreshToken);')),
    req("[Bảo mật] User 2 logout refresh token của user 1", "POST", "/api/v1/auth/logout", '{"refreshToken":"{{refresh2}}"}',
        token="access2b", tests=js('pm.collectionVariables.set("crossLogout", pm.response.code);',
                                   'pm.test("ghi nhận: trả " + pm.response.code, () => pm.expect([204, 403, 404]).to.include(pm.response.code));')),
    req("[Bảo mật] Refresh token user 1 còn sống sau khi user 2 logout nó?", "POST", "/api/v1/auth/refresh-token",
        '{"refreshToken":"{{refresh2}}"}',
        tests=js('pm.collectionVariables.set("crossLogoutKilled", pm.response.code === 401 ? "YES" : "NO");',
                 'pm.test("ghi nhận: bị vô hiệu bởi user khác = " + pm.collectionVariables.get("crossLogoutKilled"), () => pm.expect([200, 401]).to.include(pm.response.code));',
                 'if (pm.response.code === 200) { const t = pm.response.json().tokens; pm.collectionVariables.set("access2", t.accessToken); pm.collectionVariables.set("refresh2", t.refreshToken); }')),
    req("User 1 đăng nhập lại", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"{{password}}"}',
        tests=js(status(200), 'pm.collectionVariables.set("access3", pm.response.json().tokens.accessToken);',
                 'pm.collectionVariables.set("refresh3", pm.response.json().tokens.refreshToken);')),
    req("Logout hợp lệ", "POST", "/api/v1/auth/logout", '{"refreshToken":"{{refresh3}}"}', token="access3", tests=js(status(204))),
    req("Refresh sau logout bị từ chối", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{refresh3}}"}',
        tests=problem(401, "INVALID_REFRESH_TOKEN")),
    req("Logout lần 2 (idempotent)", "POST", "/api/v1/auth/logout", '{"refreshToken":"{{refresh3}}"}', token="access3", tests=js(status(204))),
    req("[Bảo mật] Access token còn dùng được sau logout?", "GET", "/api/v1/auth/me", token="access3",
        tests=js('pm.collectionVariables.set("accessAfterLogout", pm.response.code);',
                 'pm.test("ghi nhận: trả " + pm.response.code, () => pm.expect([200, 401]).to.include(pm.response.code));')),
]))

# ---------------------------------------------------------------- 6. Change password
folders.append(("6. Đổi mật khẩu", [
    req("Đăng nhập lấy 2 phiên", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"{{password}}"}',
        tests=js(status(200), 'pm.collectionVariables.set("access4", pm.response.json().tokens.accessToken);',
                 'pm.collectionVariables.set("refresh4", pm.response.json().tokens.refreshToken);')),
    req("Mật khẩu hiện tại sai", "POST", "/api/v1/auth/change-password", '{"currentPassword":"Wrong!","newPassword":"{{newPassword}}"}',
        token="access4", tests=problem(400, "CURRENT_PASSWORD_INVALID")),
    req("Mật khẩu mới quá ngắn", "POST", "/api/v1/auth/change-password", '{"currentPassword":"{{password}}","newPassword":"abc"}',
        token="access4", tests=problem(400, "VALIDATION_ERROR")),
    req("[Kiểm tra] Mật khẩu mới trùng mật khẩu cũ", "POST", "/api/v1/auth/change-password",
        '{"currentPassword":"{{password}}","newPassword":"{{password}}"}', token="access4",
        tests=js('pm.collectionVariables.set("samePasswordStatus", pm.response.code);',
                 'pm.test("ghi nhận: trả " + pm.response.code, () => pm.expect([204, 400]).to.include(pm.response.code));')),
    req("Đăng nhập lại sau test trên (phiên có thể đã bị huỷ)", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"{{password}}"}',
        tests=js(status(200), 'pm.collectionVariables.set("access4", pm.response.json().tokens.accessToken);',
                 'pm.collectionVariables.set("refresh4", pm.response.json().tokens.refreshToken);')),
    req("Đổi mật khẩu thành công", "POST", "/api/v1/auth/change-password",
        '{"currentPassword":"{{password}}","newPassword":"{{newPassword}}"}', token="access4", tests=js(status(204))),
    req("Refresh token cũ bị thu hồi sau đổi mật khẩu", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{refresh4}}"}',
        tests=problem(401, "INVALID_REFRESH_TOKEN")),
    req("Mật khẩu cũ không đăng nhập được", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"{{password}}"}',
        tests=problem(401, "INVALID_CREDENTIALS")),
    req("Mật khẩu mới đăng nhập được", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"{{newPassword}}"}',
        tests=js(status(200), 'pm.collectionVariables.set("access5", pm.response.json().tokens.accessToken);',
                 'pm.collectionVariables.set("refresh5", pm.response.json().tokens.refreshToken);')),
    req("[Bảo mật] Access token cũ còn dùng được sau đổi mật khẩu?", "GET", "/api/v1/auth/me", token="access4",
        tests=js('pm.collectionVariables.set("accessAfterPwChange", pm.response.code);',
                 'pm.test("ghi nhận: trả " + pm.response.code, () => pm.expect([200, 401]).to.include(pm.response.code));')),
]))

# ---------------------------------------------------------------- 7. Locked account (needs admin)
folders.append(("7. Tài khoản bị khoá", [
    req("Admin đăng nhập", "POST", "/api/v1/auth/login", '{"email":"{{adminEmail}}","password":"{{adminPassword}}"}',
        tests=js(status(200), 'pm.collectionVariables.set("adminAccess", pm.response.json().tokens.accessToken);')),
    req("Admin khoá user 1", "PATCH", "/api/v1/users/{{userId}}/status", '{"status":"INACTIVE"}', token=ADMIN, tests=js(status(200))),
    req("Đăng nhập đúng mật khẩu khi bị khoá", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"{{newPassword}}"}',
        tests=problem(403, "ACCOUNT_INACTIVE")),
    req("Đăng nhập sai mật khẩu khi bị khoá (không lộ trạng thái)", "POST", "/api/v1/auth/login",
        '{"email":"{{email}}","password":"WrongPassword!"}', tests=problem(401, "INVALID_CREDENTIALS")),
    req("Access token đang có bị chặn ngay", "GET", "/api/v1/auth/me", token="access5", tests=problem(403, "ACCOUNT_INACTIVE")),
    req("Refresh bị chặn khi tài khoản khoá", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{refresh5}}"}',
        tests=problem(401, "INVALID_REFRESH_TOKEN")),
    req("Admin mở khoá user 1", "PATCH", "/api/v1/users/{{userId}}/status", '{"status":"ACTIVE"}', token=ADMIN, tests=js(status(200))),
    req("Sau mở khoá, refresh token cũ dùng lại được?", "POST", "/api/v1/auth/refresh-token", '{"refreshToken":"{{refresh5}}"}',
        tests=js('pm.collectionVariables.set("refreshAfterUnlock", pm.response.code);',
                 'pm.test("ghi nhận: trả " + pm.response.code, () => pm.expect([200, 401]).to.include(pm.response.code));')),
]))

# ---------------------------------------------------------------- 8. Rate limit (last: it throttles this client for a minute)
folders.append(("8. Rate limit đăng nhập", [
    req("Đăng nhập sai liên tục đến khi bị chặn", "POST", "/api/v1/auth/login", '{"email":"{{email}}","password":"Brute-force!"}',
        tests=js('const n = (pm.collectionVariables.get("bruteCount") || 0) + 1; pm.collectionVariables.set("bruteCount", n);',
                 'if (pm.response.code === 429) {',
                 '  pm.test("bị chặn sau " + n + " lần thử", () => pm.expect(n).to.be.at.most(61));',
                 '  pm.test("code RATE_LIMIT_EXCEEDED", () => pm.expect(pm.response.json().code).to.eql("RATE_LIMIT_EXCEEDED"));',
                 '  pm.test("có header Retry-After", () => pm.expect(pm.response.headers.get("Retry-After")).to.be.ok);',
                 '} else if (n < 70) { pm.execution.setNextRequest(pm.info.requestName); }',
                 'else { pm.test("không bị chặn sau 70 lần", () => pm.expect.fail("no 429")); }')),
]))

summary = js(
    'const v = k => pm.collectionVariables.get(k);',
    'console.log("=== KẾT QUẢ GHI NHẬN ===");',
    'console.log("Phát hiện dùng lại refresh token (thu hồi cả chuỗi): " + v("reuseDetection"));',
    'console.log("Access token cũ sau refresh: " + v("oldAccessAfterRefresh"));',
    'console.log("Access token sau logout: " + v("accessAfterLogout"));',
    'console.log("Access token cũ sau đổi mật khẩu: " + v("accessAfterPwChange"));',
    'console.log("User khác logout được refresh token của mình: " + v("crossLogout") + " / bị vô hiệu: " + v("crossLogoutKilled"));',
    'console.log("Đổi mật khẩu trùng mật khẩu cũ: " + v("samePasswordStatus"));',
    'console.log("Refresh sau khi mở khoá: " + v("refreshAfterUnlock"));',
    'console.log("Đăng ký email có khoảng trắng: " + v("spacedEmailStatus"));')
folders[-1][1].append(req("Tổng hợp ghi nhận", "GET", "/api/v1/api-catalog", tests=js(status(200), *summary)))

collection = {
    "info": {"_postman_id": str(uuid.uuid5(uuid.NAMESPACE_URL, "club-basic-vju/auth")), "name": "VJU Club – Auth & Refresh Token",
             "description": "Black-box API checks for registration, login, access tokens, refresh-token rotation, logout, password change, locked accounts and login rate limiting. Requires baseUrl, adminEmail, adminPassword.",
             "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
    "item": [{"name": n, "item": items} for n, items in folders],
    "variable": [{"key": "baseUrl", "value": "http://localhost:8080"}],
}
json.dump(collection, open("auth.postman_collection.json", "w"), ensure_ascii=False, indent=2)
print(sum(len(i) for _, i in folders), "requests")
