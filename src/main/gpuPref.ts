import { execFile } from 'child_process'
import { join } from 'path'

/**
 * Su Windows i portatili con due schede video spesso fanno girare i programmi sulla scheda
 * integrata. Questa è la stessa impostazione di "Impostazioni > Grafica > Alte prestazioni",
 * scritta solo per l'utente corrente (nessun permesso di amministratore).
 */
export function setHighPerformanceGpu(exePath: string): Promise<boolean> {
  if (process.platform !== 'win32' || !exePath) return Promise.resolve(false)
  return new Promise((resolve) => {
    execFile(
      // percorso assoluto: un reg.exe messo nella cartella dell'app non deve avere la precedenza
      join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'reg.exe'),
      ['add', 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences', '/v', exePath, '/t', 'REG_SZ', '/d', 'GpuPreference=2;', '/f'],
      { windowsHide: true },
      (err) => resolve(!err)
    )
  })
}
