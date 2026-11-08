import { existsSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import type { FolderMatch } from '@shared/types'
import { SYSTEMS } from './systems'

/** Nome senza maiuscole, spazi né simboli: "Super Nintendo" e "super_nintendo" diventano uguali */
export const normFolder = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Altri nomi con cui la gente chiama le cartelle di ogni sistema (già normalizzati) */
const ALIASES: Record<string, string[]> = {
  arcade: ['fbneo', 'fba', 'finalburn', 'finalburnneo'],
  neogeo: ['neogeoaes', 'neogeomvs', 'snkneogeo'],
  mastersystem: ['sms', 'segamastersystem'],
  megadrive: ['genesis', 'segagenesis', 'segamegadrive', 'md'],
  nes: ['famicom', 'nintendones', 'nintendoentertainmentsystem'],
  snes: ['sfc', 'superfamicom', 'supernintendo', 'supernes', 'supernintendoentertainmentsystem'],
  gamegear: ['gg', 'segagamegear'],
  pce: ['pcengine', 'necpcengine'],
  tg16: ['turbografx16', 'turbografx'],
  sgx: ['supergrafx', 'pcenginesupergrafx'],
  sg1000: ['segasg1000'],
  fds: ['famicomdisksystem'],
  ngp: ['neogeopocket', 'ngpc'],
  coleco: ['colecovision'],
  spectrum: ['zxspectrum', 'sinclairzxspectrum'],
  channelf: ['fairchildchannelf'],
  astrocade: ['ballyastrocade'],
  gb: ['gameboy', 'nintendogameboy'],
  gbc: ['gameboycolor', 'nintendogameboycolor'],
  gba: ['gameboyadvance', 'nintendogameboyadvance'],
  dreamcast: ['dc', 'segadreamcast'],
  naomi: ['seganaomi'],
  atomiswave: ['sammyatomiswave'],
  psx: ['ps1', 'playstation', 'sonyplaystation', 'psone'],
  n64: ['nintendo64'],
  nds: ['ds', 'nintendods'],
  jaguar: ['atarijaguar'],
  '3do': ['panasonic3do']
}

export interface Detection {
  /** Sistemi riconosciuti, con la cartella reale (anche se si chiama come quella standard) */
  found: FolderMatch[]
  /** Cartelle presenti che non corrispondono a nessun sistema */
  unknown: string[]
  /** Solo i sistemi la cui cartella ha un nome diverso da quello standard (da ricordare nelle impostazioni) */
  overrides: Record<string, string>
}

/** Quanti file (non cartelle) ci sono al primo livello: un'idea di quanti giochi ci sono */
function countFiles(dir: string): number {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).length
  } catch {
    return 0
  }
}

/** Legge una cartella di giochi esistente e riconosce da sola le cartelle dei sistemi, senza creare né spostare nulla */
export function detectFolders(romsDir: string, list: (d: string) => string[] = listDirs): Detection {
  const dirs = romsDir ? list(romsDir) : []
  const taken = new Set<string>()
  const found: FolderMatch[] = []
  const overrides: Record<string, string> = {}
  const byNorm = new Map(dirs.map((d) => [normFolder(d), d]))
  // prima i nomi standard (hanno la precedenza), poi gli altri nomi
  for (const pass of [0, 1]) {
    for (const sys of SYSTEMS) {
      if (found.some((f) => f.id === sys.id)) continue
      const names = pass === 0 ? [normFolder(sys.folder)] : (ALIASES[sys.id] ?? [])
      const hit = names.map((n) => byNorm.get(n)).find((d): d is string => !!d && !taken.has(d))
      if (!hit) continue
      taken.add(hit)
      found.push({ id: sys.id, name: sys.name, folder: hit, files: countFiles(join(romsDir, hit)) })
      // su Windows maiuscole e minuscole non contano: si ricorda solo un nome davvero diverso
      if (hit.toLowerCase() !== sys.folder.toLowerCase()) overrides[sys.id] = hit
    }
  }
  return { found, unknown: dirs.filter((d) => !taken.has(d)), overrides }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

/** Cartella dei BIOS già esistente accanto alle ROM o dentro: "bios" in qualsiasi maiuscola; vuoto se non c'è */
export function findBiosDir(romsDir: string, list: (d: string) => string[] = listDirs, exists: (p: string) => boolean = existsSync): string {
  for (const base of [dirname(romsDir), romsDir]) {
    const hit = list(base).find((d) => d.toLowerCase() === 'bios')
    if (hit && exists(join(base, hit))) return join(base, hit)
  }
  return ''
}
