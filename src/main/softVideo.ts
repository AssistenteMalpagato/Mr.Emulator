import { promises as fsp } from 'fs'
import { join, parse } from 'path'
import type { Game, SystemDef } from '@shared/types'
import { makeMatcher } from './thumbIndex'

/**
 * Cartelle di videosnaps_SL (una per Software List di MAME) da provare per ogni sistema.
 * Dove non è indicato, valgono le liste del sistema (la cartella ha lo stesso nome della lista).
 */
const EXTRA_LISTS: Record<string, string[]> = {
  megadrive: ['megadriv', '32x'],
  pce: ['pce', 'tg16'],
  tg16: ['tg16', 'pce'],
  sgx: ['pce', 'tg16'],
  ngp: ['ngp', 'ngpc'],
  psx: ['psx'],
  jaguar: ['jaguar'],
  neogeo: ['neogeo']
}
export const softVideoListsOf = (sys: Pick<SystemDef, 'id' | 'softlist'>): string[] => EXTRA_LISTS[sys.id] ?? sys.softlist ?? []

const VIDEO_EXT = ['.mp4', '.webm', '.m4v']

/** Titolo della Software List con le abbreviazioni che i DAT scrivono per esteso ("720° (USA)" = "720 Degrees (USA)") */
const spell = (desc: string): string => desc.replace(/°/g, ' degrees')
/** Solo lettere e cifre, in minuscolo: confronta "adameve" con "Adam & Eve (Asia)" */
const squeeze = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export type SoftTitles = (lists: string[]) => Promise<Map<string, string> | null>

/**
 * Filmati delle console (videosnaps_SL/<lista>/<nome breve>.mp4). Il nome breve è quello della Software List di MAME:
 * si trova dal nome del file (se è già un nome breve) oppure dal titolo del gioco, confrontato con i titoli della lista
 * ma solo tra quelli che hanno davvero un filmato.
 */
export function createSoftVideoFinder(root: string, titlesFor: SoftTitles) {
  const files = new Map<string, Promise<Map<string, string>>>()
  /** nome breve (minuscolo) -> percorso del filmato, per una lista */
  const listing = (list: string): Promise<Map<string, string>> => {
    let p = files.get(list)
    if (!p) {
      p = (async () => {
        const out = new Map<string, string>()
        let names: string[] = []
        try {
          names = await fsp.readdir(join(root, list))
        } catch {
          return out
        }
        for (const f of names) {
          const { name, ext } = parse(f)
          if (VIDEO_EXT.includes(ext.toLowerCase())) out.set(name.toLowerCase(), join(root, list, f))
        }
        return out
      })()
      files.set(list, p)
    }
    return p
  }

  type Index = { match: (title: string) => string | null; shorts: Map<string, string[]>; paths: Map<string, string>; squeezed: Array<[string, string]> }
  const indexes = new Map<string, Promise<Index>>()
  const indexFor = (lists: string[]): Promise<Index> => {
    const key = lists.join(',')
    let p = indexes.get(key)
    if (!p) {
      p = (async () => {
        const paths = new Map<string, string>()
        for (const l of lists) for (const [k, v] of await listing(l)) if (!paths.has(k)) paths.set(k, v)
        const titles = await titlesFor(lists)
        // solo i titoli che hanno un filmato: il confronto è più preciso e più veloce
        const shorts = new Map<string, string[]>()
        const squeezed: Array<[string, string]> = []
        if (titles) {
          for (const [short, raw] of titles) {
            if (!paths.has(short)) continue
            const desc = spell(raw)
            const l = shorts.get(desc)
            if (l) l.push(short)
            else shorts.set(desc, [short])
            squeezed.push([squeeze(desc), short])
          }
        }
        return { match: makeMatcher([...shorts.keys()]), shorts, paths, squeezed }
      })()
      indexes.set(key, p)
    }
    return p
  }

  return {
    /** Percorso del filmato di un gioco, o null */
    async find(game: Pick<Game, 'name' | 'fileName' | 'path' | 'machine'>, lists: string[]): Promise<string | null> {
      if (!lists.length) return null
      const idx = await indexFor(lists)
      // il file ha già il nome breve della Software List
      for (const s of [game.machine, parse(game.fileName).name, parse(game.path).name]) {
        const hit = s ? idx.paths.get(s.toLowerCase()) : undefined
        if (hit) return hit
      }
      // altrimenti dal titolo
      for (const title of [game.name, parse(game.path).name, parse(game.fileName).name]) {
        const desc = title ? idx.match(spell(title)) : null
        const short = desc ? idx.shorts.get(desc)?.[0] : undefined
        const hit = short ? idx.paths.get(short) : undefined
        if (hit) return hit
      }
      // nome di file abbreviato ("adameve"): vale solo se è l'inizio di un unico titolo con filmato (almeno 6 caratteri)
      const q = squeeze(parse(game.fileName).name)
      if (q.length >= 6) {
        const hits = new Set<string>()
        for (const [sq, short] of idx.squeezed) if (sq.startsWith(q)) hits.add(short)
        if (hits.size === 1) return idx.paths.get([...hits][0]) ?? null
      }
      return null
    }
  }
}
