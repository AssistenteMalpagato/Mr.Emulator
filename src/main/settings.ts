import { app } from 'electron'
import { join, dirname, basename, isAbsolute } from 'path'
import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'fs'
import { writeFileAtomic } from './atomic'
import type { Settings } from '@shared/types'
import { setMainLang } from './mt'

const DEFAULTS: Settings = {
  romsDir: '',
  biosDir: '',
  retroarchPath: '',
  coresDir: '',
  fullscreen: true,
  downloadArt: true,
  lightEffects: false,
  perfMode: 'auto',
  imageStyle: 'fit',
  autoTune: true,
  tuning: {},
  gameMonitor: 0,
  dedicatedGpu: true,
  inputScheme: 'laptop',
  arcadeLayout: 'standard',
  showUnsupported: false,
  mamePath: '',
  mameChdDir: '',
  hideBadRoms: false,
  launchFix: {},
  launchFloor: 0,
  mediaDir: '',
  datDir: '',
  hiddenSystems: [],
  customControls: null,
  padExit: 'start-select',
  padMenu: 'hold-start',
  firstRunDone: false,
  language: 'auto',
  titleScreen: true,
  cabinetFullscreen: false,
  imageBySystem: {},
  tate: 'off',
  overlayEnabled: false,
  overlayPath: '',
  overlayDir: '',
  savesDir: '',
  resumeConsoles: true,
  resumeArcade: {},
  folderBySystem: {},
  cacheDir: '',
  consoleImagesPath: '',
  cacheMaxGb: 0,
  sharpness: 'off',
  resumeBySystem: {},
  raEnabled: false,
  raUser: '',
  raPassword: '',
  raHardcore: false,
  cheatsAuto: false,
  cheatsDir: '',
  hiscore: true,
  autoCovers: false,
  groupDiscs: true,
  checkUpdates: true,
  uiStyle: 'comic',
  stylizePhotos: true,
  overlayBySystem: {},
  theme: 'fighter',
  crtShader: 'auto',
  cabinetAutostart: false,
  cabinetHideCursor: false,
  cabinetLockClose: false,
  videoPreview: true,
  musicVolume: 0.5,
  mameRomDir: '',
  soundOn: true,
  soundVolume: 0.4,
  attractSeconds: 90,
  launchAnimation: true,
  favorites: [],
  recents: [],
  mameClones: false
}

const file = (): string => join(app.getPath('userData'), 'settings.json')

function readSettings(): Settings {
  // file principale, poi la copia di sicurezza; solo se entrambi sono illeggibili si riparte dai valori di default
  for (const f of [file(), `${file()}.bak`]) {
    try {
      if (existsSync(f)) return { ...DEFAULTS, ...JSON.parse(readFileSync(f, 'utf-8')) }
    } catch {
      // file corrotto: si prova con la copia
    }
  }
  return { ...DEFAULTS }
}

/** Impostazioni che contengono un percorso: vuote oppure assolute */
const PATH_KEYS = ['romsDir', 'biosDir', 'retroarchPath', 'coresDir', 'mamePath', 'mameChdDir', 'mameRomDir', 'mediaDir', 'datDir', 'overlayPath', 'overlayDir', 'savesDir', 'cacheDir', 'consoleImagesPath', 'cheatsDir'] as const
/** Gli unici due percorsi che il programma avvia: il nome del file deve essere quello di un emulatore */
const EXE_KEYS = ['retroarchPath', 'mamePath'] as const
const EXE_NAME = /retroarch|mame/i

/**
 * Controlla le impostazioni ricevute dalla finestra prima di salvarle: tipi giusti, percorsi assoluti, e per i due
 * eseguibili un nome da emulatore (così non si può far avviare un programma qualsiasi). Un valore non valido
 * lascia quello già salvato.
 */
export function sanitizeSettings(input: unknown, current: Settings): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return current
  const src = input as Record<string, unknown>
  const out: Record<string, unknown> = { ...src }
  const cur = current as unknown as Record<string, unknown>
  for (const key of Object.keys(DEFAULTS)) {
    const def: unknown = (DEFAULTS as unknown as Record<string, unknown>)[key]
    const v = src[key]
    let ok = true
    if (v === undefined) ok = false
    else if (typeof def === 'string' || typeof def === 'boolean') ok = typeof v === typeof def
    else if (typeof def === 'number') ok = typeof v === 'number' && Number.isFinite(v)
    else if (Array.isArray(def)) ok = Array.isArray(v)
    else if (def && typeof def === 'object') ok = !!v && typeof v === 'object' && !Array.isArray(v)
    if (!ok) out[key] = cur[key]
  }
  for (const key of PATH_KEYS) {
    const v = out[key]
    if (typeof v !== 'string' || v === '' || v === cur[key]) continue
    if (v.length > 1024 || v.includes('\0') || !isAbsolute(v)) out[key] = cur[key]
  }
  for (const key of EXE_KEYS) {
    const v = out[key]
    if (typeof v === 'string' && v !== '' && v !== cur[key] && !EXE_NAME.test(basename(v))) out[key] = cur[key]
  }
  return out as unknown as Settings
}

export function loadSettings(): Settings {
  const s = readSettings()
  setMainLang(s.language)
  return s
}

export function saveSettings(s: Settings): Settings {
  const merged = { ...DEFAULTS, ...s }
  mkdirSync(dirname(file()), { recursive: true })
  try {
    if (existsSync(file())) copyFileSync(file(), `${file()}.bak`)
  } catch {
    // la copia è un extra: se non riesce si salva comunque
  }
  writeFileAtomic(file(), JSON.stringify(merged, null, 2))
  setMainLang(merged.language)
  return merged
}
