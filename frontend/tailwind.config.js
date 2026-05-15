/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── GitHub Dark color tokens (exact hex values) ──────────────────────
      colors: {
        // Backgrounds (gh-* prefixed)
        'gh-canvas':        '#0d1117',
        'gh-canvas-inset':  '#010409',
        'gh-canvas-subtle': '#161b22',
        'gh-surface-1':     '#161b22',
        'gh-surface-2':     '#1c2128',
        'gh-surface-3':     '#22272e',

        // Borders (gh-* prefixed)
        'gh-border':        '#30363d',
        'gh-border-muted':  '#21262d',
        'gh-border-subtle': '#484f58',

        // Foreground (gh-* prefixed)
        'gh-fg':        '#e6edf3',
        'gh-fg-muted':  '#8b949e',
        'gh-fg-subtle': '#6e7681',
        'gh-fg-on-emphasis': '#ffffff',

        // Accent (gh-* prefixed)
        'gh-accent':        '#388bfd',
        'gh-accent-hover':  '#1f6feb',
        'gh-accent-muted':  '#1f6feb66',
        'gh-accent-subtle': '#388bfd1a',
        'gh-accent-emphasis': '#1f6feb',

        // Success (gh-* prefixed)
        'gh-success':          '#3fb950',
        'gh-success-hover':    '#3da44d',
        'gh-success-muted':    '#23863633',
        'gh-success-subtle':   '#3fb9501a',
        'gh-success-emphasis': '#238636',

        // Danger (gh-* prefixed)
        'gh-danger':          '#f85149',
        'gh-danger-hover':    '#da3633',
        'gh-danger-muted':    '#da363333',
        'gh-danger-subtle':   '#f851491a',
        'gh-danger-emphasis': '#da3633',

        // Warning (gh-* prefixed)
        'gh-warning':          '#d29922',
        'gh-warning-hover':    '#bb8009',
        'gh-warning-muted':    '#9e6a0333',
        'gh-warning-subtle':   '#d299221a',
        'gh-warning-emphasis': '#9e6a03',

        // Severe (gh-* prefixed)
        'gh-severe':        '#db6d28',
        'gh-severe-subtle': '#db6d281a',

        // Done (gh-* prefixed)
        'gh-done':        '#a371f7',
        'gh-done-subtle': '#a371f71a',

        // Neutral (gh-* prefixed)
        'gh-neutral':        '#6e7681',
        'gh-neutral-subtle': '#6e76811a',

        // ── Shorthand aliases (no prefix) ─────────────────────────────────
        // These match the class names used in pages: text-fg, text-accent, bg-surface, etc.
        'canvas':         'var(--color-canvas-default)',
        'surface':        'var(--color-surface-1)',
        'surface-hover':  'var(--color-surface-2)',
        'border':         'var(--color-border-default)',

        'fg':             'var(--color-fg-default)',
        'fg-muted':       'var(--color-fg-muted)',
        'fg-subtle':      'var(--color-fg-subtle)',

        'accent':         'var(--color-accent-fg)',
        'accent-hover':   'var(--color-accent-emphasis)',
        'accent-light':   'var(--color-accent-fg)',

        'success':        'var(--color-success-fg)',
        'success-hover':  'var(--color-success-emphasis)',

        'danger':         'var(--color-danger-fg)',
        'danger-hover':   'var(--color-danger-emphasis)',

        'warning':        'var(--color-warning-fg)',
        'warning-hover':  'var(--color-warning-emphasis)',

        'severe':         'var(--color-severe-fg)',
        'done':           'var(--color-done-fg)',
      },

      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"',
          'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"',
        ],
        mono: [
          '"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'Menlo',
          'monospace',
        ],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },

      boxShadow: {
        'gh-card':    '0 0 0 1px #30363d',
        'gh-overlay': '0 16px 32px rgba(1,4,9,0.85), 0 0 0 1px #30363d',
        'gh-inset':   'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
