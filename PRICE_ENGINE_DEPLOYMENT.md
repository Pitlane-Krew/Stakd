# Price Engine Deployment Checklist

## Pre-Deployment (Day Before)

- [ ] Review `PRICE_ENGINE_SUMMARY.md` for overview
- [ ] Review `PRICE_ENGINE_QUICKREF.md` for API reference
- [ ] Create backup of current database
- [ ] Test in development environment locally
- [ ] Verify all team members have access to documentation
- [ ] Prepare environment variables

### Environment Setup

```bash
# Generate a secure random CRON_SECRET
openssl rand -hex 32

# Add to .env.local
CRON_SECRET=your-generated-secret-here
```

## Deployment Day (Phase 1: Code)

### Step 1: Code Integration (10 mins)

Files are already in place:
```
✅ src/services/pricing.ts
✅ src/app/api/cron/prices/route.ts
✅ src/hooks/usePriceUpdates.ts
✅ src/components/pricing/PriceDisplay.tsx
```

Verify no conflicts:
```bash
git status
# Should show 4 new files in staging or unstaged
```

### Step 2: TypeScript Compilation (5 mins)

```bash
# Build the project
npm run build

# Check for any TypeScript errors
# Output should be: ✅ No errors if successful
```

### Step 3: Local Testing (10 mins)

```bash
# Start dev server
npm run dev

# Test cron endpoint (in another terminal)
curl -H "Authorization: Bearer test-secret" \
  http://localhost:3000/api/cron/prices \
  -w "\n%{http_code}\n"

# Expected: 200 response with JSON data
# { "success": true, "itemsProcessed": 0, ... }
```

### Step 4: Database Verification (5 mins)

Verify tables exist:
```sql
-- In Supabase SQL Editor
SELECT * FROM price_history LIMIT 1;
SELECT * FROM price_snapshots LIMIT 1;

-- Both should exist (created in migration 003_price_history.sql)
```

## Deployment Day (Phase 2: Staging)

### Step 5: Deploy to Staging (10 mins)

```bash
# Commit changes
git add .
git commit -m "feat: add real-time price engine

- Dual-price model (retail + resell values)
- Multi-category support (Pokemon, Sports, Hot Wheels, Funko)
- Automatic cron job for 6-hour price updates
- Real-time Supabase subscriptions
- React hooks and components for price display"

# Push to staging branch
git push origin staging
```

### Step 6: Configure Cron in Staging

**For Vercel**:
```bash
# Create/update vercel.json
{
  "crons": [{
    "path": "/api/cron/prices",
    "schedule": "0 */6 * * *"
  }]
}
```

**For AWS Lambda**:
```bash
# Create EventBridge rule
# Cron: 0 */6 * * * * (every 6 hours)
# Target: Lambda with pricing endpoint
```

**For manual testing** (all platforms):
```bash
# Test the endpoint
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://staging.your-domain.com/api/cron/prices
```

### Step 7: Staging Smoke Test (15 mins)

```bash
# 1. Verify homepage loads
curl https://staging.your-domain.com/

# 2. Test an item detail page
curl https://staging.your-domain.com/items/[sample-item-id]

# 3. Check Supabase realtime is connected
# Open DevTools → Network → Look for WebSocket connection to supabase

# 4. Monitor cron job
# Check Vercel/AWS logs for the function execution

# 5. Verify database records
# SELECT COUNT(*) FROM price_history;
# Should increase after cron runs
```

### Step 8: Team Review (10 mins)

- [ ] CTO reviews code
- [ ] QA checks functionality
- [ ] Designer approves UI/UX
- [ ] Get approval to deploy to production

## Deployment Day (Phase 3: Production)

### Step 9: Production Deployment (5 mins)

```bash
# Merge to main/production
git push origin main

# Vercel/AWS will auto-deploy
# Check deployment status in platform dashboard
```

### Step 10: Verify Production (15 mins)

```bash
# 1. Check homepage
curl https://your-domain.com/

# 2. Run cron job manually
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/prices

# 3. Verify database has new records
SELECT COUNT(*) FROM price_history 
WHERE fetched_at > NOW() - INTERVAL '5 minutes';

# 4. Check logs
# Vercel: Dashboard → Logs
# AWS: CloudWatch → Logs

# 5. Monitor error rate
# Should be 0% for first few hours
```

### Step 11: Smoke Test on Production (20 mins)

- [ ] View collection with PriceDisplay component
- [ ] Verify prices show correctly
- [ ] Test condition selector
- [ ] Check sparkline chart renders
- [ ] Confirm realtime updates work (check console for WebSocket messages)
- [ ] Test portfolio page calculations
- [ ] Verify no JavaScript errors in console
- [ ] Test on mobile (responsive design)

### Step 12: Post-Deployment Monitoring (1 hour)

```bash
# Monitor error rates
# Check logs every 15 minutes for first hour
# Look for:
# - API errors (should be <1%)
# - Database errors (should be 0%)
# - Realtime subscription errors (should be 0%)

# Check price data quality
SELECT COUNT(*) as total_prices,
       COUNT(*) FILTER(WHERE confidence = 'high') as high_confidence,
       COUNT(*) FILTER(WHERE confidence = 'medium') as medium_confidence
FROM price_history
WHERE fetched_at > NOW() - INTERVAL '1 hour';
```

## Post-Deployment (Days 1-7)

### Daily Tasks

- [ ] **Day 1**: Monitor cron job logs, check 10 random item prices manually
- [ ] **Day 2**: Verify price history accumulating, check for API errors
- [ ] **Day 3**: Spot-check portfolio calculations, user feedback
- [ ] **Day 4**: Review confidence levels, identify any low-quality sources
- [ ] **Day 5**: Verify 24-hour cron cycle working, check trend data
- [ ] **Day 6**: Test admin pricing dashboard if exists
- [ ] **Day 7**: Full health check, gather metrics

### Monitoring Queries

```sql
-- Price data health
SELECT COUNT(*) as total_records,
       COUNT(DISTINCT item_id) as unique_items,
       AVG(price) as avg_price,
       MIN(price) as min_price,
       MAX(price) as max_price
FROM price_history
WHERE fetched_at > NOW() - INTERVAL '7 days';

-- Source distribution
SELECT source, COUNT(*) as count
FROM price_history
WHERE fetched_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY count DESC;

-- Confidence levels
SELECT confidence, COUNT(*) as count
FROM price_history
WHERE fetched_at > NOW() - INTERVAL '24 hours'
GROUP BY confidence
ORDER BY count DESC;

-- Significant price changes
SELECT item_id, COUNT(*) as price_changes
FROM (
  SELECT item_id,
         ROW_NUMBER() OVER(PARTITION BY item_id ORDER BY fetched_at) as rn
  FROM price_history
  WHERE fetched_at > NOW() - INTERVAL '24 hours'
) t
WHERE rn > 1
GROUP BY item_id
HAVING COUNT(*) > 2;
```

### Error Handling

If cron job fails:
```bash
# 1. Check logs for specific error
# 2. Verify database is accessible
# 3. Check API services (pokemontcg.io, ygoprodeck.com) status
# 4. Verify CRON_SECRET in environment
# 5. Run manually: curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/prices
# 6. If still failing, check supabase.ts for connection issues
```

If realtime updates not working:
```bash
# 1. Open DevTools → Network → Filter for "wss://" (WebSocket)
# 2. Verify connection to supabase is established
# 3. Check Supabase Realtime is enabled in settings
# 4. Verify RLS policies are correct (should inherit from items table)
# 5. Check browser console for connection errors
# 6. Try hard refresh (Cmd+Shift+R)
```

## Rollback Plan

If critical issues found in production:

```bash
# 1. Identify the issue
# 2. If code issue: revert the commit
git revert HEAD
git push origin main

# 3. If data issue: restore from backup
# Contact Supabase support for point-in-time restore

# 4. Disable cron job
# Remove from vercel.json or disable EventBridge rule

# 5. Notify users
# Post status update to community
```

## Success Criteria

✅ **Deployment is successful if**:

1. All 4 code files deployed without errors
2. TypeScript builds with no errors
3. Cron job runs and completes in <30 seconds
4. Price history table has >100 records after first run
5. Price snapshots table populated with daily aggregates
6. Realtime subscriptions work (WebSocket connections)
7. PriceDisplay component renders correctly
8. No JavaScript errors in browser console
9. Mobile responsive design works
10. API error rate <1%
11. Database query performance normal
12. Users can see prices and trends

## Sign-Off Template

When all steps complete, fill in:

```
PRICE ENGINE DEPLOYMENT SIGN-OFF

Date: ___________
Deployed by: ___________
Reviewed by: ___________

Code deployment: ✓
Database verification: ✓
Cron job testing: ✓
Staging verification: ✓
Production smoke tests: ✓
Monitoring setup: ✓
Team notification: ✓

Issues found: ___________
Resolution: ___________

Status: [SUCCESSFUL / ROLLBACK]

Signature: ___________ Date: ___________
```

## Support Contacts

- **Engineering**: [CTO contact]
- **DevOps**: [DevOps contact]
- **On-Call**: [On-call engineer]
- **Supabase Support**: https://app.supabase.com/support

## Documentation Links

- Main documentation: `PRICE_ENGINE.md`
- Integration guide: `PRICE_ENGINE_INTEGRATION.md`
- Quick reference: `PRICE_ENGINE_QUICKREF.md`
- Extensibility: `PRICE_ENGINE_EXTENSIBILITY.md`
- Summary: `PRICE_ENGINE_SUMMARY.md`

## Timeline

- **Pre-deployment**: 30 mins
- **Deployment day**: ~2 hours total
  - Code integration: 10 mins
  - Testing: 30 mins
  - Staging: 30 mins
  - Production: 30 mins
  - Post-deployment monitoring: 20 mins
- **Week 1 monitoring**: ~1 hour total (spread across 7 days)

**Total time investment: 3-4 hours (mostly waiting for tests)**

## Next Steps After Successful Deployment

1. Document any issues encountered
2. Gather user feedback on pricing accuracy
3. Plan Phase 2 (admin dashboard, alerts, etc.)
4. Prepare for eBay API integration when available
5. Optimize batch sizes based on performance data
6. Plan custom category additions based on user demand

---

**Good luck with the deployment! You've got this. 🚀**

Any issues? Check the documentation or reach out to support contacts above.
