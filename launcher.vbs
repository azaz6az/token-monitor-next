' Token Monitor 静默启动器（无命令行窗口）
Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
objShell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
objShell.Run "node_modules\electron\dist\electron.exe .", 0, False
