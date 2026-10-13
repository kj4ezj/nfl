# 2026 NFL Football Schedule
This repo contains a website showing you how to watch 2026 NFL American football games for free in mid-Atlantic markets for teams of interest to me and the people I watch football with.

\>\>\> [https://zanzu.football](https://zanzu.football) <<<

Over-the-air (OTA) television works without Internet...so does this website (after first page load)! Install the app on [Android](#android) or [iOS](#ios).

> [!IMPORTANT]  
> Over-the-air availability is predicted from network and time-window heuristics, then confirmed from published TV guide data. Sunday afternoon games are not assigned to markets until roughly 12 days out. Check local listings. Some entries are estimates.

> [!NOTE]  
> While my source code is released under the MIT license, all rights to team names, network names, streaming service names, and the [NFL schedule](https://www.nfl.com/schedules) itself belong to their respective holders.


### Contents
1. [Installation](#installation)
    1. [Android](#android)
    1. [iOS](#ios)
1. [Schema](#schema)
    1. [Games](#games)
    1. [Markets](#markets)
    1. [Overrides](#overrides)
    1. [Carriage](#carriage)
1. [DNS](#dns)
    1. [DNSSEC](#dnssec)
    1. [Email](#email)
    1. [CAA](#caa)
    1. [GitHub Pages](#github-pages)
1. [See Also](#see-also)


This is a single-page web app rendering the schedule with client-side JavaScript using only one external dependency, [Vue.js](https://vuejs.org). It was built using `claude-opus-5`.


## Installation
You can install `zanzu.football` as an app, right to your homescreen, on [Android](#android) or [iOS](#ios)!


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
The `ota` key records a published fact. Add one once a first-party source exists (e.g. TV guide, marketing, ), which is roughly 12 days out for Sunday afternoon games and immediately for anything confirmed by a network.
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


## DNS
Lock your custom GitHub Pages domain down with DNS.


### DNSSEC
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


### Email
This domain is not intended to send or receive email, so we should take some steps to protect it from being used by attackers to send spam. The Messaging, Malware and Mobile Anti-Abuse Working Group has [published](https://www.m3aawg.org/sites/default/files/doc_files/m3aawg_parked_domains_bcp-2022-06.pdf) best-practices for this. We can't control what mail servers do with email forging this domain as the sender, but we can tell mail servers this domain does not send or receive email.

Record | Key | Value | Notes
:---: | ---: | --- | ---
`TXT` | `zanzu.football` | `v=spf1 -all` | No IP addresses are authorized to send email from the root domain
`TXT` | `*.zanzu.football` | `v=spf1 -all` | No IP addresses are authorized to send email from any subdomain
`TXT` | `_dmarc.zanzu.football` | `v=DMARC1; p=reject; sp=reject` | Mail servers using DMARC should reject all email from the root domain or subdomains
`MX` | `zanzu.football` | Mail Server: `.`<br/>Priority: `0` | Advise mail servers the root domain does not accept email
`MX` | `*.zanzu.football` | Mail Server: `.`<br/>Priority: `0` | Advise mail servers no subdomains accept email

This will cause most mail servers to bounce messages addressed to this domain, and to reject or quarantine mail forged from it. No DKIM record is published because the absence of a public key in DNS is what causes a forged signature to fail validation.


### CAA
Use a [Certification Authority Authorization](https://letsencrypt.org/docs/caa) `CAA` record to restrict who can issue TLS certificates, and under which conditions.

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


## See Also
- [506sports.com](https://506sports.com) - NFL game coverage/market maps
- [ABC Monday Night Football Schedule](https://abc.com/news/640105ff-cab7-46f5-98c5-ccd165214869/category/1138628) - 2026-2027
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
- [List of TV Markets](https://en.wikipedia.org/wiki/List_of_television_stations_in_North_America_by_media_market) - Wikipedia
- [NFL](https://www.nfl.com)
    - [Schedule](https://www.nfl.com/schedules)
- [rabbitears.info](https://www.rabbitears.info)
    - [Signal Search Map](https://www.rabbitears.info/searchmap.php) - over-the-air (OTA) reception
- [scorigami](https://nflscorigami.com) - NFL score history matrix
- [tvtv.us](https://tvtv.us) - over-the-air (OTA) TV guide
- [Vue.js](https://vuejs.org)
    - [Releases](https://github.com/vuejs/core/releases) - GitHub


---
> **_Notice_**  
> Assets in this repo were created in collaboration with a large language model, machine learning algorithm, or weak artificial intelligence (AI). This notice is required in some countries.
