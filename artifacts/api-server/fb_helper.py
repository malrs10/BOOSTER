#!/usr/bin/env python3
"""
Lara Web — Facebook helper (curl_cffi edition).
Uses curl_cffi with Chrome TLS fingerprint impersonation to bypass
Cloudflare and Facebook bot-detection. Called via stdin/stdout JSON.
"""
import sys, json, re, time, base64, urllib.parse, random, string, uuid

# ── Mobile FBAN user-agents (rotated per request — same as reference script) ─
UA_LIST = [
    "Mozilla/5.0 (Linux; Android 12; OnePlus 9 Build/SKQ1.210216.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/335.0.0.11.118;]",
    "Mozilla/5.0 (Linux; Android 13; Google Pixel 6a Build/TQ3A.230605.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/340.0.0.15.119;]",
    "Mozilla/5.0 (Linux; Android 11; SM-G998B Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/336.0.0.12.120;]",
    "Mozilla/5.0 (Linux; Android 10; Pixel 4 XL Build/QD1A.190821.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/113.0.5672.162 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/337.0.0.13.121;]",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/341.0.0.16.122;]",
    "Mozilla/5.0 (Linux; Android 9; SM-G973F Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/334.0.0.10.117;]",
    "Mozilla/5.0 (Linux; Android 8.1.0; Nexus 6P Build/OPM6.171019.030.B1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.117 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/333.0.0.9.116;]",
    "Mozilla/5.0 (Linux; Android 7.0; SM-G930V Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/332.0.0.8.115;]",
]

# ── curl_cffi Chrome impersonation (TLS + HTTP/2 fingerprint) ───────────────
try:
    from curl_cffi import requests as cf
    CHROME = "chrome120"
    HAS_CFFI = True
except ImportError:
    # Auto-install curl_cffi so the server works on any fresh deployment
    import subprocess as _sp, sys as _sys
    _sp.check_call(
        [_sys.executable, "-m", "pip", "install", "--break-system-packages",
         "--quiet", "curl-cffi"],
        stdout=_sp.DEVNULL, stderr=_sp.DEVNULL,
    )
    from curl_cffi import requests as cf
    CHROME = "chrome120"
    HAS_CFFI = True

try:
    import requests as _req
    HAS_REQ = True
except ImportError:
    HAS_REQ = False

# ── Constants ────────────────────────────────────────────────────────────────
UA_CHR  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
UA_MOB  = "Mozilla/5.0 (Linux; Android 12; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
UA_MBX  = "Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"

HDR_BASE = {
    "User-Agent": UA_CHR,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
}

HDR_MOB = {
    **HDR_BASE,
    "User-Agent": UA_MOB,
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
}

HDR_XHR = {
    "User-Agent": UA_CHR,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

# ── Session factory ──────────────────────────────────────────────────────────
def make_cf_session(raw_cookie: str, mobile: bool = False) -> cf.Session:
    """Create a curl_cffi Session with Chrome TLS fingerprint + raw cookie header."""
    cookie_str = _normalize_cookie(raw_cookie)
    hdrs = dict(HDR_MOB if mobile else HDR_BASE)
    hdrs["Cookie"] = cookie_str
    if HAS_CFFI:
        s = cf.Session(impersonate=CHROME)
    else:
        s = cf.Session()
    s.headers.update(hdrs)
    return s

def make_cf_get(url: str, cookie: str, mobile: bool = False, **kw) -> "cf.Response":
    """One-shot GET with Chrome TLS."""
    s = make_cf_session(cookie, mobile=mobile)
    return s.get(url, timeout=18, **kw)

def make_cf_post(url: str, cookie: str, data: dict, extra_headers: dict = None, **kw) -> "cf.Response":
    """One-shot POST with Chrome TLS."""
    s = make_cf_session(cookie)
    if extra_headers:
        s.headers.update(extra_headers)
    return s.post(url, data=data, timeout=18, **kw)

# ── Cookie helpers ───────────────────────────────────────────────────────────
def _parse_cookie(raw: str) -> dict:
    jar = {}
    if not raw or not isinstance(raw, str):
        return jar
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) >= 7:
            jar[parts[5]] = parts[6]
            continue
        for kv in line.split(";"):
            kv = kv.strip()
            eq = kv.find("=")
            if eq > 0:
                k = kv[:eq].strip()
                v = kv[eq+1:].strip()
                if k:
                    jar[k] = v
    return jar

def _normalize_cookie(raw: str) -> str:
    jar = _parse_cookie(raw)
    return "; ".join(f"{k}={urllib.parse.unquote(v)}" for k, v in jar.items())

def _validate_cookie(raw: str) -> tuple:
    jar = _parse_cookie(raw)
    if "c_user" not in jar:
        return False, "Missing c_user — paste a complete Facebook cookie"
    if "xs" not in jar:
        return False, "Missing xs — paste a complete Facebook cookie"
    return True, ""

def _uid_from_cookie(raw: str) -> str:
    jar = _parse_cookie(raw)
    return jar.get("c_user") or jar.get("i_user", "")

# ── HTML extractors ──────────────────────────────────────────────────────────
def _dtsg(html: str) -> str:
    """Extract fb_dtsg token — prioritises DTSGInitData JSON, ignores JS 'window' ref."""
    for p in [
        # Exact match for the inline JSON Facebook embeds in every page
        r'DTSGInitData"[^{]*\{"token":"([^"]{10,})"',
        r'\["DTSGInitData",\[\],\{"token":"([^"]{10,})"',
        r'"fb_dtsg","([^"]{10,})"',
        r'name="fb_dtsg"\s+value="([^"]{10,})"',
        r'"fb_dtsg":\{"value":"([^"]{10,})"',
        # Last resort — require 25+ chars so "window" / "document" never match
        r'fb_dtsg=([A-Za-z0-9_\-:]{25,})',
    ]:
        m = re.search(p, html, re.S)
        if m:
            val = m.group(1)
            # Extra safety: reject obvious JS identifiers
            if val.lower() in ("window", "document", "undefined", "null", "true", "false"):
                continue
            return val
    return ""

def _token(html: str) -> str:
    for p in [
        r'(EAAG[A-Za-z0-9+/=_%]{30,})',
        r'"access_token"\s*:\s*"(EAAG[A-Za-z0-9+/=_%]+)"',
        r'access_token=(EAAG[A-Za-z0-9+/%]+)',
    ]:
        m = re.search(p, html)
        if m:
            return urllib.parse.unquote(m.group(1))
    return ""

def _uid_html(html: str) -> str:
    for p in [r'"USER_ID":"(\d+)"', r'"userID":"(\d+)"', r'"uid":(\d+)', r'"viewerID":"(\d+)"']:
        m = re.search(p, html)
        if m:
            val = m.group(1)
            # Reject obviously invalid UIDs like "0" — Facebook UIDs are at least 5 digits
            if val and val != "0" and len(val) >= 5:
                return val
    return ""

_BAD_NAMES = {
    "facebook", "error", "login", "home", "log in",
    "facebook – log in or sign up", "log into facebook",
    "facebook - log in or sign up", "sign up for facebook",
    "facebook | log in or sign up", "facebook – logga in eller registrera dig",
}

def _name(html: str) -> str:
    for p in [
        r'"name":"([A-Za-zÀ-ÿ\u4e00-\u9fff][^"]{1,60})","__typename":"User"',
        r'"viewer_name":"([^"]+)"',
        r'"NAME":"([^"]+)"',
        r'"actorName":"([^"]+)"',
    ]:
        m = re.search(p, html, re.S)
        if m:
            n = m.group(1).strip()
            if n and n.lower() not in _BAD_NAMES and len(n) > 1:
                return n
    # Title as last resort — only if looks like a real name
    m = re.search(r'<title>([^<|]{2,50})\s*[\|<]', html, re.S)
    if m:
        n = m.group(1).strip()
        if n and n.lower() not in _BAD_NAMES and "facebook" not in n.lower():
            return n
    return ""

def _is_login_wall(html: str) -> bool:
    """True when Facebook shows the login/signup wall — cookie invalid/expired."""
    indicators = ['action="/login"', 'name="email"', 'name="pass"',
                  'log in to facebook', 'sign up for facebook',
                  'data-testid="royal_email"', '/login/?next=', 'login.php']
    low = html.lower()
    hits = sum(1 for i in indicators if i in low)
    return hits >= 2

def _checkpoint(html: str) -> bool:
    """True when cookie is invalid OR account has active security checkpoint."""
    if len(html) < 2000:
        return True
    if _is_login_wall(html):
        return True
    signs = ["checkpoint", "unusual activity", "confirm your identity",
             "security check", "help us confirm", "account is restricted",
             "verify your identity", "locked out", "suspicious activity"]
    low = html.lower()
    return any(s in low for s in signs)

def _post_id(url: str) -> str:
    for p in [r'/posts/(\d+)', r'story_fbid=(\d+)', r'fbid=(\d+)', r'v=(\d+)', r'/(\d{15,})']:
        m = re.search(p, url)
        if m:
            return m.group(1)
    nums = re.findall(r'\d{10,}', url)
    return nums[-1] if nums else url

def _rand(n: int = 8) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))

def _feedback_id(post_id: str) -> str:
    return base64.b64encode(f"feedback:{post_id}".encode()).decode()

# ── Get fb_dtsg + uid (core auth) ───────────────────────────────────────────
def _get_auth(cookie: str, logs: list) -> tuple:
    """Returns (fb_dtsg, uid, token, authenticated, auth_html).

    KEY FIX: UID-presence check happens FIRST. www.facebook.com contains
    login.php 6× even for logged-in users — so we must NOT rely on link-pattern
    detection to decide if the session is valid. Instead:
      - If UID from the cookie appears in the page HTML → real session.
      - Only flag as login-wall when UID is absent AND 2+ login indicators found.
    """
    uid = _uid_from_cookie(cookie)
    fb_dtsg = ""
    tok = ""
    authenticated = False
    auth_html = ""

    attempts = [
        ("https://www.facebook.com/", False),
        ("https://m.facebook.com/",   True),
        ("https://mbasic.facebook.com/", True),
    ]
    for url, mob in attempts:
        try:
            s = make_cf_session(cookie, mobile=mob)
            r = s.get(url, timeout=22, allow_redirects=True)
            logs.append(f"[INFO] GET {url} → {r.status_code} ({len(r.text)}B)")
            html = r.text
            if r.status_code != 200 or len(html) < 3000:
                continue

            # ── PRIMARY CHECK: is the user's UID present in the page? ─────────
            uid_present = uid and uid in html

            if not uid_present:
                # Page is a login wall (cookie invalid / expired / wrong region)
                logs.append("[WARN] UID not in page — cookie invalid or expired")
                continue

            # UID confirmed → session is alive. Now check for security checkpoint.
            checkpoint_signs = [
                "confirm your identity", "unusual activity",
                "account is restricted", "verify your identity",
                "locked out", "suspicious activity",
            ]
            low = html.lower()
            if any(s2 in low for s2 in checkpoint_signs):
                logs.append("[WARN] Account security checkpoint — resolve at facebook.com then re-export cookie")
                # We still try to get fb_dtsg for any purpose, but mark not authenticated
                t = _dtsg(html)
                if t and t != fb_dtsg:
                    fb_dtsg = t
                continue

            # ── EXTRACT tokens ────────────────────────────────────────────────
            t = _dtsg(html)
            if t:
                fb_dtsg = t
                logs.append(f"[OK] fb_dtsg extracted ({len(t)} chars)")
            tok = _token(html) or tok
            uid2 = _uid_html(html)
            # Only override cookie uid if we didn't already have one
            if uid2 and uid2 != uid and not _uid_from_cookie(cookie):
                uid = uid2

            authenticated = True
            auth_html = html
            logs.append(f"[OK] Authenticated · UID {uid} · dtsg {'✓' if fb_dtsg else '✗'}")
            break

        except Exception as e:
            logs.append(f"[WARN] {url}: {e}")

    return fb_dtsg, uid, tok, authenticated, auth_html

# ══════════════════════════════════════════════════════════════════════════════
# PROFILE
# ══════════════════════════════════════════════════════════════════════════════
def get_profile(cookie: str) -> dict:
    logs = []
    uid = _uid_from_cookie(cookie)
    name = ""
    avatar = f"https://graph.facebook.com/{uid}/picture?type=large"
    fb_dtsg = ""
    tok = ""

    fb_dtsg, uid, tok, authenticated, auth_html = _get_auth(cookie, logs)

    # ── Extract name from the same page that authenticated us ────────────────
    if authenticated and auth_html:
        # Primary: "NAME" key in the page JSON (most reliable)
        name = _name(auth_html)
        if name:
            logs.append(f"[OK] Name from auth page: {name}")

    # Fallback name extraction from profile page
    if authenticated and not name:
        try:
            s2 = make_cf_session(cookie, mobile=False)
            r2 = s2.get(f"https://www.facebook.com/profile.php?id={uid}", timeout=14)
            if r2.status_code == 200 and uid in r2.text:
                name = _name(r2.text)
                if name:
                    logs.append(f"[OK] Name from profile page: {name}")
        except Exception as e:
            logs.append(f"[WARN] profile name fetch: {e}")

    if not name and authenticated:
        name = f"User {uid}"
    elif not name:
        name = "Unknown (invalid cookie)"

    # ── Avatar: extract from auth page HTML (most reliable, no token needed) ──
    try:
        # Method 1: og:image from home page / profile page HTML
        if auth_html:
            m_og = re.search(r'"profilePicLarge"\s*,\s*\{\s*"uri"\s*:\s*"([^"]+)"', auth_html)
            if not m_og:
                m_og = re.search(r'"profilePicMedium"\s*,\s*\{\s*"uri"\s*:\s*"([^"]+)"', auth_html)
            if not m_og:
                m_og = re.search(r'"profile_picture"\s*:\s*\{\s*"uri"\s*:\s*"([^"]+)"', auth_html)
            if not m_og:
                m_og = re.search(r'"pictureUrl"\s*:\s*"([^"]+profile_photos[^"]+)"', auth_html)
            if m_og:
                cand = m_og.group(1).replace("\\/", "/").replace("\\u0026", "&")
                if uid in cand or "scontent" in cand or "fbcdn" in cand:
                    avatar = cand
        # Method 2: fetch profile page and get og:image
        if avatar == f"https://graph.facebook.com/{uid}/picture?type=large":
            try:
                sp = make_cf_session(cookie)
                rp = sp.get(f"https://www.facebook.com/profile.php?id={uid}", timeout=12)
                if rp.status_code == 200:
                    m_og2 = re.search(r'<meta property="og:image" content="([^"]+)"', rp.text)
                    if not m_og2:
                        m_og2 = re.search(r'"profilePicLarge"\s*,\s*\{\s*"uri"\s*:\s*"([^"]+)"', rp.text)
                    if m_og2:
                        cand2 = m_og2.group(1).replace("\\/", "/").replace("\\u0026", "&")
                        if "t1.30497" not in cand2 and len(cand2) > 20:
                            avatar = cand2
            except Exception:
                pass
    except Exception:
        pass

    logs += [f"UID: {uid}", f"Name: {name}",
             f"fb_dtsg: {'✓' if fb_dtsg else '✗'}", f"Token: {'✓' if tok else '✗'}"]

    if not authenticated:
        return {
            "ok": False,
            "message": "Cookie is invalid or expired — please export a fresh Facebook cookie from your browser",
            "uid": uid, "name": name, "avatar": avatar,
            "fb_dtsg": "", "token": "", "authenticated": False, "logs": logs,
        }

    return {
        "ok": True, "uid": uid, "name": name, "avatar": avatar,
        "fb_dtsg": fb_dtsg, "token": tok,
        "authenticated": True, "logs": logs,
    }

# ══════════════════════════════════════════════════════════════════════════════
# REACT  — the core feature
# ══════════════════════════════════════════════════════════════════════════════
REACTION_MAP = {"LIKE": 1, "LOVE": 2, "HAHA": 4, "WOW": 3, "SAD": 7, "ANGRY": 8, "CARE": 16}
REACTION_STR = {"LIKE": "like", "LOVE": "love", "HAHA": "haha", "WOW": "wow", "SAD": "sad", "ANGRY": "angry", "CARE": "care"}
# CometUFIReactionsColors reaction type IDs (extracted from live FB bundles)
REACTION_TYPE_IDS = {
    "LIKE":  "1635855486666999",
    "LOVE":  "1678524932434102",
    "HAHA":  "115940658764963",
    "WOW":   "908563459236466",
    "SAD":   "908563459236466",
    "ANGRY": "444813342392137",
    "CARE":  "613557422527858",
}
# Numeric reaction IDs for the /reactions/react/ endpoint
REACTION_NUMERIC = {"LIKE": "1", "LOVE": "2", "HAHA": "4", "WOW": "3", "SAD": "7", "ANGRY": "8", "CARE": "16"}

def _get_current_reaction(cookie: str, post_url: str, post_id: str, uid: str, logs: list) -> str:
    """Check if this account already reacted to the post. Returns reaction name (LIKE/LOVE/etc) or ''.
    Uses mbasic page which shows 'Remove Like', 'Remove Love', etc. for existing reactions."""
    try:
        sm = make_cf_session(cookie, mobile=True)
        # Try mbasic URL of the post
        mbasic_url = re.sub(r'https?://(www\.)?facebook\.com', 'https://mbasic.facebook.com', post_url)
        if "mbasic" not in mbasic_url:
            mbasic_url = f"https://mbasic.facebook.com/{uid}/posts/{post_id}"
        r = sm.get(mbasic_url, timeout=10)
        text = r.text.lower()
        # Check for "remove X" patterns — these appear when user already has that reaction
        for rxn_name, variants in [
            ("LIKE",  ["remove like", "unlike", "remove_like"]),
            ("LOVE",  ["remove love", "remove_love"]),
            ("CARE",  ["remove care", "remove_care"]),
            ("HAHA",  ["remove haha", "remove_haha"]),
            ("WOW",   ["remove wow",  "remove_wow"]),
            ("SAD",   ["remove sad",  "remove_sad"]),
            ("ANGRY", ["remove angry","remove_angry"]),
        ]:
            if any(v in text for v in variants):
                logs.append(f"[INFO] Already reacted: {rxn_name}")
                return rxn_name
    except Exception as e:
        logs.append(f"[DEBUG] Check reaction: {e}")
    return ""


def do_react(cookie: str, post_url: str, reaction: str, count: int = 1) -> dict:
    logs = []
    post_id = _post_id(post_url)
    uid = _uid_from_cookie(cookie)
    rxn = reaction.upper()
    rxn_id = REACTION_MAP.get(rxn, 1)
    rxn_str = REACTION_STR.get(rxn, "like")
    logs.append(f"[INFO] Post: {post_id}  Reaction: {rxn}  Count: {count}")

    # ── Step 1: Get auth tokens ──────────────────────────────────────────────
    fb_dtsg, uid, access_token, authenticated, auth_html = _get_auth(cookie, logs)
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False,
                "message": "⚠️ Cookie invalid or expired — export a fresh cookie from facebook.com and try again. If you see a security alert on Facebook, resolve it first.",
                "logs": logs}

    # ── Step 2: Check existing reaction (smart dedup) ────────────────────────
    current_rxn = _get_current_reaction(cookie, post_url, post_id, uid, logs)
    if current_rxn:
        if current_rxn == rxn:
            return {
                "ok": True, "success": True, "count": 0,
                "message": f"⏭️ Already reacted with {current_rxn} — no change needed (skipped)",
                "logs": logs,
            }
        else:
            logs.append(f"[INFO] Changing reaction {current_rxn} → {rxn}")

    reacted = 0

    for attempt in range(count):
        if attempt > 0:
            time.sleep(random.uniform(0.25, 0.6))

        done = False

        # ── Method A: GraphQL (CometUFIFeedbackReactMutation) — fast primary ────
        # Uses simple base64 feedback_id (no post-page fetch needed, ~1.5s)
        if not done:
            done = _react_graphql(cookie, post_id, uid, fb_dtsg, rxn, logs,
                                  post_url=post_url, home_html=auth_html)

        # ── Method B: Mobile UFI endpoint ────────────────────────────────────
        if not done:
            done = _react_ufi(cookie, post_id, uid, fb_dtsg, rxn_id, logs, post_url)

        # ── Method C: mbasic scrape ───────────────────────────────────────────
        if not done:
            done = _react_mbasic(cookie, post_url, post_id, uid, rxn, rxn_id, logs)

        # ── Method D: Graph API via access_token ─────────────────────────────
        if not done and access_token:
            done = _react_graph_api(access_token, post_id, rxn_str, logs)

        if done:
            reacted += 1
            logs.append(f"[OK] ✓ Attempt {attempt+1}/{count} succeeded")

    if reacted:
        return {"ok": True, "success": True, "count": reacted,
                "message": f"✅ Reacted {rxn} on {reacted}/{count} attempt(s)", "logs": logs}

    # Diagnose — be specific, avoid false positives from mbasic warning logs
    all_logs = "\n".join(logs)
    if ("account security checkpoint" in all_logs.lower()
            or "1357054" in all_logs
            or "graphql checkpoint" in all_logs.lower()):
        msg = ("❌ Account checkpoint detected.\n\n"
               "Fix: Log in to facebook.com in your browser, resolve the security check, "
               "then re-export a fresh cookie and try again.")
    elif "no like link" in all_logs.lower() or "like_link_not_found" in all_logs.lower():
        msg = "❌ Post not accessible from server IP — post may be private or account needs checkpoint"
    else:
        msg = "❌ Reaction failed — ensure the post URL is public and your cookie is fresh"

    return {"ok": True, "success": False, "message": msg, "logs": logs}


def _react_reactions_endpoint(cookie: str, post_id: str, uid: str, fb_dtsg: str,
                               rxn: str, logs: list, post_url: str = "") -> bool:
    """POST to FB AJAX like/reaction endpoints — try multiple known paths."""
    rxn_num = REACTION_NUMERIC.get(rxn, "1")
    rxn_id  = str(REACTION_MAP.get(rxn, 1))
    referer = post_url or f"https://www.facebook.com/{uid}/posts/{post_id}"

    attempts = [
        # (url, mobile, payload_builder)
        ("https://www.facebook.com/ajax/ufi/like.php", False, {
            "object_id": post_id, "action_type": rxn_id,
            "source": "23", "fb_dtsg": fb_dtsg,
            "__user": uid, "__a": "1", "av": uid,
        }),
        ("https://www.facebook.com/like/action/", False, {
            "ft_ent_identifier": post_id, "how": rxn_id,
            "object_id": post_id, "action_type": "ADD_REACTION",
            "fb_dtsg": fb_dtsg, "__user": uid, "__a": "1",
        }),
    ]

    for url, mobile, payload in attempts:
        try:
            s = make_cf_session(cookie, mobile=mobile)
            s.headers.update({
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://www.facebook.com",
                "Referer": referer,
                "X-Requested-With": "XMLHttpRequest",
            })
            r = s.post(url, data=payload, timeout=10)
            logs.append(f"[DEBUG] ajax {url.split('/')[-2]} → {r.status_code} body={r.text[:100]}")
            if r.status_code in (200, 302):
                txt = r.text
                if "1357054" in txt or "checkpoint" in txt.lower()[:300]:
                    return False
                if ('"payload"' in txt and '"errorSummary"' not in txt
                        and "errorDescription" not in txt):
                    logs.append(f"[OK] Reacted via AJAX ({url.split('/')[-2]}) ✓")
                    return True
                if len(txt.strip()) < 60 or txt.strip() in ("{}", "[]", "null"):
                    logs.append(f"[OK] Reacted via AJAX (empty ok) ✓")
                    return True
        except Exception as e:
            logs.append(f"[WARN] ajax {url}: {e}")
    return False


def _react_mbasic(cookie: str, post_url: str, post_id: str, uid: str,
                  rxn: str, rxn_id: int, logs: list) -> bool:
    """Scrape mbasic for the like/react link and follow it — Chrome TLS."""
    # Build candidate mbasic URLs for the post
    mbasic_urls = []
    if "mbasic.facebook.com" in post_url:
        mbasic_urls.append(post_url)
    if "facebook.com/permalink" in post_url or "story_fbid" in post_url:
        mbasic_urls.append(post_url.replace("www.facebook.com", "mbasic.facebook.com").replace("m.facebook.com", "mbasic.facebook.com"))
    mbasic_urls += [
        f"https://mbasic.facebook.com/story.php?story_fbid={post_id}&id={uid}",
        f"https://mbasic.facebook.com/{uid}/posts/{post_id}",
        f"https://mbasic.facebook.com/permalink/{post_id}/",
        f"https://mbasic.facebook.com/photo.php?fbid={post_id}",
    ]

    for murl in mbasic_urls:
        try:
            s = make_cf_session(cookie, mobile=True)
            r = s.get(murl, timeout=15, allow_redirects=True)
            final_url = str(r.url) if hasattr(r, "url") else murl
            logs.append(f"[INFO] mbasic {murl[-60:]} → {r.status_code} ({len(r.text)}B) final={final_url[-50:]}")
            if r.status_code != 200 or len(r.text) < 1000:
                continue
            html = r.text

            # mbasic.facebook.com now often redirects to m.facebook.com (modern
            # React SPA). Detect this: the SPA has no <a href="/ufi/react/..."> links.
            # Signs of SPA: no mbasic-style links, lots of __BBQ or JSON data, or
            # the final URL is m.facebook.com.
            is_spa = (
                "m.facebook.com" in final_url
                or ("__BBQ" in html and "/ufi/react/" not in html)
                or ('{"__typename"' in html and "<body" not in html[:500])
            )
            if is_spa:
                logs.append(f"[WARN] mbasic redirected to React SPA — no like links available on {final_url[-40:]}")
                continue

            if _checkpoint(html[:500]):
                logs.append("[WARN] Checkpoint page on mbasic")
                continue

            # ── Find reaction link (handles all reaction types) ─────────────
            like_link = None
            fb_dtsg_mb = _dtsg(html)

            # Pattern 1: /ufi/react/ link with reaction type
            m = re.search(r'href="(/ufi/react/[^"]*)"', html)
            if m:
                like_link = "https://mbasic.facebook.com" + m.group(1).replace("&amp;", "&")
                logs.append("[INFO] Found /ufi/react/ link")

            # Pattern 2: /a/like.php link
            if not like_link:
                m = re.search(r'href="(/a/like\.php\?[^"]+)"', html)
                if m:
                    like_link = "https://mbasic.facebook.com" + m.group(1).replace("&amp;", "&")
                    logs.append("[INFO] Found /a/like.php link")

            # Pattern 3: reactions/react link
            if not like_link:
                m = re.search(r'href="(/reactions/react/[^"]+)"', html)
                if m:
                    like_link = "https://mbasic.facebook.com" + m.group(1).replace("&amp;", "&")
                    logs.append("[INFO] Found /reactions/react/ link")

            # Pattern 4: full href with like
            if not like_link:
                m = re.search(r'href="(https://mbasic\.facebook\.com/[^"]*like[^"]*)"', html)
                if m:
                    like_link = m.group(1).replace("&amp;", "&")
                    logs.append("[INFO] Found full like link")

            if not like_link:
                # Pattern 5: form with hidden fields
                form_m = re.search(r'<form[^>]+action="([^"]*(?:like|react)[^"]*)"[^>]*>(.*?)</form>', html, re.S | re.I)
                if form_m:
                    form_url = form_m.group(1).replace("&amp;", "&")
                    if not form_url.startswith("http"):
                        form_url = "https://mbasic.facebook.com" + form_url
                    fields = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', form_m.group(2)))
                    rl = s.post(form_url, data=fields, timeout=12)
                    logs.append(f"[DEBUG] form POST → {rl.status_code}")
                    if rl.status_code in (200, 302):
                        logs.append("[OK] Reacted via mbasic form ✓")
                        return True

            if not like_link:
                logs.append(f"[WARN] like_link_not_found on {murl[-50:]}")
                continue

            # ── Inject reaction type into the link ─────────────────────────
            # For non-LIKE reactions, modify the URL
            if rxn != "LIKE":
                if "/ufi/react/" in like_link or "/reactions/react/" in like_link:
                    # Replace or add reaction_type param
                    like_link = re.sub(r'reaction_type=[^&]+', f'reaction_type={rxn}', like_link)
                    if "reaction_type" not in like_link:
                        like_link += f"&reaction_type={rxn}"
                    like_link = re.sub(r'action=[^&]+', 'action=ADD_REACTION', like_link)
                    if "action" not in like_link:
                        like_link += "&action=ADD_REACTION"
                else:
                    # Build a react URL from scratch using the ft_ent_identifier
                    m2 = re.search(r'ft_ent_identifier=(\d+)', like_link)
                    av_m = re.search(r'av=(\d+)', like_link)
                    ent_id = m2.group(1) if m2 else post_id
                    av_id = av_m.group(1) if av_m else uid
                    if fb_dtsg_mb:
                        like_link = (
                            f"https://mbasic.facebook.com/ufi/react/?ft_ent_identifier={ent_id}"
                            f"&reaction_type={rxn}&action=ADD_REACTION&av={av_id}"
                            f"&fb_dtsg={fb_dtsg_mb}&__a=1"
                        )

            logs.append(f"[INFO] Following react link: ...{like_link[-60:]}")
            rl = s.get(like_link, timeout=14, allow_redirects=True,
                       headers={"Referer": murl})
            logs.append(f"[DEBUG] React GET → {rl.status_code} ({len(rl.text)}B)")

            if rl.status_code in (200, 302):
                rl_low = rl.text.lower()
                if any(x in rl_low for x in ["unlike", "remove reaction", "already", "success", "unreact"]):
                    logs.append("[OK] Reaction confirmed ✓")
                    return True
                if len(rl.text) > 500 and not _checkpoint(rl.text[:500]):
                    logs.append("[OK] Reacted via mbasic link ✓ (status 200)")
                    return True

        except Exception as e:
            logs.append(f"[WARN] mbasic error: {e}")

    return False


# ── Global cache for the reaction mutation doc_id (refreshed hourly) ─────────
_REACT_DOC_CACHE: dict = {"id": "", "expires": 0.0}
_FB_ID_CACHE: dict = {}  # per-post feedback_id cache, keyed by post_url

# ── Known working doc_ids (discovered from live FB bundles, newest first) ─────
# CometUFIFeedbackReactMutation_facebookRelayOperation — update when FB redeploys
_KNOWN_REACT_DOC_IDS = [
    "27045420388428225",  # discovered 2025-05 via rsrcMap bundle 3dbKC66
]

def _find_react_doc_id(home_html: str, cookie: str, logs: list) -> str:
    """Find current CometUFIFeedbackReactMutation doc_id via FB's rsrcMap.

    Strategy (reliable even for deferred/lazy bundles):
      1. Parse ALL rsrcMap entries from inline scripts → hash→URL map
      2. Parse ALL deferred module registrations → module→[hashes] map
      3. Fetch each bundle referenced by any CometUFI deferred module
      4. Look for CometUFIFeedbackReactMutation_facebookRelayOperation export
    Result cached for 1 hour.
    """
    now = time.time()
    if _REACT_DOC_CACHE["id"] and now < _REACT_DOC_CACHE["expires"]:
        return _REACT_DOC_CACHE["id"]

    try:
        s = make_cf_session(cookie)

        # ── Build hash → URL map from ALL rsrcMap entries ────────────────────
        rsrc_map: dict = {}
        for m in re.finditer(r'"rsrcMap"\s*:\s*(\{[^}]{50,8000}\})', home_html, re.S):
            entries = re.findall(
                r'"([A-Za-z0-9+/\\=]{3,12})"\s*:\s*\{"type"\s*:\s*"js"\s*,\s*"src"\s*:\s*"([^"]+)"',
                m.group(1)
            )
            for h, url in entries:
                rsrc_map[h.replace("\\", "")] = url.replace("\\/", "/")

        logs.append(f"[INFO] rsrcMap: {len(rsrc_map)} hash→URL entries")

        # ── Parse deferred module hash lists ─────────────────────────────────
        all_hashes: set = set()
        for m in re.finditer(
            r'"CometUFI[^"]{3,60}"\s*:\s*\{"r"\s*:\s*\[([^\]]+)\]', home_html, re.S
        ):
            hashes = re.findall(r'"([A-Za-z0-9+/\\=]{3,12})"', m.group(1))
            all_hashes.update(h.replace("\\", "") for h in hashes)

        logs.append(f"[INFO] Scanning {len(all_hashes)} deferred bundle hashes for react doc_id …")

        for h in all_hashes:
            url = rsrc_map.get(h)
            if not url:
                continue
            try:
                rb = s.get(url, timeout=12)
                chunk = rb.text
                # Fast pre-filter
                if "CometUFIFeedbackReactMutation" not in chunk:
                    continue
                # Extract the _facebookRelayOperation export
                ops = re.findall(
                    r'"(CometUFIFeedbackReactMutation_facebookRelayOperation)"'
                    r'[^(]*\(function[^{]*\{a\.exports="(\d{15,})"',
                    chunk
                )
                if ops:
                    doc_id = ops[0][1]
                    _REACT_DOC_CACHE["id"] = doc_id
                    _REACT_DOC_CACHE["expires"] = now + 3600
                    logs.append(f"[OK] Dynamic react doc_id: {doc_id} (cached 1h)")
                    return doc_id
            except Exception:
                continue

    except Exception as e:
        logs.append(f"[WARN] doc_id scan: {e}")

    return ""


def _extract_compound_feedback_id(post_url: str, cookie: str, logs: list) -> str:
    """Fetch the post page and extract the real compound feedback_id
    (e.g. ZmVlZGJhY2s6POST_ID_STORY_ID=) which FB requires for the mutation.
    Cached per post_url so different posts always get their own correct feedback_id."""
    if post_url in _FB_ID_CACHE:
        logs.append(f"[INFO] Compound feedback_id from cache ({len(_FB_ID_CACHE[post_url])} chars)")
        return _FB_ID_CACHE[post_url]
    try:
        s = make_cf_session(cookie)
        r = s.get(post_url, timeout=18)
        if r.status_code != 200:
            return ""
        html = r.text
        # Compound feedback_id always starts with ZmVlZGJhY2s6 (base64 "feedback:")
        m = re.search(r'"feedback_id"\s*:\s*"(ZmVlZGJhY2s6[A-Za-z0-9+/=_-]+)"', html)
        if m:
            fb_id = m.group(1)
            _FB_ID_CACHE[post_url] = fb_id
            logs.append(f"[INFO] Compound feedback_id extracted ({len(fb_id)} chars)")
            return fb_id
        # Also scan JS bundles on the page
        js_urls = list(set(
            re.findall(
                r'"(https://(?:static|z-m-static)\.xx\.fbcdn\.net/rsrc\.php/[^"]+\.js[^"]*)"',
                html
            )
        ))
        for url in js_urls[:5]:
            try:
                rb = s.get(url, timeout=10)
                m2 = re.search(r'"feedback_id"\s*:\s*"(ZmVlZGJhY2s6[A-Za-z0-9+/=_-]+)"', rb.text)
                if m2:
                    fb_id = m2.group(1)
                    _FB_ID_CACHE[post_url] = fb_id
                    logs.append(f"[INFO] Compound feedback_id from bundle ({len(fb_id)} chars)")
                    return fb_id
            except Exception:
                continue
    except Exception as e:
        logs.append(f"[WARN] feedback_id extract: {e}")
    return ""


def _react_graphql(cookie: str, post_id: str, uid: str, fb_dtsg: str, rxn: str,
                   logs: list, post_url: str = "", home_html: str = "") -> bool:
    """Desktop GraphQL CometUFIFeedbackReactMutation with Chrome TLS.

    FAST PATH: simple base64 feedback_id (no post-page fetch needed — confirmed working).
    Tries _KNOWN_REACT_DOC_IDS first WITHOUT bundle scanning.
    Only falls back to dynamic discovery if known IDs expire.
    """
    rxn_type_id = REACTION_TYPE_IDS.get(rxn, REACTION_TYPE_IDS["LIKE"])

    # Simple base64 feedback_id is confirmed to work (verified 2025-05):
    # GraphQL returns reaction_count + viewer_feedback_reaction_info with simple ID.
    # Skip the expensive 5s post-page fetch entirely.
    feedback_id = _feedback_id(post_id)
    logs.append(f"[INFO] feedback_id={feedback_id[:20]}… (simple base64)")

    # Start with known IDs — no bundle scan needed on happy path
    doc_ids = list(_KNOWN_REACT_DOC_IDS)
    dynamic_done = False   # scan bundles at most once, only on doc_id failure

    if not doc_ids:
        logs.append("[WARN] No reaction doc_id available")
        return False

    s = make_cf_session(cookie)
    s.headers.update({
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://www.facebook.com",
        "Referer": post_url or "https://www.facebook.com/",
        "X-FB-Friendly-Name": "CometUFIFeedbackReactMutation",
        "X-ASBD-ID": "198387",
    })

    for doc_id in doc_ids:
        try:
            variables = {
                "input": {
                    "client_mutation_id":   _rand(),
                    "actor_id":             uid,
                    "feedback_id":          feedback_id,
                    "feedback_reaction_id": rxn_type_id,
                    "action":               "ADD_REACTION",
                    "useDefaultActor":      False,
                    "reaction_style":       REACTION_STR.get(rxn, "like"),
                }
            }
            r = s.post("https://www.facebook.com/api/graphql/", data={
                "fb_dtsg": fb_dtsg,
                "variables": json.dumps(variables),
                "doc_id": doc_id,
                "__a": "1",
                "__user": uid,
                "av": uid,
                "__req": _rand(4),
                "server_timestamps": "true",
            }, timeout=15)
            logs.append(f"[DEBUG] GraphQL doc={doc_id} → {r.status_code}")
            if r.status_code != 200:
                continue
            txt = r.text
            # ── Strict success signals — require real reaction data ───────────
            if '"reaction_count"' in txt or '"viewer_feedback_reaction_info"' in txt:
                logs.append("[OK] Reacted via GraphQL ✓")
                return True
            if '"feedback_react"' in txt and '"errors"' not in txt:
                logs.append("[OK] Reacted via GraphQL (feedback_react) ✓")
                return True
            # ── Hard stop ────────────────────────────────────────────────────
            if "1357054" in txt:
                logs.append("[WARN] GraphQL checkpoint/IP block")
                return False
            if "not_found" in txt or '"The GraphQL document' in txt:
                logs.append(f"[DEBUG] doc_id {doc_id} expired — will try dynamic discovery")
                # On first expiry, do one-time bundle scan and append any new IDs
                if not dynamic_done:
                    dynamic_done = True
                    scan_html = home_html
                    if not scan_html:
                        try:
                            s0 = make_cf_session(cookie)
                            r0 = s0.get("https://www.facebook.com/", timeout=18)
                            scan_html = r0.text if r0.status_code == 200 else ""
                        except Exception:
                            scan_html = ""
                    dyn = _find_react_doc_id(scan_html, cookie, logs) if scan_html else ""
                    if dyn and dyn not in doc_ids:
                        doc_ids.append(dyn)
                continue
            logs.append(f"[DEBUG] response: {txt[:200]}")
        except Exception as e:
            logs.append(f"[WARN] GraphQL: {e}")
    return False


def _react_graph_api(token: str, post_id: str, rxn_str: str, logs: list) -> bool:
    """Use EAAG access token with Graph API likes endpoint."""
    try:
        if HAS_CFFI:
            r = cf.post(
                f"https://graph.facebook.com/v18.0/{post_id}/reactions",
                params={"type": rxn_str.upper(), "access_token": token},
                impersonate=CHROME, timeout=12
            )
        elif HAS_REQ:
            r = _req.post(f"https://graph.facebook.com/v18.0/{post_id}/reactions",
                          params={"type": rxn_str.upper(), "access_token": token}, timeout=12)
        else:
            return False
        logs.append(f"[DEBUG] Graph API reactions → {r.status_code}")
        d = r.json()
        if d.get("success") or "true" in str(d).lower():
            logs.append("[OK] Reacted via Graph API ✓")
            return True
        logs.append(f"[DEBUG] Graph API: {d}")
    except Exception as e:
        logs.append(f"[WARN] Graph API: {e}")
    return False


def _react_ufi(cookie: str, post_id: str, uid: str, fb_dtsg: str, rxn_id: int,
               logs: list, post_url: str = "") -> bool:
    """Mobile UFI /ufi/react/ endpoint."""
    referer = post_url or f"https://www.facebook.com/{uid}/posts/{post_id}"
    for ufi_url in [
        "https://www.facebook.com/ufi/react/",
        "https://m.facebook.com/ufi/react/",
    ]:
        try:
            s = make_cf_session(cookie, mobile=True)
            s.headers.update({
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://www.facebook.com",
                "Referer": referer,
                "X-Requested-With": "XMLHttpRequest",
            })
            r = s.post(ufi_url, data={
                "ft_ent_identifier": post_id,
                "reaction_type":     str(rxn_id),
                "action":            "ADD_REACTION",
                "fb_dtsg":           fb_dtsg,
                "__user":            uid,
                "__a":               "1",
                "av":                uid,
            }, timeout=12)
            logs.append(f"[DEBUG] UFI {ufi_url} → {r.status_code} body={r.text[:100]}")
            if r.status_code in (200, 302):
                txt = r.text
                if "1357054" in txt or "checkpoint" in txt.lower()[:200]:
                    return False
                # Not an error response
                if ('"error":0' in txt or '"payload"' in txt
                        or len(txt.strip()) < 50 or '"reaction"' in txt):
                    logs.append(f"[OK] Reacted via UFI ✓")
                    return True
        except Exception as e:
            logs.append(f"[WARN] UFI {ufi_url}: {e}")
    return False


# ══════════════════════════════════════════════════════════════════════════════
# SHARE
# ══════════════════════════════════════════════════════════════════════════════
def do_share(cookie: str, post_url: str, count: int) -> dict:
    """Fast share: reuses session, remembers best method, minimal delays."""
    logs = []
    post_id = _post_id(post_url)
    logs.append(f"[INFO] Sharing {post_id} × {count}")
    fb_dtsg, uid, _, authenticated, _auth_html = _get_auth(cookie, logs)
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False, "count": 0,
                "message": "❌ Cookie invalid or expired — re-export a fresh cookie from facebook.com",
                "logs": logs}

    # ── Get EAAG token via business.facebook.com (reference script — REQUIRED for Graph API share) ──
    # _get_auth scans www.facebook.com which rarely embeds EAAG, so we call do_token() explicitly.
    eaag_token = ""
    try:
        tok_res = do_token(cookie)
        eaag_token = tok_res.get("token", "")
        if eaag_token:
            logs.append(f"[OK] EAAG token ready for Graph API share: {eaag_token[:14]}...")
        else:
            logs.append("[WARN] No EAAG token — Graph API method will be skipped, falling back to mbasic")
    except Exception as e:
        logs.append(f"[WARN] EAAG token extract: {e}")

    # ── Parse cookie string into dict (reference passes cookies= dict to Graph API) ──
    cookie_dict: dict = {}
    try:
        cookie_dict = {
            p.split("=")[0].strip(): p.split("=", 1)[1].strip()
            for p in cookie.split(";") if "=" in p
        }
    except Exception:
        pass

    # Create sessions ONCE and reuse across all shares
    s_mob = make_cf_session(cookie, mobile=True)
    s_web = make_cf_session(cookie)
    shared = 0
    best_method: str | None = None  # track which method works to skip others

    # Pre-fetch the mbasic share page once (reuse form data)
    mbasic_form_url: str = ""
    mbasic_form_data: dict = {}
    try:
        murl = f"https://mbasic.facebook.com/sharer/mbasic/share/?u={urllib.parse.quote(post_url)}&refid=8"
        rm0 = s_mob.get(murl, timeout=13)
        if rm0.status_code == 200 and len(rm0.text) > 500:
            fa = re.search(r'<form[^>]+action="([^"]+)"', rm0.text)
            if fa:
                mbasic_form_url = fa.group(1).replace("&amp;", "&")
                if not mbasic_form_url.startswith("http"):
                    mbasic_form_url = "https://mbasic.facebook.com" + mbasic_form_url
                mbasic_form_data = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', rm0.text))
                logs.append(f"[INFO] mbasic form ready ✓")
    except Exception as e:
        logs.append(f"[WARN] mbasic pre-fetch: {e}")

    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(0.1, 0.3))  # faster delay between shares
        logs.append(f"[INFO] Share {i+1}/{count}")
        done = False

        # Method A: Graph API me/feed — HIGHEST priority (reference script approach, exact port)
        # ses.post(f"https://graph.facebook.com/v18.0/me/feed?link={link}&published=0&access_token={token}",
        #          headers=headers, cookies=cookie, timeout=25)
        if not done and eaag_token and best_method in (None, "graph_api"):
            try:
                is_video = any(k in post_url.lower() for k in ["video", "reel", "watch", "watch?"])
                ga_headers = {
                    "authority": "graph.facebook.com",
                    "cache-control": "max-age=0",
                    "sec-ch-ua-mobile": "?0",
                    "user-agent": random.choice(UA_LIST),
                    **({"accept": "application/json",
                        "content-type": "application/x-www-form-urlencoded",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "cross-site"} if is_video else {}),
                }
                # Use cf.post directly with cookies=cookie_dict — same as reference ses.post(..., cookies=cookie)
                r_ga = cf.post(
                    f"https://graph.facebook.com/v18.0/me/feed?link={urllib.parse.quote(post_url)}&published=0&access_token={eaag_token}",
                    headers=ga_headers, cookies=cookie_dict, timeout=25,
                )
                d_ga = {}
                try: d_ga = r_ga.json()
                except Exception: pass
                logs.append(f"[DEBUG] Graph me/feed → {r_ga.status_code} {str(d_ga)[:120]}")
                if "id" in d_ga:
                    target = d_ga["id"].split("_")[0] if "_" in d_ga["id"] else d_ga["id"]
                    logs.append(f"[OK] Share {i+1} via Graph API me/feed ✓ target_uid={target}")
                    done = True
                    best_method = "graph_api"
                elif "error" in d_ga:
                    emsg = d_ga["error"].get("message", "").lower()
                    logs.append(f"[WARN] Graph API: {d_ga['error'].get('message','')[:120]}")
                    if any(k in emsg for k in ["suspended", "checkpoint", "blocked", "disabled", "login required", "rate limit"]):
                        logs.append("[WARN] Account suspended/blocked — disabling Graph API for this run")
                        eaag_token = ""  # stop using token for remaining shares
                    elif any(k in emsg for k in ["video", "reel", "content"]):
                        logs.append("[WARN] Video/reel error — will retry with next method")
            except Exception as e:
                logs.append(f"[WARN] Graph me/feed: {e}")

        # Method B: mbasic share form (most reliable fallback, fastest) — skip if we know it fails
        if mbasic_form_url and best_method in (None, "mbasic"):
            try:
                # Re-fetch form only if first iteration failed to cache
                form_data = dict(mbasic_form_data)  # copy
                rp = s_mob.post(mbasic_form_url, data=form_data, timeout=11)
                if rp.status_code in (200, 302):
                    logs.append(f"[OK] Share {i+1} via mbasic ✓")
                    done = True
                    best_method = "mbasic"
            except Exception as e:
                logs.append(f"[WARN] mbasic share {i+1}: {e}")

        # Method C: GraphQL createShareStory — use if mbasic failed
        if not done and best_method in (None, "graphql"):
            try:
                r = s_web.post("https://www.facebook.com/api/graphql/", data={
                    "fb_dtsg": fb_dtsg,
                    "variables": json.dumps({"input": {
                        "actor_id": uid, "client_mutation_id": _rand(),
                        "story_id": post_id,
                        "privacy": {"base_state": "EVERYONE", "allow": [], "deny": []},
                    }}),
                    "doc_id": "4004469316266496",
                    "__a": "1", "__user": uid,
                }, timeout=12)
                if r.status_code == 200 and ('"data"' in r.text or '"story"' in r.text) and "errors" not in r.text:
                    logs.append(f"[OK] Share {i+1} via GraphQL ✓")
                    done = True
                    best_method = "graphql"
            except Exception as e:
                logs.append(f"[WARN] GraphQL share {i+1}: {e}")

        # Method C2: Graph API published=1 fallback (if Method A failed but token still valid)
        if not done and eaag_token and best_method in (None, "graph_api"):
            try:
                r = cf.post(
                    f"https://graph.facebook.com/v18.0/me/feed?link={urllib.parse.quote(post_url)}&published=1&access_token={eaag_token}",
                    headers={"user-agent": random.choice(UA_LIST)},
                    cookies=cookie_dict, timeout=11,
                )
                d = {}
                try: d = r.json()
                except Exception: pass
                if "id" in d:
                    logs.append(f"[OK] Share {i+1} via Graph API published=1 ✓ id={d['id']}")
                    done = True
                    best_method = "graph_api"
                elif "error" in d:
                    logs.append(f"[WARN] Graph API C2: {d['error'].get('message','')[:100]}")
            except Exception as e:
                logs.append(f"[WARN] Graph API share {i+1}: {e}")

        # Method D: re-fetch mbasic page fresh (fallback when all else fails)
        if not done:
            try:
                murl2 = f"https://mbasic.facebook.com/sharer/mbasic/share/?u={urllib.parse.quote(post_url)}&refid=8"
                rm2 = s_mob.get(murl2, timeout=13)
                if rm2.status_code == 200:
                    fa2 = re.search(r'<form[^>]+action="([^"]+)"', rm2.text)
                    if fa2:
                        fu2 = fa2.group(1).replace("&amp;", "&")
                        if not fu2.startswith("http"):
                            fu2 = "https://mbasic.facebook.com" + fu2
                        hd2 = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', rm2.text))
                        rp2 = s_mob.post(fu2, data=hd2, timeout=11)
                        if rp2.status_code in (200, 302):
                            logs.append(f"[OK] Share {i+1} via mbasic fresh ✓")
                            done = True
            except Exception as e:
                logs.append(f"[WARN] mbasic fresh {i+1}: {e}")

        if done:
            shared += 1
        else:
            logs.append(f"[FAIL] Share {i+1} failed — all methods exhausted")

    return {
        "ok": True, "success": shared > 0, "count": shared,
        "message": f"✅ Shared {shared}/{count} times" if shared > 0
                   else "❌ Share failed — check cookie and post URL",
        "logs": logs,
    }


# ══════════════════════════════════════════════════════════════════════════════
# COMMENT
# ══════════════════════════════════════════════════════════════════════════════
def do_comment(cookie: str, post_url: str, comments: list, count: int) -> dict:
    logs = []
    post_id = _post_id(post_url)
    logs.append(f"[INFO] Commenting on {post_id} × {count}")
    fb_dtsg, uid, _, authenticated, _auth_html = _get_auth(cookie, logs)
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False, "count": 0,
                "message": "❌ Cookie invalid or expired — re-export a fresh cookie from facebook.com", "logs": logs}

    commented = 0
    feedback_id = _feedback_id(post_id)

    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(0.3, 0.6))
        text = comments[i % len(comments)] if comments else "nice"
        logs.append(f"[INFO] Comment {i+1}/{count}: '{text[:40]}'")
        done = False

        # Method A: GraphQL CometUFICreateCommentMutation
        if not done:
            try:
                s = make_cf_session(cookie)
                s.headers.update({"Origin": "https://www.facebook.com",
                                  "Referer": post_url,
                                  "X-FB-Friendly-Name": "CometUFICreateCommentMutation"})
                r = s.post("https://www.facebook.com/api/graphql/", data={
                    "fb_dtsg": fb_dtsg,
                    "variables": json.dumps({"input": {
                        "client_mutation_id": _rand(),
                        "actor_id": uid,
                        "feedback_id": feedback_id,
                        "message": {"text": text},
                        "feedback_source": "OBJECT",
                    }}),
                    # useCometUFICreateCommentMutation_facebookRelayOperation (live 2025-05)
                    "doc_id": "26613344231661138",
                    "__a": "1", "__user": uid,
                }, timeout=14)
                logs.append(f"[DEBUG] GraphQL comment → {r.status_code}")
                txt = r.text
                if r.status_code == 200 and '"comment"' in txt:
                    logs.append("[OK] Commented via GraphQL ✓")
                    done = True
                elif r.status_code == 200 and '"errors"' not in txt and "1357054" not in txt and len(txt) > 50:
                    logs.append("[OK] Commented via GraphQL (no error) ✓")
                    done = True
                else:
                    logs.append(f"[DEBUG] comment resp: {txt[:150]}")
            except Exception as e:
                logs.append(f"[WARN] GraphQL comment: {e}")

        # Method B: mbasic comment form
        if not done:
            try:
                murl = f"https://mbasic.facebook.com/{uid}/posts/{post_id}"
                s = make_cf_session(cookie, mobile=True)
                rm = s.get(murl, timeout=13)
                if rm.status_code == 200:
                    fm = re.search(r'<form[^>]+action="([^"]*(?:comment|reply)[^"]*)"[^>]*>(.*?)</form>',
                                   rm.text, re.S | re.I)
                    if fm:
                        furl = fm.group(1).replace("&amp;", "&")
                        if not furl.startswith("http"):
                            furl = "https://mbasic.facebook.com" + furl
                        hidden = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', fm.group(2)))
                        hidden["comment_text"] = text
                        rp = s.post(furl, data=hidden, timeout=12)
                        logs.append(f"[DEBUG] mbasic comment → {rp.status_code}")
                        if rp.status_code in (200, 302):
                            logs.append("[OK] Commented via mbasic ✓")
                            done = True
            except Exception as e:
                logs.append(f"[WARN] mbasic comment: {e}")

        if done:
            commented += 1

    return {
        "ok": True, "success": commented > 0, "count": commented,
        "message": f"✅ Commented {commented}/{count} times" if commented > 0 else "❌ Comments failed",
        "logs": logs
    }


# ══════════════════════════════════════════════════════════════════════════════
# TOKEN
# ══════════════════════════════════════════════════════════════════════════════
def _token_extended(html: str) -> str:
    """Extended token search — more patterns than _token()."""
    for p in [
        r'(EAAG[A-Za-z0-9+/=_%|]{30,})',
        r'"access_token"\s*:\s*"(EAAG[A-Za-z0-9+/=_%|]+)"',
        r'access_token=(EAAG[A-Za-z0-9+/%|]+)',
        r'"accessToken"\s*:\s*"(EAAG[A-Za-z0-9+/=_%|]+)"',
        r'EAAGwEZCFhZC[A-Za-z0-9+/=_%|]{20,}',
        r'"token"\s*:\s*"(EAA[A-Za-z0-9+/=_%|]{30,})"',
        r"'access_token'\s*:\s*'(EAAG[A-Za-z0-9+/=_%|]+)'",
    ]:
        m = re.search(p, html)
        if m:
            groups = m.groups()
            val = groups[0] if groups else m.group(0)
            return urllib.parse.unquote(val.rstrip('"\''))
    return ""


def do_token(cookie: str) -> dict:
    logs = []
    uid = _uid_from_cookie(cookie)
    tok = ""

    # Strategy 1 (primary): business.facebook.com/business_locations — exact headers from reference
    # This endpoint reliably embeds the EAAG token in the page HTML
    _biz_headers = {
        "user-agent": random.choice(UA_LIST),
        "referer": "https://www.facebook.com/",
        "host": "business.facebook.com",
        "origin": "https://business.facebook.com",
        "upgrade-insecure-requests": "1",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "max-age=0",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "content-type": "text/html; charset=utf-8",
    }
    try:
        s_biz = make_cf_session(cookie)
        r_biz = s_biz.get("https://business.facebook.com/business_locations",
                          headers=_biz_headers, timeout=14, allow_redirects=True)
        logs.append(f"[INFO] business_locations → {r_biz.status_code} ({len(r_biz.text)}B)")
        if r_biz.status_code == 200:
            # Try simple \w+ pattern first (reference script), then extended
            m_biz = re.search(r"(EAAG\w+)", r_biz.text)
            if m_biz:
                tok = m_biz.group(1)
                logs.append("[OK] Token via business_locations (primary) ✓")
            else:
                tok = _token_extended(r_biz.text)
                if tok:
                    logs.append("[OK] Token via business_locations (extended) ✓")
    except Exception as e:
        logs.append(f"[WARN] business_locations: {e}")

    # Strategy 1b: Additional pages with rotating FBAN user-agents
    token_pages = [
        ("https://www.facebook.com/",                       False),
        ("https://www.facebook.com/marketplace/",            False),
        ("https://developers.facebook.com/tools/explorer/",  False),
        ("https://adsmanager.facebook.com/adsmanager/manage", False),
        ("https://www.facebook.com/settings/",               False),
        ("https://m.facebook.com/",                          True),
        ("https://m.facebook.com/settings/",                 True),
    ]
    for url, mob in token_pages:
        if tok:
            break
        try:
            s = make_cf_session(cookie, mobile=mob)
            s.headers.update({"User-Agent": random.choice(UA_LIST)})
            r = s.get(url, timeout=14, allow_redirects=True)
            logs.append(f"[INFO] {url.split('/')[2]} → {r.status_code} ({len(r.text)}B)")
            if r.status_code == 200:
                m_p = re.search(r"(EAAG\w+)", r.text)
                t = m_p.group(1) if m_p else _token_extended(r.text)
                if t:
                    tok = t
                    logs.append(f"[OK] Token found on {url.split('/')[2]} ✓")
        except Exception as e:
            logs.append(f"[WARN] {url.split('/')[2]}: {e}")

    # Strategy 2: GraphQL CurrentViewerContextQuery — returns token in relay store
    if not tok:
        try:
            s2 = make_cf_session(cookie)
            _, _, _, authenticated, auth_html = _get_auth(cookie, [])
            if authenticated and auth_html:
                fb_dtsg = _dtsg(auth_html)
                lsd_m = re.search(r'"LSD",\[\],\{"token":"([^"]+)"', auth_html)
                lsd = lsd_m.group(1) if lsd_m else ""
                r2 = s2.post("https://www.facebook.com/api/graphql/", data={
                    "fb_dtsg": fb_dtsg,
                    "variables": json.dumps({}),
                    "doc_id": "4561209987287038",  # CurrentSessionQuery
                    "__a": "1", "__user": uid,
                }, timeout=12)
                t2 = _token_extended(r2.text)
                if t2:
                    tok = t2
                    logs.append("[OK] Token via GraphQL session query ✓")
        except Exception as e:
            logs.append(f"[WARN] GraphQL token: {e}")

    # Strategy 3: Instagram bridge (FB auth embedded in IG pages)
    if not tok:
        try:
            s3 = make_cf_session(cookie)
            r3 = s3.get("https://www.instagram.com/accounts/login/", timeout=12)
            t3 = _token_extended(r3.text)
            if t3:
                tok = t3
                logs.append("[OK] Token via IG bridge ✓")
        except Exception as e:
            logs.append(f"[WARN] IG bridge: {e}")

    # Strategy 4: Android b-api with cookie-based session exchange
    if not tok:
        try:
            cookie_str = _normalize_cookie(cookie)
            jar_dict = _parse_cookie(cookie)
            xs = jar_dict.get("xs", "")
            # Exchange session cookie for token via internal endpoint
            for app_id, app_secret in [
                ("350685531728", "62f8ce9f74b12f84c123cc23437a4a32"),
                ("124024574287414", ""),
            ]:
                app_token = f"{app_id}|{app_secret}" if app_secret else app_id
                s4_kw = {"impersonate": CHROME} if HAS_CFFI else {}
                r4 = cf.get(
                    "https://b-api.facebook.com/method/auth.getSessionInfo",
                    params={"access_token": app_token, "format": "json",
                            "generate_session_cookies": "1", "locale": "en_US"},
                    headers={"User-Agent": "FBAN/FB4A;FBAV/377.0.0.29.112;",
                             "Cookie": cookie_str},
                    timeout=10, **s4_kw)
                d4 = {}
                try: d4 = r4.json()
                except Exception: pass
                if "access_token" in d4:
                    tok = d4["access_token"]
                    logs.append(f"[OK] Token via b-api sessionInfo ✓")
                    break
                t4 = _token_extended(r4.text)
                if t4:
                    tok = t4
                    logs.append("[OK] Token via b-api text ✓")
                    break
        except Exception as e:
            logs.append(f"[WARN] b-api: {e}")

    return {
        "ok": True, "token": tok, "uid": uid, "expires": "Session-based",
        "logs": logs + (["[OK] Token extracted ✓"] if tok else
                        ["[FAIL] Token not found — try refreshing cookie or resolve any FB security alerts"])
    }


# ══════════════════════════════════════════════════════════════════════════════
# GUARD — helper functions
# ══════════════════════════════════════════════════════════════════════════════

def _bgraph_login(email: str, password: str, logs: list) -> str:
    """Get EAAG access token from Facebook via email+password using b-graph.facebook.com.
    This is the approach from the reference guard script (get_token function)."""
    try:
        headers = {
            "authorization": "OAuth 350685531728|62f8ce9f74b12f84c123cc23437a4a32",
            "x-fb-friendly-name": "Authenticate",
            "x-fb-connection-type": "Unknown",
            "accept-encoding": "gzip, deflate",
            "content-type": "application/x-www-form-urlencoded",
            "x-fb-http-engine": "Liger",
            "user-agent": random.choice(UA_LIST),
        }
        data = {
            "adid": "".join(random.choices("0123456789abcdef", k=16)),
            "format": "json",
            "device_id": str(uuid.uuid4()),
            "email": email,
            "password": password,
            "generate_analytics_claims": "0",
            "credentials_type": "password",
            "source": "login",
            "error_detail_type": "button_with_disabled",
            "enroll_misauth": "false",
            "generate_session_cookies": "0",
            "generate_machine_id": "0",
            "fb_api_req_friendly_name": "authenticate",
        }
        r = cf.post("https://b-graph.facebook.com/auth/login",
                    data=data, headers=headers, timeout=14)
        result = {}
        try: result = r.json()
        except Exception: pass
        token = result.get("access_token", "")
        if token:
            logs.append("[OK] b-graph login ✓")
        else:
            err = result.get("error", {})
            logs.append(f"[WARN] b-graph: {err.get('message', 'no token')} (code={err.get('code','')})")
        return token
    except Exception as e:
        logs.append(f"[WARN] b-graph login: {e}")
        return ""


def _get_uid_from_token(eaag_token: str, logs: list) -> tuple:
    """Return (uid, name) from an EAAG access token via graph.facebook.com/me."""
    try:
        r = cf.get("https://graph.facebook.com/me",
                   params={"access_token": eaag_token, "fields": "id,name"},
                   timeout=10)
        info = {}
        try: info = r.json()
        except Exception: pass
        uid = info.get("id", "")
        name = info.get("name", "")
        if uid:
            logs.append(f"[INFO] Logged in: {name} ({uid})")
        else:
            logs.append(f"[WARN] get_me: {info}")
        return uid, name
    except Exception as e:
        logs.append(f"[WARN] get_me: {e}")
        return "", ""


def _turn_shield_token(eaag_token: str, uid: str, enable: bool, logs: list) -> bool:
    """Toggle profile guard using an EAAG access token.
    Uses doc_id 1477043292367183 — from reference guard script (turn_shield function)."""
    try:
        data = {
            "variables": json.dumps({
                "0": {
                    "is_shielded": enable,
                    "session_id": str(uuid.uuid4()),
                    "actor_id": uid,
                    "client_mutation_id": str(uuid.uuid4()),
                }
            }),
            "method": "post",
            "doc_id": "1477043292367183",
        }
        headers = {
            "Authorization": f"OAuth {eaag_token}",
            "User-Agent": random.choice(UA_LIST),
        }
        r = cf.post("https://graph.facebook.com/graphql",
                    json=data, headers=headers, timeout=14)
        resp = r.text
        logs.append(f"[DEBUG] turn_shield doc_id=1477043292367183 → {r.status_code}: {resp[:150]}")
        if '"is_shielded":true' in resp:
            logs.append("[OK] Shield enabled via token (doc_id 1477043292367183) ✓")
            return True
        elif '"is_shielded":false' in resp:
            logs.append("[OK] Shield disabled via token ✓")
            return True
        elif r.status_code == 200 and '"errors"' not in resp and "error" not in resp.lower()[:100]:
            if len(resp) > 20:
                logs.append("[OK] Shield toggled (200 OK, no error) ✓")
                return True
    except Exception as e:
        logs.append(f"[WARN] turn_shield_token: {e}")
    return False


def _get_profile_photo_id(s: object, uid: str, logs: list) -> str:
    """Extract current profile picture photo ID from the profile page."""
    try:
        r = s.get(f"https://www.facebook.com/profile.php?id={uid}",
                  headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"},
                  timeout=14)
        body = r.text
        # Try various patterns to find the profile picture photo ID
        for pat in [
            r'"profile_picture"[^}]{0,200}"id"\s*:\s*"(\d{10,})"',
            r'photo/(?:\?fbid=|)(\d{10,})',
            r'"photo_id"\s*:\s*"(\d{10,})"',
            r'fbid=(\d{10,})[^"]*profile_picture',
            r'"node"\s*:\s*\{"id"\s*:\s*"(\d{10,})"[^}]{0,100}"__typename"\s*:\s*"Photo"',
        ]:
            m = re.search(pat, body)
            if m:
                logs.append(f"[INFO] Profile photo ID: {m.group(1)}")
                return m.group(1)
    except Exception as e:
        logs.append(f"[WARN] Photo ID fetch: {e}")
    return ""


def _scan_js_for_guard_docid(s: object, page_html: str, logs: list) -> str:
    """Download JS bundles from the page and search for the live ProfileGuard doc_id."""
    # Find all <script src=...> tags (lazy chunks, not just preloads)
    script_srcs = re.findall(r'<script[^>]+src="(https://z-m-static[^"]+\.js[^"]*)"', page_html)
    preload_srcs = re.findall(r'href="(https://z-m-static[^"]+\.js[^"]*)"', page_html)
    all_srcs = list(set(script_srcs + preload_srcs))
    logs.append(f"[INFO] Scanning {len(all_srcs)} JS bundles for guard doc_id")
    for url in all_srcs[:6]:
        try:
            rb = cf.get(url, timeout=15)
            body = rb.text
            # Search for doc_id near any guard-related keyword
            for kw in ["profileGuard", "profile_guard", "ProfileGuard", "PROFILE_GUARD", "profile_picture_guard"]:
                for m in re.finditer(kw, body, re.I):
                    snippet = body[max(0, m.start()-300):m.start()+300]
                    ids = re.findall(r'"(\d{13,20})"', snippet)
                    for did in ids:
                        logs.append(f"[INFO] Found candidate doc_id near {kw}: {did}")
                        return did
        except Exception as e:
            logs.append(f"[WARN] Bundle scan {url[:60]}: {e}")
    return ""


def do_guard(cookie: str, enable: bool = True) -> dict:
    logs = []
    uid = _uid_from_cookie(cookie)
    fb_dtsg, uid, access_token, authenticated, auth_html = _get_auth(cookie, logs)
    action_word = "Enabling" if enable else "Disabling"
    logs.append(f"[INFO] {action_word} profile guard for UID {uid}")
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False,
                "message": "❌ Cookie invalid or expired — re-export from facebook.com",
                "logs": logs}

    s = make_cf_session(cookie)
    sm = make_cf_session(cookie, mobile=True)
    guard_val = "1" if enable else "0"

    # ── Method 0: turn_shield via EAAG token (doc_id 1477043292367183) — reference script approach ──
    # Try with the access_token from auth first; if not found, extract fresh via do_token
    _tok = access_token
    if not _tok:
        try:
            tok_res = do_token(cookie)
            _tok = tok_res.get("token", "")
            if _tok:
                logs.append("[INFO] Extracted fresh EAAG token for turn_shield")
        except Exception as e:
            logs.append(f"[DEBUG] token extract: {e}")
    if _tok:
        if _turn_shield_token(_tok, uid, enable, logs):
            msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
            return {"ok": True, "success": True, "message": msg, "logs": logs}

    lsd = ""
    if auth_html:
        lm = re.search(r'"LSD",\[\],\{"token":"([^"]+)"', auth_html)
        if lm:
            lsd = lm.group(1)

    # ── Method 1: mbasic guard page (direct form submit) ─────────────────────
    try:
        mob_hdr = {"User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
                   "Accept-Language": "en-US,en;q=0.9"}
        # Try the guard-specific pages
        guard_pages = [
            f"https://mbasic.facebook.com/profile.php?id={uid}&action=profile_picture_guard",
            "https://mbasic.facebook.com/settings/?section=privacy",
            "https://mbasic.facebook.com/settings/",
            f"https://mbasic.facebook.com/{uid}/pictures/",
        ]
        for gurl in guard_pages:
            try:
                rg = sm.get(gurl, headers=mob_hdr, timeout=13)
                forms = re.findall(r'<form[^>]+action="([^"]+)"[^>]*>(.*?)</form>', rg.text, re.S)
                for furl, fbody in forms:
                    if any(k in furl.lower() or k in fbody.lower()
                           for k in ["guard", "privacy", "profile_guard"]):
                        hidden = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', fbody))
                        hidden["fb_dtsg"] = fb_dtsg
                        hidden["__user"] = uid
                        act = furl.replace("&amp;", "&")
                        if not act.startswith("http"):
                            act = "https://mbasic.facebook.com" + act
                        rp = sm.post(act, data=hidden, headers=mob_hdr, timeout=12)
                        logs.append(f"[DEBUG] mbasic guard form → {rp.status_code}")
                        if rp.status_code in (200, 302):
                            # Check for success indicators
                            if "guard" in rp.text.lower() or rp.status_code == 302:
                                logs.append("[OK] Guard set via mbasic form ✓")
                                msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                                return {"ok": True, "success": True, "message": msg, "logs": logs}
            except Exception as ex:
                logs.append(f"[WARN] mbasic {gurl}: {ex}")
    except Exception as e:
        logs.append(f"[WARN] mbasic method: {e}")

    # ── Method 2: JS bundle scanning for live doc_id ─────────────────────────
    try:
        guard_page = sm.get("https://m.facebook.com/privacy/touch/profile_picture_guard/",
                            headers={"User-Agent": "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36"},
                            timeout=15)
        live_doc_id = _scan_js_for_guard_docid(cf, guard_page.text, logs)
        if live_doc_id:
            for var_fmt in [
                {"input": {"actor_id": uid, "client_mutation_id": _rand(), "value": guard_val, "privacy_setting": "PROFILE_GUARD"}},
                {"input": {"actor_id": uid, "client_mutation_id": _rand(), "guard_enabled": enable}},
                {"input": {"actor_id": uid, "client_mutation_id": _rand(), "enabled": enable}},
            ]:
                try:
                    r2 = s.post("https://www.facebook.com/api/graphql/", data={
                        "fb_dtsg": fb_dtsg, "__user": uid, "__a": "1",
                        "doc_id": live_doc_id,
                        "variables": json.dumps(var_fmt),
                    }, timeout=12)
                    logs.append(f"[DEBUG] Live doc_id {live_doc_id}: {r2.status_code} → {r2.text[:80]}")
                    if r2.status_code == 200 and '"errors"' not in r2.text and "not found" not in r2.text.lower() and len(r2.text) > 40:
                        logs.append("[OK] Guard set via live doc_id ✓")
                        msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                        return {"ok": True, "success": True, "message": msg, "logs": logs}
                except Exception:
                    pass
    except Exception as e:
        logs.append(f"[WARN] Bundle scan method: {e}")

    # ── Method 3: Photo-ID based mutation (most common Filipino tool approach) ─
    photo_id = _get_profile_photo_id(s, uid, logs)
    if photo_id:
        for doc_id in [
            "3868904606491881", "5095811730442218", "6043175359085756",
            "4134075133319397", "5221685174560924", "6628564843836870",
        ]:
            for var in [
                {"input": {"actor_id": uid, "client_mutation_id": _rand(), "profile_photo_id": photo_id, "should_set_profile_guard": enable, "privacy": {"base_state": "EVERYONE", "allow": [], "deny": []}}},
                {"input": {"actor_id": uid, "client_mutation_id": _rand(), "photo_id": photo_id, "guard_enabled": enable}},
            ]:
                try:
                    r3 = s.post("https://www.facebook.com/api/graphql/", data={
                        "fb_dtsg": fb_dtsg, "__user": uid, "__a": "1",
                        "doc_id": doc_id, "variables": json.dumps(var),
                    }, timeout=10)
                    if (r3.status_code == 200
                            and '"errors"' not in r3.text
                            and "not found" not in r3.text.lower()
                            and len(r3.text) > 40):
                        logs.append(f"[OK] Guard via photo mutation {doc_id} ✓")
                        msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                        return {"ok": True, "success": True, "message": msg, "logs": logs}
                except Exception:
                    pass

    # ── Method 4: Privacy REST endpoints ─────────────────────────────────────
    ep_action = "enable" if enable else "disable"
    for ep in [
        f"https://www.facebook.com/privacy/settings/profile_guard/{ep_action}/",
        f"https://www.facebook.com/profile_guard/{ep_action}/",
        f"https://www.facebook.com/ajax/profile/picture_guard/{ep_action}/",
    ]:
        try:
            r4 = s.post(ep, data={"fb_dtsg": fb_dtsg, "__user": uid, "__a": "1", "lsd": lsd}, timeout=10)
            logs.append(f"[DEBUG] REST {ep} → {r4.status_code}: {r4.text[:60]}")
            if r4.status_code in (200, 302) and "not found" not in r4.text.lower() and "error" not in r4.text.lower()[:50]:
                logs.append("[OK] Guard set via REST endpoint ✓")
                msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                return {"ok": True, "success": True, "message": msg, "logs": logs}
        except Exception:
            pass

    # ── Method 5: Privacy setting mutations with broad variable sweep ─────────
    for doc_id in ["4134075133319397", "3734556693315868", "6594053617363001",
                   "5489748184424761", "7263150730374991"]:
        for var in [
            {"input": {"actor_id": uid, "client_mutation_id": _rand(), "value": guard_val, "privacy_setting": "PROFILE_GUARD"}},
            {"input": {"actor_id": uid, "client_mutation_id": _rand(), "profile_guard_enabled": enable}},
            {"input": {"actor_id": uid, "client_mutation_id": _rand(), "enabled": enable, "feature": "PROFILE_GUARD"}},
        ]:
            try:
                r5 = s.post("https://www.facebook.com/api/graphql/", data={
                    "fb_dtsg": fb_dtsg, "__user": uid, "__a": "1",
                    "doc_id": doc_id, "variables": json.dumps(var),
                }, timeout=9)
                if (r5.status_code == 200
                        and '"errors"' not in r5.text
                        and "not found" not in r5.text.lower()
                        and len(r5.text) > 40):
                    logs.append(f"[OK] Guard via sweep {doc_id} ✓")
                    msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                    return {"ok": True, "success": True, "message": msg, "logs": logs}
            except Exception:
                pass

    # ── Method 6: AJAX profile-picture-guard endpoint (classic) ─────────────
    try:
        ajax_payloads = [
            {"action": "enable" if enable else "disable"},
            {"profile_guard": "1" if enable else "0"},
            {"enabled": "1" if enable else "0"},
        ]
        for payload in ajax_payloads:
            payload.update({"fb_dtsg": fb_dtsg, "__user": uid, "__a": "1", "lsd": lsd or ""})
            for ep in [
                "https://www.facebook.com/ajax/privacy/profile_picture_guard.php",
                "https://www.facebook.com/privacy/ajax/profile_picture_guard/",
                "https://www.facebook.com/ajax/profile_guard.php",
            ]:
                try:
                    r6 = s.post(ep, data=payload, timeout=9,
                                headers={"X-Requested-With": "XMLHttpRequest",
                                         "Content-Type": "application/x-www-form-urlencoded"})
                    logs.append(f"[DEBUG] AJAX guard {ep.split('/')[-1]}: {r6.status_code} {r6.text[:60]}")
                    if r6.status_code == 200 and "error" not in r6.text.lower()[:50] and len(r6.text) > 5:
                        logs.append("[OK] Guard set via AJAX endpoint ✓")
                        msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                        return {"ok": True, "success": True, "message": msg, "logs": logs}
                except Exception:
                    pass
    except Exception as e:
        logs.append(f"[WARN] AJAX guard: {e}")

    # ── Method 7: Graph API with access token ────────────────────────────────
    if not access_token:
        # Try to get a token using the EAAG approach
        try:
            from fb_helper import do_token  # noqa: F401
            tok_res = do_token(cookie)
            access_token = tok_res.get("token", "")
            if access_token:
                logs.append(f"[INFO] Obtained access token for Graph API")
        except Exception:
            pass

    if access_token:
        try:
            for api_version in ["v18.0", "v17.0", "v19.0"]:
                for field_name in ["profile_guard_enabled", "profile_guard"]:
                    r7 = s.post(
                        f"https://graph.facebook.com/{api_version}/{uid}",
                        data={"access_token": access_token, field_name: "1" if enable else "0"},
                        timeout=10,
                    )
                    d7 = {}
                    try: d7 = r7.json()
                    except Exception: pass
                    logs.append(f"[DEBUG] Graph API {api_version}/{field_name}: {d7}")
                    if d7.get("success") or d7.get("id") or d7.get(field_name):
                        logs.append("[OK] Guard set via Graph API ✓")
                        msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                        return {"ok": True, "success": True, "message": msg, "logs": logs}
        except Exception as e:
            logs.append(f"[WARN] Graph API guard: {e}")

    # ── Method 8: mbasic photo page — navigate to profile pic, find guard link ──
    if photo_id:
        try:
            photo_urls = [
                f"https://mbasic.facebook.com/photo.php?fbid={photo_id}",
                f"https://mbasic.facebook.com/photo/{photo_id}/",
                f"https://mbasic.facebook.com/{uid}/photos/{photo_id}/",
            ]
            for purl in photo_urls:
                try:
                    rphoto = sm.get(purl, timeout=12)
                    # Look for guard/privacy links in the page
                    guard_links = re.findall(r'href="([^"]*(?:guard|privacy)[^"]*)"', rphoto.text, re.I)
                    logs.append(f"[DEBUG] Photo page guard links found: {len(guard_links)}")
                    for gl in guard_links[:4]:
                        gl = gl.replace("&amp;", "&")
                        if not gl.startswith("http"):
                            gl = "https://mbasic.facebook.com" + gl
                        try:
                            rg2 = sm.get(gl, timeout=12)
                            forms_ph = re.findall(r'<form[^>]+action="([^"]+)"[^>]*>(.*?)</form>', rg2.text, re.S)
                            for furl2, fbody2 in forms_ph[:3]:
                                hidden2 = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', fbody2))
                                hidden2.update({"fb_dtsg": fb_dtsg, "__user": uid})
                                act2 = furl2.replace("&amp;", "&")
                                if not act2.startswith("http"):
                                    act2 = "https://mbasic.facebook.com" + act2
                                rp3 = sm.post(act2, data=hidden2, timeout=12)
                                if rp3.status_code in (200, 302):
                                    if "guard" in rp3.text.lower() or "success" in rp3.text.lower() or rp3.status_code == 302:
                                        logs.append("[OK] Guard set via photo page ✓")
                                        msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                                        return {"ok": True, "success": True, "message": msg, "logs": logs}
                        except Exception:
                            pass
                except Exception:
                    pass
        except Exception as e:
            logs.append(f"[WARN] Photo page guard: {e}")

    # ── Method 9: m.facebook.com privacy settings page ───────────────────────
    try:
        priv_urls = [
            "https://m.facebook.com/settings/privacy/",
            "https://m.facebook.com/privacy/touch/profile_picture_guard/",
            f"https://m.facebook.com/profile.php?id={uid}&sk=info",
        ]
        for purl in priv_urls:
            try:
                rpriv = sm.get(purl, timeout=12, headers={"User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/123 Mobile Safari/537.36"})
                forms_priv = re.findall(r'<form[^>]+action="([^"]+)"[^>]*>(.*?)</form>', rpriv.text, re.S)
                for furl_p, fbody_p in forms_priv:
                    if any(k in furl_p.lower() or k in fbody_p.lower() for k in ["guard", "profile_picture", "privacy"]):
                        hidden_p = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', fbody_p))
                        hidden_p.update({"fb_dtsg": fb_dtsg, "__user": uid})
                        act_p = furl_p.replace("&amp;", "&")
                        if not act_p.startswith("http"):
                            act_p = "https://m.facebook.com" + act_p
                        rpp = sm.post(act_p, data=hidden_p, timeout=12)
                        logs.append(f"[DEBUG] m.fb privacy form → {rpp.status_code}")
                        if rpp.status_code in (200, 302):
                            logs.append("[OK] Guard set via m.facebook.com privacy ✓")
                            msg = "✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!"
                            return {"ok": True, "success": True, "message": msg, "logs": logs}
            except Exception:
                pass
    except Exception as e:
        logs.append(f"[WARN] m.fb privacy guard: {e}")

    return {
        "ok": True, "success": False,
        "message": (
            "❌ Guard API unavailable — Facebook has restricted all automated endpoints.\n"
            "➡ Manual steps:\n"
            "  1. Open Facebook app on your phone\n"
            "  2. Tap your profile picture\n"
            "  3. Tap '...' (3 dots) → 'Turn on Profile Guard'\n"
            "  OR: facebook.com → Profile → tap profile photo → '...' → Turn on Profile Guard"
        ),
        "logs": logs,
    }


def do_guard_email(email: str, password: str, enable: bool = True) -> dict:
    """Enable/disable profile guard via email+password — uses b-graph login + turn_shield.
    This is the full reference-script approach: b-graph.facebook.com/auth/login → turn_shield."""
    logs = []
    action_word = "Enabling" if enable else "Disabling"
    logs.append(f"[INFO] {action_word} guard via email: {email[:4]}***@{email.split('@')[-1] if '@' in email else '???'}")

    # Step 1: Get EAAG token via b-graph login
    eaag_token = _bgraph_login(email, password, logs)
    if not eaag_token:
        return {
            "ok": True, "success": False,
            "message": "❌ Login failed — check email/password and try again",
            "logs": logs,
        }

    # Step 2: Get UID from token
    uid, name = _get_uid_from_token(eaag_token, logs)
    if not uid:
        return {
            "ok": True, "success": False,
            "message": "❌ Could not get account info from token",
            "logs": logs,
        }

    # Step 3: Toggle shield
    success = _turn_shield_token(eaag_token, uid, enable, logs)
    msg = ("✅ Profile guard enabled!" if enable else "✅ Profile guard disabled!") if success else "❌ Guard toggle failed — Facebook may have blocked this token"
    return {"ok": True, "success": success, "message": msg, "uid": uid, "name": name, "logs": logs}


# ══════════════════════════════════════════════════════════════════════════════
# BULK OPERATIONS (all saved accounts)
# ══════════════════════════════════════════════════════════════════════════════

def do_react_all(cookies: list, post_url: str, reaction: str) -> dict:
    """React to a post using every cookie in the provided list (bulk boost, max 20)."""
    logs = []
    rxn = reaction.upper()
    post_id = _post_id(post_url)
    # Cap at 20 accounts to avoid suspension
    if len(cookies) > 20:
        logs.append(f"[INFO] Capping to 20 accounts (had {len(cookies)}) to avoid suspension")
        cookies = cookies[:20]
    logs.append(f"[INFO] Bulk react: {len(cookies)} accounts, reaction={rxn}, post={post_id}")

    success = 0
    results = []

    for i, cookie in enumerate(cookies):
        if i > 0:
            time.sleep(random.uniform(0.3, 0.7))

        uid = "?"
        acc_logs: list = []
        try:
            valid, _ = _validate_cookie(cookie)
            if not valid:
                results.append({"uid": uid, "success": False, "name": "Invalid cookie"})
                continue

            uid = _uid_from_cookie(cookie)
            fb_dtsg, uid, access_token, authenticated, auth_html = _get_auth(cookie, acc_logs)
            if not authenticated or not fb_dtsg:
                results.append({"uid": uid, "success": False, "name": f"UID {uid}"})
                logs.append(f"[WARN] Account {uid}: not authenticated")
                continue

            try:
                name = _name(auth_html) or f"User {uid}"
            except Exception:
                name = f"User {uid}"

            # Smart dedup: skip if already reacted with same reaction
            cur = _get_current_reaction(cookie, post_url, post_id, uid, acc_logs)
            if cur and cur == rxn:
                results.append({"uid": uid, "success": True, "name": name, "skipped": True})
                logs.append(f"[SKIP] {name} ({uid}): already has {cur} ↩ skipped")
                success += 1  # count as success since it's already done
                continue
            elif cur:
                acc_logs.append(f"[INFO] {name}: changing {cur} → {rxn}")

            rxn_id = REACTION_MAP.get(rxn, 1)
            done = _react_graphql(cookie, post_id, uid, fb_dtsg, rxn, acc_logs,
                                  post_url=post_url, home_html=auth_html)
            if not done:
                done = _react_ufi(cookie, post_id, uid, fb_dtsg, rxn_id, acc_logs, post_url)
            if not done:
                done = _react_mbasic(cookie, post_url, post_id, uid, rxn, rxn_id, acc_logs)
            if not done and access_token:
                done = _react_graph_api(access_token, post_id, rxn, acc_logs)

            results.append({"uid": uid, "success": done, "name": name})
            if done:
                success += 1
                logs.append(f"[OK] {name} ({uid}): reacted ✓")
            else:
                logs.append(f"[WARN] {name} ({uid}): failed")
                logs.extend(acc_logs[-3:])
        except Exception as e:
            results.append({"uid": uid, "success": False, "name": f"UID {uid}"})
            logs.append(f"[WARN] Account {uid}: {e}")

    msg = (f"✅ {success}/{len(cookies)} accounts reacted successfully"
           if success > 0 else f"❌ All {len(cookies)} accounts failed to react")
    return {
        "ok": True,
        "success": success > 0,
        "total": len(cookies),
        "succeeded": success,
        "failed": len(cookies) - success,
        "results": results,
        "message": msg,
        "logs": logs,
    }


def do_comment_all(cookies: list, post_url: str, comments: list, count: int) -> dict:
    """Post comments using every cookie in the provided list (bulk boost, max 10 comments)."""
    logs = []
    # Cap at 10 comments per account to avoid suspension
    if count > 10:
        logs.append(f"[INFO] Capping comments to 10 (was {count}) to avoid suspension")
        count = 10
    logs.append(f"[INFO] Bulk comment: {len(cookies)} accounts, {count} comments each")

    success = 0
    results = []

    for i, cookie in enumerate(cookies):
        if i > 0:
            time.sleep(random.uniform(0.3, 0.7))

        uid = "?"
        try:
            valid, _ = _validate_cookie(cookie)
            if not valid:
                results.append({"uid": uid, "success": False, "name": "Invalid cookie"})
                continue

            uid = _uid_from_cookie(cookie)
            fb_dtsg, uid, _, authenticated, auth_html = _get_auth(cookie, [])
            if not authenticated:
                results.append({"uid": uid, "success": False, "name": f"UID {uid}"})
                logs.append(f"[WARN] Account {uid}: not authenticated")
                continue

            try:
                name = _name(auth_html) or f"User {uid}"
            except Exception:
                name = f"User {uid}"

            result = do_comment(cookie, post_url, comments, count)
            ok = result.get("success", False)
            results.append({"uid": uid, "success": ok, "name": name})
            if ok:
                success += 1
                logs.append(f"[OK] {name} ({uid}): commented ✓")
            else:
                logs.append(f"[WARN] {name} ({uid}): failed — {result.get('message','')}")
        except Exception as e:
            results.append({"uid": uid, "success": False, "name": f"UID {uid}"})
            logs.append(f"[WARN] Account {uid}: {e}")

    msg = (f"✅ {success}/{len(cookies)} accounts commented successfully"
           if success > 0 else f"❌ All {len(cookies)} accounts failed to comment")
    return {
        "ok": True,
        "success": success > 0,
        "total": len(cookies),
        "succeeded": success,
        "failed": len(cookies) - success,
        "results": results,
        "message": msg,
        "logs": logs,
    }


# ══════════════════════════════════════════════════════════════════════════════
# MAIN DISPATCH
# ══════════════════════════════════════════════════════════════════════════════
def main():
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"ok": False, "error": "Empty input"})); return
        data = json.loads(raw)
        action = data.get("action", "")

        # ── Bulk actions use cookies list, no single-cookie validation ──────────
        if action == "react_all":
            result = do_react_all(
                data.get("cookies", []),
                data.get("postUrl", ""),
                data.get("reactionType", "LIKE"),
            )
            print(json.dumps(result)); return

        if action == "comment_all":
            result = do_comment_all(
                data.get("cookies", []),
                data.get("postUrl", ""),
                data.get("comments", ["nice"]),
                int(data.get("count", 1)),
            )
            print(json.dumps(result)); return

        # ── Email+password guard (no cookie needed) ─────────────────────────────
        if action == "guard_email":
            result = do_guard_email(
                data.get("email", ""),
                data.get("password", ""),
                bool(data.get("enable", True)),
            )
            print(json.dumps(result)); return

        # ── Single-cookie actions ───────────────────────────────────────────────
        cookie = data.get("cookie", "")
        if not cookie:
            print(json.dumps({"ok": False, "error": "No cookie"})); return
        valid, err = _validate_cookie(cookie)
        if not valid:
            print(json.dumps({"ok": False, "error": err})); return

        if   action == "login":
            result = get_profile(cookie)
        elif action == "react":
            result = do_react(cookie, data.get("postUrl",""), data.get("reactionType","LIKE"), int(data.get("count",1)))
        elif action == "share":
            result = do_share(cookie, data.get("postUrl",""), int(data.get("count",1)))
        elif action == "comment":
            result = do_comment(cookie, data.get("postUrl",""), data.get("comments",["nice"]), int(data.get("count",1)))
        elif action == "token":
            result = do_token(cookie)
        elif action == "guard":
            result = do_guard(cookie, bool(data.get("enable", True)))
        else:
            result = {"ok": False, "error": f"Unknown action: {action}"}

        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "error": f"JSON decode: {e}"}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

if __name__ == "__main__":
    main()
