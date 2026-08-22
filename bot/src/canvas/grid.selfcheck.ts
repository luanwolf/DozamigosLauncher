import { squareGridLayout } from '@/canvas/grid';

function check(count: number, cell: number) {
  const layout = squareGridLayout(count, cell);
  if (layout.cols * layout.rows < Math.max(count, 1)) throw new Error(`grid too small for ${count}`);
  const contentW = 28 * 2 + layout.cols * layout.cell + Math.max(0, layout.cols - 1) * 10;
  const contentH = 110 + 48 + 28 * 2 + layout.rows * layout.cell + Math.max(0, layout.rows - 1) * 10;
  if (layout.size !== Math.max(contentW, contentH)) throw new Error(`size ${layout.size} vs ${contentW}x${contentH}`);
  if (layout.originX + contentW > layout.size + 1) throw new Error('overflow x');
  if (layout.originY + contentH > layout.size + 1) throw new Error('overflow y');
  return layout;
}

const one = check(1, 132);
const few = check(9, 132);
const many = check(100, 132);
if (few.size <= one.size) throw new Error('9 items should make a bigger square than 1');
if (many.size <= few.size) throw new Error('100 items should make a bigger square than 9');
if (squareGridLayout(16, 100).cols * squareGridLayout(16, 100).rows < 16) throw new Error('16');

process.stdout.write('grid.selfcheck ok\n');
