/**
 * Builds src-tauri/icons/icon-dev.ico from app-icon-dev.png.
 *
 * Tauri embeds the window/taskbar icon from the FIRST entry of the .ico
 * (tauri-codegen image.rs -> icon_dir.entries()[0]), so 32x32 must come first,
 * matching the production icon.ico layout. The remaining sizes are what
 * Explorer and the shell pick from.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'app-icon-dev.png');
const output = resolve(root, 'src-tauri/icons/icon-dev.ico');
const sizes = [32, 16, 24, 48, 64, 256];

const python = `
import struct, sys
from io import BytesIO
from PIL import Image

source, output = sys.argv[1], sys.argv[2]
sizes = [int(s) for s in sys.argv[3:]]
base = Image.open(source).convert('RGBA')

frames = []
for size in sizes:
    buffer = BytesIO()
    base.resize((size, size), Image.LANCZOS).save(buffer, format='PNG')
    frames.append((size, buffer.getvalue()))

offset = 6 + 16 * len(frames)
header = struct.pack('<HHH', 0, 1, len(frames))
directory = b''
for size, data in frames:
    byte = 0 if size == 256 else size
    directory += struct.pack('<BBBBHHII', byte, byte, 0, 0, 1, 32, len(data), offset)
    offset += len(data)

with open(output, 'wb') as f:
    f.write(header + directory + b''.join(data for _, data in frames))
`;

mkdirSync(dirname(output), { recursive: true });
execFileSync('python', ['-c', python, source, output, ...sizes.map(String)], { stdio: 'inherit' });
console.log(`icon-dev.ico written with entries: ${sizes.join(', ')}`);
