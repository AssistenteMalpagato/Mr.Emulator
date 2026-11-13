import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { looksLikeDiscImage, looksLikeRawDump } from '../src/main/naomi'
import { biosStatus } from '../src/main/diagnostics'
import { SYSTEMS } from '../src/main/systems'
import { BIOS_SETS } from '../src/main/scanner'
import type { Settings } from '../src/shared/types'

const sys = (id: string) => SYSTEMS.find((s) => s.id === id)!

test('Naomi/Atomiswave: anche i file grezzi .dat .bin .lst compaiono in elenco', () => {
  for (const id of ['naomi', 'atomiswave']) for (const ext of ['.dat', '.bin', '.lst', '.zip', '.7z']) assert.ok(sys(id).extensions.includes(ext), `${id} ${ext}`)
  // i BIOS di Flycast non sono giochi
  for (const n of ['naomi', 'awbios', 'naomi2', 'hod2bios']) assert.ok(BIOS_SETS.has(n))
})

test('archivio con dentro solo un .dat/.bin = immagine grezza, non un set MAME', () => {
  assert.equal(looksLikeRawDump(['Death Crimson OX.dat']), true)
  assert.equal(looksLikeRawDump(['gioco.bin', 'gioco.lst']), true)
  assert.equal(looksLikeRawDump(['epr-23605.ic22', 'mpr-23528.ic1', 'mpr-23529.ic2']), false)
  assert.equal(looksLikeRawDump(['cartella/', 'cartella/x.dat']), true)
  assert.equal(looksLikeRawDump([]), false)
  assert.equal(looksLikeRawDump(['readme.txt']), false)
})

test('BIOS di Flycast: contano solo in bios\\dc; se stanno altrove la Diagnostica lo dice', () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-naomi-'))
  const s = { biosDir: root } as Settings
  const rule = { systemId: 'naomi', name: 'Sega Naomi', anyOf: ['naomi.zip'], where: 'bios\\dc', note: '' }
  writeFileSync(join(root, 'naomi.zip'), 'x')
  let r = biosStatus(s, [rule])[0]
  assert.equal(r.found, null)
  assert.equal(r.misplaced, join(root, 'naomi.zip'))
  mkdirSync(join(root, 'dc'))
  writeFileSync(join(root, 'dc', 'naomi.zip'), 'x')
  r = biosStatus(s, [rule])[0]
  assert.equal(r.found, 'naomi.zip')
  // le regole non-Flycast restano flessibili (PlayStation in bios\ o in sottocartelle)
  writeFileSync(join(root, 'scph5501.bin'), 'x')
  assert.equal(biosStatus(s, [{ systemId: 'psx', name: 'PS', anyOf: ['scph5501.bin'], where: 'bios', note: '' }])[0].found, 'scph5501.bin')
})

test('archivio con dentro un disco (.cue/.gdi) = immagine di disco, non un set MAME', () => {
  assert.equal(looksLikeDiscImage(['Gioco (Track 1).bin', 'Gioco (Track 2).bin', 'Gioco.cue']), true)
  assert.equal(looksLikeDiscImage(['disc.gdi', 'track01.bin']), true)
  assert.equal(looksLikeDiscImage(['epr-23605.ic22', 'mpr-23528.ic1']), false)
})

test('MAME: i giochi del driver naomi.cpp hanno la famiglia Naomi / Atomiswave', async () => {
  const { familyOf } = await import('../src/main/mame')
  const m = { name: 'hotd2', description: 'The House of the Dead 2', year: '1999', manufacturer: 'Sega', cloneof: undefined, driver: 'naomi.cpp', bios: false, device: false, mechanical: false, runnable: true, status: 'good' }
  assert.equal(familyOf(m as never, new Map()), 'Naomi / Atomiswave')
})

test('nome macchina MAME: solo lettere, cifre e underscore, mai un\'opzione', async () => {
  const { isMachineName } = await import('../src/main/machineName')
  for (const ok of ['hotd2', 'vs2_2k', '1942', 'ggxxsla']) assert.equal(isMachineName(ok), true, ok)
  for (const bad of ['-autoboot_script', '--help', '../x', 'a b', '', 'a/b', 'a\b', 'x'.repeat(65)]) assert.equal(isMachineName(bad), false, bad)
  assert.equal(isMachineName(undefined), false)
})
