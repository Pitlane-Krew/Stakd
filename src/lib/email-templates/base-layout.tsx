import * as React from 'react';

interface BaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

const baseStyles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    margin: 0,
    padding: 0,
  },
  wrapper: {
    backgroundColor: '#0f172a',
    paddingTop: '40px',
    paddingBottom: '40px',
  },
  card: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    overflow: 'hidden' as const,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  header: {
    backgroundColor: '#0f172a',
    padding: '40px 30px',
    borderBottom: '1px solid #334155',
    textAlign: 'center' as const,
  },
  logo: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#4B9CD3',
    letterSpacing: '2px',
    margin: 0,
  },
  content: {
    padding: '40px 30px',
  },
  footer: {
    backgroundColor: '#0f172a',
    padding: '30px',
    borderTop: '1px solid #334155',
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#94a3b8',
  },
  footerText: {
    margin: '10px 0',
    lineHeight: '1.5',
  },
  divider: {
    borderTop: '1px solid #334155',
    margin: '20px 0',
  },
  link: {
    color: '#4B9CD3',
    textDecoration: 'none',
  },
} as const;

export function BaseLayout({ children, previewText }: BaseLayoutProps) {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>STAKD</title>
        {previewText && <meta name="description" content={previewText} />}
      </head>
      <body style={baseStyles.container as React.CSSProperties}>
        <div style={baseStyles.wrapper as React.CSSProperties}>
          <div style={baseStyles.card as React.CSSProperties}>
            <div style={baseStyles.header as React.CSSProperties}>
              <h1 style={baseStyles.logo as React.CSSProperties}>STAKD</h1>
            </div>
            <div style={baseStyles.content as React.CSSProperties}>
              {children}
            </div>
            <div style={baseStyles.footer as React.CSSProperties}>
              <div style={baseStyles.footerText as React.CSSProperties}>
                STAKD — The Collector's Edge
              </div>
              <div style={baseStyles.divider as React.CSSProperties} />
              <div style={baseStyles.footerText as React.CSSProperties}>
                <a href="https://stakd.app/preferences" style={baseStyles.link as React.CSSProperties}>
                  Manage Email Preferences
                </a>
              </div>
              <div style={baseStyles.footerText as React.CSSProperties}>
                © 2026 STAKD. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

export const buttonStyles = {
  button: {
    display: 'inline-block',
    backgroundColor: '#4B9CD3',
    color: '#ffffff',
    padding: '12px 32px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '20px',
  },
  buttonSecondary: {
    display: 'inline-block',
    backgroundColor: 'transparent',
    color: '#4B9CD3',
    padding: '12px 32px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    border: '1px solid #4B9CD3',
    cursor: 'pointer',
    marginTop: '20px',
  },
} as const;

export const textStyles = {
  heading: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 0,
    marginBottom: '16px',
  },
  subheading: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: '24px',
    marginBottom: '12px',
  },
  body: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#cbd5e1',
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  value: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#f1f5f9',
  },
} as const;

export const dataStyles = {
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #334155',
  },
  dataRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
  },
  dataLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: '14px',
    color: '#f1f5f9',
    fontWeight: '600',
  },
} as const;
