import * as React from 'react';
import { BaseLayout, buttonStyles, textStyles } from './base-layout';

interface WelcomeEmailProps {
  username: string;
  displayName?: string;
}

export function WelcomeEmail({ username, displayName }: WelcomeEmailProps) {
  const name = displayName || username;

  return (
    <BaseLayout previewText={`Welcome to STAKD, ${name}!`}>
      <h2 style={textStyles.heading as React.CSSProperties}>
        Welcome to STAKD, {name}!
      </h2>

      <p style={textStyles.body as React.CSSProperties}>
        We're excited to have you join the community of collectors. STAKD is your ultimate platform
        for managing, tracking, and trading collectibles with confidence.
      </p>

      <h3 style={textStyles.subheading as React.CSSProperties}>
        Here's what you can do:
      </h3>

      <ul style={{ marginBottom: '24px', paddingLeft: '20px' } as React.CSSProperties}>
        <li style={textStyles.body as React.CSSProperties}>
          <strong>Build Your Collections</strong> — Organize and showcase your collectibles with detailed descriptions and images
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          <strong>Track Values</strong> — Monitor real-time market prices and get instant alerts when values change
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          <strong>Trade Safely</strong> — Connect with verified collectors and complete secure peer-to-peer trades
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          <strong>Discover Items</strong> — Find hot restocks, rare finds, and trending collectibles in your area
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          <strong>AI-Powered Grading</strong> — Get instant condition assessments with our advanced AI analysis
        </li>
      </ul>

      <p style={textStyles.body as React.CSSProperties}>
        Your account is now active and ready to use. Start by creating your first collection and adding your favorite items.
      </p>

      <div style={{ textAlign: 'center' as const }}>
        <a
          href="https://stakd.app/dashboard"
          style={buttonStyles.button as React.CSSProperties}
        >
          Explore Dashboard
        </a>
      </div>

      <p style={textStyles.body as React.CSSProperties}>
        Have questions? Check out our help center or reach out to our support team anytime.
      </p>

      <p style={textStyles.body as React.CSSProperties}>
        Happy collecting!
        <br />
        <strong>The STAKD Team</strong>
      </p>
    </BaseLayout>
  );
}
