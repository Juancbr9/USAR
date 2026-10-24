"""Servidor de prueba que imita Supabase: API REST de usar_records y usar_members, y el acceso con usuario (auth).
Solo para las pruebas. Con usuario «miembro» no se devuelven ni aceptan los tipos de la documentación del personal."""
import json, threading, os
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
rows = {}; users = {}; members = {}; lock = threading.Lock()
JEFE_KINDS = set()   # ahora todo el personal accede a todo
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    def reply(self, code, data=None):
        self.send_response(code); self.cors()
        if data is not None:
            body = json.dumps(data).encode(); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
        else: self.end_headers()
    def who(self):
        a = self.headers.get('Authorization', '')
        email = a[len('Bearer tok:'):] if a.startswith('Bearer tok:') else None
        return email, (members.get(email, {}).get('role') if email else None)
    def bad_jwt(self):
        # Como Supabase: en Authorization solo vale un JWT (aquí, el token de sesión); una clave «sb_publishable_…» se rechaza
        a = self.headers.get('Authorization')
        if a and not a.startswith('Bearer tok:'): self.reply(401, {'message': 'Invalid JWT'}); return True
        return False
    def do_OPTIONS(self): self.reply(204)
    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path == '/_dump': return self.reply(200, list(rows.values()))
        if self.bad_jwt(): return
        if u.path.endswith('/usar_members'):
            f = q.get('email', [None])[0]
            data = [m for m in members.values() if not f or m['email'] == f[3:]]
            return self.reply(200, data)
        email, role = self.who()
        with lock: data = sorted(rows.values(), key=lambda r: r['updated_at'])
        if role == 'miembro': data = [r for r in data if r['kind'] not in JEFE_KINDS]
        f = q.get('updated_at', [None])[0]
        if f: data = [r for r in data if r['updated_at'] >= f[4:]]
        off = int(q.get('offset', [0])[0]); lim = int(q.get('limit', [1000])[0])
        self.reply(200, data[off:off+lim])
    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0) or 0)) or b'{}')
        if u.path == '/auth/v1/signup':
            users[body['email'].lower()] = body['password']
            return self.reply(200, {'access_token': 'tok:' + body['email'].lower(), 'refresh_token': 'ref:' + body['email'].lower(), 'expires_in': 3600, 'user': {'email': body['email'].lower()}})
        if u.path == '/auth/v1/token':
            if q.get('grant_type') == ['password']:
                e = body['email'].lower()
                if users.get(e) != body['password']: return self.reply(400, {'error_description': 'Invalid login credentials'})
            else: e = body['refresh_token'][4:]
            return self.reply(200, {'access_token': 'tok:' + e, 'refresh_token': 'ref:' + e, 'expires_in': 3600, 'user': {'email': e}})
        if self.bad_jwt(): return
        if u.path.endswith('/usar_members'):
            for m in body: members[m['email']] = m
            return self.reply(201)
        email, role = self.who()
        if role == 'miembro' and any(r['kind'] in JEFE_KINDS for r in body): return self.reply(403, {'message': 'permiso denegado'})
        with lock:
            for r in body:
                r['updated_at'] = datetime.now(timezone.utc).isoformat()
                rows[(r['kind'], r['id'])] = r
        self.reply(201)
    def do_DELETE(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path.endswith('/usar_members'): members.pop(q.get('email', [''])[0][3:], None)
        self.reply(204)
ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('PORT_MOCK', 54321))), H).serve_forever()
