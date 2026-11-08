import { useCallback, useEffect, useState } from 'react'
import type { DiagnosticReport, FolderMatch, Settings } from '@shared/types'
import { ToolFinder } from './ToolFinder'
import { useInput } from '../hooks/useInput'
import Orbs from './Orbs'
import { getLang, setLang, t } from '../i18n'

type Bios = Awaited<ReturnType<typeof window.mr.getBiosStatus>>

const STEPS = ['LINGUA', 'BENVENUTO', 'I TUOI GIOCHI', 'RETROARCH', 'BIOS', 'MAME', 'FINE']

/** Il passo resta quando cambia la lingua (l'interfaccia si ricrea): si ricomincia dal punto in cui si era */
let lastStep = 0

/** Procedura guidata del primo avvio: pochi passi, parole semplici, niente da cercare nelle impostazioni */
export default function FirstRun({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [step, setStepState] = useState(lastStep)
  const setStep = (f: (n: number) => number): void =>
    setStepState((n) => {
      lastStep = f(n)
      return lastStep
    })
  const [existing, setExisting] = useState<{ found: FolderMatch[]; unknown: string[]; dir: string } | null>(null)
  const [s, setS] = useState<Settings | null>(null)
  const [bios, setBios] = useState<Bios>([])
  const [diag, setDiag] = useState<DiagnosticReport | null>(null)
  const [msg, setMsg] = useState('')
  const [cores, setCores] = useState<Array<{ core: string; systems: string[]; installed: boolean; games: number }>>([])
  const [pickedCores, setPickedCores] = useState<Set<string>>(new Set())
  const [coreBusy, setCoreBusy] = useState('')
  const [coreLog, setCoreLog] = useState<string[]>([])

  const reload = useCallback(async () => {
    setS(await window.mr.getSettings())
    setBios(await window.mr.getBiosStatus())
  }, [])
  useEffect(() => {
    reload()
  }, [reload])

  const finish = async (): Promise<void> => {
    await window.mr.ensureDefaultFolders()
    const cur = await window.mr.getSettings()
    await window.mr.saveSettings({ ...cur, firstRunDone: true })
    lastStep = 0
    onDone()
  }
  const next = (): void => setStep((n) => Math.min(STEPS.length - 1, n + 1))
  const back = (): void => setStep((n) => Math.max(0, n - 1))

  useEffect(() => {
    if (step === STEPS.length - 1) window.mr.getDiagnostics().then(setDiag)
    if (step === 4) window.mr.getBiosStatus().then(setBios)
    if (step === 3) window.mr.getCoreList().then(setCores)
  }, [step])

  useInput({ onConfirm: () => (step === STEPS.length - 1 ? finish() : next()), onBack: back })

  if (!s) return <div className="loading">{t('Caricamento…')}</div>

  const useTool = async (key: 'retroarchPath' | 'mamePath', p: string): Promise<void> => {
    await window.mr.saveSettings({ ...s, [key]: p })
    await reload()
    if (key === 'retroarchPath') setCores(await window.mr.getCoreList())
  }

  const pick = async (key: 'retroarchPath' | 'mamePath', kind: 'file'): Promise<void> => {
    const p = await window.mr.pickPath(kind)
    if (!p) return
    await window.mr.saveSettings({ ...s, [key]: p })
    await reload()
    if (key === 'retroarchPath') setCores(await window.mr.getCoreList())
  }

  return (
    <div className="screen firstrun" style={{ ['--accent' as string]: '#ffd400' }}>
      <Orbs />
      <header className="topbar">
        <div className="brand">
          <h1 className="logo">
            {t('MR.')} <span>{t('EMULATOR')}</span>
          </h1>
          <small className="by">by Assistente Malpagato software</small>
        </div>
        <button className="chip" onClick={finish}>{t('SALTA LA GUIDA')}</button>
      </header>
      <div className="fr-steps">
        {STEPS.map((label, i) => (
          <span key={label} className={`fr-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}>{i + 1}. {t(label)}</span>
        ))}
      </div>

      <div className="fr-body">
        {step === 0 && (
          <>
            <h2>Choose your language · Scegli la lingua</h2>
            <p>The guide and the whole program will use it. You can change it any time in Settings. · La guida e tutto il programma useranno questa lingua. Puoi cambiarla quando vuoi dalle Impostazioni.</p>
            <div className="fr-actions">
              {(['it', 'en'] as const).map((l) => (
                <button
                  key={l}
                  className={`chip big ${getLang() === l ? 'on' : ''}`}
                  onClick={async () => {
                    const cur = await window.mr.getSettings()
                    await window.mr.saveSettings({ ...cur, language: l })
                    setLang(l)
                  }}
                >
                  {l === 'it' ? '🇮🇹 ITALIANO' : '🇬🇧 ENGLISH'}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>{t('Benvenuto!')}</h2>
            <p>{t('In pochi passi il programma è pronto. Non serve conoscere nulla di emulazione: ti diciamo noi cosa fare, e puoi ripetere questa guida quando vuoi da Impostazioni.')}</p>
            <ul className="fr-list">
              <li><b>{t('I tuoi giochi')}</b>{t(': indica dove sono (o fai creare le cartelle).')}</li>
              <li><b>{t('RetroArch')}</b>{t(': il programma che fa partire le console.')}</li>
              <li><b>{t('BIOS')}</b>{t(': alcuni sistemi hanno bisogno di file speciali. Ti mostriamo quali.')}</li>
              <li><b>{t('MAME')}</b>{t(': facoltativo, per i giochi arcade.')}</li>
            </ul>
            <p className="hint">{t('Mr. Emulator non include né scarica ROM o BIOS: usa i file che possiedi già.')}</p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t('Dove sono i tuoi giochi?')}</h2>
            <p>{t('Se hai già una cartella con le ROM, indicala: il programma la legge così com\'è, senza creare nulla, e riconosce da solo i nomi più comuni delle cartelle dei sistemi («SNES», «Genesis», «PlayStation»…). Se parti da zero, puoi far creare le cartelle.')}</p>
            <div className="fr-actions">
              <button
                className="chip big"
                onClick={async () => {
                  const dir = await window.mr.pickPath('dir')
                  if (!dir) return
                  const r = await window.mr.useExistingRoms(dir)
                  setS(r.settings)
                  setExisting({ found: r.found, unknown: r.unknown, dir })
                  setMsg('')
                  await reload()
                }}
              >
                {t('📂 HO GIÀ UNA CARTELLA CON I GIOCHI…')}
              </button>
              <button
                className="chip big"
                onClick={async () => {
                  const cur = await window.mr.getSettings()
                  await window.mr.saveSettings({ ...cur, romsDir: '', biosDir: '', mameRomDir: '', folderBySystem: {} })
                  setS(await window.mr.setupFolders())
                  setExisting(null)
                  setMsg(t('✔ Cartelle create in Documenti\\MrEmulator'))
                  await reload()
                }}
              >
                {t('📁 CREA LE CARTELLE PER ME (Documenti)')}
              </button>
              <button
                className="chip big"
                onClick={async () => {
                  const dir = await window.mr.pickPath('dir')
                  if (!dir) return
                  try {
                    setS(await window.mr.setupRoot(dir))
                    setExisting(null)
                    setMsg(t('✔ Tutto impostato dentro {dir}', { dir }))
                    await reload()
                  } catch {
                    setMsg(t('⚠ Non riesco a creare le cartelle lì: controlla che il disco sia collegato e scrivibile.'))
                  }
                }}
              >
                {t('💾 CREA LE CARTELLE SU UN ALTRO DISCO…')}
              </button>
            </div>
            <p className="fr-ok">{msg || (s.romsDir ? t('Cartella attuale: {dir}', { dir: s.romsDir }) : t('Nessuna cartella scelta ancora.'))}</p>
            {existing && (
              <>
                {existing.found.length > 0 ? (
                  <>
                    <p className="fr-ok">{t('✔ Riconosciuti {n} sistemi:', { n: existing.found.length })}</p>
                    <ul className="fr-list">
                      {existing.found.map((f) => (
                        <li key={f.id}>
                          <b>{f.name}</b> → {f.folder} ({t('{n} file', { n: f.files.toLocaleString(getLang() === 'it' ? 'it' : 'en') })})
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="fr-warn">{t('Non ho riconosciuto nessuna cartella di sistema. Dentro la cartella devono esserci sottocartelle come nes, snes, megadrive… (vanno bene anche i nomi più comuni). Scegli un\'altra cartella oppure fai creare quelle dei sistemi qui sotto.')}</p>
                )}
                {existing.unknown.length > 0 && (
                  <p className="hint">{t('Cartelle non riconosciute (le ignoro): {list}', { list: existing.unknown.slice(0, 12).join(', ') + (existing.unknown.length > 12 ? '…' : '') })}</p>
                )}
                <div className="fr-actions">
                  <button
                    className="chip"
                    onClick={async () => {
                      setS(await window.mr.setupFolders())
                      setMsg(t('✔ Create le cartelle dei sistemi che mancavano'))
                    }}
                  >
                    {t('➕ CREA LE CARTELLE DEI SISTEMI MANCANTI (facoltativo)')}
                  </button>
                </div>
              </>
            )}
            <div className="fr-actions">
              <button className="chip" onClick={() => window.mr.openFolder('roms')}>{t('APRI LA CARTELLA DEI GIOCHI')}</button>
            </div>
            <p className="hint">{t('Non viene mai spostato né cancellato nulla: le tue ROM restano dove sono.')}</p>
          </>
        )}

        {step === 3 && (
          <>
            <h2>{t('RetroArch')}</h2>
            <p>{t('È il programma gratuito che fa partire NES, SNES, Mega Drive, PlayStation, Dreamcast e le altre console. Si scarica dal sito ufficiale')} <b>{t('retroarch.com')}</b> {t('(versione Windows), si estrae in una cartella e basta: non si installa.')}</p>
            <div className="fr-actions">
              <button className="chip big" onClick={() => pick('retroarchPath', 'file')}>{t('🔎 INDICA retroarch.exe')}</button>
            </div>
            <ToolFinder kind="retroarch" current={s.retroarchPath} onUse={(p) => useTool('retroarchPath', p)} />
            <p className={s.retroarchPath ? 'fr-ok' : 'fr-warn'}>{s.retroarchPath ? `✔ ${s.retroarchPath}` : t('Non ancora indicato (puoi farlo anche dopo)')}</p>
            {s.retroarchPath && (
              <>
                <p>{t('Ogni console ha bisogno del suo')} <b>{t('core')}</b>{t('. Scegli quelli che ti servono: il programma li scarica dall\'archivio ufficiale di RetroArch.')}</p>
                <div className="fr-cores">
                  {cores.map((c) => (
                    <label key={c.core} className={`fr-core ${c.installed ? 'ok' : ''}`}>
                      <input
                        type="checkbox"
                        disabled={c.installed || !!coreBusy}
                        checked={c.installed || pickedCores.has(c.core)}
                        onChange={() =>
                          setPickedCores((p) => {
                            const n = new Set(p)
                            if (n.has(c.core)) n.delete(c.core)
                            else n.add(c.core)
                            return n
                          })
                        }
                      />
                      <span className="fr-core-n">{c.systems.join(', ')}</span>
                      <span className="fr-core-s">{c.installed ? t('✔ già installato') : c.games ? t('{n} giochi', { n: c.games }) : c.core}</span>
                    </label>
                  ))}
                </div>
                <div className="fr-actions">
                  <button
                    className="chip"
                    disabled={!!coreBusy}
                    onClick={() => setPickedCores(new Set(cores.filter((c) => !c.installed).map((c) => c.core)))}
                  >
                    {t('SELEZIONA TUTTI')}
                  </button>
                  <button
                    className="chip big"
                    disabled={!!coreBusy || pickedCores.size === 0}
                    onClick={async () => {
                      const todo = [...pickedCores]
                      const log: string[] = []
                      for (let i = 0; i < todo.length; i++) {
                        setCoreBusy(t('Scarico {c} ({i} di {n})… può richiedere un minuto', { c: todo[i], i: i + 1, n: todo.length }))
                        const r = await window.mr.installCore(todo[i])
                        log.push(r.ok ? `✔ ${todo[i]}` : `⚠ ${todo[i]}: ${r.error}`)
                        setCoreLog([...log])
                      }
                      setCoreBusy('')
                      setPickedCores(new Set())
                      setCores(await window.mr.getCoreList())
                    }}
                  >
                    {t('⬇ INSTALLA I CORE SCELTI')}
                  </button>
                </div>
                {coreBusy && <p className="fr-warn">{coreBusy}</p>}
                {coreLog.map((l, i) => (
                  <p key={i} className={l.startsWith('✔') ? 'fr-ok' : 'fr-warn'}>{l}</p>
                ))}
              </>
            )}
            <p className="hint">{t('Se vuoi giocare solo ad arcade con MAME, puoi saltare questo passo.')}</p>
          </>
        )}

        {step === 4 && (
          <>
            <h2>{t('BIOS: i file speciali')}</h2>
            <p>{t('Alcuni sistemi non partono senza un file BIOS. Servono solo se hai giochi per quel sistema. Mr. Emulator non li fornisce: se li possiedi, copiali nella cartella indicata.')}</p>
            <p className="hint">{t('Cartella BIOS: {dir}', { dir: s.biosDir })}</p>
            <div className="fr-bios">
              {bios.map((b) => (
                <div key={b.systemId} className={`fr-b ${b.found ? 'ok' : ''}`}>
                  <span className="fr-b-ic">{b.found ? (b.verified === 'unknown' ? '⚠' : '✔') : '✖'}</span>
                  <span className="fr-b-n">{b.name}</span>
                  <span className="fr-b-f">{b.found ? (b.verified === 'ok' ? t('trovato e riconosciuto: {f}', { f: b.found }) : b.verified === 'unknown' ? t('trovato ma non riconosciuto: {f} (può funzionare lo stesso, ma non è una versione nota)', { f: b.found }) : t('trovato: {f}', { f: b.found })) : t('serve {f}{o} in {w}', { f: b.files[0], o: b.files.length > 1 ? t(' (o simile)') : '', w: b.where })}</span>
                  <span className="fr-b-note">{t(b.note)}</span>
                </div>
              ))}
            </div>
            <div className="fr-actions">
              <button
                className="chip"
                onClick={async () => {
                  const dir = await window.mr.pickPath('dir')
                  if (!dir) return
                  await window.mr.saveSettings({ ...s, biosDir: dir })
                  await reload()
                }}
              >
                {t('📁 SCEGLI LA CARTELLA BIOS…')}
              </button>
              <button className="chip" onClick={() => window.mr.openFolder('bios')}>{t('📂 APRI LA CARTELLA BIOS')}</button>
              <button className="chip" onClick={() => window.mr.getBiosStatus().then(setBios)}>{t('⟳ RICONTROLLA')}</button>
            </div>
            <p className="hint">{t('Un ✖ non è un errore: significa solo che quel sistema non partirà finché il file non c\'è.')}</p>
          </>
        )}

        {step === 5 && (
          <>
            <h2>{t('MAME (facoltativo)')}</h2>
            <p>{t('Serve solo per il sistema')} <b>{t('Arcade (MAME)')}</b> {t('e per dare i nomi giusti ai giochi delle console. Si scarica da')} <b>{t('mamedev.org')}</b>{t('. Usa la stessa versione dei tuoi set di ROM.')}</p>
            <div className="fr-actions">
              <button className="chip big" onClick={() => pick('mamePath', 'file')}>{t('🔎 INDICA mame.exe')}</button>
            </div>
            <ToolFinder kind="mame" current={s.mamePath} onUse={(p) => useTool('mamePath', p)} />
            <p className={s.mamePath ? 'fr-ok' : 'fr-warn'}>{s.mamePath ? `✔ ${s.mamePath}` : t('Non indicato: va bene se non ti serve.')}</p>
          </>
        )}

        {step === 6 && (
          <>
            <h2>{t('Tutto pronto?')}</h2>
            {!diag ? (
              <p>{t('Controllo in corso…')}</p>
            ) : (
              <>
                <p>{diag.problems === 0 ? t('✔ Nessun problema trovato.') : t('{n} cose da sistemare (puoi farlo anche dopo da Impostazioni → Diagnostica).', { n: diag.problems })}</p>
                <ul className="diag-list">
                  {diag.checks.filter((k) => k.level !== 'ok').slice(0, 6).map((k, i) => (
                    <li key={i} className={`diag-${k.level}`}>
                      <span className="diag-ic">{k.level === 'warn' ? '⚠' : '✖'}</span>
                      <span className="diag-t">{k.title}</span>
                      {k.fix && <span className="diag-f">→ {k.fix}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="hint">{t('Se non hai ancora messo i giochi nelle cartelle, nessun problema: la home mostrerà i sistemi vuoti finché non lo fai.')}</p>
          </>
        )}
      </div>

      <footer className="fr-nav">
        <button className="chip" onClick={back} disabled={step === 0}>{t('◀ INDIETRO')}</button>
        {step < STEPS.length - 1 ? (
          <button className="chip save" onClick={next}>{t('AVANTI ▶')}</button>
        ) : (
          <button className="chip save" onClick={finish}>{t('🚀 INIZIA')}</button>
        )}
      </footer>
    </div>
  )
}
