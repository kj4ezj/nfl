# 2026 NFL Football Schedule
This repo contains a website showing how to watch 2026 NFL American football games in mid-Atlantic markets for teams of interest to me and the people I watch football with.

\>\>\> [https://zanzu.football](https://zanzu.football) <<<

This is a single-page web app rendering the schedule with client-side JavaScript using only one external dependency, [Vue.js](https://vuejs.org). It was built using `claude-opus-5`.

> [!IMPORTANT]  
> Over-the-air availability is computed from network and time-window rules, not from published coverage maps. Sunday afternoon games are not assigned to markets until roughly 12 days out. Check local listings. Several entries are estimates.

> [!NOTE]  
> While my source code is released under the MIT license, all rights to team names, network names, streaming service names, and the [NFL schedule](https://www.nfl.com/schedules) itself belong to their respective holders.


### Contents
1. [DNS](#dns)
    1. [DNSSEC](#dnssec)
1. [See Also](#see-also)


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


## See Also
- [506sports.com](https://506sports.com) - NFL game coverage/market maps
- [Claude](https://claude.ai) - AI
- DNS
    - [dnsviz.net](https://dnsviz.net) - DNSSEC checking tool
    - [Domain Name System Security Extensions](https://en.wikipedia.org/wiki/Domain_Name_System_Security_Extensions) - DNSSEC Wikipedia
- [HD Homerun](https://www.silicondust.com/hdhomerun.html) - networked TV tuner
- [Jellyfin](https://jellyfin.org)
- [NFL](https://www.nfl.com)
    - [Schedule](https://www.nfl.com/schedules)
- [rabbitears.info](https://www.rabbitears.info)
    - [Signal Search Map](https://www.rabbitears.info/searchmap.php) - over-the-air (OTA) reception
- [tvtv.us](https://tvtv.us) - over-the-air (OTA) TV guide
- [Vue.js](https://vuejs.org)

---
> **_Notice_**  
> Assets in this repo were created in collaboration with a large language model, machine learning algorithm, or weak artificial intelligence (AI). This notice is required in some countries.
