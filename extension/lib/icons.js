/**
 * Purpose-Built SVG Icon Library - Lixie / 16-Segment Phosphor Aesthetic
 * Replaces all emoji icons with sharp, crisp, scalable vector glyphs.
 */

const HRIcons = {
  // Precision 6-Unit 3-Column Ascending Multi-Segment Display Logo (1:1 with Reference Photo)
  logo: (size = 24) => `
    <svg viewBox="0 0 72 72" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" class="hr-icon-logo">
      <defs>
        <!-- Single 16-Segment Display Cell Template -->
        <g id="seg-cell" transform="skewX(-8)">
          <!-- Unlit skeleton segments (dark grid) -->
          <g stroke="rgba(255, 255, 255, 0.14)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <!-- Perimeter -->
            <line x1="2" y1="1" x2="10" y2="1"/>
            <line x1="10" y1="1" x2="10" y2="9"/>
            <line x1="10" y1="9" x2="10" y2="17"/>
            <line x1="10" y1="17" x2="2" y2="17"/>
            <line x1="2" y1="17" x2="2" y2="9"/>
            <line x1="2" y1="9" x2="2" y2="1"/>
            <!-- Center Cross & Diagonals -->
            <line x1="2" y1="9" x2="10" y2="9"/>
            <line x1="6" y1="1" x2="6" y2="9"/>
            <line x1="6" y1="9" x2="6" y2="17"/>
            <line x1="2" y1="1" x2="6" y2="9"/>
            <line x1="10" y1="1" x2="6" y2="9"/>
            <line x1="6" y1="9" x2="2" y2="17"/>
            <line x1="6" y1="9" x2="10" y2="17"/>
            <!-- Unlit DP -->
            <circle cx="12.5" cy="17" r="0.9" fill="rgba(255, 255, 255, 0.14)"/>
          </g>
        </g>
      </defs>

      <!-- Column 1 (Left: 2 Stacked Displays, lowest elevation) -->
      <g transform="translate(6, 26)">
        <use href="#seg-cell" x="0" y="0"/>
        <!-- Lit Segments Top Digit -->
        <path d="M4 1v8M4 9v8" stroke="var(--color-brand, #00E5FF)" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 3px var(--color-brand, #00E5FF))"/>
        <!-- Bottom Digit -->
        <use href="#seg-cell" x="0" y="20"/>
        <path d="M4 21h8M4 21v8M12 29v8M4 37h8M4 29h8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 3px #FFFFFF)"/>
        <circle cx="14.5" cy="37" r="1.1" fill="var(--color-brand, #00E5FF)"/>
      </g>

      <!-- Column 2 (Middle: 2 Stacked Displays, mid elevation) -->
      <g transform="translate(26, 14)">
        <use href="#seg-cell" x="0" y="0"/>
        <!-- Lit Segments Top Digit -->
        <path d="M4 1v8M4 9h8M12 9v8" stroke="var(--color-brand, #00E5FF)" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 3px var(--color-brand, #00E5FF))"/>
        <!-- Bottom Digit -->
        <use href="#seg-cell" x="0" y="20"/>
        <path d="M4 21h8M12 21v8M4 29h8M4 29v8M4 37h8M12 29v8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 3px #FFFFFF)"/>
        <circle cx="14.5" cy="37" r="1.1" fill="#FFFFFF"/>
      </g>

      <!-- Column 3 (Right: 2 Stacked Displays, highest elevation) -->
      <g transform="translate(46, 2)">
        <use href="#seg-cell" x="0" y="0"/>
        <!-- Lit Segments Top Digit -->
        <path d="M4 1v8M4 9v8M12 1v8M12 9v8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 3px #FFFFFF)"/>
        <!-- Bottom Digit -->
        <use href="#seg-cell" x="0" y="20"/>
        <path d="M4 21h8M4 21v8M4 29h8M12 29v8M4 37h8" stroke="var(--color-brand, #00E5FF)" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 3px var(--color-brand, #00E5FF))"/>
        <circle cx="14.5" cy="37" r="1.1" fill="var(--color-brand, #00E5FF)"/>
      </g>
    </svg>
  `,

  explorer: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
    </svg>
  `,

  workspace: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <path d="M7 8l3 3-3 3M13 14h4"/>
    </svg>
  `,

  admin: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <line x1="4" y1="21" x2="4" y2="14"/>
      <line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/>
      <line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  `,

  bell: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  `,

  key: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3-4.5 4.5a5.5 5.5 0 1 0 7.78 7.78L22 10.5V6l-2-2z"/>
      <circle cx="7.5" cy="16.5" r="1.5" fill="currentColor"/>
    </svg>
  `,

  lightning: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  `,

  search: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  `,

  filter: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  `,

  check: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="hr-icon hr-icon-success">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `,

  clock: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon hr-icon-attention">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  `,

  alert: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon hr-icon-critical">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  `,

  star: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon hr-icon-star">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  `,

  starFilled: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" stroke="currentColor" stroke-width="1.5" class="hr-icon hr-icon-star-filled">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  `,

  comment: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `,

  aiSpark: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364"/>
    </svg>
  `,

  brain: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/>
    </svg>
  `,

  document: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  `,

  target: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  `,

  discord: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M18 6h0a14.5 14.5 0 0 0-4-1.2 11.5 11.5 0 0 0-.5 1.2 13.5 13.5 0 0 0-3 0 11.5 11.5 0 0 0-.5-1.2A14.5 14.5 0 0 0 6 6a15.8 15.8 0 0 0-2 9.5 14.5 14.5 0 0 0 4.5 2.3 11.5 11.5 0 0 0 1-1.6 9.4 9.4 0 0 1-1.6-.8l.4-.3a10.5 10.5 0 0 0 7.4 0l.4.3a9.4 9.4 0 0 1-1.6.8 11.5 11.5 0 0 0 1 1.6 14.5 14.5 0 0 0 4.5-2.3A15.8 15.8 0 0 0 18 6z"/>
      <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  `,

  list: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  `,

  export: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  `,

  import: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  `,

  copy: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  `,

  external: (size = 12) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  `,

  sync: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  `,

  code: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  `,

  close: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hr-icon">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HRIcons;
}
