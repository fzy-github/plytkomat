# Płytkomat

Aplikacja webowa do szacowania ilości płytek (m² + sztuki) potrzebnych do remontu łazienki, z parametrycznym modelowaniem pomieszczenia i podglądem 3D. Działa w całości w przeglądarce — bez backendu.

**Plan architektoniczny i implementacyjny:** [docs/PLAN.md](docs/PLAN.md)

## Funkcje

- Parametryczne modelowanie łazienki: prostokątne pomieszczenie + paleta elementów (ścianki działowe, wnęki, wanna z zabudową, zabudowy, drzwi/okna).
- Zaznaczanie powierzchni do okafelkowania (całe ściany/podłoga lub prostokątne regiony) przez kliknięcie w 3D i przypisywanie im typów płytek.
- Kolorowa wizualizacja 3D regionów z obracaniem kamery (orbit) i siatką fug w skali płytki.
- Dwa tryby obliczeń:
  - **Prosty** — powierzchnia netto + % zapasu,
  - **Układ** — symulacja siatki z fugą, docinkami i ponownym użyciem ścinek (zachłanny first-fit z rotacją 90°); breakdown per region.
- Autozapis do localStorage + eksport/import projektu jako JSON (walidacja zod).
- Interfejs PL/EN (poprawne polskie formy liczby mnogiej).

## Jak używać

1. Ustaw wymiary pomieszczenia w panelu **Pomieszczenie**.
2. Dodaj elementy z menu **Dodaj element** (drzwi są ważne — odejmują ~1.8 m² od ściany).
3. Dodaj **typ płytki** (wymiary, kolor wizualizacji).
4. Kliknij powierzchnię w 3D → **Kafelkuj całą** lub **Dodaj region częściowy**.
5. Odczytaj wyniki w dolnym panelu; przełącz **Prosty/Układ**, dostosuj fugę, zapas i min. ścinkę w **Ustawieniach obliczeń**.

## Stack

React + TypeScript + Vite + react-three-fiber + drei + Zustand + i18next + zod. Testy: Vitest (geometria i silnik obliczeń), opcjonalny smoke Playwright.

## Rozwój

```bash
npm install
npm run dev       # serwer deweloperski
npm test          # testy jednostkowe (Vitest)
npm run test:e2e  # smoke E2E (wymaga: npx playwright install chromium)
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

## Ograniczenia v1 (świadome)

- Pokoje tylko prostokątne; elementy tylko osiowo wyrównane (bez rotacji).
- Kontakt box↔box nie jest rozwiązywany geometrycznie (bez CSG) — przenikające się elementy dają ostrzeżenie.
- Układ płytek: tylko prosta siatka od narożnika (układy z przesunięciem — punkt rozszerzenia `pattern`).
- Docinki liczone po prostokątnym bounding boxie widocznej części (L-kształty lekko pesymistycznie); ościeża drzwi poza zakresem.
- Wnęki i otwory tylko na 4 ścianach pomieszczenia (nie na ściankach działowych).
- Bez undo (ścieżka: `zundo` na immutable slice) i bez zaokrąglania do pełnych opakowań.
