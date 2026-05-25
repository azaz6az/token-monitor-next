Set fso = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
Set objShortcut = objShell.CreateShortcut(objShell.SpecialFolders("Desktop") & "\Token Monitor.lnk")
objShortcut.TargetPath = fso.GetParentFolderName(WScript.ScriptFullName) & "\start-hidden.vbs"
objShortcut.WorkingDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
objShortcut.WindowStyle = 7
objShortcut.Description = "Token Monitor"
objShortcut.Save
