import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import type { Game, LaunchResult, Settings, SystemDef } from '@shared/types'
import { platform } from './platform'
import { systemDir } from './paths'
import { archiveNames, looksLikeDiscImage, looksLikeRawDump } from './naomi'
import { mt } from './mt'

/** Avvia RetroArch con il core giusto. Chiama onExit quando il gioco si chiude. */
export function launchGame(
  game: Game,
  system: SystemDef,
  settings: Settings,
  /** Testo del file di configurazione aggiuntivo di RetroArch (generato dai profili) */
  configText: string,
  onStart: () => void,
  onExit: () => void
): LaunchResult {
  if (game.demo) return { ok: false, error: mt('Questo è un gioco di esempio. Imposta la cartella ROM nelle impostazioni.') }
  if (!system.core) return { ok: false, error: mt('{name} non è ancora supportato.', { name: system.name }) }
  if (!settings.retroarchPath || !existsSync(settings.retroarchPath)) {
    return { ok: false, error: mt('RetroArch non trovato. Indica il percorso di retroarch.exe nelle impostazioni.') }
  }
  const coresDir = settings.coresDir || join(dirname(settings.retroarchPath), 'cores')
  const corePath = join(coresDir, system.core + platform.coreExt)
  if (!existsSync(corePath)) {
    return { ok: false, error: mt('Core mancante: {file}. Installalo da RetroArch (Carica core > Scarica un core).', { file: system.core + platform.coreExt }) }
  }
  if (!existsSync(game.path)) return { ok: false, error: mt('File del gioco non trovato.') }

  if (system.id === 'neogeo') {
    const dirs = [dirname(game.path), systemDir(system, settings), settings.biosDir, join(settings.biosDir, 'fbneo')]
    if (!dirs.some((d) => d && existsSync(join(d, 'neogeo.zip')))) {
      return {
        ok: false,
        error: mt('Manca neogeo.zip (il BIOS Neo Geo). Copialo nella cartella roms\\{folder} insieme ai giochi, oppure in bios\\fbneo.', { folder: system.folder })
      }
    }
  }

  // BIOS delle console a disco: senza, il core si chiude subito e l'utente non capisce perché
  const has = (...names: string[]): boolean =>
    [settings.biosDir, join(settings.biosDir, 'dc'), dirname(game.path)].some((d) => d && names.some((n) => existsSync(join(d, n))))
  if (system.id === 'psx' && !has('scph5501.bin', 'scph5500.bin', 'scph5502.bin', 'scph1001.bin', 'scph7001.bin')) {
    return { ok: false, error: mt('Manca il BIOS PlayStation (per esempio scph5501.bin). Copialo nella cartella bios.') }
  }
  // Flycast (Dreamcast, Naomi, Atomiswave) cerca i BIOS solo in <bios>\dc: un file messo altrove non lo trova
  const hasDc = (name: string): boolean => existsSync(join(settings.biosDir, 'dc', name))
  if (system.id === 'dreamcast' && !hasDc('dc_boot.bin')) {
    return { ok: false, error: mt('Manca il BIOS Dreamcast (dc_boot.bin, più dc_flash.bin). Copiali nella cartella bios\\dc.') }
  }
  if (system.id === 'naomi' && !hasDc('naomi.zip')) {
    return { ok: false, error: mt('Manca il BIOS Naomi (naomi.zip). Copialo nella cartella bios\\dc: Flycast lo cerca solo lì.') }
  }
  if (system.id === 'atomiswave' && !hasDc('awbios.zip')) {
    return { ok: false, error: mt('Manca il BIOS Atomiswave (awbios.zip). Copialo nella cartella bios\\dc: Flycast lo cerca solo lì.') }
  }
  // Naomi/Atomiswave: uno ZIP o 7z con dentro un solo .dat/.bin non è un set MAME e Flycast lo scarta
  if ((system.id === 'naomi' || system.id === 'atomiswave') && /\.(zip|7z)$/i.test(game.path)) {
    const names = archiveNames(game.path)
    if (names && looksLikeDiscImage(names)) {
      return { ok: false, error: mt('Questo archivio contiene un disco intero (.cue/.gdi), non un set MAME: Flycast non riesce ad avviare questi dump di GD-ROM Naomi. Servono i file nel formato dei set MAME.') }
    }
    if (names && looksLikeRawDump(names)) {
      return { ok: false, error: mt('Questo archivio contiene solo un file {ext}, non un set MAME. Per {name} serve uno ZIP con i file del set (nomi tipo epr-…, mpr-…), oppure il file {ext} estratto e messo direttamente nella cartella del sistema.', { ext: (/\.(\w+)$/.exec(names[0])?.[0] ?? '.dat').toLowerCase(), name: system.name }) }
    }
  }

  // configurazione su misura per questo PC, questo schermo e questo sistema
  const cfg = join(app.getPath('userData'), 'retroarch-mr.cfg')
  mkdirSync(dirname(cfg), { recursive: true })
  writeFileSync(cfg, configText, 'utf-8')
  // registro di RetroArch dell'ultima partita: serve a capire cosa è successo (per esempio ai salvataggi)
  const args = ['-L', corePath, game.path, '--appendconfig', cfg, '--verbose', '--log-file', join(app.getPath('userData'), 'retroarch-last.log')]

  try {
    const child = spawn(settings.retroarchPath, args, { cwd: dirname(settings.retroarchPath), stdio: 'ignore' })
    // 'error' e 'exit' possono scattare entrambi: il ritorno al launcher deve avvenire una volta sola
    let ended = false
    const end = (): void => {
      if (ended) return
      ended = true
      onExit()
    }
    child.once('spawn', onStart)
    child.once('error', end)
    child.once('exit', end)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
