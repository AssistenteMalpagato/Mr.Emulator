import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createSoftVideoFinder, softVideoListsOf } from '../src/main/softVideo'

test('filmati delle console: liste per sistema', () => {
  assert.deepEqual(softVideoListsOf({ id: 'megadrive', softlist: ['megadriv'] }), ['megadriv', '32x'])
  assert.deepEqual(softVideoListsOf({ id: 'nes', softlist: ['nes'] }), ['nes'])
  assert.deepEqual(softVideoListsOf({ id: 'dreamcast', softlist: [] }), [])
  assert.deepEqual(softVideoListsOf({ id: 'xyz' }), [])
})

test('filmati delle console: dal nome breve e dal titolo, solo tra quelli che hanno un filmato', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-sv-'))
  mkdirSync(join(root, 'megadriv'))
  for (const n of ['sonic', 'aladdin']) writeFileSync(join(root, 'megadriv', `${n}.mp4`), 'x')
  const titles = new Map([
    ['sonic', 'Sonic The Hedgehog (USA, Europe)'],
    ['aladdin', 'Aladdin (Europe)'],
    ['nofilm', 'Gioco Senza Filmato (USA)']
  ])
  const f = createSoftVideoFinder(root, async () => titles)
  const lists = ['megadriv']
  const g = (name: string, fileName: string) => ({ name, fileName, path: join(root, fileName), machine: undefined })
  // nome del file = nome breve
  assert.ok((await f.find(g('x', 'sonic.zip'), lists))?.endsWith('sonic.mp4'))
  // titolo con altra regione
  assert.ok((await f.find(g('Sonic The Hedgehog (Japan)', 'Sonic The Hedgehog (Japan).md'), lists))?.endsWith('sonic.mp4'))
  assert.ok((await f.find(g('Aladdin (USA)', 'Aladdin (USA).md'), lists))?.endsWith('aladdin.mp4'))
  // nessun filmato per questo gioco, nessuna lista, titolo sconosciuto
  assert.equal(await f.find(g('Gioco Senza Filmato (USA)', 'Gioco Senza Filmato (USA).md'), lists), null)
  assert.equal(await f.find(g('Sonic', 'sonic.zip'), []), null)
  assert.equal(await f.find(g('Altro Titolo Mai Visto', 'altro.md'), lists), null)
})

test('filmati delle console: gradi, nomi abbreviati e nessun abbinamento ambiguo', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-sv2-'))
  mkdirSync(join(root, 'nes'))
  for (const n of ['720', 'adamneve', 'marioa', 'marioab']) writeFileSync(join(root, 'nes', `${n}.mp4`), 'x')
  const titles = new Map([
    ['720', '720° (USA)'],
    ['adamneve', 'Adam & Eve (Asia)'],
    ['marioa', 'Mario Alpha (USA)'],
    ['marioab', 'Mario Alpha Beta (USA)']
  ])
  const f = createSoftVideoFinder(root, async () => titles)
  const g = (name: string, fileName: string) => ({ name, fileName, path: join(root, fileName), machine: undefined })
  assert.ok((await f.find(g('720 Degrees (USA)', '720degrees.zip'), ['nes']))?.endsWith('720.mp4'))
  // nome abbreviato e titolo sconosciuto: unico titolo che comincia così
  assert.ok((await f.find(g('adameve', 'adameve.zip'), ['nes']))?.endsWith('adamneve.mp4'))
  // due titoli cominciano allo stesso modo: meglio nessun filmato di quello sbagliato
  assert.equal(await f.find(g('marioal', 'marioal.zip'), ['nes']), null)
})
