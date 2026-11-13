import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSettings } from '../src/main/settings'
import type { Settings } from '../src/shared/types'

const cur = { romsDir: 'G:\\ROMset', mamePath: 'G:\\Emu\\mame.exe', retroarchPath: 'G:\\RA\\retroarch.exe', mediaDir: '', cheatsAuto: false, musicVolume: 0.5, favorites: [] } as unknown as Settings
const ch = (patch: Record<string, unknown>): Record<string, unknown> => sanitizeSettings({ ...cur, ...patch }, cur) as unknown as Record<string, unknown>

test('impostazioni: valori validi passano, anche percorsi nuovi e vuoti', () => {
  assert.equal(ch({ romsDir: 'D:\\Giochi' }).romsDir, 'D:\\Giochi')
  assert.equal(ch({ mediaDir: '' }).mediaDir, '')
  assert.equal(ch({ mamePath: 'D:\\Altro\\mame64.exe' }).mamePath, 'D:\\Altro\\mame64.exe')
  assert.equal(ch({ cheatsAuto: true }).cheatsAuto, true)
})

test('impostazioni: tipi sbagliati e percorsi relativi lasciano il valore salvato', () => {
  assert.equal(ch({ cheatsAuto: 'si' }).cheatsAuto, false)
  assert.equal(ch({ musicVolume: Number.NaN }).musicVolume, 0.5)
  assert.deepEqual(ch({ favorites: 'x' }).favorites, [])
  assert.equal(ch({ romsDir: '..\\..\\x' }).romsDir, 'G:\\ROMset')
  assert.equal(ch({ romsDir: 'D:\\a\u0000b' }).romsDir, 'G:\\ROMset')
})

test('impostazioni: i programmi da avviare devono avere un nome da emulatore', () => {
  assert.equal(ch({ mamePath: 'C:\\Windows\\System32\\cmd.exe' }).mamePath, 'G:\\Emu\\mame.exe')
  assert.equal(ch({ retroarchPath: 'C:\\Windows\\System32\\calc.exe' }).retroarchPath, 'G:\\RA\\retroarch.exe')
  // un valore già salvato resta valido anche se ha un nome insolito
  assert.equal(sanitizeSettings({ ...cur, mamePath: 'G:\\Emu\\mame.exe' }, cur).mamePath, 'G:\\Emu\\mame.exe')
  assert.equal(sanitizeSettings('x', cur), cur)
})
