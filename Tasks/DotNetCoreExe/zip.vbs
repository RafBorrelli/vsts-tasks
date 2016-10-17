set args = Wscript.Arguments
sourceDirectory = args(0)
targetZip = args(1)
call CreateObject("Scripting.FileSystemObject").CreateTextFile(targetZip, True).Write("PK" & Chr(5) & Chr(6) & String(18, Chr(0)))
set application = CreateObject("Shell.Application")
set source = application.NameSpace(sourceDirectory)
set target = application.NameSpace(targetZip)
call target.MoveHere(source.items, 1044)
do until source.items.count = target.items.count
    wscript.sleep 1000 
loop

