Set fso = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
objShell.Run "npx electron .", 0, False
