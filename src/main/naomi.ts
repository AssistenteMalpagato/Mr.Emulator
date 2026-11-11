import { spawnSync } from 'child_process'

/** Estensioni delle immagini "grezze" che Flycast sa caricare solo direttamente (non dentro un archivio) */
const RAW_DUMP = /\.(dat|bin|lst)$/i

/**
 * Un archivio che contiene soltanto uno o due file .dat/.bin/.lst è un'immagine grezza, non un set MAME
 * (i set MAME hanno molti file con nomi come epr-23605.ic22, mpr-…): Flycast lo scarta.
 */
export function looksLikeRawDump(names: string[]): boolean {
  const files = names.map((n) => n.trim()).filter((n) => n && !/[\\/]$/.test(n))
  return files.length > 0 && files.length <= 2 && files.every((n) => RAW_DUMP.test(n))
}

/** Elenco dei file dentro uno ZIP o 7z con il programma "tar" di Windows 10/11; null se non si riesce a leggere */
export function archiveNames(file: string): string[] | null {
  try {
    const r = spawnSync('tar', ['-tf', file], { encoding: 'utf-8', timeout: 15000, windowsHide: true })
    if (r.status !== 0 || typeof r.stdout !== 'string') return null
    return r.stdout.split(/\r?\n/).filter(Boolean)
  } catch {
    return null
  }
}
