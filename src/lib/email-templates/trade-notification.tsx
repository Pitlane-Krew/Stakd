import * as React from 'react';
import { BaseLayout, buttonStyles, textStyles, dataStyles } from './base-layout';

type TradeType = 'proposal' | 'accepted' | 'declined' | 'completed';

interface TradeNotificationEmailProps {
  tradeId: string;
  type: TradeType;
  otherUsername: string;
  itemSummary: string;
  itemCount?: number;
}

export function TradeNotificationEmail({
  tradeId,
  type,
  otherUsername,
  itemSummary,
  itemCount = 1,
}: TradeNotificationEmailProps) {
  const getTitleAndMessage = (tradeType: TradeType) => {
    switch (tradeType) {
      case 'proposal':
        return {
          title: 'New Trade Proposal',
          message: `${otherUsername} has sent you a new trade proposal.`,
          cta: 'Review Proposal',
          color: '#4B9CD3',
        };
      case 'accepted':
        return {
          title: 'Trade Accepted',
          message: `${otherUsername} has accepted your trade proposal. Time to finalize the exchange!`,
          cta: 'View Trade',
          color: '#00FF87',
        };
      case 'declined':
        return {
          title: 'Trade Declined',
          message: `${otherUsername} has declined your trade proposal.`,
          cta: 'Browse Trades',
          color: '#ff6b6b',
        };
      case 'completed':
        return {
          title: 'Trade Completed',
          message: `Your trade with ${otherUsername} has been completed. Leave feedback to build your reputation!`,
          cta: 'Leave Feedback',
          color: '#00FF87',
        };
      default:
        return {
          title: 'Trade Update',
          message: 'You have a trade update.',
          cta: 'View Trade',
          color: '#4B9CD3',
        };
    }
  };

  const { title, message, cta } = getTitleAndMessage(type);

  return (
    <BaseLayout previewText={title}>
      <h2 style={textStyles.heading as React.CSSProperties}>
        {title}
      </h2>

      <p style={textStyles.body as React.CSSProperties}>
        {message}
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
          <span style={dataStyles.dataLabel as React.CSSProperties}>Trade Partner</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>@{otherUsername}</span>
        </div>

        <div style={dataStyles.dataRow as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Item{itemCount > 1 ? 's' : ''}</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>
            {itemCount > 1 ? `${itemCount} items` : itemSummary}
          </span>
        </div>

        <div style={dataStyles.dataRowLast as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Trade ID</span>
          <span style={{ ...dataStyles.dataValue, fontSize: '12px', fontFamily: 'monospace' } as React.CSSProperties}>
            {tradeId.substring(0, 8)}...
          </span>
        </div>
      </div>

      {type === 'proposal' && (
        <p style={textStyles.body as React.CSSProperties}>
          Review the details and accept or decline the proposal at your convenience. You have 30 days to respond.
        </p>
      )}

      {type === 'accepted' && (
        <p style={textStyles.body as React.CSSProperties}>
          Coordinate the shipping and exchange with your trade partner. Once both parties confirm receipt, the trade will be marked complete.
        </p>
      )}

      {type === 'completed' && (
        <p style={textStyles.body as React.CSSProperties}>
          Sharing your experience helps the community trust each other more. Your feedback is valuable!
        </p>
      )}

      <div style={{ textAlign: 'center' as const }}>
        <a
          href={`https://stakd.app/trades/${tradeId}`}
          style={buttonStyles.button as React.CSSProperties}
        >
          {cta}
        </a>
      </div>

      <p style={{...textStyles.body, fontSize: '12px', color: '#94a3b8'} as React.CSSProperties}>
        Keep your contact information and collection privacy settings secure. Never share sensitive data outside the STAKD platform.
      </p>
    </BaseLayout>
  );
}
