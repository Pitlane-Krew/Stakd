import * as React from 'react';
import { BaseLayout, buttonStyles, textStyles, dataStyles } from './base-layout';

interface PriceAlertEmailProps {
  itemName: string;
  itemId: string;
  oldPrice: number;
  newPrice: number;
  priceChangePercentage: number;
  currency?: string;
}

export function PriceAlertEmail({
  itemName,
  itemId,
  oldPrice,
  newPrice,
  priceChangePercentage,
  currency = 'USD',
}: PriceAlertEmailProps) {
  const isPositive = priceChangePercentage >= 0;
  const priceChangeColor = isPositive ? '#00FF87' : '#ff6b6b';
  const arrow = isPositive ? '↑' : '↓';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  return (
    <BaseLayout previewText={`Price Alert: ${itemName}`}>
      <h2 style={textStyles.heading as React.CSSProperties}>
        Price Alert
      </h2>

      <p style={textStyles.body as React.CSSProperties}>
        The value of an item in your collection has changed.
      </p>

      <div
        style={{
          backgroundColor: '#0f172a',
          padding: '24px',
          borderRadius: '6px',
          marginBottom: '24px',
          border: `1px solid #334155`,
        } as React.CSSProperties}
      >
        <div style={dataStyles.dataRow as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Item</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>{itemName}</span>
        </div>

        <div style={dataStyles.dataRow as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Previous Value</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>
            {formatPrice(oldPrice)}
          </span>
        </div>

        <div style={dataStyles.dataRow as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Current Value</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>
            {formatPrice(newPrice)}
          </span>
        </div>

        <div style={dataStyles.dataRowLast as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Change</span>
          <span style={{ ...dataStyles.dataValue, color: priceChangeColor } as React.CSSProperties}>
            {arrow} {Math.abs(priceChangePercentage).toFixed(1)}%
          </span>
        </div>
      </div>

      <p style={textStyles.body as React.CSSProperties}>
        Market data is updated regularly to keep you informed about your collection's value.
        Check out your item to see full price history and market trends.
      </p>

      <div style={{ textAlign: 'center' as const }}>
        <a
          href={`https://stakd.app/items/${itemId}`}
          style={buttonStyles.button as React.CSSProperties}
        >
          View Item
        </a>
      </div>

      <p style={{...textStyles.body, fontSize: '12px', color: '#94a3b8'} as React.CSSProperties}>
        This is an automated price alert. Prices are sourced from market data and may vary by condition and grading.
      </p>
    </BaseLayout>
  );
}
