# Regenerates the README banner (transparent PNG: cube icon + wordmark).
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

$titleFont = New-Object System.Drawing.Font $family, 78, ([System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font $family, 60, ([System.Drawing.FontStyle]::Bold)

$probe = New-Object System.Drawing.Bitmap 1, 1
$measure = [System.Drawing.Graphics]::FromImage($probe)
$titleSize = $measure.MeasureString('DOZAMIGOS', $titleFont)
$subSize = $measure.MeasureString('LAUNCHER', $subFont)
$measure.Dispose()
$probe.Dispose()

$pad = 24
$iconSize = 190
$gap = 28
$textWidth = [Math]::Ceiling([Math]::Max($titleSize.Width, $subSize.Width))
$textHeight = [Math]::Ceiling($titleSize.Height + $subSize.Height)
$width = $pad * 2 + $iconSize + $gap + $textWidth
$height = $pad * 2 + [Math]::Max($iconSize, $textHeight)

$bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
# Grid-fit hinting bakes the background colour into the glyph edges, so keep it off on transparency.
$g.TextRenderingHint = 'AntiAlias'

# ponytail: purple wordmark instead of white so it stays readable on GitHub's light and dark themes.
$purple = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(168, 85, 247))
$lilac = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(198, 122, 255))

$textLeft = $pad + $iconSize + $gap
$textTop = [Math]::Round(($height - $textHeight) / 2)
$g.DrawImage($icon, $pad, [int][Math]::Round(($height - $iconSize) / 2), $iconSize, $iconSize)
$g.DrawString('DOZAMIGOS', $titleFont, $purple, $textLeft, $textTop)
$g.DrawString('LAUNCHER', $subFont, $lilac, ($textLeft + ($titleSize.Width - $subSize.Width) / 2), ($textTop + $titleSize.Height))

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$icon.Dispose()
if (-not (Test-Path $out)) { throw "failed to write $out" }
Write-Host "wrote $out ($width x $height)"
