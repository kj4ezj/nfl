# 2026 NFL Football Schedule
This repo contains a website showing you how to watch 2026 NFL American football games for free in mid-Atlantic markets for teams of interest to me and the people I watch football with.

\>\>\> [https://zanzu.football](https://zanzu.football) <<<

Over-the-air (OTA) television works without Internet...so does this website (after first page load)! Install the app on [Android](#android) or [iOS](#ios).

> [!IMPORTANT]  
> Over-the-air availability is predicted from network and time-window heuristics, then confirmed from published TV guide data. Sunday afternoon games are not assigned to markets until roughly 12 days out. Check local listings. Some entries are estimates.

> [!NOTE]  
> While my source code is released under the MIT license, all rights to team names, network names, streaming service names, and the [NFL schedule](https://www.nfl.com/schedules) itself belong to their respective holders.


### Contents
1. [Install](#install)
    1. [Android](#android)
    1. [iOS](#ios)
1. [Schema](#schema)
    1. [Games](#games)
    1. [Markets](#markets)
    1. [Overrides](#overrides)
    1. [Carriage](#carriage)
1. [Development](#development)
    1. [Service Worker](#service-worker)
        1. [Killswitch](#killswitch)
1. [Deployment](#deployment)
    1. [DNS](#dns)
        1. [DNSSEC](#dnssec)
        1. [Email](#email)
        1. [CAA](#caa)
    1. [GitHub Pages](#github-pages)
    1. [Assets](#assets)
        1. [Icons](#icons)
        1. [Link Preview](#link-preview)
    1. [Bubblewrap](#bubblewrap)
1. [See Also](#see-also)


This is a single-page web app rendering the schedule with client-side JavaScript using only one external dependency, [Vue.js](https://vuejs.org). It was built using `claude-opus-5`.


## Install
You can install `zanzu.football` as an app, right to your homescreen, on [Android](#android) or [iOS](#ios).


### Android
Install `zanzu.football` on Android!

> [!TIP]  
> You can use any browser, but this process works best using Google Chrome.

1. Open [https://zanzu.football](https://zanzu.football)
1. Menu (three vertical dots) > Install
1. Tap Install
1. Confirm

If you used Chrome, `zanzu.football` will appear in your app drawer and on your home screen. If you used Brave or Firefox, `zanzu.football` will be on your homescreen but not your app drawer.


### iOS
Installation is Safari only. Chrome on iOS cannot do it.
1. Open [https://zanzu.football](https://zanzu.football) in Safari
1. Tap Share, the square with an arrow
1. Scroll down and tap Add to Home Screen
1. Tap Add


## Schema
All schedule data lives in two constants near the top of the script block. Everything the table renders comes from `GAMES`, `MARKETS`, and the rules in `predict()`.


### Games
Each entry in `GAMES` is one game. Rows render in array order, so keep the array sorted by date and kickoff time.

Key | Type | Notes
--- | --- | ---
`w` | number | NFL week number, 1 through 18
`d` | string | Date, `YYYY-MM-DD`, compared as a string against today
`t` | string | Kickoff, 24 hour Eastern or `TBD`
`ts` | string | Time slot (see below)
`tm` | array | Tracked teams in this game, `[]` for a filler game
`l` | string | Matchup label, always `Away at Home`
`sub` | string | Subtext under the matchup, score and location
`net` | string | Broadcast rights holder (see below)
`nsub` | string | Subtext under the network
`bye` | boolean | Bye week placeholder, no other fields apply
`ota` | object | Optional per-market [override](#overrides)

The time slot drives the carriage rules, because a station can only air one game per network per window.

Time Slot | Meaning
--- | ---
`am` | Morning game (~9:30 ET)
`early` | Early afternoon (~13:00 ET)
`late` | Late afternoon (~16:15 ET)
`night` | Primetime game
`special` | Holiday or Saturday kickoff that fits nothing else
`bye` | Bye week placeholder
`tbd` | Week 18, not scheduled until January

The network field names who holds the broadcast rights, which is not always who broadcasts the game.

> [!IMPORTANT]  
> The league flexes games. Kickoff times move, Sunday afternoon games swap windows, and FOX and CBS cross-flex more often than the conference rule suggests. 2026 Week 6 had three games inverted from the default in one week. Trust published listings over any rule of thumb.

Network | Meaning
--- | ---
`FOX` | Regional Sunday afternoon
`CBS` | Regional Sunday afternoon
`NBC` | Sunday Night Football, national
`ABC` | Monday Night Football usually simulcast on ABC, national
`ESPN` | Monday Night Football with no ABC simulcast
`PRIME` | Thursday Night Football, free on Twitch
`NFLX` | Netflix exclusive
`INTL` | International game, network varies
`SAT` | Late season Saturday game, network announced later
`TBD` | Week 18, flexed

A game with `tm: []` is a filler game involving none of the tracked teams. Those rows always render regardless of the team chips, gated instead by the `Other` chip.


### Markets
Each entry in `MARKETS` is one television market. The market key is what gets stored in `localStorage` and what an override can target.

> [!NOTE]  
> The team's actual home market behaves differently from the other markets assigned to that team. Washington DC reorganizes its whole Sunday around the Commanders. Roanoke, Hampton Roads, and Baltimore simply take what the network offers. The rules cannot express that difference, so it has to come from listings.

Key | Type | Notes
--- | --- | ---
`short` | string | Chip label and column header
`name` | string | Full market name shown under the chips
`home` | string | Team code whose games this market protects
`state` | string | Two letter group key, lets one override cover several markets
`ch` | object | Network to callsign map, ordered by virtual channel number

The `state` key and the market keys share one namespace inside `ota`, so market keys must never collide with a state's two-letter abbreviation.


### Overrides
The `ota` key records a published fact. Add one once a first-party source exists (TV guide, network schedule, marketing), which is roughly 12 days out for Sunday afternoon games.
```js
ota: {all: {free: 'yes'}}                     // every market
ota: {nova: {free: 'yes'}}                    // one market, everything else predicted
ota: {va: {free: 'no'}, bal: {free: 'no'}}    // one state group plus one market
ota: {all: {free: 'yes'}, det: {free: 'no'}}  // every market except Detroit
```
Lookup is most specific first. The market key wins, then the state key, then `all`. A market with no match falls through to the heuristic.

Entries accept four keys, all optional except `free`.

Key | Values | Notes
--- | --- | ---
`free` | `yes`, `maybe`, `no` | Can you watch this without paying
`net` | `FOX`, `CBS`, `NBC`, `ABC` | Show a network other than `net` in specific markets
`label` | string | Replace the pill text, for example `Twitch`
`note` | string | Replace the note under the pill

Anything you leave out is inherited from the prediction. Confirming a Prime game as `{free: 'yes'}` keeps the Twitch label and the Twitch note without restating either.


### Carriage
The `carriage()` method produces every pill in the table. It always runs the heuristic (`predict()`), then layers any override on top.

> [!TIP]  
> The heuristic blocks a game when the market's home team occupies the same network in the same window. That is the single most useful rule in the file, and it is why a Lions game at 13:00 on FOX disappears in Washington DC whenever the Commanders are in the same slot.

The returned object carries two different kinds of text. The distinction is what makes overrides terse.
- `note` is _where to watch_, for example a callsign. It survives confirmation.
- `why` is _why this was guessed_, for example `open window, regional pick`. It is dropped on confirmation, because a confirmed verdict is not a guess.

A `confirmed` flag renders the pill with an outline. That is the only visual difference between a fact and a prediction, and it is explained in the legend on the page.


## Development
Open the file over HTTP, not from disk.

> [!WARNING]  
> Opening `index.html` directly as `file://` looks broken and is not. Service workers never register on that protocol, absolute paths like `/icon.svg` resolve to the filesystem root, and the manifest throws a CORS error. None of that means the site is broken.

Service workers require a secure origin, and `localhost` counts as one.
```bash
python3 -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080).


### Service Worker
A service worker is a script the browser registers against an origin and keeps locally. It intercepts every request from that origin, including the one that loads the page itself.

> [!WARNING]  
> A service worker is the only thing on a static site that persists in someone else's browser after you stop serving it. Ship a broken one and every visitor keeps running it. The browser refetches the worker on every navigation and bypasses HTTP caching for it after 24 hours, which is what makes recovery possible at all.

The strategy here is network first with a cache fallback. Online, you always get fresh content and the cache refreshes behind you. Offline, you get the last successful load.
```js
async function fetchThenCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}
```
Service worker install pre-caches a short list so the very first offline load works without the user having visited twice. Activate deletes every cache whose name is not the current one, which is the whole cache invalidation mechanism.

Three details are easy to get wrong and are correct in [sw.js](./sw.js).
- Clone the response before returning it. A body can only be read once, so the cache gets the clone and the page gets the original.
- Do not await the cache write. Awaiting it delays the response to the page for no benefit.
- Keep the precache list short. The `addAll()` call is atomic, so one bad URL fails the entire install and the worker never activates.


#### Killswitch
Keep [sw-killswitch.js](./sw-killswitch.js) in the repo. It unregisters the worker and deletes every cache.
```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(selfDestruct()));
async function selfDestruct() {
  const names = await caches.keys();
  await Promise.all(names.map(n => caches.delete(n)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.navigate(c.url));
}
```
Deploy it by overwriting the registered path. The browser only ever fetches the URL it has registered, so a file sitting at a different path will never be loaded.
```bash
cp sw-killswitch.js sw.js
git add sw.js
git commit -m 'Deploy service worker killswitch'
git push
```
Visitors recover on their next _two_ page loads. Restore the real worker once the damage is undone.

Test the killswitch before you need it.

> [!CAUTION]  
> Do not recover using the Unregister button in devtools. That lever does not exist for your visitors. The point of the test is proving the deployed file path works.

Use a throwaway path or [serve locally](#development) so live visitors are never affected, because worker scope is the directory the worker lives in.
1. Copy `index.html` and `sw.js` into `sw-test/` and register at `/sw-test/sw.js`.
1. Load the page, confirm the worker is active in devtools under Application, then go offline and reload.
1. Replace `sw-test/sw.js` with a worker that serves garbage for every request.
    ```js
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', e => {
      e.respondWith(new Response('<h1>broken</h1>', {headers: {'Content-Type': 'text/html'}}));
    });
    ```
1. Reload twice and confirm the site is unusable.
1. Copy the killswitch over it, reload twice, and confirm the worker and caches are gone.
1. Delete `sw-test/`.


## Deployment
Deploy `zanzu.football`, or another progressive web app (PWA) backed by GitHub Pages.


### DNS
Lock your custom GitHub Pages domain down with DNS.


#### DNSSEC
[Domain Name System Security Extensions](https://en.wikipedia.org/wiki/Domain_Name_System_Security_Extensions) (DNSSEC) allows your DNS provider to cryptographically sign your DNS records such that DNS forgery can be detected by clients. Enable this with your DNS provider, then verify it is enabled and working with [dnsviz.net](https://dnsviz.net) and `dig`.
```log
$ dig CDNSKEY zanzu.football +short
257 3 13 mdsswUyr3DPW132mOi8V9xESWE8jTo0dxCjjnopKl+GqJxpVXckHAeF+ KkxLbxILfDLUT0rAK9iUzy1L53eKGQ==
$ dig CDS zanzu.football +short
2371 13 2 9CF058808AC1FA4B082CBE8E6429363A7074DB93969CA992BAF789C7 BBFE9054
$ dig DNSKEY zanzu.football +short
257 3 13 mdsswUyr3DPW132mOi8V9xESWE8jTo0dxCjjnopKl+GqJxpVXckHAeF+ KkxLbxILfDLUT0rAK9iUzy1L53eKGQ==
256 3 13 oJMRESz5E4gYzS/q6XDrvU1qMPYIjCWzJaOau8XNEZeqCYKD5ar0IRd8 KqXXFJkqmVfRvMGPmM1x8fGAa2XhSA==
$ dig DS zanzu.football +short
```
My `DS` record was missing for a while. My DNS provider had to submit my `DS` record to the TLD registry, which took some time. The site works for clients during this time because they ignore the signature without a `DS` record and operate in insecure mode. Just wait a day and the `DS` record will eventually appear and make [dnsviz.net](https://dnsviz.net) happy. Some providers and configurations will require you to submit this manually.

Once a `DS` record exists at the registry, validating resolvers will reject your entire domain with `SERVFAIL` if the signatures stop matching. Disable DNSSEC and wait for the `DS` to expire before moving DNS providers.


#### Email
This domain is not intended to send or receive email, so we should take some steps to protect it from being used by attackers to send spam. The Messaging, Malware and Mobile Anti-Abuse Working Group has [published](https://www.m3aawg.org/sites/default/files/doc_files/m3aawg_parked_domains_bcp-2022-06.pdf) best-practices for this. We can't control what mail servers do with email forging this domain as the sender, but we can tell mail servers this domain does not send or receive email.

Record | Key | Value | Notes
:---: | ---: | --- | ---
`TXT` | `zanzu.football` | `v=spf1 -all` | No IP addresses are authorized to send email from the root domain
`TXT` | `*.zanzu.football` | `v=spf1 -all` | No IP addresses are authorized to send email from any subdomain
`TXT` | `_dmarc.zanzu.football` | `v=DMARC1; p=reject; sp=reject` | Mail servers using DMARC should reject all email from the root domain or subdomains
`MX` | `zanzu.football` | Mail Server: `.`<br/>Priority: `0` | Advise mail servers the root domain does not accept email
`MX` | `*.zanzu.football` | Mail Server: `.`<br/>Priority: `0` | Advise mail servers no subdomains accept email

This will cause most mail servers to bounce messages addressed to this domain, and to reject or quarantine mail forged from it. No DKIM record is published because the absence of a public key in DNS is what causes a forged signature to fail validation.


#### CAA
Use a [Certification Authority Authorization](https://letsencrypt.org/docs/caa) `CAA` record to restrict who can issue TLS certificates, and under which conditions.

> [!TIP]  
> Add `CAA` records before requesting your first certificate, so that issuance by an unexpected authority fails loudly instead of succeeding silently.

Record | Key | Value | Notes
:---: | ---: | --- | ---
`CAA` | `zanzu.football` | `0 issue "letsencrypt.org"` | Only Let's Encrypt should be issuing new certificates for this root domain or subdomains
`CAA` | `zanzu.football` | `0 issuewild ";"` | No certificate authority should be issuing wildcard certificates for this root domain or subdomains

GitHub Pages uses Let's Encrypt. Subdomain `CAA` records override root `CAA` records.


### GitHub Pages
Enable GitHub Pages by going to repository settings > Pages, then selecting "Deploy from a branch" and your base branch, then click save. The site should be live almost immediately at `${USERNAME}.github.io/${REPOSITORY_NAME}/`.

[Verify your custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages) by going to [account settings](https://github.com/settings) > [Pages](https://github.com/settings/pages) > [Add a domain](https://github.com/settings/pages_verified_domains/new), and entering your domain name. It will return a key-value pair for you to enter in your DNS records.

Record | Key | Value | Notes
:---: | ---: | --- | ---
`TXT` | `_github-pages-challenge-kj4ezj.zanzu.football` | `1beb1d735f8e83408ae21a92919317` | GitHub-provided

Enter this record and click verify.

Next, follow [GitHub's instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain) to point your domain at GitHub Pages.

> [!TIP]  
> I recommend deviating from their instructions by entering the DNS records _before_ adding the domain to your repo so the GitHub DNS checks pass on the first attempt instead of caching a failure.

Record | Key | Value | Notes
:---: | ---: | --- | ---
`A` | `zanzu.football` | `185.199.108.153` | Obtain from docs or `dig A ${USERNAME}.github.io`, not this table
`A` | `zanzu.football` | `185.199.109.153` | Obtain from docs or `dig A ${USERNAME}.github.io`, not this table
`A` | `zanzu.football` | `185.199.110.153` | Obtain from docs or `dig A ${USERNAME}.github.io`, not this table
`A` | `zanzu.football` | `185.199.111.153` | Obtain from docs or `dig A ${USERNAME}.github.io`, not this table
`AAAA` | `zanzu.football` | `2606:50c0:8000::153` | Obtain from docs or `dig AAAA ${USERNAME}.github.io`, not this table
`AAAA` | `zanzu.football` | `2606:50c0:8001::153` | Obtain from docs or `dig AAAA ${USERNAME}.github.io`, not this table
`AAAA` | `zanzu.football` | `2606:50c0:8002::153` | Obtain from docs or `dig AAAA ${USERNAME}.github.io`, not this table
`AAAA` | `zanzu.football` | `2606:50c0:8003::153` | Obtain from docs or `dig AAAA ${USERNAME}.github.io`, not this table
`CNAME` | `www.zanzu.football` | `kj4ezj.github.io` | Use your own username, lol

Once your domain points to GitHub Pages, go to repo settings > Pages > Custom domain, enter your root domain and click "Save". Their DNS check should pass, GitHub will automatically obtain and renew a TLS certificate with Let's Encrypt, and redirect `www.*` to your root domain.

Finally, when the DNS check is passing and the TLS cert has been (re)issued with `www.` as a Subject Alternative Name (SAN), you will be able to check "Enforce HTTPS".

> [!NOTE]  
> GitHub Pages sets no `Strict-Transport-Security` header on custom domains and offers no way to add one. HSTS preloading and Encrypted Client Hello are both out of reach for the same reason. Moving to a host you control, such as [Caddy](https://caddyserver.com) on a VPS, is the only fix.


### Assets
Icons and the link preview have constraints that are invisible until something crops or scales your artwork.

> [!WARNING]  
> AI-generated image files can arrive containing metadata you did not ask for. Check before you commit them.


#### Icons
Four icon files cover every context. Each one exists because something refuses to accept the others.

> [!TIP]  
> Design the 16 pixel frame first and scale up. Artwork that reads at 512 pixels usually turns to mush at 16, and a multi-resolution `*.ico` file lets you ship a simplified small frame rather than a shrunken large one.

File | Size | Purpose
--- | --- | ---
`favicon.ico` | 48x48, 32x32, 16x16 | Browser tabs, multi-resolution, requested automatically at the site root
`icon.svg` | vector | Modern browser tabs, scales perfectly, themeable
`icon-apple.png` | 180x180 | iOS home screen, must be opaque, never cropped by iOS
`icon-maskable.png` | 512x512 | Android launcher, must be opaque, cropped to the launcher shape
`link-preview.jpg` | 1200x630 | [Link preview](#link-preview)

The maskable icon is the fussy one. Android crops it to a circle, a squircle, or whatever shape the launcher uses, so the artwork has to sit inside the center 80 percent. On a 512 pixel canvas that leaves about 51 pixels of padding on every side. Transparent regions inside the crop render as holes, so the background must be painted edge to edge.


#### Link Preview
Open Graph tags control how the site renders when someone shares the link. Every major messaging app reads them.

> [!TIP]  
> Platforms cache previews aggressively and for a long time. Test in a thread you do not mind polluting, and append a query string to the page URL while iterating.

```html
<meta property="og:type" content="website">
<meta property="og:url" content="https://zanzu.football/">
<meta property="og:title" content="2026 NFL Antenna and Streaming Guide">
<meta property="og:description" content="Pick your teams, pick your TV market, see which games are free over-the-air, see which games are free on streaming.">
<meta property="og:image" content="https://zanzu.football/link-preview.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A football schedule table rendered as a field, with rabbit-ear antennas as goalposts and a kicker kicking a football">
<meta name="twitter:card" content="summary_large_image">
```
Four details decide whether this works at all.
- The image URL must be absolute. A relative path is the most common reason a preview comes back blank.
- The image must be 1200x630. That is the 1.91:1 ratio every platform crops to.
- Open Graph tags use `property`, Twitter tags use `name`. Mixing them up breaks one or the other silently.
- Put the tags before any script tags. Some scrapers read only the first chunk of the document.

Design the image for a 350 pixel wide render, because that is roughly how wide it appears in a chat thread. Shrink your draft to 350 pixels and look at it before committing. Put the domain in large type and keep the composition simple.


### Bubblewrap
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) generates the Trusted Web Activity (TWA). It downloads its own JDK and Android build tools, so Android Studio is not required.

> [!CAUTION]  
> Back up the keystore and its password. Lose either and you cannot ship an update, only a fresh install under a different identity. The `packageId` is permanent for the same reason. Bump `appVersionCode` before every rebuild or Android refuses the upgrade.

> [!WARNING]  
> GitHub Pages runs Jekyll by default, and Jekyll ignores directories beginning with a dot. Add an empty `.nojekyll` file at the repo root or `.well-known/assetlinks.json` returns a 404.

Install bubblewrap.
```bash
npm install --global @bubblewrap/cli
```
Install any missing bubblewrap dependencies.
```bash
bubblewrap doctor
```
Initialize from the live manifest.
```bash
bubblewrap init --manifest https://zanzu.football/site.webmanifest
```

> [!TIP]  
> If bubblewrap fails before the init process is complete, you can generate your own keys...
> ```bash
> keytool -genkeypair -v -keystore android.keystore -alias android.zanzu.football -keyalg RSA -keysize 4096 -validity 36500 -storetype PKCS12
> ```
> ...get your fingerprint...
> ```bash
> keytool -list -v -keystore android.keystore -alias android.zanzu.football | grep SHA256
> ```
> ...then declare it in `twa-manifest.json` at `fingerprints.value` and pull it in.
> ```bash
> bubblewrap update
> ```

Build the APK.
```bash
bubblewrap build
```
Digital Asset Links is the step that breaks silently. The app claims an identity, the site vouches for it, and Android checks both before dropping the URL bar.
```bash
bubblewrap fingerprint add <SHA256>
bubblewrap fingerprint generateAssetLinks
```
Copy the result to `/.well-known/assetlinks.json` and verify it is reachable.
```bash
curl -s https://zanzu.football/.well-known/assetlinks.json
```
A URL bar across the top of the installed app means the JSON is unreachable or the fingerprint does not match the key that signed the APK.


## See Also
- [506sports.com](https://506sports.com) - NFL game coverage/market maps
- [ABC Monday Night Football Schedule](https://abc.com/news/640105ff-cab7-46f5-98c5-ccd165214869/category/1138628) - 2026-2027
- Android
    - [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) - TWA generator
    - [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
    - [Maskable Icons](https://web.dev/articles/maskable-icon)
- [Caddy](https://caddyserver.com) - web server with automatic HTTPS
- [Claude](https://claude.ai) - AI
- DNS
    - [Certification Authority Authorization](https://letsencrypt.org/docs/caa) - Let's Encrypt `CAA`
    - [DMARC Subdomain Policy Tag](https://mxtoolbox.com/dmarc/details/dmarc-tags/dmarc-sp) - `sp`
    - [dnsviz.net](https://dnsviz.net) - DNSSEC checking tool
        - [Analyze zanzu.football](https://dnsviz.net/d/zanzu.football/dnssec)
    - [Domain Name System Security Extensions](https://en.wikipedia.org/wiki/Domain_Name_System_Security_Extensions) - DNSSEC Wikipedia
    - [M³AAWG Protecting Parked Domains Best Common Practices](https://www.m3aawg.org/sites/default/files/doc_files/m3aawg_parked_domains_bcp-2022-06.pdf) \[PDF]
    - [RFC-7505](https://www.rfc-editor.org/info/rfc7505) - A "Null MX" No Service Resource Record for Domains That Accept No Mail
- GitHub Pages
    - [About custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
    - [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
        - [Configuring an apex domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)
    - [Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
    - [Verifying your custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [HD Homerun](https://www.silicondust.com/hdhomerun.html) - networked TV tuner
- [Jellyfin](https://jellyfin.org)
- Link Previews
    - [metatags.io](https://metatags.io)
    - [opengraph.xyz](https://www.opengraph.xyz)
    - [The Open Graph Protocol](https://ogp.me)
- [List of TV Markets](https://en.wikipedia.org/wiki/List_of_television_stations_in_North_America_by_media_market) - Wikipedia
- [NFL](https://www.nfl.com)
    - [Schedule](https://www.nfl.com/schedules)
- [rabbitears.info](https://www.rabbitears.info)
    - [Signal Search Map](https://www.rabbitears.info/searchmap.php) - over-the-air (OTA) reception
- [scorigami](https://nflscorigami.com) - NFL score history matrix
- Service Workers
    - [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) - MDN
    - [The Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) - MDN
- [tvtv.us](https://tvtv.us) - over-the-air (OTA) TV guide
- [Vue.js](https://vuejs.org)
    - [Releases](https://github.com/vuejs/core/releases) - GitHub


---
> **_Notice_**  
> Assets in this repo were created in collaboration with a large language model, machine learning algorithm, or weak artificial intelligence (AI). This notice is required in some countries.
