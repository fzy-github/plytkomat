# Płytkomat — plan architektoniczny i implementacyjny

## Kontekst

Aplikacja webowa (100% w przeglądarce, bez backendu) do szacowania ilości płytek (m² + sztuki) potrzebnych do remontu łazienki. Użytkownik parametrycznie modeluje pomieszczenie w 3D (ścianki, wnęki, wanna z zabudową, drzwi), zaznacza powierzchnie do okafelkowania, przypisuje im typy płytek (kolorowa wizualizacja 3D), a aplikacja liczy zapotrzebowanie w dwóch trybach: prostym (powierzchnia + % zapasu) i symulacyjnym (układ siatki z fugą, docinki, ponowne użycie ścinek). Repo `fzy-github/plytkomat` jest puste — projekt od zera. Hosting: Cloudflare Pages (statyczny build).

**Decyzje potwierdzone z użytkownikiem:** modelowanie parametryczne (prostokątny pokój + paleta elementów) · oba tryby obliczeń · React + TS + Vite + react-three-fiber + drei + Zustand · autosave localStorage + eksport/import JSON · wiele typów płytek per projekt · układ tylko prosta siatka (przesunięcia later) · UI polski + angielski (i18n z przełącznikiem) · deploy na Cloudflare Pages.

## Naczelna decyzja architektoniczna

**Model domenowy jest 2D-first; scena 3D jest pochodną.** Wszystko to prostokątny pokój, osiowo wyrównane boxy, prostokątne otwory (wnęki/drzwi) i prostokątne regiony płytek w **lokalnych układach 2D powierzchni**. Czysta funkcja `deriveSurfaces(project): Surface[]` produkuje płaskie powierzchnie (obrys + otwory + osadzenie 3D), konsumowane i przez renderer, i przez silnik obliczeń. Cała ryzykowna matematyka żyje w czystym TS bez zależności od three/React — w pełni testowalna Vitestem.

Ograniczenie przyjęte świadomie: **tylko osiowo wyrównane prostokąty i boxy** (bez rotacji i wielokątów) — wystarcza dla realnych łazienek, redukuje geometrię do arytmetyki przedziałów.

Jednostki: **centymetry w całym modelu** (fuga = 0.2 cm). Porównania współrzędnych przez jedną stałą `EPS = 1e-3` w `src/geometry/rect.ts`. Układ: origin w narożniku podłogi, X = szerokość, Y = wysokość (up), Z = długość; ściany o stałych id `north/south/east/west`.

## Model domenowy (`src/model/types.ts`)

```ts
interface Rect { x: number; y: number; w: number; h: number }  // lokalne 2D, cm

interface Project {
  schemaVersion: 1; name: string;
  room: { width: number; length: number; height: number };
  elements: RoomElement[]; tileTypes: TileType[]; regions: TileRegion[];
  settings: Settings;
}

type RoomElement = BoxElement | NicheElement | OpeningElement;

// Ścianka działowa, zabudowa wanny i zabudowa ogólna = JEDEN prymityw (box);
// kind wpływa tylko na domyślne wymiary/ścianki kafelkowane i etykietę w palecie.
interface BoxElement {
  id; kind: 'partition' | 'tubEnclosure' | 'box'; name: string;
  pos: { x; y; z };  size: { x; y; z };
  faces?: Partial<Record<BoxFace, boolean>>;  // tubEnclosure: top=false (tam leży wanna)
}
interface NicheElement { id; kind: 'niche'; wall: WallId; rect: Rect; depth: number }
interface OpeningElement { id; kind: 'opening'; wall: WallId; rect: Rect }  // drzwi/okno — nigdy kafelkowane

interface TileType { id; name; width; height; color: string; rotatable: boolean }
interface TileRegion { id; surfaceId: SurfaceId; rect: Rect; tileTypeId; name? }
interface Settings { groutWidth: 0.2; wastePercent: 10; minOffcut: 5 }  // domyślne
```

**Drzwi/okna wchodzą do v1** — każda łazienka ma drzwi; bez nich każdy szacunek ściany jest ~1.8 m² za wysoki, a koszt to tylko dodatkowy otwór w ścianie (ościeża poza zakresem, udokumentowane).

## Derywacja powierzchni (`src/geometry/surfaces.ts`) — ryzyko nr 1

```ts
interface Surface {
  id: SurfaceId;   // DETERMINISTYCZNE: 'wall:north', 'floor', 'el:<id>:front', 'niche:<id>:back'…
  origin: Vec3; u: Vec3; v: Vec3; normal: Vec3;  // własny Vec3, NIE three.Vector3
  width; height; holes: Rect[];                  // otwory mogą się nakładać
  source; tileableByDefault: boolean;            // sufit → false
}
```

Konwencja lokalna ścian (przybita testami): **u = w lewo→prawo patrząc z wnętrza, v = od podłogi w górę, normal do wnętrza.** Jedna tabela w `surfaces.ts` koduje origin/u/v dla 4 ścian + podłogi/sufitu.

Kolejność w `deriveSurfaces`:
1. 6 powierzchni pokoju (sufit nie-kafelkowany, tylko do renderu).
2. Otwory (drzwi/okna) → dziury w ścianie-hoście.
3. Wnęki → dziura w ścianie + 5 powierzchni wnętrza (tył `w×h`, boki `depth×h`, półki `w×depth`).
4. Boxy → do 6 powierzchni ścianek + **rozwiązywanie kontaktu**: ścianka boxu koplanarna (± EPS) z powierzchnią pokoju i nachodząca na nią → ścianka boxu stłumiona, a prostokąt kontaktu wybity jako dziura w powierzchni pokoju. To załatwia: zabudowę wanny przy 2 ścianach, ściankę działową dobitą do ściany, footprint każdego boxu w podłodze („cała podłoga" automatycznie netto od wanny). Kontakt box↔box NIE jest rozwiązywany (bez CSG) — udokumentowane ograniczenie + nieblokujące ostrzeżenie o nakładaniu AABB.
5. V1: wnęki/otwory tylko na 4 ścianach pokoju (nie na ściankach działowych) — punkt rozszerzenia zaznaczony w kodzie.

Odporność: deterministyczne id powierzchni (regiony przeżywają re-derywację), kasowanie elementu kaskadowo usuwa jego regiony (akcja store) + defensywny filtr sierot w selektorach; zmiana wymiarów pokoju → clamp regionów/otworów + ostrzeżenie, nigdy crash.

`src/geometry/rect.ts`: `intersect`, `contains`, `clampToBounds` i kluczowe `areaMinusHoles(rect, holes)` z **nakładającymi się** otworami — przez kompresję współrzędnych (sweep siatki komórek), dokładne, ~30 linii. Plus `subtractToCells` reużywane przez silnik układu.

## Silnik obliczeń (`src/calc/`) — czysty TS, bez React/three

Wyniki: `RegionCalcResult` (net m², tryb, fullTiles/cutCells/cutsServedByOffcuts/newTilesForCuts/totalTiles), `TileTypeSummary` (suma sztuk, `tilesWithWaste = ceil(total*(1+waste/100))`, purchase m²), `ProjectCalcResult` z `warnings[]`.

**Tryb prosty (`simple.ts`):** `netArea = areaMinusHoles(region ∩ surface, holes)`; `tiles = ceil(netCm2*(1+waste/100)/(tw*th))`. Fuga celowo ignorowana (konserwatywnie). Jeden wspólny `wastePercent`; w trybie układu działa jako rezerwa na stłuczenia nakładana na dokładny wynik.

**Symulacja układu (`layout.ts`) — ryzyko nr 2.** `simulateRegion({width, height, holes, tile, grout, minOffcut, pattern: 'grid'})` — tylko `'grid'`; cegiełka to przyszła wartość `pattern`. Algorytm (założenia w doc-commencie, w UI etykieta „szacunek"):
1. Siatka od narożnika (0,0), `pitch = tile + grout`, komórki przycinane do regionu.
2. Per komórka `visible = komórka ∩ region − holes`: pusta → nic; pełna płytka bez dziur → **pełna**; inaczej → **docinka** o zapotrzebowaniu = *bounding box* części widocznej (dziura w środku płytki = zużyta cała płytka bez ścinki — poprawne dla przejść rur; L-kształt przy narożniku wnęki = lekko pesymistyczne, udokumentowane).
3. **Ponowne użycie ścinek — zachłanny first-fit w obrębie regionu:** popyt malejąco po polu; kosz ścinek; dopasowanie z rotacją 90° jeśli `rotatable`; cięcie gilotynowe daje 2 resztki, do kosza trafiają te z oboma wymiarami ≥ `minOffcut`. Deterministyczne, nigdy nie zaniża.
4. `engine.ts` → `calculateProject(project, surfaces, mode)`: przycina regiony do powierzchni, tłumaczy otwory na lokalne współrzędne regionu, agreguje per typ płytki, emituje ostrzeżenia (regiony nachodzące, sieroty, płytka większa niż region…).

## Scena 3D (`src/scene/`)

Skala: cm × `0.01` na poziomie meshy (stała `SCALE`). Drzewo: `<SceneRoot>` (Canvas, światła, OrbitControls z targetem w środku pokoju) → `<RoomShell>` → `<ElementMeshes>` → `<RegionMeshes>` → opcjonalny `<GroutGrid>` (linie co pitch płytki, nice-to-have M7).

- `SurfaceMesh`: `THREE.ShapeGeometry` z obrysu + `Path` dla dziur (`shapeFromOutline.ts` robi Shape + Matrix4 z origin/u/v/normal). Meshe **jednostronne z normalnymi do wnętrza** → back-face culling daje efekt „domku dla lalek" za darmo (bliższe ściany i sufit znikają przy orbitowaniu z zewnątrz), zero logiki widoczności.
- `RegionMesh`: geometria `rect − (holes ∩ rect)`, offset +0.2 cm wzdłuż normalnej + `polygonOffset` (anty z-fighting); kolor = kolor typu płytki, opacity ~0.95; hover → rozjaśnienie, selekcja → `<Edges>` z drei.
- Picking: zwykłe eventy R3F `onClick`/`onPointerOver` z `stopPropagation` (region wygrywa z powierzchnią-hostem); klik gołej powierzchni → panel „Kafelkuj całą" / „Dodaj region". Bez ręcznego raycastingu.
- Geometrie memoizowane; derywacja cache'owana w selektorze — orbitowanie nic nie przelicza.

## UI (`src/ui/`) — ręczny CSS (flexbox + zmienne), bez bibliotek komponentów

- **Toolbar**: nazwa projektu, „Dodaj element" (Ścianka / Wnęka / Wanna z zabudową / Zabudowa / Drzwi‑okno), ustawienia (fuga, % zapasu, min. ścinka), Export/Import JSON, przełącznik PL/EN.
- **Lewy panel** (~320 px): drzewo sceny (Pokój, Elementy, Typy płytek, Regiony pogrupowane po powierzchni), selekcja zsynchronizowana z 3D, poniżej formularz właściwości — wspólny `NumberField` (cm, min/max/step, walidacja inline: dodatnie, w granicach hosta; nakładanie = ostrzeżenie, nie blokada; geometria niemożliwa = clamp).
- **Środek**: canvas R3F.
- **Dolny panel zwijany**: tabela wyników — przełącznik Prosty/Układ, wiersze per typ płytki (nazwa, chip koloru, net m², sztuki, sztuki+zapas, m² zakupu), rozwijany breakdown per region (w trybie układu kolumny pełne/docinki/ze ścinek), suma, ostrzeżenia, przypis „szacunek".
- Flow regionu: klik powierzchni w 3D → wymiary w panelu → „Kafelkuj całą" (pełnowymiarowy rect, bez specjalnej flagi) lub „Dodaj region" (x/y/w/h) → wybór typu płytki (dropdown z „+ nowy typ").

## Stan (`src/state/`)

Jeden store Zustand; `project` jako czysty serializowalny slice aktualizowany immutably (to czyni przyszłe undo trywialnym):
- `project`, `selection {kind, id}`, `hover`, `ui {calcMode, resultsOpen}`; akcje CRUD z kaskadami (usunięcie elementu/typu → czyszczenie regionów).
- `selectors.ts`: `getSurfaces(project)` i `getResults(project, mode)` za memo po referencji — jedna derywacja na zmianę projektu, współdzielona przez scenę/panele/wyniki.
- **Undo: odroczone do v2** (ścieżka: `zundo` temporal middleware — zmiana jednoplikowa dzięki immutable slice).
- **Autosave** (`persistence.ts`): `store.subscribe` na slice projektu, debounce 500 ms → `localStorage['plytkomat:project']` w kopercie `{schemaVersion, savedAt, project}`. Boot: parse → walidacja → load; przy błędzie surowy payload do `:backup` i start z `defaultProject()`.
- **Export/import**: ta sama koperta; Blob + `<a download>`; `<input type="file">`. Walidacja **zod** (`src/model/schema.ts`) — jedyna „dodatkowa" zależność, uzasadniona: import to niezaufane wejście. `migrateProject(raw)` — switch po `schemaVersion` (mechanizm wersjonowania).

## i18n (`src/i18n/`)

**i18next + react-i18next**, zasoby inline (`pl.json`, `en.json`), bez pluginów backend/detector — język z `localStorage` z fallbackiem na `navigator.language`, domyślnie polski. Uzasadnienie ponad ręcznym `t()`: poprawna polska liczba mnoga (1 płytka / 2 płytki / 5 płytek) przez `Intl.PluralRules` — tabela wyników używa tego stale. Wszystkie stringi kluczowane od M1.

## Struktura projektu i zależności

```
plytkomat/
  index.html  vite.config.ts  tsconfig.json (strict)  package.json  .nvmrc (22)
  src/
    main.tsx  App.tsx
    model/    types.ts  defaults.ts  schema.ts  ids.ts
    geometry/ vec.ts  rect.ts  surfaces.ts        // czyste, bez three
    calc/     types.ts  simple.ts  layout.ts  engine.ts  // czyste, bez three
    state/    store.ts  selectors.ts  persistence.ts
    scene/    SceneRoot.tsx  SurfaceMesh.tsx  RegionMesh.tsx  shapeFromOutline.ts  GroutGrid.tsx
    ui/       Layout.tsx  Toolbar.tsx  SidePanel.tsx  ResultsPanel.tsx  NumberField.tsx  styles.css
              forms/ RoomForm ElementForm RegionForm TileTypeForm SettingsForm
    i18n/     index.ts  pl.json  en.json
  e2e/smoke.spec.ts   // opcjonalny Playwright
```

Deps: `react react-dom three @react-three/fiber @react-three/drei zustand i18next react-i18next zod`; dev: `typescript vite @vitejs/plugin-react vitest @types/three` (+ opc. `@playwright/test`). Testy kolokowane: `src/geometry/*.test.ts`, `src/calc/*.test.ts`.

## Kamienie milowe (każdy kończy się działającą apką)

- **M0 – Scaffold**: `npm create vite@latest . -- --template react-ts`, zależności, konfiguracja Vitest, `.nvmrc`. `npm run dev` i `npm run build` przechodzą.
- **M1 – Pokój + orbit**: typy modelu, defaults, store, RoomForm, 6 płaszczyzn pokoju (bez dziur), OrbitControls z cullingiem „domku". Efekt: edycja wymiarów, orbitowanie.
- **M2 – Derywacja powierzchni + otwory** *(wypalanie ryzyka)*: `rect.ts` (w tym area przez kompresję współrzędnych), pełne `deriveSurfaces` (pokój + otwory + wnęki) **z kompletem testów tej warstwy przed jakimkolwiek renderem/calc**; render ścian z dziurami i wnętrz wnęk. Efekt: drzwi i wnęka widoczne w 3D.
- **M3 – Elementy box**: formularze + defaulty palety, tłumienie kontaktów + auto-dziury (ściana/podłoga), lista elementów, selekcja/hover, kaskadowe kasowanie. Efekt: pełna parametryczna łazienka.
- **M4 – Typy płytek + regiony**: CRUD typów, flow tworzenia regionu (klik → cała/część), kolorowe `RegionMesh`, ostrzeżenia o nakładaniu. Efekt: kolorowa wizualizacja 3D.
- **M5 – Obliczenia proste**: `simple.ts` + `engine.ts` + ResultsPanel (tryb prosty), testy. Efekt: użyteczny estymator.
- **M6 – Symulacja układu**: `layout.ts` (siatka + kosz ścinek), breakdown per region w UI, przełącznik trybu, testy układu. Efekt: oba tryby.
- **M7 – Persystencja, i18n, szlif, deploy**: autosave + export/import + zod, i18next z pełnymi słownikami pl/en + przełącznik, GroutGrid (nice-to-have), README z instrukcją CF Pages, opcjonalny smoke Playwright, finalny `npm run build && npm run preview`.

Po każdym milestone: commit na branch `claude/bathroom-tile-calculator-3d-ob6831`, push na koniec pracy.

## Testy i weryfikacja

**Vitest — geometria:**
- `areaMinusHoles`: bez dziur; jedna; dwie **nakładające się** (bez podwójnego odejmowania); dziura częściowo poza rectem (clip); dziura kryjąca wszystko → 0.
- `deriveSurfaces`: pokój 300×200×250 → 6 powierzchni z przybitymi origin/u/v/normal (blokuje konwencję orientacji); drzwi 90×205 przy x=20 na north → dziura, zero nowych powierzchni; wnęka 60×30 gł. 10 przy (100,90) → dziura `{100,90,60,30}` + 5 ścian o wymiarach tył 60×30, boki 10×30, półki 60×10 z poprawnym osadzeniem; ścianka 120×250×10 dobita do west → stłumiona ścianka czołowa + dziura-pasek 10×250 w west + footprint w podłodze; zabudowa wanny 170×55×60 w narożniku → 2 kontakty ze ścianami + podłogą stłumione/wybite, top nieobecny, zostają 2 powierzchnie; box z `faces.top: true` (murek geberit) emituje top.

**Vitest — obliczenia:**
- Prosty: region 200×100, płytka 60×30, zapas 10% → net 2.0 m², `ceil(2.2/0.18) = 13` szt., 2.2 m² zakupu; zapas 0 → 12.
- Układ, kanoniczny przypadek liczony ręcznie: 200×100, 60×30, fuga 0.2 → siatka 4×4, 9 pełnych, 7 docinek (3× 19.4×30, 3× 60×9.4, 1× 19.4×9.4); z `minOffcut 5` zachłanny algorytm → 3 nowe płytki na docinki → **12 razem** (asercje na dokładne liczby pośrednie — przybijają algorytm).
- Ścinki: region 80×60, płytka 60×30, fuga 0 → 2 pełne + 2 docinki 20×30; resztka 40×30 z pierwszego cięcia obsługuje drugą → **3 płytki** (4 bez reuse); wariant `rotatable: false` asertuje różnicę.
- Dziury: 200×100 z dziurą 60×30 przy (70,35) → net 1.82 m²; komórki w pełni zakryte pomijane, częściowo → docinki; dziura ściśle wewnątrz komórki → docinka zużywająca całą płytkę bez kredytu ścinki.
- Krawędzie: płytka większa niż region → 1 docinka; fuga 0; region zdegenerowany (w=0) → 0 + warning; dokładne dopasowanie (region 180.6, płytka 60/fuga 0.2) → 3 kolumny, bez fantomowej 4. (test EPS).

**Ręcznie w przeglądarce** per milestone (`npm run dev`): orbit, picking, clampy formularzy, autosave po reload, round-trip export→import, PL↔EN. **Build**: `npm run build && npm run preview` w M7. **Opcjonalny Playwright smoke** (chromium preinstalowany): apka wstaje na `vite preview`, canvas obecny, dodanie wnęki przez UI aktualizuje drzewo, panel wyników pokazuje liczbę, export odpala download.

## Deploy — Cloudflare Pages

Czysty statyczny output Vite, zero kodu serwerowego. Integracja git w CF Pages: preset **Vite**, build `npm run build`, output `dist`, Node przez `.nvmrc` (22). Bez `wrangler.toml`; bez `_redirects` (brak routera — notka w README: przy dodaniu routera dodać `/* /index.html 200`). `base: '/'`. README dokumentuje: podłącz repo → ustaw build/output → gotowe + lokalny `build && preview` jako pre-check.

## Rejestr ryzyk

1. **`deriveSurfaces`** (wnęki + kontakty boxów) — mitygacja: tylko osiowe recty, czysty moduł bez three, deterministyczne id, komplet testów w M2 zanim cokolwiek na tym polega.
2. **Silnik układu** (dziury + ścinki) — mitygacja: precyzyjnie udokumentowany greedy (bbox popytu, resztki gilotynowe, first-fit malejąco), jedna stała EPS, ręcznie policzone wartości w testach, etykieta „szacunek" w UI.
3. **Nakładające się dziury** — rozwiązane strukturalnie kompresją współrzędnych.
4. **Stabilność region↔powierzchnia przy edycjach** — deterministyczne id + kaskady + filtr sierot + clamp-and-warn.
5. Poza zakresem v1 (w README): pokoje nieprostokątne, rotacje, CSG box↔box, układy z przesunięciem (punkt rozszerzenia: parametr `pattern`), ościeża drzwi, undo (zarezerwowana ścieżka zundo), zaokrąglanie do pełnych opakowań.
