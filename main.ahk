#SingleInstance Force
#Requires AutoHotkey v2

#Include <WebView2\WebView2>
#Include <cJson>
#Include <Gdip>

Gdip_Startup()

album := {
	folder: ''
}

main := Gui('Resize', 'ALBUM BROWSER')
main.OnEvent('Close', quit)
main.MarginX := main.MarginY := 0
resize(GuiObj, MinMax, Width, Height) {
	wvController.Fill()
}
quit(*) {
	wvCore := 0
	wvController := 0
	wv := 0
	orgwpp := 'C:\Windows\Web\Wallpaper\Windows\img0.jpg'
	if FileExist(orgwpp)
		changeWallpaper(orgwpp)
	ExitApp()
}
main.Show('Maximize')

wv := WebView2
wvController := wv.CreateControllerAsync(main.hwnd).await()
wvCore := wvController.CoreWebView2

wvCore.add_ContainsFullScreenElementChanged(fullscreen)
fullscreen(*) {
	If wvCore.ContainsFullScreenElement {
		main.Opt('-Border -SysMenu -Resize AlwaysOnTop')
		main.Show(Format('x-3 y-3 w{} h{}', A_ScreenWidth, A_ScreenHeight))
	} Else {
		main.Opt('Border SysMenu Resize -AlwaysOnTop')
		main.Show('Maximize')
	}
	wvController.Fill()
}

ahkBridge := {
	selectAlbum: (*) => showAlbum(),
	loadAlbum: (src) => loadAlbum(src),
	remAlbum: (src) => remAlbum(src),
	sliAlbum: (src) => sliAlbum(src),
	clearAlbum: (src) => clearAlbum(src),
	openAlbum: (src) => openAlbum(src)
}

wvCore.AddHostObjectToScript('ahk', ahkBridge)

wvCore.Navigate(A_ScriptDir '\renderer\main\index.html')

showAlbum(*) {
	alb := FileSelect('D')
	if !alb
		return

	base64 := ''
	If FileExist(alb '\cover.png') {
		bitmap := Gdip_CreateBitmapFromFile(alb '\cover.png')
		base64 := 'data:image/png;base64,' Gdip_EncodeBitmapTo64string(bitmap)
		Gdip_DisposeImage(bitmap)
	}

	return JSON.Dump({ folder: alb, previews: loadPreviews(alb), cover: base64 })
}

scanNames(folder) {
	Loop Files, folder '\*', 'D' {
		SplitPath(A_LoopFileFullPath, &name, &dir)
		if !(name ~= '^[a-zA-Z0-9]{32}$') {
			newname := generateName(dir)
			DirMove(A_LoopFileFullPath, dir '\' newname)
		}
	}
}

generateName(dir) {
	While DirExist(dir '\' nw := generateAlphaNum15())
		Continue
	return nw
}

generateAlphaNum15() {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := ""
	Loop 32 {
		rand := Random(1, StrLen(chars))
		result .= SubStr(chars, rand, 1)
	}
	return result
}

loadPreviews(folder) {
	sorted := Map()
	Loop Files, folder '\*', 'D' {
		creationTime := A_LoopFileTimeCreated
		if sorted.Has(creationTime) {
			while sorted.Has(creationTime)
				creationTime := DateAdd(creationTime, 1, 'S')
		}
		sorted[creationTime] := A_LoopFileFullPath
	}
	previews := []
	For album, location in sorted {
		previews.Push({ preview: loadImages(location, 1), location: location })
	}
	return previews
}

loadImages(folder, preview := 0, jpg := 0) {
	imgs := '', images := []
	Loop Files, folder '\*.*' {
		If !(A_LoopFileExt ~= 'i)bmp|jpg|jpeg|webp|svg|png|gif') || !(A_LoopFileName ~= '\d') {
			Continue
		}
		imgs .= (imgs ? '`n' : '') A_LoopFileName
	}
	imgs := Sort(imgs, 'N')

	gallery := StrSplit(imgs, '`n')

	If !gallery.Length
		return FileExist(folder '\..\no-album.png') ? folder '\..\no-album.png' : 'assets\book.png'

	if preview
		return folder '\' gallery[1]

	For img in StrSplit(imgs, '`n') {
		images.Push(folder '\' img)
	}

	if jpg {
		images := convert2jpg(images)
	}

	return images
}

convert2jpg(imgs) {
	jpgs := []
	For img in imgs {
		SplitPath(img, , &dir, , &name)
		If FileExist(dir '\' name '.jpg')
			Continue
		b := Gdip_CreateBitmapFromFile(img)
		Gdip_SaveBitmapToFile(b, dir '\' name '.jpg')
		If !FileExist(dir '\' name '.jpg')
			Continue
		jpgs.Push(dir '\' name '.jpg')
		Gdip_DisposeImage(b)
	}
	return jpgs
}

loadAlbum(preview) {
	preview := normalizePath(preview)
	SplitPath(preview, , &folder)

	images := loadImages(folder)

	obj := {
		pages: images
	}
	Return JSON.Dump(obj)
}

remAlbum(folder) {
	If Msgbox('Sure to delete the following album?`n`n' folder, 'Delete Album', 0x30 + 0x4) != 'Yes' {
		Return false
	}
	DirDelete(folder, 1)
	Return true
}

clearAlbum(folder) {
	remAlbum(folder)
	DirCreate(folder)
	Return loadImages(folder)
}

openAlbum(folder) => Run(folder)

sliAlbum(folder) {
	static timer := 0, timeron := 0, index := 1
	If timeron := !timeron {
		images := loadImages(folder, , 1)
		If !images.Length {
			Return
		}
		timer := slideShow.Bind(images)
		changeWallpaper(images[index])
		SetTimer(timer, 20000)
	} else {
		SetTimer(timer, 0)
	}

	slideShow(images) {
		If ++index > images.Length
			index := 1
		changeWallpaper(images[index])
	}
}

normalizePath(path, flags := 0x00140000) {
	path := StrReplace(path, 'file:///')
	path := StrReplace(path, '/', '\')

	DllCall("shlwapi.dll\UrlUnescapeW", "Ptr", StrPtr(path), "Ptr", 0, "UInt", 0, "UInt", flags, "UInt")

	Return path
}

changeWallpaper(path, flag := 2) => DllCall("SystemParametersInfo", "UInt", 0x0014, "UInt", 0, "Str", path, "UInt", flag)