$projeto = "C:\Users\ViniciusSardou\Desktop\SISTEMA IBC\Sistema\central-ibc"
$atalho = "C:\Users\ViniciusSardou\Desktop\Sistema IBC.lnk"
$icone = "$projeto\public\logo-sem-fundo.ico"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($atalho)
$Shortcut.TargetPath = "C:\Windows\System32\cmd.exe"
$Shortcut.Arguments = "/c start /b cmd /c `"cd /d `"$projeto`" && npm run dev -- --host 0.0.0.0 --port 5173 --strictPort`" && timeout /t 4 /nobreak >nul && start http://localhost:5173/"
$Shortcut.WorkingDirectory = $projeto
$Shortcut.IconLocation = $icone
$Shortcut.WindowStyle = 7  # Minimizado
$Shortcut.Save()
