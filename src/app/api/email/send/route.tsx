import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { WelcomeEmail } from '@/lib/email-templates/welcome';
import { PriceAlertEmail } from '@/lib/email-templates/price-alert';
import { TradeNotificationEmail } from '@/lib/email-templates/trade-notification';
import { SubscriptionEmail } from '@/lib/email-templates/subscription';

type EmailType = 'welcome' | 'price_alert' | 'trade_update' | 'subscription';

interface EmailRequest {
  type: EmailType;
  userId: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (API key or service role)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== process.env.EMAIL_API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body: EmailRequest = await request.json();
    const { type, userId, data } = body;

    // Validate required fields
    if (!type || !userId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, userId, data' },
        { status: 400 }
      );
    }

    // Get user profile with email
    const supabase = await createServiceRoleClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, email_preferences')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user email from Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser?.user?.email) {
      return NextResponse.json(
        { error: 'Could not retrieve user email' },
        { status: 404 }
      );
    }

    const userEmail = authUser.user.email;

    // Check email preferences
    const preferences = profile.email_preferences || {
      marketing: true,
      price_alerts: true,
      trade_updates: true,
      weekly_digest: true,
    };

    // Route based on type and check preferences
    let subject: string;
    let react: React.ReactNode;

    switch (type) {
      case 'welcome': {
        subject = 'Welcome to STAKD';
        react = (
          <WelcomeEmail
            username={profile.username}
            displayName={profile.display_name || undefined}
          />
        );
        break;
      }

      case 'price_alert': {
        if (!preferences.price_alerts) {
          return NextResponse.json(
            { message: 'User has disabled price alert emails' },
            { status: 200 }
          );
        }

        const priceData = data as any;
        subject = `Price Alert: ${priceData.itemName}`;
        react = (
          <PriceAlertEmail
            itemName={priceData.itemName}
            itemId={priceData.itemId}
            oldPrice={priceData.oldPrice}
            newPrice={priceData.newPrice}
            priceChangePercentage={priceData.priceChangePercentage}
            currency={priceData.currency || 'USD'}
          />
        );
        break;
      }

      case 'trade_update': {
        if (!preferences.trade_updates) {
          return NextResponse.json(
            { message: 'User has disabled trade update emails' },
            { status: 200 }
          );
        }

        const tradeData = data as any;
        subject = `Trade ${tradeData.type === 'proposal' ? 'Proposal' : tradeData.type.charAt(0).toUpperCase() + tradeData.type.slice(1)}: ${tradeData.otherUsername}`;
        react = (
          <TradeNotificationEmail
            tradeId={tradeData.tradeId}
            type={tradeData.type}
            otherUsername={tradeData.otherUsername}
            itemSummary={tradeData.itemSummary}
            itemCount={tradeData.itemCount}
          />
        );
        break;
      }

      case 'subscription': {
        const subData = data as any;
        subject = `Subscription ${subData.type.charAt(0).toUpperCase() + subData.type.slice(1)}: ${subData.planName}`;
        react = (
          <SubscriptionEmail
            type={subData.type}
            planName={subData.planName}
            price={subData.price}
            billingCycle={subData.billingCycle}
            nextBillingDate={subData.nextBillingDate}
            currency={subData.currency || 'USD'}
          />
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    // Send the email
    const result = await sendEmail({
      to: userEmail,
      subject,
      react,
    });

    // Log in database if available (optional)
    await supabase.from('notifications').insert({
      user_id: userId,
      type: `email_${type}`,
      title: subject,
      body: `Email sent to ${userEmail}`,
      entity_id: (data as any).itemId || (data as any).tradeId || null,
      entity_type: type,
    });

    return NextResponse.json(
      {
        success: true,
        messageId: (result as any).id,
        email: userEmail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
