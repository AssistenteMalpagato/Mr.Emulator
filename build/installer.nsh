; Disinstallazione "pulita": chiede se togliere anche impostazioni, indici e cache.
; Non tocca MAI giochi, BIOS e salvataggi. Non chiede nulla durante un aggiornamento né nelle disinstallazioni silenziose.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    MessageBox MB_YESNO|MB_ICONQUESTION "Vuoi eliminare anche le impostazioni e i dati del programma?$\r$\n$\r$\nSi cancellano: impostazioni, elenchi dei giochi, copertine in cache e il registro degli errori.$\r$\nNon si cancellano mai: i tuoi giochi, i BIOS e i salvataggi.$\r$\n$\r$\nScegli SI' per una reinstallazione completamente pulita, NO per tenere tutto." /SD IDNO IDNO mrSkipClean
      Push $0
      Push $1
      Push $2
      ; cartelle create dal programma altrove (per esempio la cache spostata su un altro disco): elenco scritto dal programma
      IfFileExists "$APPDATA\Mr. Emulator\cleanup.txt" 0 mrListDone
        FileOpen $0 "$APPDATA\Mr. Emulator\cleanup.txt" r
        mrReadLoop:
          FileRead $0 $1
          IfErrors mrReadEnd
          StrCpy $2 $1 1 -1
          ${If} $2 == "$\n"
            StrCpy $1 $1 -1
          ${EndIf}
          StrCpy $2 $1 1 -1
          ${If} $2 == "$\r"
            StrCpy $1 $1 -1
          ${EndIf}
          ; sicurezza: si toglie solo una cartella che si chiama proprio "MrEmulator-artwork"
          StrCpy $2 $1 18 -18
          ${If} $2 == "MrEmulator-artwork"
            RMDir /r "$1"
          ${EndIf}
          Goto mrReadLoop
        mrReadEnd:
        FileClose $0
      mrListDone:
      Pop $2
      Pop $1
      Pop $0
      RMDir /r "$APPDATA\Mr. Emulator"
    mrSkipClean:
  ${endIf}
!macroend
