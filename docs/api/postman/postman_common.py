"""Shared pieces of the Postman collections: session cookies + CSRF and request builders.

The backend signs users in with an HttpOnly CLUB_SESSION cookie, which the Postman CLI cookie
jar keeps between requests. Unsafe requests (POST/PUT/PATCH/DELETE) must echo the XSRF-TOKEN
cookie in the X-XSRF-TOKEN header: the collection-level scripts below keep the token in the
`xsrf` variable and fetch a fresh one from GET /auth/csrf whenever it is missing (signing in
rotates it). Switching user = signing in again. Add the header X-No-Csrf to a request to send it
without the token on purpose.
"""
import json

def js(*lines): return list(lines)

COLLECTION_EVENTS = [
    {"listen": "prerequest", "script": {"type": "text/javascript", "exec": js(
        "const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(pm.request.method);",
        "const skip = pm.request.headers.has('X-No-Csrf');",
        "if (skip) pm.request.headers.remove('X-No-Csrf');",
        "const apply = () => pm.request.headers.upsert({ key: 'X-XSRF-TOKEN', value: pm.collectionVariables.get('xsrf') || '' });",
        "if (skip) { /* sent without a CSRF token on purpose */ }",
        "else if (unsafe && !pm.collectionVariables.get('xsrf')) {",
        "  pm.sendRequest({ url: pm.variables.get('baseUrl') + '/api/v1/auth/csrf', method: 'GET' }, (err, res) => {",
        "    if (!err) res.headers.all().filter(h => h.key.toLowerCase() === 'set-cookie').forEach(h => {",
        "      const m = h.value.match(/^XSRF-TOKEN=([^;]*)/); if (m && m[1]) pm.collectionVariables.set('xsrf', decodeURIComponent(m[1]));",
        "    });",
        "    apply();",
        "  });",
        "} else if (unsafe) { apply(); }")}},
    {"listen": "test", "script": {"type": "text/javascript", "exec": js(
        "pm.response.headers.all().filter(h => h.key.toLowerCase() === 'set-cookie').forEach(h => {",
        "  const m = h.value.match(/^XSRF-TOKEN=([^;]*)/); if (m) pm.collectionVariables.set('xsrf', decodeURIComponent(m[1]));",
        "});")}},
]

def url(path, query=None):
    raw = "{{baseUrl}}" + path
    u = {"host": ["{{baseUrl}}"], "path": path.strip("/").split("/")}
    if query:
        raw += "?" + "&".join(f"{k}={v}" for k, v in query)
        u["query"] = [{"key": k, "value": v} for k, v in query]
    u["raw"] = raw
    return u

def req(name, method, path, body=None, query=None, form=None, pre=None, tests=None, no_csrf=False):
    headers = []
    if body is not None: headers.append({"key": "Content-Type", "value": "application/json"})
    if no_csrf: headers.append({"key": "X-No-Csrf", "value": "1"})
    item = {"name": name, "request": {"method": method, "header": headers, "url": url(path, query)}, "event": []}
    if body is not None:
        item["request"]["body"] = {"mode": "raw", "raw": body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)}
    if form is not None:
        item["request"]["body"] = {"mode": "formdata", "formdata": [
            {"key": "file", "type": "file", "src": v} if k == "file" else {"key": k, "type": "text", "value": v} for k, v in form]}
    if pre: item["event"].append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre}})
    if tests: item["event"].append({"listen": "test", "script": {"type": "text/javascript", "exec": tests}})
    return item

def status(c): return f'pm.test("status {c}", () => pm.response.to.have.status({c}));'
def code(c): return f'pm.test("code {c}", () => pm.expect(pm.response.json().code).to.eql("{c}"));'
def problem(s, c): return js(status(s), code(c))
def save(var, expr="pm.response.json().id"): return f'pm.collectionVariables.set("{var}", {expr});'

def login(name, email_var, password_var, extra=()):
    """Signs in; the session cookie replaces whoever was signed in before."""
    return req(name, "POST", "/api/v1/auth/login", '{"email":"{{' + email_var + '}}","password":"{{' + password_var + '}}"}',
               tests=js(status(200), 'pm.collectionVariables.unset("xsrf");',
                        'pm.test("có cookie phiên CLUB_SESSION", () => pm.expect(pm.cookies.has("CLUB_SESSION")).to.be.true);',
                        *extra))

def logout(name="Đăng xuất"):
    return req(name, "POST", "/api/v1/auth/logout", tests=js(status(204)))

def collection(key, name, description, folders, variables):
    return {
        "info": {"_postman_id": __import__("uuid").uuid5(__import__("uuid").NAMESPACE_URL, "club-basic-vju/" + key).__str__(),
                 "name": name, "description": description,
                 "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
        "event": COLLECTION_EVENTS,
        "item": [{"name": n, "item": items} for n, items in folders],
        "variable": [{"key": k, "value": v} for k, v in variables],
    }
