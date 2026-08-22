/**
 * Purpose-Built Pixel Art SVG Icon Library (Pixelarticons + Pixel Icon Library)
 * All icons rendered on a strict 24x24 pixel grid with currentColor fill.
 */

const HRIcons = {
  // Authentic 3-Cell 16-Segment Alphanumeric Display Logo spelling "H R H"
  logo: (size = 26) => `
    <svg viewBox="0 0 70 28" width="${Math.round(size * 2.5)}" height="${size}" fill="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" class="hr-icon-logo">
      <defs>
        <!-- Single 16-Segment Display Cell Template -->
        <g id="seg-cell" transform="skewX(-7)">
          <!-- Unlit skeleton segments (dark grid) -->
          <g stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.2" stroke-linecap="square" stroke-linejoin="miter">
            <line x1="2" y1="2" x2="16" y2="2"/>
            <line x1="16" y1="2" x2="16" y2="13"/>
            <line x1="16" y1="13" x2="16" y2="24"/>
            <line x1="16" y1="24" x2="2" y2="24"/>
            <line x1="2" y1="24" x2="2" y2="13"/>
            <line x1="2" y1="13" x2="2" y2="2"/>
            <line x1="2" y1="13" x2="16" y2="13"/>
            <line x1="9" y1="2" x2="9" y2="13"/>
            <line x1="9" y1="13" x2="9" y2="24"/>
            <line x1="2" y1="2" x2="9" y2="13"/>
            <line x1="16" y1="2" x2="9" y2="13"/>
            <line x1="9" y1="13" x2="2" y2="24"/>
            <line x1="9" y1="13" x2="16" y2="24"/>
            <rect x="18" y="23" width="1.5" height="1.5" fill="rgba(255, 255, 255, 0.12)"/>
          </g>
        </g>
      </defs>

      <!-- Letter 1: 'H' (Cyan Phosphor) -->
      <g transform="translate(3, 1)">
        <use href="#seg-cell" x="0" y="0"/>
        <g stroke="var(--color-brand, #00E5FF)" stroke-width="2.2" stroke-linecap="square" filter="drop-shadow(0 0 3px var(--color-brand, #00E5FF))" transform="skewX(-7)">
          <line x1="2" y1="2" x2="2" y2="24"/>
          <line x1="16" y1="2" x2="16" y2="24"/>
          <line x1="2" y1="13" x2="16" y2="13"/>
        </g>
        <rect x="18" y="23" width="1.5" height="1.5" fill="var(--color-brand, #00E5FF)" transform="skewX(-7)"/>
      </g>

      <!-- Letter 2: 'R' (White Phosphor) -->
      <g transform="translate(26, 1)">
        <use href="#seg-cell" x="0" y="0"/>
        <g stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="square" filter="drop-shadow(0 0 3px #FFFFFF)" transform="skewX(-7)">
          <line x1="2" y1="2" x2="2" y2="24"/>
          <line x1="2" y1="2" x2="16" y2="2"/>
          <line x1="16" y1="2" x2="16" y2="13"/>
          <line x1="2" y1="13" x2="16" y2="13"/>
          <line x1="9" y1="13" x2="16" y2="24"/>
        </g>
        <rect x="18" y="23" width="1.5" height="1.5" fill="#FFFFFF" transform="skewX(-7)"/>
      </g>

      <!-- Letter 3: 'H' (Cyan Phosphor) -->
      <g transform="translate(49, 1)">
        <use href="#seg-cell" x="0" y="0"/>
        <g stroke="var(--color-brand, #00E5FF)" stroke-width="2.2" stroke-linecap="square" filter="drop-shadow(0 0 3px var(--color-brand, #00E5FF))" transform="skewX(-7)">
          <line x1="2" y1="2" x2="2" y2="24"/>
          <line x1="16" y1="2" x2="16" y2="24"/>
          <line x1="2" y1="13" x2="16" y2="13"/>
        </g>
        <rect x="18" y="23" width="1.5" height="1.5" fill="var(--color-brand, #00E5FF)" transform="skewX(-7)"/>
      </g>
    </svg>
  `,

  // Pixelarticons: Folder (Explorer)
  folder: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M4 4h6v2H4zm0 14h16v2H4zM20 8h2v10h-2zM2 6h2v12H2zm8 0h10v2H10z"/>
    </svg>
  `,

  // Pixelarticons: Code / Workspace
  workspace: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M11 18H9v-4h2v4Zm-4-1H5v-2h2v2Zm12-2v2h-2v-2h2ZM5 15H3v-2h2v2Zm16 0h-2v-2h2v2Zm-8-1h-2v-4h2v4ZM3 13H1v-2h2v2Zm20 0h-2v-2h2v2ZM5 11H3V9h2v2Zm16 0h-2V9h2v2Zm-6-1h-2V6h2v4ZM7 9H5V7h2v2Zm12 0h-2V7h2v2Z"/>
    </svg>
  `,

  // Pixelarticons: Terminal
  terminal: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM6 16h2v2H6zm2-2h2v2H8zm-2-2h2v2H6z"/>
    </svg>
  `,

  // Pixelarticons: Sliders (Admin Settings)
  admin: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M8 14H7v6H5v-6H2v-2h6v2Zm5 6h-2V10h2v10Zm9-2h-3v2h-2v-2h-1v-2h6v2Zm-3-4h-2V4h2v10ZM7 10H5V4h2v6Zm6-4h2v2H9V6h2V4h2v2Z"/>
    </svg>
  `,

  // Pixelarticons: Bell (Notification)
  bell: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M9 2h6v2H9zM7 4h2v2H7zm8 0h2v2h-2zM5 6h2v7H5zm12 0h2v7h-2zM3 13h2v4H3zm16 0h2v4h-2z"/>
      <path d="M3 15h18v2H3zm5 3h2v2H8zm6 0h2v2h-2zm-4 2h4v2h-4z"/>
    </svg>
  `,

  // Pixelarticons: Key (Auth)
  key: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M11 18H3V16H11V18ZM23 15H21V18H17V16H19V13H21V11H11V8H13V9H23V15ZM3 16H1V8H3V16ZM17 16H15V15H13V16H11V13H17V16ZM9 14H5V10H9V14ZM11 8H3V6H11V8Z"/>
    </svg>
  `,

  // Pixelarticons: Zap (Lightning / Fetch)
  zap: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-brand">
      <path d="M4 13h8v6h2v2h-2v2h-2v-8H2v-4h2v2Zm12 6h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2v-2h2v2Zm-6-6h8v4h-2v-2h-8V5h-2V3h2V1h2v8Zm-8 2H4V9h2v2Zm2-2H6V7h2v2Zm2-2H8V5h2v2Z"/>
    </svg>
  `,

  // Pixelarticons: Search
  search: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M22 22h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-6-2H6v-2h8v2Zm4 0h-2v-2h2v2ZM6 16H4v-2h2v2Zm10 0h-2v-2h2v2ZM4 14H2V6h2v8Zm14 0h-2V6h2v8ZM6 6H4V4h2v2Zm10 0h-2V4h2v2Zm-2-2H6V2h8v2Z"/>
    </svg>
  `,

  // Pixelarticons: Filter
  filter: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M11 20H13V22H9V12H11V20ZM15 20H13V12H15V20ZM9 12H7V10H9V12ZM17 12H15V10H17V12ZM7 10H5V8H7V10ZM19 10H17V8H19V10ZM21 8H19V4H5V8H3V2H21V8Z"/>
    </svg>
  `,

  // Pixelarticons: Check (Success / Solved / Approved)
  check: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-success">
      <path d="M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z"/>
    </svg>
  `,

  // Pixelarticons: Clock (Attention / Pending)
  clock: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-attention">
      <path d="M6 2h12v2H6zM2 6h2v12H2zm18 0h2v12h-2zm-2-2h2v2h-2zM4 4h2v2H4zm2 18h12v-2H6zm12-2h2v-2h-2zM4 20h2v-2H4zm7-14h2v7h-2zm2 7h2v2h-2zm2 2h2v2h-2z"/>
    </svg>
  `,

  // Pixelarticons: Close (Critical / Reject / Dismiss)
  close: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-critical">
      <path d="M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z"/>
    </svg>
  `,

  // Authentic 5-Point Pixel Star (Outline Hollow Rating)
  star: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-star">
      <path d="M11 2h2v2h-2z M10 4h1v2h-1z M13 4h1v2h-1z M9 6h1v2H9z M14 6h1v2h-1z M1 8h8v1H1z M15 8h8v1h-8z M1 9h1v2H1z M22 9h1v2h-1z M2 11h3v1H2z M19 11h3v1h-3z M5 12h2v1H5z M17 12h2v1h-2z M6 13h1v2H6z M17 13h1v2h-1z M5 15h1v2H5z M18 15h1v2h-1z M4 17h1v2H4z M19 17h1v2h-1z M3 19h1v3H3z M20 19h1v3h-1z M4 21h3v1H4z M17 21h3v1h-3z M7 19h2v2H7z M15 19h2v2h-2z M9 17h6v2H9z"/>
    </svg>
  `,

  // Authentic 5-Point Pixel Star (Solid Filled Rating)
  starFilled: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-star-filled">
      <path d="M11 2h2v2h-2z M10 4h4v2h-4z M9 6h6v2H9z M1 8h22v3H1z M4 11h16v2H4z M6 13h12v2H6z M5 15h14v2H5z M4 17h6v2H4z M14 17h6v2h-6z M3 19h4v3H3z M17 19h4v3h-4z"/>
    </svg>
  `,

  // Pixelarticons: Message / Comment
  comment: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M20 2H4v2h16zm0 14H6v2h14zm2-12h-2v12h2zM4 4H2v18h2zm2 14H4v2h2z"/>
    </svg>
  `,

  // Pixelarticons: Sparkle (AI Agent)
  aiSpark: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-brand">
      <path d="M11 1h2v4h-2zm0 22h2v-4h-2zM9 5h2v4H9zm0 14h2v-4H9zm4-14h2v4h-2zm0 14h2v-4h-2zM5 9h4v2H5zm14 0h-4v2h4zM1 11h4v2H1zm22 0h-4v2h4zM5 13h4v2H5zm14 0h-4v2h4z"/>
    </svg>
  `,

  // Pixelarticons: CPU / Chip (Cleverness Metric)
  brain: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M5 3h14v2H5zm0 16h14v2H5zM3 5h2v14H3zm16 0h2v14h-2zM9 7h6v2H9zm0 8h6v2H9zM7 9h2v6H7zm8 0h2v6h-2zm-4-8h2v2h-2zm0 20h2v2h-2zM1 11h2v2H1zm20 0h2v2h-2zm0-4h2v2h-2zm0 8h2v2h-2zM1 15h2v2H1zm0-8h2v2H1zm6-6h2v2H7zm8 0h2v2h-2zm0 20h2v2h-2zm-8 0h2v2H7z"/>
    </svg>
  `,

  // Pixelarticons: File-Text (Readability / Document)
  document: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M6 4H4v16h2zm10-2H6v2h10zm4 4h-2v14h2zm-2 14H6v2h12zM16 4h2v2h-2zm-4 0h2v6h-2z"/>
      <path d="M12 8h6v2h-6zm-4 8h8v2H8zm0-4h8v2H8zm0-4h2v2H8z"/>
    </svg>
  `,

  // Pixelarticons: Target / Line Badge
  target: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M5 1h14v2H5zM3 3h2v2H3zm0 16h2v2H3zm16 0h2v2h-2zm0-16h2v2h-2zm2 2h2v14h-2zM5 21h14v2H5zM1 5h2v14H1zm8 0h6v2H9zM5 9h2v6H5zm4 8h6v2H9zm8-8h2v6h-2zm-6 0h2v2h-2zM7 7h2v2H7zm0 8h2v2H7zm8 0h2v2h-2zm0-8h2v2h-2zm-6 4h2v2H9zm2 2h2v2h-2zm2-2h2v2h-2z"/>
    </svg>
  `,

  // Pixelarticons: Discord (Community SSO)
  discord: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M9 21H5v-2h4v2Zm10 0h-4v-2h4v2ZM5 19H3v-2h2v2Zm12-2h-2v2h-2v-2h-2v2H9v-2H7v-2h10v2Zm4 2h-2v-2h2v2ZM3 17H1V7h2v10Zm20 0h-2V7h2v10Zm-12-4H8v-3h3v3Zm5 0h-3v-3h3v3ZM5 7H3V5h2v2Zm10 0H9V5h6v2Zm6 0h-2V5h2v2ZM9 5H5V3h4v2Zm10 0h-4V3h4v2Z"/>
    </svg>
  `,

  // Pixelarticons: Bullet List (Table of Contents / Queue)
  list: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M10 5h12v2H10zm0 4h8v2h-8zm0 4h12v2H10zm0 4h8v2h-8zm-4-6H4V9h2v2ZM4 9H2V7h2v2Zm4 0H6V7h2v2ZM6 7H4V5h2v2Zm-2 6h2v2H4zm0 4h2v2H4zm-2 0v-2h2v2zm4 0v-2h2v2z"/>
    </svg>
  `,

  // Pixelarticons: Download (Export)
  download: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M21 15v4h-2v-4zm-2 4v2H5v-2zM5 15v4H3v-4zm8-12v14h-2V3z"/>
      <path d="M7 11v2h10v-2zm2 2v2h2v-2zm4 0v2h2v-2z"/>
      <path d="M15 11v2h2v-2z"/>
    </svg>
  `,

  // Pixelarticons: Upload (Import)
  upload: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M19 21H5v-2h14v2ZM5 19H3v-4h2v4Zm16 0h-2v-4h2v4ZM13 5h2v2h2v2h-4v8h-2V9H7V7h2V5h2V3h2v2Z"/>
    </svg>
  `,

  // Pixelarticons: Copy
  copy: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M8 6h12v2H8zM4 2h12v2H4zm2 6h2v12H6zM2 4h2v12H2zm6 16h12v2H8zM20 8h2v12h-2zm-4-4h2v2h-2zM4 16h2v2H4z"/>
    </svg>
  `,

  // Pixelarticons: External Link
  external: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M11 5H5v2h6V5ZM5 7H3v12h2V7Zm12 12H5v2h12v-2Zm2-6h-2v6h2v-6Zm-8 0H9v2h2v-2Zm2-2h-2v2h2v-2Zm2-2h-2v2h2V9Zm2-2h-2v2h2V7Zm2-2h-2v2h2V5Zm2-2h-2v8h2V3Z"/>
      <path d="M21 3h-8v2h8V3Z"/>
    </svg>
  `,

  // Pixelarticons: Reload / Sync
  sync: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M16 4h2v6h-2zm-2-2h2v2h-2zm0 2h2v8h-2zM4 8H2v5h2z"/>
      <path d="M4 6h16v2H4zm4 14H6v-6h2zm2 2H8v-2h2zm0-2H8v-8h2zm10-4h2v-5h-2z"/>
      <path d="M20 18H4v-2h16z"/>
    </svg>
  `,

  // Pixelarticons: User
  user: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M9 2h6v2H9zm0 8h6v2H9zm6-6h2v6h-2zM7 4h2v6H7zM4 18h2v4H4zm14 0h2v4h-2zM8 14h8v2H8zm-2 2h2v2H6zm10 0h2v2h-2z"/>
    </svg>
  `,

  // Pixelarticons: Trash
  trash: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M18 22H6V20H18V22ZM9 6H15V4H17V6H22V8H20V20H18V8H6V20H4V8H2V6H7V4H9V6ZM15 4H9V2H15V4Z"/>
    </svg>
  `,

  // Pixelarticons: Pencil / Edit
  edit: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M4 16H6V18H8V20H10V22H2V14H4V16ZM12 20H10V18H12V20ZM14 18H12V16H14V18ZM10 16H8V14H10V16ZM16 16H14V14H16V16ZM6 14H4V12H6V14ZM12 14H10V12H12V14ZM18 14H16V12H18V14ZM8 12H6V10H8V12ZM14 12H12V10H14V12ZM20 12H18V10H20V12ZM10 10H8V8H10V10ZM18 10H16V8H18V10ZM22 10H20V8H22V10ZM12 8H10V6H12V8ZM16 8H14V6H16V8ZM20 8H18V6H20V8ZM14 6H12V4H14V6ZM18 6H16V4H18V6ZM16 4H14V2H16V4Z"/>
    </svg>
  `,

  // Pixelarticons: Eye
  eye: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M16 20H8v-2h8v2Zm-8-2H4v-2h4v2Zm12 0h-4v-2h4v2ZM4 16H2v-2h2v2Zm10-6h-2v2h2v-2h2v4h-2v2h-4v-2H8v-4h2V8h4v2Zm8 6h-2v-2h2v2ZM2 14H0v-4h2v4Zm22 0h-2v-4h2v4ZM4 10H2V8h2v2Zm18 0h-2V8h2v2ZM8 8H4V6h4v2Zm12 0h-4V6h4v2Zm-4-2H8V4h8v2Z"/>
    </svg>
  `,

  // Pixelarticons: Git-Branch
  gitBranch: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M4 14h4v2H4zm0 6h4v2H4zm-2-4h2v4H2zm6 0h2v4H8zm8-14h4v2h-4zm0 6h4v2h-4zm-2-4h2v4h-2zm6 0h2v4h-2zm-8 13h5v2h-5zm5-5h2v5h-2zM5 2h2v10H5z"/>
    </svg>
  `,

  // Pixelarticons: Warning Diamond (Alert)
  alert: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-attention">
      <path d="M2 10h2v2H2zm0 4h2v-2H2zm20-4h-2v2h2zm0 4h-2v-2h2zM4 8h2v2H4zm0 8h2v-2H4zm16-8h-2v2h2zm0 8h-2v-2h2zM6 6h2v2H6zm0 12h2v-2H6zM18 6h-2v2h2zm0 12h-2v-2h2zM8 4h2v2H8zm0 16h2v-2H8zm8-16h-2v2h2zm0 16h-2v-2h2zM10 2h2v2h-2zm0 20h2v-2h-2zm4-20h-2v2h2zm0 20h-2v-2h2zm-3-5h2v-2h-2zm0-4h2V7h-2z"/>
    </svg>
  `,

  // Pixelarticons: Chevron Down
  chevronDown: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M13 16h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 10H5V8h2v2Zm12 0h-2V8h2v2Z"/>
    </svg>
  `,

  // Pixelarticons: Chevron Up
  chevronUp: (size = 14) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M13 8h-2v2h2V8Zm-2 2H9v2h2v-2Zm4 0h-2v2h2v-2Zm-6 2H7v2h2v-2Zm8 0h-2v2h2v-2ZM7 14H5v2h2v-2Zm12 0h-2v2h2v-2Z"/>
    </svg>
  `,

  // Pixelarticons: Checkbox
  checkbox: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon">
      <path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2z"/>
    </svg>
  `,

  // Pixelarticons: Checkbox Checked
  checkboxOn: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" shape-rendering="crispEdges" class="hr-icon hr-icon-success">
      <path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM7 12h2v2H7zm2 2h2v2H9zm2-2h2v2h-2zm2-2h2v2h-2zm2-2h2v2h-2z"/>
    </svg>
  `
};

// CommonJS export if running in Node.js test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HRIcons;
}
