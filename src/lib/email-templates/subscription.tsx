import * as React from 'react';
import { BaseLayout, buttonStyles, textStyles, dataStyles } from './base-layout';

type SubscriptionType = 'confirmation' | 'upgraded' | 'downgraded' | 'renewal';

interface SubscriptionEmailProps {
  type: SubscriptionType;
  planName: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
  currency?: string;
}

export function SubscriptionEmail({
  type,
  planName,
  price,
  billingCycle,
  nextBillingDate,
  currency = 'USD',
}: SubscriptionEmailProps) {
  const getTitleAndMessage = (subType: SubscriptionType) => {
    switch (subType) {
      case 'confirmation':
        return {
          title: 'Subscription Confirmed',
          message: `Welcome to ${planName}! Your subscription is now active and you have access to all premium features.`,
        };
      case 'upgraded':
        return {
          title: 'Subscription Upgraded',
          message: `You've successfully upgraded to ${planName}. Enjoy your new features immediately!`,
        };
      case 'downgraded':
        return {
          title: 'Subscription Downgraded',
          message: `Your subscription has been changed to ${planName}. Changes take effect at your next billing cycle.`,
        };
      case 'renewal':
        return {
          title: 'Subscription Renewed',
          message: `Your ${planName} subscription has been renewed. Thank you for continuing with STAKD!`,
        };
      default:
        return {
          title: 'Subscription Update',
          message: 'Your subscription has been updated.',
        };
    }
  };

  const { title, message } = getTitleAndMessage(type);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(p);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

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
          <span style={dataStyles.dataLabel as React.CSSProperties}>Plan</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>{planName}</span>
        </div>

        <div style={dataStyles.dataRow as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Billing Cycle</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>
            {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
          </span>
        </div>

        <div style={dataStyles.dataRow as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Amount</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>
            {formatPrice(price)} / {billingCycle === 'monthly' ? 'month' : 'year'}
          </span>
        </div>

        <div style={dataStyles.dataRowLast as React.CSSProperties}>
          <span style={dataStyles.dataLabel as React.CSSProperties}>Next Billing Date</span>
          <span style={dataStyles.dataValue as React.CSSProperties}>
            {formatDate(nextBillingDate)}
          </span>
        </div>
      </div>

      <h3 style={textStyles.subheading as React.CSSProperties}>
        What's Included
      </h3>

      <ul style={{ marginBottom: '24px', paddingLeft: '20px' } as React.CSSProperties}>
        <li style={textStyles.body as React.CSSProperties}>
          Priority customer support
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          Advanced analytics and insights
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          Unlimited price tracking
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          Exclusive trading tools
        </li>
        <li style={textStyles.body as React.CSSProperties}>
          Early access to new features
        </li>
      </ul>

      <p style={textStyles.body as React.CSSProperties}>
        You can manage your subscription, update your payment method, or make changes to your plan anytime from your account settings.
      </p>

      <div style={{ textAlign: 'center' as const }}>
        <a
          href="https://stakd.app/account/billing"
          style={buttonStyles.button as React.CSSProperties}
        >
          Manage Subscription
        </a>
      </div>

      <p style={{...textStyles.body, fontSize: '12px', color: '#94a3b8'} as React.CSSProperties}>
        If you have any questions about your subscription or need assistance, our support team is ready to help.
      </p>
    </BaseLayout>
  );
}
