/*
 * download.js — which file this visitor should get, decided at read time from the repository itself.
 *
 * The page never carries a version number or a file name. It asks GitHub for the newest release and
 * matches its assets by shape (electron-builder writes `viberoom-<version>-<os>-<arch>.<ext>`, see
 * shell/electron-builder.yml). A release published later therefore needs no edit here: the reason is
 * not tidiness but truth — a hard-coded link is a promise the site cannot keep, and the day it breaks
 * is the day somebody is trying to install the thing.
 *
 * Three states, all of them said out loud rather than left blank:
 *   ready      — an asset for this system exists: the button downloads it and says the size.
 *   none       — the release has no file for this system (or there is no release yet): the button
 *                points at what does work today, `npm install -g viberoom`, and says so.
 *   unreachable— GitHub did not answer (offline, rate limit): the button opens the releases page.
 *
 * Windows has a second channel: the Microsoft Store signs the package itself, so when STORE_URL is
 * filled in that becomes the first button and the installer stays beside it as the direct download.
 */
(() => {
  "use strict";

  const REPO = "todor-rusev/viberoom";
  const RELEASES = `https://github.com/${REPO}/releases`;
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;
  /** The Microsoft Store listing, once it exists ("https://apps.microsoft.com/detail/<id>"). Empty: the installer is the only Windows way. */
  const STORE_URL = "";
  const NPM = "npm install -g viberoom";

  /**
   * What each system's file looks like. `pick` gets the release's assets and returns the ones for that
   * system, newest naming first; two entries mean a real choice (Apple silicon or Intel), not a guess.
   */
  const SYSTEMS = {
    windows: {
      label: "Windows",
      what: "Windows 10 and 11, 64-bit. Installs for you alone — no administrator.",
      pick: (assets) => assets.filter((a) => /windows/i.test(a.name) && /\.exe$/i.test(a.name)),
    },
    mac: {
      label: "macOS",
      what: "macOS 11 Big Sur and later, Apple silicon or Intel.",
      pick: (assets) => assets.filter((a) => /\.dmg$/i.test(a.name)),
    },
    linux: {
      label: "Linux",
      // A .deb, not an AppImage: on Ubuntu 24.04 and later only the package's AppArmor profile lets Chromium's sandbox
      // start, and an AppImage can carry none (shell/electron-builder.yml)
      what: "Ubuntu and Debian, 64-bit. Installs as a package, with your password.",
      pick: (assets) => assets.filter((a) => /linux/i.test(a.name) && /\.deb$/i.test(a.name)),
    },
  };

  const ARCH = [
    { test: /arm64|aarch64|apple/i, label: "Apple silicon", linux: "ARM 64-bit" },
    { test: /x64|x86_64|amd64|intel/i, label: "Intel", linux: "64-bit" },
  ];

  /** The system this visitor is on. Unknown is a real answer: then no card is singled out. */
  function thisSystem() {
    const ua = navigator.userAgent || "";
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    const both = `${platform} ${ua}`;
    if (/iphone|ipad|android/i.test(ua)) return null; // a phone cannot run it; nothing to highlight
    if (/mac/i.test(both)) return "mac";
    if (/win/i.test(both)) return "windows";
    if (/linux|x11|cros/i.test(both)) return "linux";
    return null;
  }

  const size = (bytes) => (bytes >= 1024 * 1024 * 1024 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 / 1024)} MB`);

  /**
   * The newest release, asked for once per visit. sessionStorage because the download pages under /get/
   * are separate documents: without it a person who opens two of them spends two of GitHub's sixty
   * anonymous requests an hour for the same answer.
   */
  async function latest() {
    const cached = sessionStorage.getItem("viberoom.release");
    if (cached) { try { return JSON.parse(cached); } catch { /* a damaged cache is simply refetched */ } }
    const response = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
    // 404 is the honest answer of a repository with no release yet, and it is not an error to shout about
    if (response.status === 404) return { tag: null, assets: [] };
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const body = await response.json();
    const release = {
      tag: body.tag_name || body.name || null,
      published: body.published_at || null,
      assets: (body.assets || []).map((a) => ({ name: a.name, url: a.browser_download_url, bytes: a.size })),
    };
    sessionStorage.setItem("viberoom.release", JSON.stringify(release));
    return release;
  }

  /** What one system can offer: a list of downloads (possibly empty), each with its own words. */
  function offer(system, release) {
    const spec = SYSTEMS[system];
    const found = spec.pick(release.assets);
    return found.map((asset) => {
      const arch = ARCH.find((a) => a.test.test(asset.name));
      const label = found.length > 1 && arch ? (system === "linux" ? arch.linux : arch.label) : null;
      return { url: asset.url, bytes: asset.bytes, label, name: asset.name };
    });
  }

  // --- the cards on the page -------------------------------------------------------------------

  function paintCard(card, system, state, release) {
    const spec = SYSTEMS[system];
    const button = card.querySelector('[data-role="button"]');
    const aside = card.querySelector('[data-role="aside"]');
    const alt = card.querySelector('[data-role="alt"]');
    const store = STORE_URL && system === "windows";

    if (state === "unreachable") {
      button.href = RELEASES;
      button.textContent = `All downloads for ${spec.label}`;
      aside.textContent = "The list of releases could not be read from here; the page on GitHub has every file.";
      return;
    }

    const downloads = state === "ready" ? offer(system, release) : [];
    if (!downloads.length) {
      // Nothing for this system in the newest release. The npm route works today on all three, so it is
      // what the button offers instead of a dead link — and it says why, which a greyed-out button cannot.
      button.href = "#npm";
      button.classList.remove("primary");
      button.classList.add("ghost");
      button.textContent = "Install with npm instead";
      aside.innerHTML = release.tag
        ? `No ${spec.label} file in <b>${release.tag}</b> yet. It runs here through npm today.`
        : "The desktop package is not published yet. It runs here through npm today.";
      return;
    }

    const first = downloads[0];
    if (store) {
      button.href = STORE_URL;
      button.textContent = "Get it from the Microsoft Store";
      aside.innerHTML = `Signed and updated by the Store. <a href="${first.url}">Direct installer</a> · ${size(first.bytes)}`;
    } else {
      button.href = first.url;
      button.textContent = downloads.length > 1 && first.label ? `Download · ${first.label}` : `Download for ${spec.label}`;
      button.setAttribute("download", "");
      aside.innerHTML = `${size(first.bytes)}${release.tag ? ` · ${release.tag}` : ""}`;
    }

    // A second architecture is a choice the visitor makes, never one this page makes for them.
    for (const extra of downloads.slice(1)) {
      const link = document.createElement("a");
      link.className = "btn ghost sm";
      link.href = extra.url;
      link.setAttribute("download", "");
      link.textContent = extra.label || "Other build";
      link.title = `${extra.name} · ${size(extra.bytes)}`;
      alt.appendChild(link);
    }
  }

  async function paintPage() {
    const cards = [...document.querySelectorAll("[data-system]")];
    if (!cards.length) return;
    const mine = thisSystem();
    let release = { tag: null, assets: [] };
    let state = "ready";
    try { release = await latest(); } catch { state = "unreachable"; }

    for (const card of cards) {
      const system = card.dataset.system;
      if (system === mine) {
        card.classList.add("is-yours");
        const tag = card.querySelector('[data-role="yours"]');
        if (tag) tag.hidden = false;
      }
      paintCard(card, system, state, release);
    }

    const line = document.querySelector("[data-role=release-line]");
    if (line) {
      line.textContent = state === "unreachable" ? "Every file is on the releases page."
        : release.tag ? `Newest release: ${release.tag}${release.published ? ` · ${new Date(release.published).toLocaleDateString()}` : ""}`
        : "The desktop package is on its way; npm works today.";
    }
  }

  // --- /get/<system>/ : one address that hands over the file ------------------------------------

  async function handOver(system) {
    const say = document.querySelector("[data-role=state]");
    const link = document.querySelector("[data-role=link]");
    const tell = (text) => { if (say) say.textContent = text; };
    try {
      const release = await latest();
      const downloads = offer(system, release);
      if (!downloads.length) {
        tell(`The newest release has no ${SYSTEMS[system].label} file yet. Every file, and the other ways to install, are on the main page.`);
        link.href = "/#download";
        link.textContent = "Ways to install viberoom";
        return;
      }
      if (STORE_URL && system === "windows") {
        tell("Opening the Microsoft Store…");
        link.href = STORE_URL;
        link.textContent = "Open the Store";
        location.href = STORE_URL;
        return;
      }
      const first = downloads[0];
      tell(`Downloading ${first.name} · ${size(first.bytes)}. If nothing happens, use the link below.`);
      link.href = first.url;
      link.textContent = `Download ${first.name}`;
      location.href = first.url;
    } catch {
      tell("The list of releases could not be read from here. The page on GitHub has every file.");
      link.href = RELEASES;
      link.textContent = "All releases on GitHub";
    }
  }

  // --- the npm line ------------------------------------------------------------------------------

  function wireCopy() {
    for (const button of document.querySelectorAll("[data-copy]")) {
      button.addEventListener("click", async () => {
        const said = button.textContent;
        try {
          await navigator.clipboard.writeText(button.dataset.copy || NPM);
          button.textContent = "Copied";
          button.classList.add("ok");
        } catch {
          button.textContent = "Select it and copy";
        }
        setTimeout(() => { button.textContent = said; button.classList.remove("ok"); }, 1800);
      });
    }
  }

  const get = document.body.dataset.get;
  if (get && SYSTEMS[get]) void handOver(get);
  else void paintPage();
  wireCopy();
})();
