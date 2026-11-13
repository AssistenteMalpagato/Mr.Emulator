/**
 * Nome breve di una macchina MAME: solo lettere, cifre e underscore. Un nome che comincia con "-" diventerebbe
 * un'opzione di mame.exe (per esempio uno ZIP chiamato "-autoboot_script.zip"), quindi va rifiutato prima di passarlo.
 */
export const isMachineName = (n: unknown): n is string => typeof n === 'string' && /^[a-z0-9][a-z0-9_]{0,63}$/i.test(n)
