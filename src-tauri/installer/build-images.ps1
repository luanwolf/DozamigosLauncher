# Regenerates the NSIS banner images from the app icon.
# NSIS only accepts BMP, so run this whenever the icon or branding changes:
#   powershell -ExecutionPolicy Bypass -File src-tauri/installer/build-images.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconPath = Join-Path $root 'icons/icon.png'
$fontPath = Join-Path (Split-Path -Parent $root) 'static/fonts/BurbankBigCondensed-Black.otf'

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

function New-Canvas([int]$width, [int]$height) {
  $bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.TextRenderingHint = 'AntiAliasGridFit'

  $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  $from = [System.Drawing.Color]::FromArgb(11, 14, 20)
  $to = [System.Drawing.Color]::FromArgb(23, 28, 40)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $from, $to, 45.0
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  return @{ Bitmap = $bmp; Graphics = $g }
}

function Add-Glow($g, [int]$cx, [int]$cy, [int]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(($cx - $radius), ($cy - $radius), ($radius * 2), ($radius * 2))
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
  $glow.CenterColor = [System.Drawing.Color]::FromArgb(120, 168, 44, 232)
  $glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 168, 44, 232))
  $g.FillPath($glow, $path)
  $glow.Dispose()
  $path.Dispose()
}

function Save-Canvas($canvas, [string]$name) {
  $out = Join-Path $PSScriptRoot $name
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $canvas.Bitmap.Dispose()
  if (-not (Test-Path $out)) { throw "failed to write $out" }
  Write-Host "wrote $out"
}

$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$purple = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(198, 122, 255))
$grey = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 150, 170))

# Header: shown on every page except welcome/finish (150x57).
$header = New-Canvas 150 57
Add-Glow $header.Graphics 26 28 34
$header.Graphics.DrawImage($icon, 6, 8, 40, 40)
$header.Graphics.DrawString('DOZAMIGOS', (New-Object System.Drawing.Font $family, 15, ([System.Drawing.FontStyle]::Bold)), $white, 48, 6)
$header.Graphics.DrawString('LAUNCHER', (New-Object System.Drawing.Font $family, 12, ([System.Drawing.FontStyle]::Bold)), $purple, 49, 27)
Save-Canvas $header 'header.bmp'

# Sidebar: welcome and finish pages (164x314).
$sidebar = New-Canvas 164 314
Add-Glow $sidebar.Graphics 82 100 110
$sidebar.Graphics.DrawImage($icon, 34, 52, 96, 96)

$centered = New-Object System.Drawing.StringFormat
$centered.Alignment = 'Center'
$line = New-Object System.Drawing.RectangleF 0, 168, 164, 40
$sidebar.Graphics.DrawString('DOZAMIGOS', (New-Object System.Drawing.Font $family, 26, ([System.Drawing.FontStyle]::Bold)), $white, $line, $centered)
$line = New-Object System.Drawing.RectangleF 0, 204, 164, 34
$sidebar.Graphics.DrawString('LAUNCHER', (New-Object System.Drawing.Font $family, 20, ([System.Drawing.FontStyle]::Bold)), $purple, $line, $centered)
$line = New-Object System.Drawing.RectangleF 0, 284, 164, 22
$sidebar.Graphics.DrawString('by Heyash', (New-Object System.Drawing.Font $family, 10), $grey, $line, $centered)
Save-Canvas $sidebar 'sidebar.bmp'

$icon.Dispose()
