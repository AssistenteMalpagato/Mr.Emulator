[◀ Home](IT-Home) · **Sistemi e BIOS**

# 🎮 Sistemi e BIOS

Mr. Emulator non emula nulla da solo. Ogni sistema è eseguito da un **core libretro in RetroArch** o da **MAME autonomo**. L'elenco cresce nel tempo; i sistemi che non usi si nascondono in **Impostazioni → Sistemi in home**.

## Sistemi supportati

| Famiglia | Sistema | Motore | Cartella | Tipi di file |
|---|---|---|---|---|
| **Arcade** | Arcade (FinalBurn Neo) | core `fbneo` | `arcade` | `.zip` `.7z` |
| | Arcade (MAME autonomo) | MAME | `mame` | `.zip` `.7z` (+ CHD) |
| | Neo Geo | core `fbneo` | `neogeo` | `.zip` `.7z` |
| | Sega Naomi · Atomiswave | core `flycast` | `naomi` · `atomiswave` | `.zip` `.7z` `.chd` · file grezzi `.dat` `.bin` `.lst` |
| **Sega** | Master System | `genesis_plus_gx` | `mastersystem` | `.sms` `.zip` |
| | Mega Drive | `genesis_plus_gx` | `megadrive` | `.md` `.gen` `.smd` `.bin` `.zip` |
| | Game Gear · SG-1000 | `fbneo` | `gamegear` · `sg1000` | `.zip` `.7z` |
| | Dreamcast | `flycast` | `dreamcast` | `.gdi` `.cdi` `.chd` `.cue` |
| **Nintendo** | NES | `nestopia` | `nes` | `.nes` `.zip` |
| | Famicom Disk System | `fbneo` | `fds` | `.zip` `.7z` |
| | Super Nintendo | `snes9x` | `snes` | `.sfc` `.smc` `.zip` |
| | Game Boy · Game Boy Color | `gambatte` | `gb` · `gbc` | `.gb` `.gbc` `.zip` |
| | Game Boy Advance | `mgba` | `gba` | `.gba` `.zip` |
| | Nintendo 64 | `mupen64plus_next` | `n64` | `.n64` `.z64` `.v64` `.zip` |
| | Nintendo DS | `melonds` | `nds` | `.nds` `.zip` |
| **NEC / SNK** | PC Engine · TurboGrafx-16 · SuperGrafx | `fbneo` | `pce` · `tg16` · `sgx` | `.zip` `.7z` |
| | Neo Geo Pocket | `fbneo` | `ngp` | `.zip` `.7z` |
| **Sony / Atari / 3DO** | PlayStation | `pcsx_rearmed` | `psx` | `.cue` `.chd` `.pbp` `.iso` |
| | Atari Jaguar | `virtualjaguar` | `jaguar` | `.j64` `.jag` `.zip` |
| | 3DO | `opera` | `3do` | `.iso` `.cue` `.chd` |
| **Computer e altro** | MSX · ZX Spectrum · ColecoVision · Fairchild Channel F · Bally Astrocade | `fbneo` | `msx` · `spectrum` · `coleco` · `channelf` · `astrocade` | `.zip` `.7z` |

**Non ancora supportati:** Mega CD, Sega Saturn, GameCube/Wii, PlayStation 2, PSP. Vedi la [roadmap](https://github.com/AssistenteMalpagato/Mr.Emulator/blob/main/docs/ROADMAP.it.md).

## BIOS che possono servire

Solo pochi sistemi richiedono un BIOS. La guida al primo avvio mostra l'elenco e verifica quelli con checksum noto. **Devi procurarli tu.**

| Sistema | File | Dove metterlo |
|---|---|---|
| Neo Geo | `neogeo.zip` | `bios\fbneo` (o accanto ai giochi) |
| PlayStation | `scph5501.bin` (o `scph5500` / `scph5502`…) | `bios` |
| Dreamcast | `dc_boot.bin` + `dc_flash.bin` | `bios\dc` |
| Naomi / Atomiswave | `naomi.zip` / `awbios.zip` | `bios\dc` **soltanto** (Flycast non cerca altrove) |
| Famicom Disk System | `disksys.rom` | `bios` |
| 3DO | `panafz10.bin` | `bios` |

## Naomi e Atomiswave: quali file funzionano

Flycast esegue questi sistemi da **set di ROM con i nomi di MAME** (`.zip` o `.7z` con il nome del set, per esempio `deathcox`, che contengono molti file tipo `epr-….ic22`, `mpr-….ic1`). Cose che **non** funzionano:

- **Archivi `.rar`** — nessun emulatore legge i RAR: vanno estratti (la Diagnostica avvisa se ne trova).
- **Un archivio con dentro un solo `.dat` o `.bin`** — è un'*immagine grezza*, non un set MAME: Flycast scarta l'archivio e il programma lo dice quando lo avvii. Estrai il `.dat`/`.bin` e mettilo **direttamente nella cartella del sistema** (compare in elenco e Flycast lo carica, con l'avviso *«Please upgrade to MAME romsets or expect issues»*), oppure cerca il set MAME.
- **BIOS nella cartella sbagliata** — `naomi.zip` / `awbios.zip` devono stare in `bios\dc`; la Diagnostica dice se sono altrove.
- **Giochi su GD-ROM** — usano `.chd` o `.gdi`, non ZIP/7z.

## Cartelle

Ogni sistema ha una cartella sotto quella dei giochi, con il nome della tabella. Se hai già una tua raccolta, indicala al programma: la **legge così com'è** e riconosce anche i nomi alternativi più comuni (per esempio `Genesis` per il Mega Drive, `PlayStation` o `PS1` per la PlayStation, `Super Nintendo` o `SFC` per lo SNES, `Game Boy Advance` per il GBA) — non crea né rinomina nulla. Le cartelle che non riconosce vengono ignorate. Mr. Emulator le scansiona in background e ricorda il risultato, quindi aprire un sistema è istantaneo. I giochi possono stare su qualsiasi disco; se un disco esterno è scollegato il programma lo dice invece di mostrare un elenco vuoto.

[◀ Tour delle funzioni](IT-Funzioni) · [Avanti: Comandi ▶](IT-Comandi)
