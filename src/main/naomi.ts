import { spawn, spawnSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

import type { Game } from '@shared/types'
import { mt } from './mt'
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

/** Il tar di Windows (bsdtar) legge anche i 7z; quello di Git, che può stare prima nel PATH, no */
const tarBin = (): string => {
  const win = join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe')
  return process.platform === 'win32' && existsSync(win) ? win : 'tar'
}

/** Elenco dei file dentro uno ZIP o 7z con il programma "tar" di Windows 10/11; null se non si riesce a leggere */
export function archiveNames(file: string): string[] | null {
  try {
    const r = spawnSync(tarBin(), ['-tf', file], { encoding: 'utf-8', timeout: 15000, windowsHide: true })
    if (r.status !== 0 || typeof r.stdout !== 'string') return null
    return r.stdout.split(/\r?\n/).filter(Boolean)
  } catch {
    return null
  }
}

/**
 * Un archivio che contiene un'immagine di disco (.cue/.gdi/.iso con le sue tracce) non è un set MAME:
 * Flycast non apre gli archivi con dentro un disco, vuole il .cue/.gdi/.chd estratto.
 */
export function looksLikeDiscImage(names: string[]): boolean {
  return names.some((n) => /\.(cue|gdi|iso)$/i.test(n.trim()))
}
