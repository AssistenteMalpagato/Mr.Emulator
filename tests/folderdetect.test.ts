import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectFolders, findBiosDir, normFolder } from '../src/main/folderDetect'
import { systemDir } from '../src/main/paths'
import { SYSTEMS } from '../src/main/systems'

const sys = (id: string) => SYSTEMS.find((s) => s.id === id)!

function raccolta(nomi: string[], files: Record<string, number> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'mr-roms-'))
  for (const n of nomi) {
    mkdirSync(join(root, n))
    for (let i = 0; i < (files[n] ?? 0); i++) writeFileSync(join(root, n, `g${i}.zip`), 'x')
  }
  return root
}

test('cartelle esistenti: nomi standard e nomi comuni vengono riconosciuti senza creare nulla', () => {
  const root = raccolta(['snes', 'Genesis', 'PlayStation', 'Game Boy Advance', 'NES', 'Super Nintendo Mio', 'Documenti'], { Genesis: 3 })
  const before = ['snes', 'Genesis', 'PlayStation', 'Game Boy Advance', 'NES', 'Super Nintendo Mio', 'Documenti']
  const d = detectFolders(root)
  const byId = Object.fromEntries(d.found.map((f) => [f.id, f.folder]))
  assert.equal(byId.snes, 'snes')
  assert.equal(byId.megadrive, 'Genesis')
  assert.equal(byId.psx, 'PlayStation')
  assert.equal(byId.gba, 'Game Boy Advance')
  assert.equal(byId.nes, 'NES')
  assert.equal(d.found.find((f) => f.id === 'megadrive')?.files, 3)
  // solo i nomi diversi da quello standard si ricordano (NES = nes su Windows)
  assert.deepEqual(d.overrides, { megadrive: 'Genesis', psx: 'PlayStation', gba: 'Game Boy Advance' })
  assert.deepEqual(d.unknown.sort(), ['Documenti', 'Super Nintendo Mio'])
  // niente è stato creato
  for (const s of SYSTEMS) assert.equal(existsSync(join(root, s.folder)) && !before.map((b) => b.toLowerCase()).includes(s.folder), false)
})

test('cartelle esistenti: il nome standard ha la precedenza e una cartella non si assegna a due sistemi', () => {
  const root = raccolta(['pce', 'PC Engine', 'tg16'])
  const d = detectFolders(root)
  const byId = Object.fromEntries(d.found.map((f) => [f.id, f.folder]))
  assert.equal(byId.pce, 'pce')
  assert.equal(byId.tg16, 'tg16')
  assert.deepEqual(d.unknown, ['PC Engine'])
  assert.equal(detectFolders('').found.length, 0)
  assert.equal(detectFolders(join(tmpdir(), 'non-esiste-xyz')).found.length, 0)
})

test('cartelle esistenti: la cartella del sistema segue il nome trovato', () => {
  const s = { romsDir: 'D:\\ROM', mameRomDir: '', folderBySystem: { megadrive: 'Genesis' } }
  assert.equal(systemDir(sys('megadrive'), s), join('D:\\ROM', 'Genesis'))
  assert.equal(systemDir(sys('snes'), s), join('D:\\ROM', 'snes'))
  // MAME con la sua cartella dedicata non cambia
  assert.equal(systemDir(sys('mame'), { ...s, mameRomDir: 'E:\\mame0289' }), 'E:\\mame0289')
  assert.equal(normFolder('Super Nintendo'), 'supernintendo')
})

test('BIOS: si usa la cartella "bios" già presente (accanto alle ROM o dentro), in qualsiasi maiuscola', () => {
  const base = mkdtempSync(join(tmpdir(), 'mr-bios-'))
  const roms = join(base, 'roms')
  mkdirSync(roms)
  assert.equal(findBiosDir(roms), '')
  mkdirSync(join(base, 'BIOS'))
  assert.equal(findBiosDir(roms), join(base, 'BIOS'))
})
