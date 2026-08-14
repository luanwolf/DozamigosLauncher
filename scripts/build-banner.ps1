# Regenerates the README banner from the app icon.
#   powershell -ExecutionPolicy Bypass -File scripts/build-banner.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconPath = Join-Path $root 'src-tauri/icons/icon.png'
$fontPath = Join-Path $root 'static/fonts/BurbankBigCondensed-Black.otf'
$out = Join-Path $root 'assets/banner.png'

$icon = [System.Drawing.Image]::FromFile($iconPath)

# GDI+ can't rasterize CFF-flavoured OpenType, so fall back to a condensed system face.
$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$family = $null
try {
  $fonts.AddFontFile($fontPath)
  $family = $fonts.Families[0]
} catch {
  foreach ($name in @('Bahnschrift Condensed', 'Segoe UI Black', 'Arial')) {
    try { $family = New-Object System.Drawing.FontFamily $name; break } catch { }
  }
}

$width = 1280
$height = 340
$bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.TextRenderingHint = 'AntiAliasGridFit'

$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(11, 14, 20)), ([System.Drawing.Color]::FromArgb(23, 28, 40)), 45.0
$g.FillRectangle($bg, $rect)
$bg.Dispose()

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(80, -140, 620, 620)
$glow = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
$glow.CenterColor = [System.Drawing.Color]::FromArgb(120, 168, 44, 232)
$glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 168, 44, 232))
$g.FillPath($glow, $path)
$glow.Dispose()
$path.Dispose()

$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$purple = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(198, 122, 255))
$grey = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 150, 170))

$g.DrawImage($icon, 110, 86, 168, 168)
$g.DrawString('DOZAMIGOS', (New-Object System.Drawing.Font $family, 72, ([System.Drawing.FontStyle]::Bold)), $white, 310, 66)
$g.DrawString('LAUNCHER', (New-Object System.Drawing.Font $family, 56, ([System.Drawing.FontStyle]::Bold)), $purple, 314, 160)
$g.DrawString('Fortnite Battle Royale, Salve o Mundo e Epic Games em um só lugar', (New-Object System.Drawing.Font $family, 20), $grey, 316, 240)

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$icon.Dispose()
if (-not (Test-Path $out)) { throw "failed to write $out" }
Write-Host "wrote $out"
