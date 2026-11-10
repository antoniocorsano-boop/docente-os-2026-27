#!/usr/bin/env python3
"""Read-only inspection of public Beta HTML and same-origin JavaScript chunks.
This never reads Render secrets, authenticates, or contacts the Supabase database.
"""
from html.parser import HTMLParser
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urljoin, urlsplit
from urllib.error import HTTPError, URLError
import argparse
import re
import sys
import time

BASE = "https://docente-os-2026-27-beta.onrender.com"
EXPECTED = "gnshgapmwyjamhmlikeg"
REF_RE = re.compile(r"https?://([a-z0-9]{20})\.supabase\.co\b", re.I)

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []
    def handle_starttag(self, tag, attributes):
        if tag == "script":
            src = dict(attributes).get("src")
            if src:
                self.sources.append(src)

def refs(text):
    text = text.replace(r"\/", "/").replace(r"\u002F", "/").replace(r"\u002f", "/")
    return {m.group(1).lower() for m in REF_RE.finditer(text)}

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Refuse before any second network request, including HTTP downgrades.
        raise ValueError("all redirects denied before following")


def get(url, limit):
    if urlsplit(url).scheme != "https" or urlsplit(url).netloc != urlsplit(BASE).netloc:
        raise ValueError("cross-origin access denied")
    req = Request(url, headers={"User-Agent": "P7-Beta-Public-Ref-ReadOnly", "Accept-Encoding": "identity"})
    opener = build_opener(NoRedirect())
    with opener.open(req, timeout=45) as response:
        if urlsplit(response.url).scheme != "https" or urlsplit(response.url).netloc != urlsplit(BASE).netloc:
            raise ValueError("cross-origin response denied")
        if response.status != 200:
            raise ValueError("unexpected HTTP response")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("response exceeds inspection limit")
    return data.decode("utf-8", "replace")

def inspect():
    hits = set()
    sources = set()
    ok_pages = 0
    for path in ("/", "/login"):
        page = None
        for i in range(2):
            try:
                page = get(urljoin(BASE, path), 1500000)
                break
            except (HTTPError, URLError, TimeoutError, ValueError):
                if i == 0:
                    time.sleep(3)
        if page is None:
            continue
        ok_pages += 1
        hits.update(refs(page))
        parsed = Scripts()
        parsed.feed(page)
        for src in parsed.sources:
            full = urljoin(BASE, src)
            parts = urlsplit(full)
            if (parts.scheme == "https" and parts.netloc == urlsplit(BASE).netloc
                and parts.path.startswith("/_next/static/") and parts.path.endswith(".js")):
                sources.add(full)
    inspected = 0
    for url in sorted(sources)[:70]:
        try:
            chunk = get(url, 2000000)
        except (HTTPError, URLError, TimeoutError, ValueError):
            continue
        hits.update(refs(chunk))
        inspected += 1
    if not ok_pages:
        print("P7_PUBLIC_REF_INCONCLUSIVE: public Beta unavailable")
        return 2
    if hits == {EXPECTED}:
        print("P7_PUBLIC_CLIENT_REF_PASS expected_ref=" + EXPECTED + " chunks=" + str(inspected))
        print("Public client evidence only: private Render environment unverified")
        return 0
    if hits:
        print("P7_PUBLIC_CLIENT_REF_CONFLICT: unexpected Supabase public endpoint")
        return 1
    print("P7_PUBLIC_REF_INCONCLUSIVE: no public Supabase endpoint found, chunks=" + str(inspected))
    return 2

def selftest():
    good = "https://" + EXPECTED + ".supabase.co"
    assert refs(good) == {EXPECTED}
    assert refs(good.replace("/", r"\/")) == {EXPECTED}
    assert refs("https://abcdefghijklmnopqrst.supabase.co") == {"abcdefghijklmnopqrst"}
    assert refs("nothing") == set()
    # Fail closed before following 301/302/303/307/308, regardless of origin.
    for code in (301, 302, 303, 307, 308):
        try:
            NoRedirect().redirect_request(None, None, code, "Moved", {}, "http://unsafe.example/")
        except ValueError:
            pass
        else:
            raise AssertionError("redirect not rejected")
    try:
        get("http://docente-os-2026-27-beta.onrender.com/", 100)
    except ValueError:
        pass
    else:
        raise AssertionError("HTTP downgrade not rejected")
    print("P7_PUBLIC_REF_PARSER_SELFTEST_PASS")
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    sys.exit(selftest() if args.self_test else inspect())
