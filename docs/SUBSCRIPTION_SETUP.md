# Subscription System Setup Guide

This guide explains how to set up and manage the subscription system in SambaScribe.

## Prerequisites

1. Stripe account (can be test or live)
2. Environment variables configured (see `.env.example`)
3. Database with Prisma migrations applied

## Initial Setup

1. **Configure Stripe Environment Variables**:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Set Up Stripe Products**:
   - Create a one-time payment product for PDF uploads
   - Create a weekly premium subscription product
   - Update the product IDs in `src/lib/services/stripe.ts`

3. **Configure Webhook Endpoints**:
   - Set up webhook endpoint in Stripe dashboard: `/api/webhooks/stripe`
   - Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

## Local Development

1. **Install Stripe CLI**:
   ```bash
   # Windows (with Chocolatey)
   choco install stripe-cli

   # macOS (with Homebrew)
   brew install stripe/stripe-cli/stripe
   ```

2. **Forward Webhooks Locally**:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

## Access Control

The subscription system uses multiple layers of verification:

1. **Session Token**:
   - JWT contains `hasPaidAccess` flag
   - Updated on login and subscription changes

2. **Database State**:
   - `User` table tracks `hasPaidAccess`
   - `Subscription` table tracks active subscriptions

3. **Middleware Protection**:
   - Routes under `/api/upload` require premium access
   - Both token and database state are verified

## Subscription States

1. **Free Tier**:
   - Access to sample files
   - Limited features

2. **One-Time Premium**:
   - Full access to PDF upload
   - No expiration

3. **Weekly Premium**:
   - Full access to all features
   - Expires after one week
   - Can be renewed

## Troubleshooting

1. **Payment Success but No Access**:
   - Check webhook logs in Stripe dashboard
   - Verify webhook secret is correct
   - Check user session token is updated
   - Try signing out and back in

2. **Webhook Errors**:
   - Ensure Stripe CLI is running for local development
   - Verify webhook signature
   - Check server logs for detailed errors

3. **Session Mismatch**:
   - Clear browser cookies
   - Sign out and back in
   - Check database state matches session

## Testing

1. **Test Cards**:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002

2. **Webhook Events**:
   - Use Stripe CLI to trigger test events
   - Monitor webhook endpoint responses

## Maintenance

1. **Database Cleanup**:
   - Expired subscriptions are automatically marked
   - Run periodic checks for consistency

2. **Session Management**:
   - Sessions auto-refresh on navigation
   - Force refresh available through API

3. **Access Verification**:
   - Middleware checks on protected routes
   - Database verification for critical operations 