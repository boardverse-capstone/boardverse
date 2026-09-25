/**
 * Phong cách "Board Game Cafe / Arcade" — pixel borders, neon glow, hex chip,
 * score displays… nhưng GIỮ NGUYÊN palette màu có sẵn.
 *
 * - Không thay đổi tone màu (vẫn orange / amber / neutral…).
 * - Chỉ thêm chi tiết "game-style" lên các khung nút & badge.
 */

/** Pixel/arcade border chunky + glow mặc định. Dùng cho card chính. */
export const arcadeCardClass =
  "relative overflow-hidden rounded-lg border-2 shadow-[2px_2px_0_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-150 hover:shadow-[3px_3px_0_rgba(0,0,0,0.1)]";

/** "Cartridge header" — đầu card với 2 chấm tròn như nút game cartridge. */
export const cartridgeDotsClass =
  "[&::before,_&::after]:content-[''] [&::before,_&::after]:absolute [&::before,_&::after]:size-1.5 [&::before,_&::after]:rounded-full [&::before]:left-2 [&::after]:right-2 [&::before]:top-2 [&::after]:top-2";

/** Status orb pulse — như đèn LED trên bảng điều khiển. */
export const statusOrbClass =
  "relative inline-block size-2.5 rounded-full after:absolute after:inset-0 after:rounded-full after:animate-ping";

/** Score / number display — pixelated monospace. */
export const scoreNumberClass =
  "font-mono font-extrabold tabular-nums tracking-tight";

/** Hex chip cho badge — dùng `clip-path` tạo góc xéo như viên đạn / mảnh ghép. */
export const hexChipClass =
  "[clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest";

/** Power button (nút chính) — arcade style với viền đậm + glow. */
export const powerButtonClass =
  "relative font-bold uppercase tracking-wider shadow-[inset_0_-3px_0_rgba(0,0,0,0.18),0_2px_0_rgba(0,0,0,0.15)] hover:translate-y-[-1px] active:translate-y-0 active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.18),0_1px_0_rgba(0,0,0,0.15)] transition-all";

/** Power button outline — viền cho nút phụ. */
export const powerButtonOutlineClass =
  "relative font-bold uppercase tracking-wider shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-0 active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] transition-all";

/** LCD screen — gradient panel giả màn hình nhỏ. */
export const lcdScreenClass =
  "relative overflow-hidden rounded-md border-2 border-neutral-900/30 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),inset_0_-1px_0_rgba(255,255,255,0.05)] before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)]";

/** Mini pixel arrow góc phải (giả chevron pixel). */
export const pixelChevronClass =
  "[clip-path:polygon(0_0,100%_50%,0_100%)]";

/** Stepper progress bar — segment kiểu thanh máu trong game. */
export const retroBarClass =
  "flex h-3 overflow-hidden rounded-sm border-2 border-neutral-900/30 bg-neutral-900/10";

/** Power LED — đèn LED nhỏ ở góc (indicator). */
export const ledClass =
  "inline-block size-2 rounded-full bg-orange-500 shadow-[0_0_6px_currentColor] animate-pulse";
