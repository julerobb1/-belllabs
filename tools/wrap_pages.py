#!/usr/bin/env python3
"""Rebuild every public HTML page onto shared chrome, meta tags, and image markup."""
from __future__ import annotations

import json
import re
import shutil
from html import escape, unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = Path(__file__).resolve().parent / "content"
MANIFEST_PATH = ROOT / "img" / "image-sizes.json"
SITE = "https://belllaboratories.net"
OG_IMAGE = SITE + "/img/map1.jpg"

MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.exists() else {}

SKIP_WRAP = {"lzk.html", "l-carrier-systems.html", "timelinepagebackup.html"}

REMAP_SRC = {
    "images/att-longlines-network-map.jpg": "img/map1.jpg",
    "img/long-lines-facility.jpg": "img/ll1.jpg",
    "img/timeline/transistor.jpg": "img/transistor.jpg",
    "img/timeline/bell-labs-founding.jpg": "img/map1.jpg",
    "img/att truck.png": "img/att truck.jpg",
}

DROP_SRC = {
    "img/bell-labs-logo.png",
    "img/switching-hierarchy.jpg",
    "img/coaxial-diagram.jpg",
    "img/tower-diagram.jpg",
    "img/timeline/shannon-info-theory.jpg",
}

PAGES = {
    "index.html": {
        "title": "AT&T Long Lines & Bell Labs - Innovations in Communication",
        "description": "A historical tribute to AT&T Long Lines and Bell Labs: microwave radio, L-carrier, electronic switching, Telstar, and the inventions of Bell Telephone Laboratories.",
        "subtitle": "Pioneering innovations in telecommunications",
        "canonical": "/",
        "fragment": "index.html",
        "discord": True,
        "csp_frame": "https://discord.com",
    },
    "404.html": {
        "title": "Page not found - AT&T Long Lines & Bell Labs",
        "description": "That page is not on belllaboratories.net.",
        "subtitle": "Page not found",
        "canonical": "/404",
        "fragment": "404.html",
        "body_class": "page-404",
        "noindex": True,
    },
    "admin.html": {
        "title": "Admin - AT&T Long Lines & Bell Labs",
        "description": "There is no public admin panel on this historical site.",
        "subtitle": "Administration",
        "canonical": "/admin",
        "fragment": "admin.html",
        "noindex": True,
    },
    "amps.html": {
        "title": "AMPS cellular system - Bell Labs",
        "description": "The Advanced Mobile Phone System (AMPS) was Bell Labs' analog cellular telephone standard, first in commercial U.S. service in Chicago in 1983.",
        "subtitle": "Advanced Mobile Phone System",
        "canonical": "/amps",
        "fragment": "amps.html",
    },
    "bell-labs.html": {
        "title": "Bell Labs - Bell Telephone Laboratories",
        "description": "Bell Labs, founded in 1925, was the research and development organization of the Bell System: transistor, UNIX, Telstar, ESS, information theory, and more.",
        "subtitle": "Bell Telephone Laboratories",
        "canonical": "/bell-labs",
        "fragment": "bell-labs.html",
    },
    "blit.html": {
        "title": "Blit terminal - Bell Labs",
        "description": "The Blit was a programmable bitmap graphics terminal designed at Bell Labs in the early 1980s for use with UNIX research systems.",
        "subtitle": "Bitmap terminal",
        "canonical": "/blit",
        "fragment": "blit.html",
    },
    "bob-lucky.html": {
        "title": "Robert W. Lucky - Bell Labs",
        "description": "Robert W. Lucky is the Bell Labs engineer known for adaptive equalization, which made high-speed data practical on telephone channels.",
        "subtitle": "Engineer and author",
        "canonical": "/bob-lucky",
        "fragment": "bob-lucky.html",
    },
    "ccd.html": {
        "title": "Charge-coupled device (CCD) - Bell Labs",
        "description": "The charge-coupled device was invented at Bell Labs in 1969 by Willard Boyle and George E. Smith, later recognized with a Nobel Prize.",
        "subtitle": "Digital imaging",
        "canonical": "/ccd",
    },
    "coaxial-cable-systems.html": {
        "title": "Coaxial cable systems - AT&T Long Lines",
        "description": "AT&T Long Lines coaxial cable routes carried L-carrier analog telephone and television circuits underground across the United States.",
        "subtitle": "Underground long-distance plant",
        "canonical": "/coaxial-cable-systems",
    },
    "contribute.html": {
        "title": "Contribute - AT&T Long Lines & Bell Labs",
        "description": "How to contribute photographs, documents, or edits to this independent historical site.",
        "subtitle": "Help document the network",
        "canonical": "/contribute",
        "fragment": "contribute.html",
    },
    "educational-resources.html": {
        "title": "Educational resources - Bell Labs and Long Lines",
        "description": "Reading paths and primary sources for Bell Labs inventions and AT&T Long Lines technology.",
        "subtitle": "For students and teachers",
        "canonical": "/educational-resources",
        "fragment": "educational-resources.html",
    },
    "ess.html": {
        "title": "Electronic Switching System (ESS) - Bell Labs",
        "description": "The No. 1 ESS, first in commercial service at Succasunna, New Jersey, on 30 May 1965, brought stored-program control to Bell System switching.",
        "subtitle": "Stored-program telephone switching",
        "canonical": "/ess",
        "fragment": "ess.html",
    },
    "gallery.html": {
        "title": "Gallery - AT&T Long Lines sites",
        "description": "Photographs of remaining AT&T Long Lines microwave towers, horn-reflector antennas, and equipment buildings.",
        "subtitle": "Photographs of the plant",
        "canonical": "/gallery",
        "gallery": True,
    },
    "history-att-longlines.html": {
        "title": "History of AT&T Long Lines",
        "description": "How AT&T Long Lines built the United States long-distance telephone and television network.",
        "subtitle": "Long-distance history",
        "canonical": "/history-att-longlines",
    },
    "history-bell-labs.html": {
        "title": "History of Bell Labs",
        "description": "Bell Telephone Laboratories from its founding in 1925 through later corporate successors.",
        "subtitle": "History of the laboratory",
        "canonical": "/history-bell-labs",
    },
    "im-beta.html": {
        "title": "Interactive map (archived) - AT&T Long Lines",
        "description": "Archived beta of an interactive Long Lines map. Current mapping is at long-lines.com.",
        "subtitle": "Archived map experiment",
        "canonical": "/im-beta",
    },
    "interactive-timeline.html": {
        "title": "Interactive timeline - Bell Labs and Long Lines",
        "description": "A clickable timeline of Bell Labs and AT&T Long Lines milestones from 1925 onward.",
        "subtitle": "Click a year to read the event",
        "canonical": "/interactive-timeline",
        "extra_js": ["js/interactive-timeline.js"],
    },
    "international-locations.html": {
        "title": "International locations - Bell Labs",
        "description": "Notes on Bell Labs and Bell System work beyond the United States.",
        "subtitle": "Beyond the U.S. plant",
        "canonical": "/international-locations",
    },
    "l-carrier.html": {
        "title": "L-carrier - AT&T Long Lines coaxial systems",
        "description": "L-carrier was the Bell System analog coaxial-cable family (L1, L3, L4, L5) that carried thousands of telephone circuits underground.",
        "subtitle": "Analog coaxial carrier",
        "canonical": "/l-carrier",
        "fragment": "l-carrier.html",
    },
    "llmap-int.html": {
        "title": "Network map reference - AT&T Long Lines",
        "description": "A static reference to the historical AT&T Long Lines microwave and coaxial network, with links to independent maps.",
        "subtitle": "Network map reference",
        "canonical": "/llmap-int",
    },
    "longlines-facilities.html": {
        "title": "Long Lines facilities",
        "description": "Buildings, towers, and stations that made up the AT&T Long Lines plant.",
        "subtitle": "Stations and buildings",
        "canonical": "/longlines-facilities",
    },
    "microwave-relay.html": {
        "title": "Microwave radio relay - TD-2 and Long Lines",
        "description": "AT&T Long Lines microwave radio, including the TD-2 4 GHz system and the 1951 transcontinental route.",
        "subtitle": "TD-2 and the radio backbone",
        "canonical": "/microwave-relay",
        "fragment": "microwave-relay.html",
    },
    "microwave-relay-towers.html": {
        "title": "Microwave relay towers - AT&T Long Lines",
        "description": "Horn-reflector antennas, tower spacing, and equipment buildings of the Long Lines microwave network.",
        "subtitle": "Towers and horn-reflector antennas",
        "canonical": "/microwave-relay-towers",
    },
    "museum-project.html": {
        "title": "Museum project - Bell Labs and Long Lines",
        "description": "Early planning for a museum dedicated to Bell Labs and AT&T Long Lines history.",
        "subtitle": "A place for the hardware and the story",
        "canonical": "/museum-project",
    },
    "noc.html": {
        "title": "AT&T Network Operations Center",
        "description": "The AT&T Network Operations Center at Bedminster, New Jersey, watched the long-distance network from 1977 onward.",
        "subtitle": "Watching the long-distance network",
        "canonical": "/noc",
        "fragment": "noc.html",
    },
    "optical-maser.html": {
        "title": "Optical maser and the laser - Bell Labs",
        "description": "Bell Labs' role in the optical maser, the proposal that led to the laser.",
        "subtitle": "Light amplification",
        "canonical": "/optical-maser",
    },
    "photovoltaic-cell.html": {
        "title": "Silicon photovoltaic cell - Bell Labs",
        "description": "The practical silicon solar cell demonstrated at Bell Labs in 1954 by Chapin, Fuller, and Pearson.",
        "subtitle": "The silicon solar cell",
        "canonical": "/photovoltaic-cell",
    },
    "plan9.html": {
        "title": "Plan 9 from Bell Labs",
        "description": "Plan 9 is the distributed operating system Bell Labs developed as a research successor to UNIX, and the origin of UTF-8.",
        "subtitle": "A distributed operating system",
        "canonical": "/plan9",
        "csp_frame": "https://9p.io https://cat-v.org",
    },
    "plan9-emulator.html": {
        "title": "Plan 9 emulator - Bell Labs",
        "description": "Try a browser-based Plan 9 / 9front environment linked from this historical site.",
        "subtitle": "Run Plan 9 in the browser",
        "canonical": "/plan9-emulator",
        "extra_js": ["js/plan9-emulator.js"],
        "csp_frame": "https://cat-v.org https://9p.io",
    },
    "preservation-efforts.html": {
        "title": "Preservation efforts - AT&T Long Lines",
        "description": "How volunteers document remaining Long Lines towers, horns, and buildings. Do not trespass on active or private sites.",
        "subtitle": "Documenting what is left",
        "canonical": "/preservation-efforts",
        "fragment": "preservation-efforts.html",
    },
    "repeater-stations.html": {
        "title": "Repeater stations - AT&T Long Lines",
        "description": "Repeater stations amplified microwave and coaxial signals so Long Lines circuits could cross the country.",
        "subtitle": "Keeping the signal alive",
        "canonical": "/repeater-stations",
    },
    "research-archives.html": {
        "title": "Research archives - Bell Labs",
        "description": "Public collections and on-site articles for Bell Labs research: BSTJ, Nobel citations, UNIX, Telstar, and patents.",
        "subtitle": "Papers and collections",
        "canonical": "/research-archives",
        "fragment": "research-archives.html",
    },
    "rss-helper.html": {
        "title": "RSS feed - AT&T Long Lines & Bell Labs",
        "description": "How to subscribe to the RSS feed for this historical site.",
        "subtitle": "Site updates by RSS",
        "canonical": "/rss-helper",
        "fragment": "rss-helper.html",
        "extra_js": ["js/rss-helper.js"],
    },
    "switching-systems.html": {
        "title": "Switching systems - AT&T Long Lines",
        "description": "From toll boards and crossbar to No. 4 ESS: how AT&T switched long-distance calls.",
        "subtitle": "The intelligence of the network",
        "canonical": "/switching-systems",
    },
    "technical-archives.html": {
        "title": "Technical archives - Bell System documents",
        "description": "Where to read the Bell System Technical Journal and other primary Long Lines and Bell Labs documents.",
        "subtitle": "Primary sources",
        "canonical": "/technical-archives",
        "fragment": "technical-archives.html",
    },
    "technology.html": {
        "title": "Technology - AT&T Long Lines & Bell Labs",
        "description": "Overview of Long Lines transmission technology and Bell Labs inventions, with links to deeper articles.",
        "subtitle": "A closer look at the technology",
        "canonical": "/technology",
    },
    "telstar.html": {
        "title": "Telstar - Bell Labs communications satellite",
        "description": "Telstar 1, launched 10 July 1962, was the first active satellite to relay live transatlantic television. Bell Labs built it; NASA launched it.",
        "subtitle": "The 1962 communications satellite",
        "canonical": "/telstar",
        "fragment": "telstar.html",
    },
    "timeline.html": {
        "title": "Timeline - Bell Labs and AT&T Long Lines",
        "description": "A chronological list of major Bell Labs inventions and Long Lines network milestones.",
        "subtitle": "Dates and events",
        "canonical": "/timeline",
    },
    "transistor.html": {
        "title": "The transistor - Bell Labs",
        "description": "The point-contact transistor was demonstrated at Bell Labs on 23 December 1947 by Bardeen, Brattain, and Shockley.",
        "subtitle": "1947, Murray Hill",
        "canonical": "/transistor",
    },
    "unix.html": {
        "title": "UNIX - Bell Labs",
        "description": "UNIX was developed at Bell Labs from 1969 by Ken Thompson, Dennis Ritchie, and colleagues, and rewritten in C in the early 1970s.",
        "subtitle": "The operating system from Murray Hill",
        "canonical": "/unix",
    },
    "unix-emulator.html": {
        "title": "UNIX emulator - Bell Labs",
        "description": "Browser emulators for historical UNIX versions, linked from this Bell Labs historical site.",
        "subtitle": "Try UNIX in the browser",
        "canonical": "/unix-emulator",
        "extra_js": ["js/unix-emulator.js"],
        "csp_frame": "https://bellard.org https://copy.sh https://www.pcjs.org https://jslinux.org",
        "csp_script": "https://bellard.org https://copy.sh https://www.pcjs.org",
    },
}


def canonical_url(meta: dict) -> str:
    path = meta.get("canonical", "/")
    if path == "/":
        return SITE + "/"
    return SITE + path


def extract_main(html: str) -> str:
    match = re.search(r"<main\b[^>]*>(.*)</main>", html, flags=re.I | re.S)
    if match:
        return match.group(1).strip()
    body = re.search(r"<body\b[^>]*>(.*)</body>", html, flags=re.I | re.S)
    if not body:
        return html
    text = body.group(1)
    text = re.sub(r"<header\b[^>]*>.*?</header>", "", text, flags=re.I | re.S)
    text = re.sub(r"<nav\b[^>]*>.*?</nav>", "", text, flags=re.I | re.S)
    text = re.sub(r"<footer\b[^>]*>.*?</footer>", "", text, flags=re.I | re.S)
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    return text.strip()


def lookup_image(src: str) -> dict | None:
    src = src.strip()
    src = REMAP_SRC.get(src, src)
    if src in DROP_SRC:
        return None
    info = MANIFEST.get(src)
    if info:
        return info
    path = ROOT / src
    if path.is_file():
        return {"src": src, "webp": None, "width": None, "height": None}
    return None


def picture_tag(info: dict, alt: str, extra_attrs: str, eager: bool = False) -> str:
    attrs = []
    if extra_attrs.strip():
        cleaned = re.sub(r'\s*(src|srcset|width|height|loading|fetchpriority)\s*=\s*("[^"]*"|\'[^\']*\')', "", extra_attrs, flags=re.I)
        cleaned = re.sub(r"\s+onerror\s*=\s*(\"[^\"]*\"|'[^']*')", "", cleaned, flags=re.I)
        if cleaned.strip():
            attrs.append(cleaned.strip())
    attrs.append(f'src="{escape(info["src"], quote=True)}"')
    if alt is not None:
        attrs.append(f'alt="{escape(alt, quote=True)}"')
    if info.get("width"):
        attrs.append(f'width="{info["width"]}"')
    if info.get("height"):
        attrs.append(f'height="{info["height"]}"')
    if eager:
        attrs.append('fetchpriority="high"')
    else:
        attrs.append('loading="lazy"')
    img = "<img " + " ".join(attrs) + ">"
    webp = info.get("webp")
    if webp and (ROOT / webp).is_file():
        return (
            "<picture>\n"
            f'  <source srcset="{escape(webp, quote=True)}" type="image/webp">\n'
            f"  {img}\n"
            "</picture>"
        )
    return img


IMG_TAG = re.compile(r"<img\b([^>]*?)(/?)>", flags=re.I | re.S)
PICTURE_WRAP = re.compile(
    r"<picture>\s*(?:<source\b[^>]*>\s*)*(<img\b[^>]*>)\s*</picture>",
    flags=re.I | re.S,
)


def rewrite_images(html: str) -> str:
    html = PICTURE_WRAP.sub(r"\1", html)
    first = {"done": False}

    def repl(match: re.Match) -> str:
        raw_attrs = match.group(1)
        src_m = re.search(r'\bsrc\s*=\s*["\']([^"\']+)["\']', raw_attrs, flags=re.I)
        if not src_m:
            return match.group(0)
        src = src_m.group(1)
        if src.startswith("data:") or src.startswith("http"):
            return match.group(0)
        alt_m = re.search(r'\balt\s*=\s*["\']([^"]*)["\']', raw_attrs, flags=re.I)
        alt = alt_m.group(1) if alt_m else ""
        for _ in range(3):
            unescaped = unescape(alt)
            if unescaped == alt:
                break
            alt = unescaped
        info = lookup_image(src)
        if info is None:
            return ""
        eager = not first["done"]
        first["done"] = True
        extra = re.sub(r'\s*alt\s*=\s*("[^"]*"|\'[^\']*\')', "", raw_attrs, flags=re.I)
        extra = re.sub(r'\s*src\s*=\s*("[^"]*"|\'[^\']*\')', "", extra, flags=re.I)
        extra = re.sub(r"\s*/\s*$", "", extra)
        return picture_tag(info, alt, extra, eager=eager)

    return IMG_TAG.sub(repl, html)


def build_gallery_main() -> str:
    files = sorted((ROOT / "img" / "gallery").glob("*.jpg"))
    items = []
    for path in files:
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        info = lookup_image(rel) or {"src": rel, "webp": rel.replace(".jpg", ".webp")}
        alt = path.stem.replace("_", " ")
        items.append("<figure class=\"figure\">" + picture_tag(info, alt, "", eager=False) + f"<figcaption>{escape(alt)}</figcaption></figure>")
    extra = []
    for rel in ("img/ll1.jpg", "img/transistor.jpg", "img/map1.jpg"):
        info = lookup_image(rel)
        if info:
            extra.append("<figure class=\"figure\">" + picture_tag(info, Path(rel).stem, "", eager=False) + "</figure>")
    return f"""
<section class="section">
    <h1>Gallery</h1>
    <p>Photographs of former Long Lines microwave stations, horn-reflector antennas, and equipment buildings. Locations are volunteer-documented field sites, not an official AT&amp;T collection.</p>
    <div class="image-gallery">
        {"".join(items + extra)}
    </div>
    <p>If you have additional photographs, see <a href="contribute.html">Contribute</a>.</p>
</section>
"""


def nav_html(current: str) -> str:
    def link(href: str, label: str) -> str:
        cls = ' class="active"' if href == current else ""
        return f'<a href="{href}"{cls}>{label}</a>'

    return f"""
<nav class="site-nav" aria-label="Main">
    <button type="button" class="nav-toggle" aria-controls="nav-menu" aria-expanded="false">Menu</button>
    <div id="nav-menu" class="nav-menu">
        {link("index.html", "Home")}
        <div class="dropdown">
            <button type="button" class="drop-toggle" aria-expanded="false">Technology</button>
            <div class="dropdown-content">
                {link("technology.html", "Tech overview")}
                {link("transistor.html", "Transistor")}
                {link("optical-maser.html", "Lasers")}
                {link("ccd.html", "CCD imaging")}
                {link("photovoltaic-cell.html", "Solar cell")}
                {link("unix.html", "UNIX")}
                {link("plan9.html", "Plan 9")}
                {link("blit.html", "Blit")}
                {link("amps.html", "AMPS")}
                {link("ess.html", "ESS")}
                {link("telstar.html", "Telstar")}
            </div>
        </div>
        <div class="dropdown">
            <button type="button" class="drop-toggle" aria-expanded="false">Long Lines</button>
            <div class="dropdown-content">
                {link("history-att-longlines.html", "History")}
                {link("microwave-relay.html", "Microwave relay")}
                {link("microwave-relay-towers.html", "Relay towers")}
                {link("l-carrier.html", "L-carrier")}
                {link("coaxial-cable-systems.html", "Coaxial cable")}
                {link("switching-systems.html", "Switching")}
                {link("repeater-stations.html", "Repeaters")}
                {link("longlines-facilities.html", "Facilities")}
                {link("noc.html", "Network Operations Center")}
                {link("llmap-int.html", "Network map")}
            </div>
        </div>
        <div class="dropdown">
            <button type="button" class="drop-toggle" aria-expanded="false">Bell Labs</button>
            <div class="dropdown-content">
                {link("bell-labs.html", "Overview")}
                {link("history-bell-labs.html", "History")}
                {link("bob-lucky.html", "Bob Lucky")}
                {link("unix-emulator.html", "UNIX emulator")}
                {link("plan9-emulator.html", "Plan 9 emulator")}
            </div>
        </div>
        {link("timeline.html", "Timeline")}
        {link("gallery.html", "Gallery")}
        <div class="dropdown">
            <button type="button" class="drop-toggle" aria-expanded="false">More</button>
            <div class="dropdown-content">
                {link("technical-archives.html", "Technical archives")}
                {link("research-archives.html", "Research archives")}
                {link("educational-resources.html", "Educational resources")}
                {link("preservation-efforts.html", "Preservation")}
                {link("museum-project.html", "Museum project")}
                {link("contribute.html", "Contribute")}
                {link("rss-helper.html", "RSS")}
                {link("interactive-timeline.html", "Interactive timeline")}
            </div>
        </div>
        <a href="rss.xml" class="rss-button" title="RSS feed">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                <circle cx="6.18" cy="17.82" r="2.18"/>
                <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
            </svg>
            <span class="sr-only">RSS</span>
        </a>
    </div>
    <button type="button" id="theme-toggle" class="theme-toggle" aria-pressed="false">Dark mode</button>
</nav>
"""


def csp_for(meta: dict) -> str:
    frames = meta.get("csp_frame", "")
    scripts = meta.get("csp_script", "")
    frame_src = f"frame-src {frames};" if frames else "frame-src 'none';"
    script_src = "'self' 'unsafe-inline'" + (f" {scripts}" if scripts else "")
    return (
        "default-src 'self'; "
        f"script-src {script_src}; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        f"{frame_src} "
        "base-uri 'self'; "
        "form-action 'self'"
    )


def render(filename: str, meta: dict, main: str) -> str:
    url = canonical_url(meta)
    title = meta["title"]
    description = meta["description"]
    subtitle = meta.get("subtitle", "Innovations in communication")
    extra_js = "\n".join(
        f'    <script src="{src}" defer></script>' for src in meta.get("extra_js", [])
    )
    robots = "noindex, nofollow" if meta.get("noindex") else "index, follow"
    body_class = meta.get("body_class", "")
    body_attr = f' class="{body_class}"' if body_class else ""
    discord = ""
    if meta.get("discord"):
        discord = """
    <div id="discord-widget-container" class="collapsible collapsed">
        <button type="button" id="collapse-button" aria-expanded="false" aria-controls="discord-widget-frame">+</button>
        <iframe id="discord-widget-frame" src="https://discord.com/widget?id=807000904397094913&amp;theme=dark" width="350" height="500" allowtransparency="true" title="Discord community" loading="lazy" referrerpolicy="no-referrer"></iframe>
    </div>
"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escape(title)}</title>
    <meta name="description" content="{escape(description, quote=True)}">
    <meta name="robots" content="{robots}">
    <link rel="canonical" href="{url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="AT&amp;T Long Lines &amp; Bell Labs">
    <meta property="og:title" content="{escape(title)}">
    <meta property="og:description" content="{escape(description, quote=True)}">
    <meta property="og:url" content="{url}">
    <meta property="og:image" content="{OG_IMAGE}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{escape(title)}">
    <meta name="twitter:description" content="{escape(description, quote=True)}">
    <meta name="twitter:image" content="{OG_IMAGE}">
    <meta http-equiv="Content-Security-Policy" content="{csp_for(meta)}">
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="icon" href="img/favicon.ico" type="image/x-icon">
    <link rel="alternate" type="application/rss+xml" title="AT&amp;T Long Lines &amp; Bell Labs updates" href="rss.xml">
    <link rel="stylesheet" href="css/site.css">
    <script>
        (function () {{
            try {{
                var theme = localStorage.getItem("theme");
                if (!theme) {{
                    var legacy = localStorage.getItem("darkMode");
                    if (legacy === "enabled" || legacy === "true") theme = "dark";
                    else if (legacy === "disabled" || legacy === "false") theme = "light";
                }}
                if (theme === "dark" || (!theme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {{
                    document.documentElement.classList.add("dark-mode");
                }}
            }} catch (e) {{}}
        }})();
    </script>
    <script src="js/site.js" defer></script>
{extra_js}
</head>
<body{body_attr}>
    <header class="site-header">
        <h1><a href="index.html">AT&amp;T Long Lines &amp; Bell Labs</a></h1>
        <p class="tagline">{escape(subtitle)}</p>
    </header>
    {nav_html(filename)}
    <main>
        {main}
    </main>
    <footer class="site-footer">
        <p><small>This is an independent historical tribute. It is not affiliated with AT&amp;T Inc. or Nokia Bell Labs. We do not use advertising trackers.</small></p>
        <p>&copy; <span id="year"></span> AT&amp;T Long Lines &amp; Bell Labs Community. <small>Site by juler#5461.</small></p>
    </footer>
    {discord}
</body>
</html>
"""


def write_redirect() -> None:
    (ROOT / "l-carrier-systems.html").write_text(
        """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>L-carrier systems have moved</title>
    <link rel="canonical" href="https://belllaboratories.net/l-carrier">
    <meta http-equiv="refresh" content="0; url=l-carrier.html">
    <script>location.replace("l-carrier.html");</script>
</head>
<body>
    <p>L-carrier systems now live at <a href="l-carrier.html">l-carrier.html</a>.</p>
</body>
</html>
""",
        encoding="utf-8",
    )


def patch_lzk() -> None:
    path = ROOT / "lzk.html"
    text = path.read_text(encoding="utf-8")
    if "Back to site" not in text:
        text = text.replace(
            "<body>",
            '<body>\n<a href="index.html" style="position:fixed;z-index:9;top:8px;left:8px;color:#fff;background:#005a9c;padding:6px 10px;border-radius:4px;text-decoration:none;font-family:sans-serif;">Back to site</a>\n',
            1,
        )
    path.write_text(text, encoding="utf-8")


def write_robots_and_sitemap() -> None:
    (ROOT / "robots.txt").write_text(
        f"""User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /admin
Disallow: /timelinepagebackup.html
Disallow: /lzk.html
Disallow: /lzk

Sitemap: {SITE}/sitemap.xml
""",
        encoding="utf-8",
    )
    urls = []
    for name, meta in PAGES.items():
        if meta.get("noindex"):
            continue
        urls.append(
            f"  <url>\n    <loc>{escape(canonical_url(meta))}</loc>\n    <changefreq>monthly</changefreq>\n  </url>"
        )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n",
        encoding="utf-8",
    )
    (ROOT / "_redirects").write_text(
        """/l-carrier-systems /l-carrier 301
/l-carrier-systems.html /l-carrier.html 301
/recipes/* / 301
/recipes / 301
""",
        encoding="utf-8",
    )
    (ROOT / "_headers").write_text(
        """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer

/img/*
  Cache-Control: public, max-age=31536000, immutable

/css/*
  Cache-Control: public, max-age=86400

/js/*
  Cache-Control: public, max-age=86400
""",
        encoding="utf-8",
    )


def copy_favicon() -> None:
    src = ROOT / "img" / "favico.ico"
    if src.is_file():
        shutil.copy2(src, ROOT / "img" / "favicon.ico")
        shutil.copy2(src, ROOT / "favicon.ico")


def update_rss() -> None:
    path = ROOT / "rss.xml"
    text = path.read_text(encoding="utf-8")
    text = text.replace("https://belllabs.example.com", SITE)
    path.write_text(text, encoding="utf-8")


def patch_site_js_gallery() -> None:
    js_path = ROOT / "js" / "site.js"
    text = js_path.read_text(encoding="utf-8")

    def dim_for(src: str, default_w: int, default_h: int) -> tuple[int, int]:
        info = MANIFEST.get(src) or {}
        return int(info.get("width") or default_w), int(info.get("height") or default_h)

    replacements = [
        ("img/gallery/20250304_145346.jpg", 1920, 1080),
        ("img/gallery/20250304_145429.jpg", 1920, 1080),
        ("img/gallery/20250309_172527.jpg", 1920, 1080),
        ("img/gallery/dhtspll_base.jpg", 1920, 1080),
        ("img/gallery/dhtspll_out.jpg", 1920, 1080),
        ("img/gallery/dhtspll_Reflector_HI.jpg", 1920, 1080),
        ("img/gallery/dhtspll_TB.jpg", 1920, 1080),
        ("img/gallery/dhtspll_vents1.jpg", 1920, 1080),
        ("img/gallery/dhtspll1_far.jpg", 1920, 1080),
        ("img/gallery/dhtspll2.jpg", 1920, 1080),
        ("img/gallery/dhtspll3.jpg", 1920, 1080),
        ("img/gallery/dhtspll4.jpg", 1920, 1080),
    ]
    for src, dw, dh in replacements:
        w, h = dim_for(src, dw, dh)
        text = re.sub(
            rf'(src: "{re.escape(src)}".*?width: )\d+(, height: )\d+',
            rf"\g<1>{w}\g<2>{h}",
            text,
        )
    js_path.write_text(text, encoding="utf-8")


def main() -> None:
    copy_favicon()
    patch_site_js_gallery()
    for filename, meta in PAGES.items():
        if meta.get("gallery"):
            main_html = build_gallery_main()
        elif meta.get("fragment"):
            main_html = (CONTENT / meta["fragment"]).read_text(encoding="utf-8")
        else:
            original = (ROOT / filename).read_text(encoding="utf-8", errors="replace")
            main_html = extract_main(original)
            if filename == "history-bell-labs.html" and "bell-labs.html" not in main_html:
                main_html += '<p class="related"><a href="bell-labs.html">Bell Labs overview</a> · <a href="telstar.html">Telstar</a></p>'
            if filename == "history-att-longlines.html" and "microwave-relay.html" not in main_html:
                main_html += (
                    '<p class="related"><a href="microwave-relay.html">Microwave relay</a> · '
                    '<a href="l-carrier.html">L-carrier</a> · '
                    '<a href="ess.html">ESS</a></p>'
                )
            if filename == "technology.html" and "ess.html" not in main_html:
                main_html += (
                    '<section class="section"><h2>Long Lines plant on this site</h2><ul>'
                    '<li><a href="microwave-relay.html">Microwave radio relay (TD-2)</a></li>'
                    '<li><a href="l-carrier.html">L-carrier coaxial systems</a></li>'
                    '<li><a href="ess.html">Electronic Switching System</a></li>'
                    '<li><a href="telstar.html">Telstar</a></li>'
                    "</ul></section>"
                )
        main_html = rewrite_images(main_html)
        (ROOT / filename).write_text(render(filename, meta, main_html), encoding="utf-8")
        print("wrote", filename)
    write_redirect()
    patch_lzk()
    write_robots_and_sitemap()
    update_rss()
    print("done")


if __name__ == "__main__":
    main()
