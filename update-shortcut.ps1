$wsh = New-Object -ComObject WScript.Shell
$target = "C:\Users\User\.gemini\antigravity-ide\scratch\flip-clock-desktop\release\FlipClock-win32-x64\FlipClock.exe"
$ico = "C:\Users\User\.gemini\antigravity-ide\scratch\flip-clock-desktop\assets\icon.ico"
$work = "C:\Users\User\.gemini\antigravity-ide\scratch\flip-clock-desktop\release\FlipClock-win32-x64"

$dirs = @([Environment]::GetFolderPath('Desktop'))
if (Test-Path "C:\Users\User\Desktop") {
    $dirs += "C:\Users\User\Desktop"
}

foreach ($d in $dirs) {
    if (Test-Path $d) {
        $lnkPath = Join-Path $d "Flip Clock.lnk"
        $sc = $wsh.CreateShortcut($lnkPath)
        $sc.TargetPath = $target
        $sc.WorkingDirectory = $work
        $sc.IconLocation = "$ico,0"
        $sc.Description = "Minimalist 3D Flip Clock & Productivity Suite"
        $sc.Save()
        Write-Host "Updated shortcut at: $lnkPath"
    }
}
