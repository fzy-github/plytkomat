import { makeEnvelope, migrateProject } from '../model/schema'
import type { Project } from '../model/types'

const STORAGE_KEY = 'plytkomat:project'
const BACKUP_KEY = 'plytkomat:project:backup'
const AUTOSAVE_DEBOUNCE_MS = 500

/**
 * Wczytuje projekt z localStorage; przy nieparsowalnych/niewalidnych danych
 * odkłada surowy payload do klucza backup i zwraca null (start od domyślnego).
 */
export function loadStoredProject(): Project | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    return migrateProject(JSON.parse(raw))
  } catch {
    localStorage.setItem(BACKUP_KEY, raw)
    return null
  }
}

export function saveProject(project: Project): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeEnvelope(project)))
}

interface ProjectStore {
  subscribe: (
    listener: (state: { project: Project }, prev: { project: Project }) => void,
  ) => () => void
}

/** Autozapis: subskrypcja na slice projektu z debounce 500 ms. */
export function initAutosave(store: ProjectStore): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return store.subscribe((state, prev) => {
    if (state.project === prev.project) return
    clearTimeout(timer)
    timer = setTimeout(() => saveProject(state.project), AUTOSAVE_DEBOUNCE_MS)
  })
}

/**
 * Nazwa pliku bezpieczna między przeglądarkami: transliteracja diakrytyków
 * (NFKD + ręczne ł/Ł, które nie mają dekompozycji) i tylko [A-Za-z0-9._-] —
 * niektóre przeglądarki przy innych znakach ignorują atrybut download.
 */
function sanitizeFilename(name: string): string {
  const ascii = name
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return ascii || 'projekt'
}

/** Eksport projektu jako pobierany plik JSON. */
export function exportProjectFile(project: Project): void {
  const blob = new Blob([JSON.stringify(makeEnvelope(project), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plytkomat-${sanitizeFilename(project.name)}.json`
  // Atrybut download działa tylko dla kotwicy będącej w DOM.
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Parsuje wczytany plik; rzuca przy złych danych — wołający pokazuje błąd. */
export async function importProjectFile(file: File): Promise<Project> {
  const text = await file.text()
  return migrateProject(JSON.parse(text))
}
