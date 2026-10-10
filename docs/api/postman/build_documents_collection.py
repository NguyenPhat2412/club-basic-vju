"""Generates documents.postman_collection.json: black-box API checks for club documents (R2 / local storage).

Run from this folder so the multipart file paths (fixtures/...) resolve:
    postman collection run documents.postman_collection.json --env-var adminEmail=... --env-var adminPassword=...
"""
import json, uuid

def js(*lines): return list(lines)

def url(path, query=None):
    raw = "{{baseUrl}}" + path
    u = {"host": ["{{baseUrl}}"], "path": path.strip("/").split("/")}
    if query:
        raw += "?" + "&".join(f"{k}={v}" for k, v in query)
        u["query"] = [{"key": k, "value": v} for k, v in query]
    u["raw"] = raw
    return u

def req(name, method, path, body=None, token="adminAccess", query=None, form=None, pre=None, tests=None):
    headers = []
    if body is not None: headers.append({"key": "Content-Type", "value": "application/json"})
    if token: headers.append({"key": "Authorization", "value": "Bearer {{" + token + "}}"})
    item = {"name": name, "request": {"method": method, "header": headers, "url": url(path, query)}, "event": []}
    if body is not None:
        item["request"]["body"] = {"mode": "raw", "raw": body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)}
    if form is not None:
        fields = []
        for key, value in form:
            if key == "file":
                fields.append({"key": "file", "type": "file", "src": value})
            else:
                fields.append({"key": key, "type": "text", "value": value})
        item["request"]["body"] = {"mode": "formdata", "formdata": fields}
    if pre: item["event"].append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre}})
    if tests: item["event"].append({"listen": "test", "script": {"type": "text/javascript", "exec": tests}})
    return item

def status(c): return f'pm.test("status {c}", () => pm.response.to.have.status({c}));'
def code(c): return f'pm.test("code {c}", () => pm.expect(pm.response.json().code).to.eql("{c}"));'
def problem(s, c): return js(status(s), code(c))
def save(var, expr="pm.response.json().id"): return f'pm.collectionVariables.set("{var}", {expr});'

UPLOAD = "/api/v1/clubs/{{clubId}}/documents"
DOC = "/api/v1/documents/{{docId}}"
F = "fixtures/"
folders = []

# ---------------------------------------------------------------- 0. Setup
folders.append(("0. Chuẩn bị", [
    req("Admin đăng nhập", "POST", "/api/v1/auth/login", '{"email":"{{adminEmail}}","password":"{{adminPassword}}"}', token=None,
        pre=js('const id = Date.now().toString(36) + Math.floor(Math.random()*1e4).toString(36);',
               'pm.collectionVariables.set("runId", id);'),
        tests=js(status(200), save("adminAccess", "pm.response.json().tokens.accessToken"),
                 save("adminId", "pm.response.json().user.id"))),
    req("Tạo CLB riêng cho lần chạy này", "POST", "/api/v1/clubs", '{"code":"PM-{{runId}}","name":"Postman Docs {{runId}}"}',
        tests=js(status(201), save("clubId"))),
    req("Đăng ký user thường (không có quyền)", "POST", "/api/v1/auth/register",
        '{"email":"docs.{{runId}}@vju.local","password":"Password123!","fullName":"Docs Tester"}', token=None,
        tests=js(status(201), save("memberId"))),
    req("User thường đăng nhập", "POST", "/api/v1/auth/login", '{"email":"docs.{{runId}}@vju.local","password":"Password123!"}',
        token=None, tests=js(status(200), save("memberAccess", "pm.response.json().tokens.accessToken"))),
    req("Lấy id quyền document.view", "GET", "/api/v1/permissions",
        tests=js(status(200),
                 'const p = pm.response.json().find(x => x.permissionKey === "document.view");',
                 'pm.test("có quyền document.view", () => pm.expect(p).to.be.ok);',
                 save("documentViewPermissionId", "p.id"),
                 'pm.test("đủ 5 quyền document.*", () => pm.expect(pm.response.json().filter(x => x.permissionKey.startsWith("document.")).length).to.eql(5));')),
]))

# ---------------------------------------------------------------- 1. Upload
folders.append(("1. Upload", [
    req("Upload PDF (tên tiếng Việt, appDetailKey)", "POST", UPLOAD,
        form=[("file", F + "v1.pdf"), ("name", "Nội quy CLB {{runId}}.pdf"), ("appDetailKey", "club.rules")],
        tests=js(status(201), 'const d = pm.response.json();', save("docId"), save("docName", "d.name"), save("v1Checksum", "d.checksumSha256"),
                 'pm.test("version 1", () => pm.expect(d.version).to.eql(1));',
                 'pm.test("contentType từ đuôi file", () => pm.expect(d.contentType).to.eql("application/pdf"));',
                 'pm.test("owner là admin", () => pm.expect(d.ownerId).to.eql(pm.collectionVariables.get("adminId")));',
                 'pm.test("path trong thư mục của CLB", () => pm.expect(d.path).to.match(new RegExp("^clubs/" + pm.collectionVariables.get("clubId") + "/documents/.+\\\\.pdf$")));',
                 'pm.test("checksum SHA-256", () => pm.expect(d.checksumSha256).to.match(/^[0-9a-f]{64}$/));',
                 'pm.test("appDetailKey", () => pm.expect(d.appDetailKey).to.eql("club.rules"));',
                 'pm.test("chưa xoá", () => { pm.expect(d.deleted).to.be.false; pm.expect(d.deletedAt).to.be.null; });')),
    req("Upload PDF thứ hai", "POST", UPLOAD, form=[("file", F + "v1.pdf"), ("name", "Kế hoạch {{runId}}.pdf")],
        tests=js(status(201), save("doc2Id"), save("doc2Name", "pm.response.json().name"))),
    req("Upload ảnh PNG", "POST", UPLOAD, form=[("file", F + "logo.png"), ("appDetailKey", "club.logo")],
        tests=js(status(201), save("pngId"),
                 'pm.test("tên lấy từ file gửi lên", () => pm.expect(pm.response.json().name).to.eql("logo.png"));',
                 'pm.test("image/png", () => pm.expect(pm.response.json().contentType).to.eql("image/png"));')),
    req("Trùng tên (khác hoa thường) → 409", "POST", UPLOAD, form=[("file", F + "v2.pdf"), ("name", "NỘI QUY CLB {{runId}}.PDF")],
        tests=problem(409, "DOCUMENT_NAME_ALREADY_EXISTS")),
    req("Thiếu phần file → 400", "POST", UPLOAD, form=[("name", "a.pdf")], tests=problem(400, "VALIDATION_ERROR")),
    req("CLB không tồn tại → 404", "POST", "/api/v1/clubs/00000000-0000-0000-0000-000000000000/documents",
        form=[("file", F + "v1.pdf")], tests=problem(404, "CLUB_NOT_FOUND")),
]))

# ---------------------------------------------------------------- 2. Abnormal files
def bad(title, name, s, c, file="v1.pdf", extra=()):
    form = [("file", F + file)] + ([("name", name)] if name else []) + list(extra)
    return req(title, "POST", UPLOAD, form=form, tests=problem(s, c))

folders.append(("2. File bất thường", [
    bad("Path traversal ../../etc/passwd.pdf", "../../etc/passwd.pdf", 400, "INVALID_DOCUMENT_NAME"),
    bad("Đường dẫn Windows C:\\\\x.pdf", "C:\\x.pdf", 400, "INVALID_DOCUMENT_NAME"),
    bad("Tên thiết bị Windows CON.pdf", "CON.pdf", 400, "INVALID_DOCUMENT_NAME"),
    bad("File ẩn .env.pdf", ".env.pdf", 400, "INVALID_DOCUMENT_NAME"),
    bad("Không có đuôi", "noextension", 400, "INVALID_DOCUMENT_NAME"),
    bad("Ký tự cấm a?b.pdf", "a?b.pdf", 400, "INVALID_DOCUMENT_NAME"),
    bad("Tên dài 300 byte", "a" * 296 + ".pdf", 400, "INVALID_DOCUMENT_NAME"),
    bad("Đuôi kép invoice.exe.pdf", "invoice.exe.pdf", 400, "SUSPICIOUS_DOCUMENT_NAME"),
    bad("Ký tự đảo chiều U+202E", "invoice\u202efdp.pdf", 400, "SUSPICIOUS_DOCUMENT_NAME"),
    bad("Ký tự vô hình U+200B", "report\u200b.pdf", 400, "SUSPICIOUS_DOCUMENT_NAME"),
    bad("Đệm dấu cách che đuôi", "photo.jpg            .pdf", 400, "SUSPICIOUS_DOCUMENT_NAME"),
    bad("Chương trình setup.exe", "setup.exe", 415, "UNSUPPORTED_DOCUMENT_TYPE"),
    bad("Đuôi không cho phép .json", "data.json", 415, "UNSUPPORTED_DOCUMENT_TYPE"),
    bad("File .exe đổi tên thành .pdf", None, 400, "DOCUMENT_CONTENT_MISMATCH", file="fake-report.pdf"),
    bad("PNG đặt tên .pdf", "logo-as.pdf", 400, "DOCUMENT_CONTENT_MISMATCH", file="logo.png"),
    bad("File rỗng", None, 400, "EMPTY_DOCUMENT", file="empty.pdf"),
    bad("appDetailKey sai định dạng", "ok-{{runId}}.pdf", 400, "INVALID_APP_DETAIL_KEY", extra=[("appDetailKey", "Not A Key")]),
    req("Không file bất thường nào được lưu", "GET", "/api/v1/clubs/{{clubId}}/documents/count",
        tests=js(status(200), 'pm.test("vẫn chỉ 3 tài liệu", () => pm.expect(pm.response.json().count).to.eql(3));')),
]))

# ---------------------------------------------------------------- 3. List, count, names
LIST = "/api/v1/clubs/{{clubId}}/documents"
folders.append(("3. Danh sách, đếm, tên", [
    req("Danh sách (mới nhất trước)", "GET", LIST,
        tests=js(status(200), 'const p = pm.response.json();',
                 'pm.test("total 3", () => pm.expect(p.total).to.eql(3));',
                 'pm.test("mới nhất trước", () => pm.expect(p.items[0].name).to.eql("logo.png"));')),
    req("Phân trang limit=1 offset=1", "GET", LIST, query=[("limit", "1"), ("offset", "1")],
        tests=js(status(200), 'pm.test("1 item, total 3", () => { pm.expect(pm.response.json().items.length).to.eql(1); pm.expect(pm.response.json().total).to.eql(3); });')),
    req("Lọc theo tên (không phân biệt hoa thường)", "GET", LIST, query=[("name", "KẾ HOẠCH")],
        tests=js(status(200), 'pm.test("tìm thấy 1", () => pm.expect(pm.response.json().total).to.eql(1));')),
    req("Lọc theo appDetailKey", "GET", LIST, query=[("appDetailKey", "club.rules")],
        tests=js(status(200), 'pm.test("1 tài liệu club.rules", () => pm.expect(pm.response.json().total).to.eql(1));')),
    req("Ký tự % được hiểu theo nghĩa đen", "GET", LIST, query=[("name", "%25")],
        tests=js(status(200), 'pm.test("không khớp tất cả", () => pm.expect(pm.response.json().total).to.eql(0));')),
    req("getDocCount", "GET", LIST + "/count",
        tests=js(status(200), 'pm.test("count 3", () => pm.expect(pm.response.json().count).to.eql(3));')),
    req("getDocCount theo appDetailKey", "GET", LIST + "/count", query=[("appDetailKey", "club.logo")],
        tests=js(status(200), 'pm.test("count 1", () => pm.expect(pm.response.json().count).to.eql(1));')),
    req("getDocumentNames (A–Z)", "GET", LIST + "/names",
        tests=js(status(200), 'const n = pm.response.json().names;',
                 'pm.test("3 tên", () => pm.expect(n.length).to.eql(3));',
                 'pm.test("sắp xếp", () => pm.expect(n).to.eql([...n].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))));')),
    req("CLB không tồn tại → 404", "GET", "/api/v1/clubs/00000000-0000-0000-0000-000000000000/documents",
        tests=problem(404, "CLUB_NOT_FOUND")),
]))

# ---------------------------------------------------------------- 4. Versions and download
VERS = DOC + "/versions"
folders.append(("4. Phiên bản và tải file", [
    req("Xem chi tiết", "GET", DOC, tests=js(status(200), 'pm.test("đúng tên", () => pm.expect(pm.response.json().name).to.eql(pm.collectionVariables.get("docName")));')),
    req("Upload phiên bản 2 (expectedVersion=1)", "POST", VERS, form=[("file", F + "v2.pdf"), ("expectedVersion", "1")],
        tests=js(status(201), 'const d = pm.response.json();',
                 'pm.test("version 2", () => pm.expect(d.version).to.eql(2));',
                 'pm.test("giữ nguyên tên", () => pm.expect(d.name).to.eql(pm.collectionVariables.get("docName")));',
                 'pm.test("checksum đổi", () => pm.expect(d.checksumSha256).to.not.eql(pm.collectionVariables.get("v1Checksum")));')),
    req("expectedVersion cũ → 409", "POST", VERS, form=[("file", F + "v1.pdf"), ("expectedVersion", "1")],
        tests=problem(409, "DOCUMENT_VERSION_CONFLICT")),
    req("Nội dung trùng phiên bản hiện tại → 409", "POST", VERS, form=[("file", F + "v2.pdf")],
        tests=problem(409, "DOCUMENT_VERSION_UNCHANGED")),
    req("Đổi kiểu file .pdf → .png → 400", "POST", VERS, form=[("file", F + "logo.png")], tests=problem(400, "DOCUMENT_TYPE_CHANGED")),
    req("Phiên bản là file .exe giả → 400", "POST", VERS, form=[("file", F + "fake-report.pdf")],
        tests=problem(400, "DOCUMENT_CONTENT_MISMATCH")),
    req("Lịch sử phiên bản", "GET", VERS,
        tests=js(status(200), 'const v = pm.response.json();',
                 'pm.test("2 phiên bản, mới nhất trước", () => { pm.expect(v.length).to.eql(2); pm.expect(v[0].version).to.eql(2); pm.expect(v[1].version).to.eql(1); });',
                 'pm.test("tên file gốc của v2", () => pm.expect(v[0].originalName).to.eql("v2.pdf"));')),
    req("Tải phiên bản hiện tại", "GET", DOC + "/download",
        tests=js(status(200),
                 'pm.test("nội dung v2", () => pm.expect(pm.response.text()).to.include("fixture v2"));',
                 'pm.test("attachment + tên UTF-8", () => { const h = pm.response.headers.get("Content-Disposition"); pm.expect(h).to.include("attachment"); pm.expect(h).to.include("filename*=UTF-8\'\'"); });',
                 'pm.test("X-Document-Version 2", () => pm.expect(pm.response.headers.get("X-Document-Version")).to.eql("2"));',
                 'pm.test("ETag là checksum", () => pm.expect(pm.response.headers.get("ETag")).to.match(/^"[0-9a-f]{64}"$/));',
                 'pm.test("nosniff", () => pm.expect(pm.response.headers.get("X-Content-Type-Options")).to.eql("nosniff"));')),
    req("Tải phiên bản 1", "GET", DOC + "/download", query=[("version", "1")],
        tests=js(status(200), 'pm.test("nội dung v1", () => pm.expect(pm.response.text()).to.include("fixture v1"));')),
    req("Phiên bản không tồn tại → 404", "GET", DOC + "/download", query=[("version", "99")],
        tests=problem(404, "DOCUMENT_VERSION_NOT_FOUND")),
    req("Phiên bản 0 → 400", "GET", DOC + "/download", query=[("version", "0")], tests=problem(400, "INVALID_DOCUMENT_VERSION")),
    req("Link tải (presigned khi dùng R2)", "GET", DOC + "/download-url",
        tests=js(status(200), 'const l = pm.response.json();',
                 'pm.test("version 2", () => pm.expect(l.version).to.eql(2));',
                 'if (l.expiresAt) {',
                 '  pm.test("R2: link presigned, chưa hết hạn", () => { pm.expect(l.url).to.include("X-Amz-Signature="); pm.expect(new Date(l.expiresAt) > new Date()).to.be.true; });',
                 '  pm.collectionVariables.set("presignedUrl", l.url);',
                 '} else {',
                 '  pm.test("local: trả về đường dẫn API", () => pm.expect(l.url).to.include("/download?version=2"));',
                 '}',
                 'console.log("download-url: " + (l.expiresAt ? "R2 presigned" : "local storage"));')),
    req("Mở link presigned (bỏ qua khi dùng local)", "GET", "/api/v1/api-catalog", token=None,
        pre=js('const u = pm.collectionVariables.get("presignedUrl");',
               'if (u) { pm.request.url = u; } else { pm.execution.skipRequest(); }'),
        tests=js(status(200), 'pm.test("nội dung v2 từ R2", () => pm.expect(pm.response.text()).to.include("fixture v2"));')),
]))

# ---------------------------------------------------------------- 5. Rename
folders.append(("5. Đổi tên", [
    req("Trùng tên tài liệu khác → 409", "PATCH", "/api/v1/documents/{{doc2Id}}", '{"name":"{{docName}}"}',
        tests=problem(409, "DOCUMENT_NAME_ALREADY_EXISTS")),
    req("Đổi đuôi .pdf → .docx → 400", "PATCH", "/api/v1/documents/{{doc2Id}}", '{"name":"Kế hoạch.docx"}',
        tests=problem(400, "DOCUMENT_TYPE_CHANGED")),
    req("Tên chứa / → 400", "PATCH", "/api/v1/documents/{{doc2Id}}", '{"name":"a/b.pdf"}', tests=problem(400, "INVALID_DOCUMENT_NAME")),
    req("Đổi tên + appDetailKey", "PATCH", "/api/v1/documents/{{doc2Id}}", '{"name":"Kế hoạch sự kiện {{runId}}.pdf","appDetailKey":"event.plan"}',
        tests=js(status(200), save("doc2Name", "pm.response.json().name"),
                 'pm.test("đã đổi", () => pm.expect(pm.response.json().appDetailKey).to.eql("event.plan"));')),
    req("Xoá appDetailKey bằng chuỗi rỗng", "PATCH", "/api/v1/documents/{{doc2Id}}", '{"appDetailKey":""}',
        tests=js(status(200), 'pm.test("appDetailKey null", () => pm.expect(pm.response.json().appDetailKey).to.be.null);')),
]))

# ---------------------------------------------------------------- 6. Permissions
M = "memberAccess"
folders.append(("6. Phân quyền", [
    req("Không có token → 401", "GET", LIST, token=None, tests=problem(401, "UNAUTHORIZED")),
    req("User không quyền xem danh sách → 403", "GET", LIST, token=M, tests=problem(403, "PERMISSION_DENIED")),
    req("User không quyền xem tài liệu → 403", "GET", DOC, token=M, tests=problem(403, "PERMISSION_DENIED")),
    req("User không quyền dò id ngẫu nhiên → 403 (không lộ 404)", "GET", "/api/v1/documents/00000000-0000-0000-0000-000000000001",
        token=M, tests=problem(403, "PERMISSION_DENIED")),
    req("Admin với id ngẫu nhiên → 404", "GET", "/api/v1/documents/00000000-0000-0000-0000-000000000001",
        tests=problem(404, "DOCUMENT_NOT_FOUND")),
    req("Cấp document.view trong CLB cho user", "POST", "/api/v1/users/{{memberId}}/permissions",
        '{"permissionId":"{{documentViewPermissionId}}","scope":"CLUB","clubId":"{{clubId}}"}', tests=js(status(201))),
    req("User xem được danh sách", "GET", LIST, token=M, tests=js(status(200))),
    req("User tải được file", "GET", DOC + "/download", token=M, tests=js(status(200))),
    req("User vẫn không upload được → 403", "POST", UPLOAD, token=M, form=[("file", F + "v1.pdf"), ("name", "member.pdf")],
        tests=problem(403, "PERMISSION_DENIED")),
    req("User không xoá được file người khác → 403", "DELETE", DOC, token=M, tests=problem(403, "PERMISSION_DENIED")),
    req("User không đổi tên file người khác → 403", "PATCH", DOC, '{"name":"x.pdf"}', token=M, tests=problem(403, "PERMISSION_DENIED")),
    req("User không xem thùng rác → 403", "GET", LIST, token=M, query=[("deleted", "true")], tests=problem(403, "PERMISSION_DENIED")),
]))

# ---------------------------------------------------------------- 7. Soft delete and restore
D2 = "/api/v1/documents/{{doc2Id}}"
folders.append(("7. Xoá mềm và khôi phục", [
    req("Xoá mềm", "DELETE", D2, tests=js(status(204))),
    req("Không còn trong danh sách", "GET", LIST + "/names",
        tests=js(status(200), 'pm.test("tên đã biến mất", () => pm.expect(pm.response.json().names).to.not.include(pm.collectionVariables.get("doc2Name")));')),
    req("Có trong thùng rác (deleted=true)", "GET", LIST, query=[("deleted", "true")],
        tests=js(status(200), 'const i = pm.response.json().items[0];',
                 'pm.test("deletedBy là admin", () => pm.expect(i.deletedBy).to.eql(pm.collectionVariables.get("adminId")));',
                 'pm.test("có deletedAt", () => pm.expect(i.deletedAt).to.be.a("string"));')),
    req("getDocCount deleted=true", "GET", LIST + "/count", query=[("deleted", "true")],
        tests=js(status(200), 'pm.test("count 1", () => pm.expect(pm.response.json().count).to.eql(1));')),
    req("Xoá lần nữa → 410", "DELETE", D2, tests=problem(410, "DOCUMENT_DELETED")),
    req("Tải file đã xoá → 410", "GET", D2 + "/download", tests=problem(410, "DOCUMENT_DELETED")),
    req("Upload phiên bản cho file đã xoá → 410", "POST", D2 + "/versions", form=[("file", F + "v2.pdf")],
        tests=problem(410, "DOCUMENT_DELETED")),
    req("User chỉ có view: tài liệu đã xoá → 404", "GET", D2, token=M, tests=problem(404, "DOCUMENT_NOT_FOUND")),
    req("Upload tài liệu mới trùng tên tài liệu đã xoá", "POST", UPLOAD, form=[("file", F + "v2.pdf"), ("name", "{{doc2Name}}")],
        tests=js(status(201), save("doc2ReplacementId"))),
    req("Khôi phục khi tên đã bị dùng → 409", "POST", D2 + "/restore", tests=problem(409, "DOCUMENT_NAME_ALREADY_EXISTS")),
    req("Đổi tên tài liệu thay thế", "PATCH", "/api/v1/documents/{{doc2ReplacementId}}", '{"name":"Bản thay thế {{runId}}.pdf"}',
        tests=js(status(200))),
    req("Khôi phục", "POST", D2 + "/restore",
        tests=js(status(200), 'pm.test("deleted=false, deletedAt=null", () => { pm.expect(pm.response.json().deleted).to.be.false; pm.expect(pm.response.json().deletedAt).to.be.null; });')),
    req("Tải lại được sau khôi phục", "GET", D2 + "/download",
        tests=js(status(200), 'pm.test("nội dung v1", () => pm.expect(pm.response.text()).to.include("fixture v1"));')),
    req("Khôi phục tài liệu chưa xoá → 409", "POST", D2 + "/restore", tests=problem(409, "DOCUMENT_NOT_DELETED")),
    req("Audit log ghi lại xoá và khôi phục", "GET", "/api/v1/audit-logs", query=[("resourceId", "{{doc2Id}}")],
        tests=js(status(200), 'const body = pm.response.json(); const items = body.items || body;',
                 'const actions = items.map(x => x.action);',
                 'pm.test("có DOCUMENT_DELETED và DOCUMENT_RESTORED", () => { pm.expect(actions).to.include("DOCUMENT_DELETED"); pm.expect(actions).to.include("DOCUMENT_RESTORED"); });')),
]))

collection = {
    "info": {"_postman_id": str(uuid.uuid5(uuid.NAMESPACE_URL, "club-basic-vju/documents")), "name": "VJU Club – Documents",
             "description": "Black-box checks for club documents: upload, abnormal names/content, list/count/names, versions, download, presigned links, rename, permissions, soft delete and restore. Requires baseUrl, adminEmail, adminPassword; run from docs/api/postman so fixtures/ resolves.",
             "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
    "item": [{"name": n, "item": items} for n, items in folders],
    "variable": [{"key": "baseUrl", "value": "http://localhost:8080"}],
}
json.dump(collection, open("documents.postman_collection.json", "w"), ensure_ascii=False, indent=2)
print(sum(len(i) for _, i in folders), "requests")
