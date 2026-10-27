"""Servidor de prueba que imita Supabase: API REST de usar_records y usar_members, el acceso con usuario (auth) y el acceso
con nombre y PIN (invitados y funciones usar_* de supabase.sql).
Solo para las pruebas. Con usuario «miembro» no se devuelven ni aceptan los tipos de la documentación del personal."""
import json, threading, os
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
rows = {}; users = {}; members = {}; lock = threading.Lock()
pins = {}; sesiones = {}; anon_n = [0]   # PIN por nombre y nombre de cada invitado
SECURE = [False]   # GET /_secure lo activa: como el modo seguro de supabase.sql, sin usuario no se lee ni se escribe usar_records
JEFE_KINDS = set()   # ahora todo el personal accede a todo
FLOTA_KINDS = {'gear', 'boxes', 'consumables', 'vehicles'}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    def reply(self, code, data=None):
        self.send_response(code); self.cors()
        if data is not None:
            body = json.dumps(data).encode(); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
        else: self.end_headers()
    def who(self):
        a = self.headers.get('Authorization', '')
        email = a[len('Bearer tok:'):] if a.startswith('Bearer tok:') else None
        if email and email.startswith('anon:'):   # invitado: su rol es el del nombre con el que entró (o ninguno)
            p = pins.get(sesiones.get(email))
            return (email if p else None), (p['role'] if p else None)
        return email, (members.get(email, {}).get('role') if email else None)
    def uid(self):
        a = self.headers.get('Authorization', '')
        return a[len('Bearer tok:'):] if a.startswith('Bearer tok:anon:') else None
    def rpc(self, fn, b):
        email, role = self.who(); uid = self.uid()
        if fn == 'usar_nombres': return [{'name': n} for n in sorted(pins)]
        if fn == 'usar_entrar':
            if not uid: return {'error': 'Sin sesión'}
            n = str(b.get('p_name', '')).strip().upper(); p = pins.get(n)
            if not p: return {'error': 'Ese nombre no tiene PIN: pide a un jefe que te lo ponga'}
            if p['fails'] >= 5: return {'error': 'Demasiados intentos. Espera 5 min o pide a un jefe un PIN nuevo'}
            if p['pin'] != b.get('p_pin'): p['fails'] += 1; return {'error': 'PIN incorrecto'}
            p['fails'] = 0; sesiones[uid] = n; return {'name': n, 'role': p['role']}
        if fn == 'usar_salir': sesiones.pop(uid, None); return None
        if fn == 'usar_cambiar_mi_pin':
            p = pins.get(sesiones.get(uid))
            if not p: return {'error': 'Entra con tu nombre y PIN'}
            if p['pin'] != b.get('p_old'): return {'error': 'El PIN actual no es correcto'}
            p['pin'] = b.get('p_new'); return {'ok': True}
        if role != 'jefe': return [] if fn == 'usar_personas' else {'error': 'Solo un jefe'}
        if fn == 'usar_personas': return [{'name': n, 'role': p['role'], 'bloqueado': p['fails'] >= 5} for n, p in sorted(pins.items())]
        if fn == 'usar_poner_pin':
            pins[b['p_name'].strip().upper()] = {'role': b['p_role'], 'pin': b['p_pin'], 'fails': 0}; return {'ok': True}
        if fn == 'usar_cambiar_permiso': pins[b['p_name'].strip().upper()]['role'] = b['p_role']; return {'ok': True}
        if fn == 'usar_quitar':
            n = b['p_name'].strip().upper(); pins.pop(n, None)
            for k in [k for k, v in sesiones.items() if v == n]: sesiones.pop(k)
            return {'ok': True}
        return {'error': 'función desconocida'}
    def bad_jwt(self):
        # Como Supabase: en Authorization solo vale un JWT (aquí, el token de sesión); una clave «sb_publishable_…» se rechaza
        a = self.headers.get('Authorization')
        if a and not a.startswith('Bearer tok:'): self.reply(401, {'message': 'Invalid JWT'}); return True
        return False
    def denied(self, email):
        if SECURE[0] and not email: self.reply(401, {'code': '42501', 'message': 'permission denied for table usar_records'}); return True
        return False
    def do_OPTIONS(self): self.reply(204)
    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path == '/_dump': return self.reply(200, list(rows.values()))
        if u.path == '/_secure': SECURE[0] = True; return self.reply(200, {})
        if u.path == '/_pin':   # alta directa de un PIN (para preparar las pruebas)
            pins[q['name'][0].upper()] = {'role': q.get('role', ['miembro'])[0], 'pin': q['pin'][0], 'fails': 0}; return self.reply(200, {})
        if self.bad_jwt(): return
        if u.path.endswith('/usar_members'):
            f = q.get('email', [None])[0]
            data = [m for m in members.values() if not f or m['email'] == f[3:]]
            return self.reply(200, data)
        email, role = self.who()
        if self.denied(email): return
        with lock: data = sorted(rows.values(), key=lambda r: r['updated_at'])
        if role == 'miembro': data = [r for r in data if r['kind'] not in JEFE_KINDS]
        f = q.get('updated_at', [None])[0]
        if f: data = [r for r in data if r['updated_at'] >= f[4:]]
        off = int(q.get('offset', [0])[0]); lim = int(q.get('limit', [1000])[0])
        self.reply(200, data[off:off+lim])
    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0) or 0)) or b'{}')
        if u.path == '/auth/v1/signup' and 'email' not in body:   # invitado (acceso con PIN)
            anon_n[0] += 1; t = f'anon:{anon_n[0]}'
            return self.reply(200, {'access_token': 'tok:' + t, 'refresh_token': 'ref:' + t, 'expires_in': 3600, 'user': {'email': '', 'is_anonymous': True}})
        if u.path == '/auth/v1/signup':
            users[body['email'].lower()] = body['password']
            return self.reply(200, {'access_token': 'tok:' + body['email'].lower(), 'refresh_token': 'ref:' + body['email'].lower(), 'expires_in': 3600, 'user': {'email': body['email'].lower()}})
        if u.path == '/auth/v1/token':
            if q.get('grant_type') == ['password']:
                e = body['email'].lower()
                if users.get(e) != body['password']: return self.reply(400, {'error_description': 'Invalid login credentials'})
            else: e = body['refresh_token'][4:]
            user = {'email': '', 'is_anonymous': True} if e.startswith('anon:') else {'email': e}
            return self.reply(200, {'access_token': 'tok:' + e, 'refresh_token': 'ref:' + e, 'expires_in': 3600, 'user': user})
        if self.bad_jwt(): return
        if u.path.startswith('/rest/v1/rpc/'): return self.reply(200, self.rpc(u.path.rsplit('/', 1)[1], body))
        if u.path.endswith('/usar_members'):
            for m in body: members[m['email']] = m
            return self.reply(201)
        email, role = self.who()
        if self.denied(email): return
        if role == 'miembro' and any(r['kind'] in JEFE_KINDS for r in body): return self.reply(403, {'message': 'permiso denegado'})
        # Como supabase.sql: con usuario, solo un jefe da de alta o elimina material, cajas, consumibles y vehículos
        if email and role != 'jefe' and any(r['kind'] in FLOTA_KINDS and (r.get('deleted') or (r['kind'], r['id']) not in rows) for r in body):
            return self.reply(403, {'code': '42501', 'message': 'new row violates row-level security policy for table "usar_records"'})
        with lock:
            for r in body:
                r['updated_at'] = datetime.now(timezone.utc).isoformat()
                rows[(r['kind'], r['id'])] = r
        self.reply(201)
    def do_PUT(self):
        # Cambiar la contraseña del usuario con sesión
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0) or 0)) or b'{}')
        email, _ = self.who()
        if urlparse(self.path).path != '/auth/v1/user' or not email: return self.reply(401, {'msg': 'sin sesión'})
        users[email] = body['password']; self.reply(200, {'email': email})
    def do_DELETE(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path.endswith('/usar_members'): members.pop(q.get('email', [''])[0][3:], None)
        self.reply(204)
ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('PORT_MOCK', 54321))), H).serve_forever()
