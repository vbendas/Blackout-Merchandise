#!/usr/bin/env bun
//
// MerchStation — Terminal Product Management for MerchFrom
//
// Usage:
//   merchstation              Launch the TUI
//   merchstation --version    Print version
//   merchstation --help       Show help
//

import { render } from 'ink';
import React from 'react';
import { App } from './app.js';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  const pkg = await import('../package.json', { assert: { type: 'json' } });
  console.log(`merchstation v${pkg.default.version}`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  merchstation v0.1.0 — Terminal Product Management for MerchFrom

  Usage:
    merchstation              Launch the TUI
    merchstation --version    Print version
    merchstation --help       Show this help

  First run will prompt for:
    • Neon PostgreSQL URL
    • Cloudinary credentials
    • Typesense API key
    • App server URL (for reindex)

  After setup, just type your passphrase to connect.

  Navigation:
    ↑/↓       Navigate sidebar
    Enter     Open selected screen
    1-5       Quick switch screens
    Esc       Back
    Ctrl+Q    Quit
    Ctrl+L    Logout
`);
  process.exit(0);
}

// ─── ASCII Logo Banner ──────────────────────────────────────────────────────

const NO_COLOR = process.env.NO_COLOR || process.env.CI;

// Generated with figlet "ANSI Shadow" font — bold block characters
const LOGO_LINES = [
  '███╗   ███╗███████╗██████╗  ██████╗██╗  ██╗    ███████╗████████╗ █████╗ ████████╗██╗ ██████╗ ███╗   ██╗',
  '████╗ ████║██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║',
  '██╔████╔██║█████╗  ██████╔╝██║     ███████║    ███████╗   ██║   ███████║   ██║   ██║██║   ██║██╔██╗ ██║',
  '██║╚██╔╝██║██╔══╝  ██╔══██╗██║     ██╔══██║    ╚════██║   ██║   ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║',
  '██║ ╚═╝ ██║███████╗██║  ██║╚██████╗██║  ██║    ███████║   ██║   ██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║',
  '╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝',
];

const SUBTITLE = '       T E R M I N A L   P R O D U C T   M A N A G E M E N T';

function silverGradient(text: string, lineIndex: number, totalLines: number): string {
  if (NO_COLOR) return text;
  // Flat silver gradient: uniform cool silver tone with subtle variation
  // Avoids the bright white peak that caused a yellow-ish band in the middle
  const t = lineIndex / Math.max(totalLines - 1, 1);
  const base = 180 + Math.round(20 * Math.sin(t * Math.PI));
  return `\x1b[38;2;${base};${base};${base + 5}m${text}\x1b[0m`;
}

function showLogo(): Promise<void> {
  return new Promise((resolve) => {
    const termWidth = process.stdout.columns ?? 120;
    const logoWidth = 103; // visual width of the ANSI Shadow logo
    const subtitleWidth = SUBTITLE.trimEnd().length;

    // Center each independently
    const logoPad = Math.max(0, Math.floor((termWidth - logoWidth) / 2));
    const subtitlePad = Math.max(0, Math.floor((termWidth - subtitleWidth) / 2));

    const logoPadStr = ' '.repeat(logoPad);
    const subtitlePadStr = ' '.repeat(subtitlePad);

    if (NO_COLOR) {
      LOGO_LINES.forEach((line) => console.log(logoPadStr + line));
      console.log(subtitlePadStr + SUBTITLE);
    } else {
      const allLines = [...LOGO_LINES];
      allLines.forEach((line, i) => {
        console.log(silverGradient(logoPadStr + line, i, allLines.length));
      });
      console.log(silverGradient(subtitlePadStr + SUBTITLE, allLines.length, allLines.length + 1));
    }
    // Brief pause so the logo is visible before the TUI loads
    setTimeout(resolve, 800);
  });
}

// ─── Launch ─────────────────────────────────────────────────────────────────

await showLogo();

const { stdout } = process;
const { waitUntilExit } = render(React.createElement(App), {
  stdout,
});

await waitUntilExit();
