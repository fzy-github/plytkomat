# Płytkomat

Aplikacja webowa do szacowania ilości płytek (m² + sztuki) potrzebnych do remontu łazienki, z parametrycznym modelowaniem pomieszczenia i podglądem 3D. Działa w całości w przeglądarce — bez backendu.

**Plan architektoniczny i implementacyjny:** [docs/PLAN.md](docs/PLAN.md)

## Funkcje (docelowo)

- Parametryczne modelowanie łazienki: prostokątne pomieszczenie + paleta elementów (ścianki działowe, wnęki, wanna z zabudową, zabudowy, drzwi/okna).
- Zaznaczanie powierzchni do okafelkowania (całe ściany/podłoga lub prostokątne regiony) i przypisywanie im typów płytek.
- Kolorowa wizualizacja 3D regionów z obracaniem kamery (orbit).
- Dwa tryby obliczeń: prosty (powierzchnia + % zapasu) oraz symulacja układu siatki z fugą, docinkami i ponownym użyciem ścinek.
- Autozapis do localStorage + eksport/import projektu jako JSON.
- Interfejs PL/EN.

## Stack

React + TypeScript + Vite + react-three-fiber + drei + Zustand. Testy: Vitest.

## Rozwój

```bash
npm install
npm run dev       # serwer deweloperski
npm test          # testy (Vitest)
npm run build     # build produkcyjny (tsc + vite)
npm run preview   # podgląd builda
```

Wymagany Node 22 (patrz `.nvmrc`).

## Deploy — Cloudflare Pages

Czysty statyczny build, bez kodu serwerowego:

1. Podłącz repozytorium w Cloudflare Pages (git integration).
2. Framework preset: **Vite**, build command: `npm run build`, output: `dist`.
3. Wersja Node wykrywana z `.nvmrc`.

Bez `wrangler.toml` i bez `_redirects` (brak client-side routera; przy jego dodaniu dodać regułę `/* /index.html 200`).
