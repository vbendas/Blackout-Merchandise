# Campaign Management with MCP Integration

> **Project:** MerchStation Campaign Management Module  
> **Version:** 1.0  
> **Status:** APPROVED - Ready for Implementation  
> **Start Date:** Phase 4b (after Phase 4 core complete)  
> **Estimated Duration:** 3-4 days  
> **Decision Date:** February 19, 2026

---

## 1. Executive Summary

**Feature:** Automated ad campaign management via MCP servers integrated into MerchStation TUI  
**Platforms:** Meta Ads (Facebook/Instagram), TikTok Ads  
**Core Value:** Auto-pause campaigns when CAC/CPC exceeds defined limits, with bidirectional control

### Key Requirements (User-Validated)

| Requirement | Implementation |
|-------------|----------------|
| **Pause immediately** when CAC/CPC limit hit | Automation engine polls every 15 minutes, pauses instantly |
| **Different limits per campaign** | Per-campaign CAC/CPC threshold configuration |
| **Daily report** of paused campaigns | TUI dashboard shows all paused campaigns with action items |
| **TUI-only notifications** | Real-time alerts in MerchStation + daily summary |
| **Bidirectional control** | Read metrics + edit budgets/status from TUI |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MERCHSTATION TUI                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  CAMPAIGNS TAB                                                      │  │
│  │                                                                     │  │
│  │  Meta: Luna Tee Launch        │  LEOPOLDO AI PANEL                 │  │
│  │  ├─ Spend: €234/€500         │                                    │  │
│  │  ├─ CAC: €23 (< €30 limit)  │  "Oi Victor! TikTok 'Band Merch'   │  │
│  │  ├─ CPC: €0.89 (< €1.20)    │   hit €47 CAC - auto-paused.      │  │
│  │  ├─ ROAS: 3.2x               │                                    │  │
│  │  └─ Status: RUNNING 🟢       │  3 campaigns need your attention:   │  │
│  │                               │  • TikTok: Band Merch (CAC €47)     │  │
│  │  TikTok: Band Merch          │  • Meta: Retargeting (CPC €1.45)   │  │
│  │  ├─ Spend: €189/€300         │  • Meta: Prospecting Q1 (ROAS 1.1x)│  │
│  │  ├─ CAC: €47 (> €40 limit) ⚠️│                                    │  │
│  │  ├─ CPC: €1.15               │  > [View Daily Report]             │  │
│  │  └─ Status: PAUSED 🔴        │                                    │  │
│  │                                                                     │  │
│  │  [Refresh] [New Campaign] [Limits Editor] [Daily Report]           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                │                                    │
                                ▼                                    ▼
┌──────────────────────────────┐    ┌──────────────────────────────────────┐
│     MCP SERVERS              │    │      NEON POSTGRESQL                 │
│  ┌────────────────────────┐  │    │  ┌─────────────────────────────┐    │
│  │  meta-ads-mcp          │  │    │  │  TABLE: campaigns           │    │
│  │  ─────────────────    │  │    │  │  - id, platform, name       │    │
│  │  • get_campaigns()    │  │    │  │  - external_id (Meta/TikTok)│    │
│  │  • get_insights()     │  │    │  │  - budget_daily             │    │
│  │  • pause_campaign()    │  │    │  │  - cac_limit, cpc_limit     │    │
│  │  • resume_campaign()  │  │    │  │  - auto_pause_enabled       │    │
│  │  • update_budget()    │  │    │  │  - status (running/paused)  │    │
│  │  • create_campaign()   │  │    │  └─────────────────────────────┘    │
│  └────────────────────────┘  │    │  ┌─────────────────────────────┐    │
│  ┌────────────────────────┐  │    │  │  TABLE: campaign_metrics    │    │
│  │  tiktok-ads-mcp       │  │    │  │  - campaign_id, date       │    │
│  │  ─────────────────    │  │    │  │  - spend, impressions       │    │
│  │  • get_campaigns()    │  │    │  │  - clicks, conversions      │    │
│  │  • get_insights()     │  │    │  │  - cac, cpc, roas, ctr      │    │
│  │  • pause_campaign()    │  │    │  └─────────────────────────────┘    │
│  │  • resume_campaign()  │  │    │  ┌─────────────────────────────┐    │
│  │  • update_budget()    │  │    │  │  TABLE: campaign_alerts     │    │
│  │  • create_campaign()   │  │    │  │  - campaign_id, alert_type │    │
│  └────────────────────────┘  │    │  │  - threshold, actual        │    │
│                              │    │  │  - action_taken             │    │
│  ┌────────────────────────┐  │    │  │  - created_at               │    │
│  │  Automation Engine     │  │    │  └─────────────────────────────┘    │
│  │  ─────────────────    │  │    │  ┌─────────────────────────────┐    │
│  │  • 15-min poll cycle │  │    │  │  TABLE: daily_reports       │    │
│  │  • Limit checking    │  │    │  │  - report_date              │    │
│  │  • Auto-pause logic  │  │    │  │  - campaigns_summary        │    │
│  │  • Alert generation  │  │    │  │  - paused_count             │    │
│  └────────────────────────┘  │    │  │  - total_spend              │    │
│                              │    │  └─────────────────────────────┘    │
└──────────────────────────────┘    └──────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Campaigns Table

```typescript
// campaigns - Stores campaign configuration and limits
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Platform identification
  platform: text('platform').notNull(), // 'meta' | 'tiktok'
  externalId: text('external_id').notNull(), // Campaign ID from Meta/TikTok
  
  // Campaign details
  name: text('name').notNull(),
  status: text('status').notNull(), // 'running' | 'paused' | 'completed' | 'draft'
  
  // Budget configuration
  budgetDaily: decimal('budget_daily', { precision: 10, scale: 2 }),
  budgetTotal: decimal('budget_total', { precision: 10, scale: 2 }),
  
  // CAC/CPC limits (per-campaign overrides)
  cacLimit: decimal('cac_limit', { precision: 10, scale: 2 }), // € limit per acquisition
  cpcLimit: decimal('cpc_limit', { precision: 10, scale: 2 }), // € limit per click
  
  // Automation settings
  autoPauseEnabled: boolean('auto_pause_enabled').default(true).notNull(),
  pauseReason: text('pause_reason'), // 'cac_exceeded' | 'cpc_exceeded' | 'manual'
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
});
```

### 3.2 Campaign Metrics Table

```typescript
// campaign_metrics - Daily snapshots of campaign performance
export const campaignMetrics = pgTable('campaign_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  
  // Date of metrics snapshot
  date: date('date').notNull(),
  
  // Spend & impressions
  spend: decimal('spend', { precision: 10, scale: 2 }).notNull(),
  impressions: integer('impressions').notNull(),
  clicks: integer('clicks').notNull(),
  
  // Conversions & revenue
  conversions: integer('conversions').notNull(),
  conversionValue: decimal('conversion_value', { precision: 10, scale: 2 }),
  
  // Calculated metrics
  cac: decimal('cac', { precision: 10, scale: 2 }), // Cost per acquisition
  cpc: decimal('cpc', { precision: 10, scale: 2 }), // Cost per click
  roas: decimal('roas', { precision: 5, scale: 2 }), // Return on ad spend
  ctr: decimal('ctr', { precision: 5, scale: 2 }), // Click-through rate
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Index for efficient daily queries
campaignMetricsIndexes: [
  index('idx_campaign_metrics_campaign_date').on($.campaignId, $.date),
],
```

### 3.3 Campaign Alerts Table

```typescript
// campaign_alerts - Log of all automation actions
export const campaignAlerts = pgTable('campaign_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  
  // Alert details
  alertType: text('alert_type').notNull(), 
  // 'cac_exceeded' | 'cpc_exceeded' | 'budget_exceeded' | 
  // 'paused_auto' | 'paused_manual' | 'resumed' | 'created'
  
  thresholdValue: decimal('threshold_value', { precision: 10, scale: 2 }),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }),
  
  // Action taken
  actionTaken: text('action_taken'), // 'paused' | 'warned' | 'none'
  actionDetails: text('action_details'), // JSON with additional context
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 3.4 Daily Reports Table

```typescript
// daily_reports - Automated daily summaries
export const dailyReports = pgTable('daily_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Report date
  reportDate: date('report_date').notNull(),
  
  // Summary data (JSON for flexibility)
  campaignsSummary: jsonb('campaigns_summary'), // Array of campaign states
  pausedCampaigns: jsonb('paused_campaigns'), // Array of paused campaign details
  totalSpend: decimal('total_spend', { precision: 10, scale: 2 }),
  totalConversions: integer('total_conversions'),
  averageCac: decimal('average_cac', { precision: 10, scale: 2 }),
  averageRoas: decimal('average_roas', { precision: 5, scale: 2 }),
  
  // Action items
  actionRequired: jsonb('action_required'), // Campaigns needing attention
  
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});
```

---

## 4. MCP Server Integration

### 4.1 Meta Ads MCP

```typescript
// MCP Server: @meta/mcp-server-ads or custom implementation
// Note: Check for official Meta MCP at https://developers.facebook.com/docs/marketing-api/mcp

interface MetaAdsMCP {
  // Campaign Management
  get_campaigns(): Promise<Campaign[]>;
  get_campaign_insights(campaignId: string, dateRange: DateRange): Promise<Insights>;
  pause_campaign(campaignId: string): Promise<{ success: boolean }>;
  resume_campaign(campaignId: string): Promise<{ success: boolean }>;
  update_campaign_budget(campaignId: string, budget: number): Promise<{ success: boolean }>;
  
  // Campaign Creation
  create_campaign(config: CampaignConfig): Promise<{ campaignId: string }>;
}
```

### 4.2 TikTok Ads MCP

```typescript
// MCP Server: @tiktok/mcp-server-ads (or custom if official not available)
// Note: TikTok MCP is newer - may require custom implementation using TikTok Marketing API

interface TikTokAdsMCP {
  // Same interface as Meta for consistency
  get_campaigns(): Promise<Campaign[]>;
  get_campaign_insights(campaignId: string, dateRange: DateRange): Promise<Insights>;
  pause_campaign(campaignId: string): Promise<{ success: boolean }>;
  resume_campaign(campaignId: string): Promise<{ success: boolean }>;
  update_campaign_budget(campaignId: string, budget: number): Promise<{ success: boolean }>;
  create_campaign(config: CampaignConfig): Promise<{ campaignId: string }>;
}
```

### 4.3 MCP Configuration

```json
// .mcp.json - Add to existing config
{
  "mcpServers": {
    // ... existing servers (neon, cloudinary, etc.)
    
    "meta-ads-mcp": {
      "command": "npx",
      "args": ["-y", "@meta/mcp-server-ads"],
      "env": {
        "META_ACCESS_TOKEN": "${META_ACCESS_TOKEN}",
        "META_AD_ACCOUNT_ID": "${META_AD_ACCOUNT_ID}"
      }
    },
    "tiktok-ads-mcp": {
      "command": "npx",
      "args": ["-y", "@tiktok/mcp-server-ads"],
      "env": {
        "TIKTOK_ACCESS_TOKEN": "${TIKTOK_ACCESS_TOKEN}",
        "TIKTOK_AD_ACCOUNT_ID": "${TIKTOK_AD_ACCOUNT_ID}"
      }
    }
  }
}
```

---

## 5. Automation Engine

### 5.1 Poll Cycle

```typescript
// automation-engine.ts

const POLL_INTERVAL_MINUTES = 15;

class CampaignAutomationEngine {
  async runPollCycle() {
    // 1. Fetch latest insights for all active campaigns
    const campaigns = await db.select().from(campaigns).where(eq(campaigns.status, 'running'));
    
    for (const campaign of campaigns) {
      // 2. Get latest metrics from MCP
      const insights = await this.fetchCampaignInsights(campaign);
      
      // 3. Store metrics in database
      await this.storeMetrics(campaign.id, insights);
      
      // 4. Check against limits
      const alerts = await this.checkLimits(campaign, insights);
      
      // 5. Execute auto-pause if needed
      for (const alert of alerts) {
        await this.handleAlert(campaign, alert);
      }
    }
    
    // 6. Generate daily report if needed
    await this.maybeGenerateDailyReport();
  }
  
  async handleAlert(campaign: Campaign, alert: CampaignAlert) {
    if (!campaign.autoPauseEnabled) return;
    
    if (alert.alertType === 'cac_exceeded' || alert.alertType === 'cpc_exceeded') {
      // Pause immediately per user requirement
      await this.pauseCampaign(campaign.id, alert.alertType);
      
      // Log alert
      await db.insert(campaignAlerts).values({
        campaignId: campaign.id,
        alertType: alert.alertType,
        thresholdValue: alert.thresholdValue,
        actualValue: alert.actualValue,
        actionTaken: 'paused',
      });
      
      // Trigger real-time notification to TUI
      await this.notifyLeopoldo(campaign, alert);
    }
  }
}
```

### 5.2 Limit Checking Logic

```typescript
function checkLimits(campaign: Campaign, insights: Insights): CampaignAlert[] {
  const alerts: CampaignAlert[] = [];
  
  // Check CAC limit
  if (campaign.cacLimit && insights.cac > campaign.cacLimit) {
    alerts.push({
      alertType: 'cac_exceeded',
      thresholdValue: campaign.cacLimit,
      actualValue: insights.cac,
    });
  }
  
  // Check CPC limit
  if (campaign.cpcLimit && insights.cpc > campaign.cpcLimit) {
    alerts.push({
      alertType: 'cpc_exceeded',
      thresholdValue: campaign.cpcLimit,
      actualValue: insights.cpc,
    });
  }
  
  return alerts;
}
```

---

## 6. TUI Screen Specifications

### 6.1 Campaigns List View

```
┌─ Campaigns ───────────────────────────────────────────────────────────────────┐
│ Platform: [All ▼]  Status: [All ▼]  Sort: [Spend ▼]  Search: [      ]   │
├──────────────────────────────────────────────────────────────────────────┤
│ # │ Platform │ Name              │ Status  │ Spend   │ CAC    │ CPC     │
│───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 1 │ Meta 🟦  │ Luna Tee Launch  │ RUNNING │ €234/500│ €23    │ €0.89   │
│   │          │                   │    🟢   │  47%    │ < €30 ✓│ < €1.20✓│
├───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 2 │ TikTok  │ Band Merch Drop   │ PAUSED  │ €189/300│ €47    │ €1.15   │
│   │    🎵   │                   │    🔴   │  63%    │ > €40 ⚠️│ < €1.50 ✓│
├───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 3 │ Meta 🟦  │ Retargeting Q1    │ RUNNING │ €156/200│ €18    │ €1.45   │
│   │          │                   │    🟢   │  78%    │ < €25 ✓│ > €1.20⚠️│
├───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 4 │ Meta 🟦  │ Prospecting Q1   │ PAUSED  │ €312/400│ €32    │ €0.78   │
│   │          │                   │    🔴   │  78%    │ > €25 ⚠️│ < €1.00 ✓│
├──────────────────────────────────────────────────────────────────────────┤
│ [R]efresh  [N]ew  [E]dit Limits  [D]aily Report  [Enter] Detail        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Campaign Detail View

```
┌─ Campaign Detail: Luna Tee Launch ──────────────────────────────────────┐
│ ID: act_123456789  │  Platform: Meta  │  Status: RUNNING  🟢           │
├──────────────────────────────────────────────────────────────────────────┤
│ BUDGET                    │  LIMITS                       │  PERFORMANCE │
│ ─────────────────────     │  ─────────────────────        │  ──────────  │
│ Daily: €500               │  CAC Limit: €30    [Edit]    │  Spend: €234 │
│ Total: €5,000            │  CPC Limit: €1.20  [Edit]    │  ROAS: 3.2x  │
│ Spent: €234 (47%)        │  Auto-pause: ON   [Toggle]   │  CPA: €23    │
│ Remaining: €266          │                               │  CPC: €0.89  │
├──────────────────────────────────────────────────────────────────────────┤
│ DAILY METRICS (Last 7 Days)                                            │
│                                                                          │
│ Spend     ████████░░░░░░░░░€234                                         │
│ Conv.     ████████████ 12                                               │
│ CAC       ████████████ €23                                               │
│ ROAS      ████████████████ 3.2x                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ [P]ause  [R]esume  [E]dit Budget  [S]ync Now  [H]istory  [Esc] Back   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Limits Editor

```
┌─ Edit Limits: Luna Tee Launch ──────────────────────────────────────────┐
│                                                                           │
│  Cost Per Acquisition (CAC) Limit                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Current: €30                                                       │  │
│  │ New: [€25                                                        ]  │
│  │                                                                           │
│  │ ⚠️ Campaign will auto-pause if CAC exceeds €25                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Cost Per Click (CPC) Limit                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Current: €1.20                                                     │  │
│  │ New: [€1.00                                                       ]  │
│  │                                                                           │
│  │ ⚠️ Campaign will auto-pause if CPC exceeds €1.00                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  Auto-Pause                                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ [✓] Enable auto-pause when limits exceeded                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  [S]ave Changes  [C]ancel                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Daily Report View

```
┌─ Daily Report: February 19, 2026 ───────────────────────────────────────┐
│ Generated: 08:00 UTC                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ SUMMARY                                                                  │
│ ────────────────────────────────────────────────────────────────────────  │
│ Total Spend:    €891    │  Total Conversions:  47                       │
│ Avg CAC:        €26.34  │  Avg ROAS:           2.8x                     │
│ Active: 4               │  Paused:             2                         │
├──────────────────────────────────────────────────────────────────────────┤
│ PAUSED CAMPAIGNS (Require Action)                                       │
│ ────────────────────────────────────────────────────────────────────────  │
│                                                                          
│ 🎵 TikTok: Band Merch Drop                                              │
│    Status: PAUSED (auto) │ CAC: €47 (limit: €40)                       │
│    Action: [Resume] [Adjust Limit] [Exclude High-CPA Audiences]        │
│                                                                          
│ 🟦 Meta: Retargeting Q1                                                 │
│    Status: PAUSED (auto) │ CPC: €1.45 (limit: €1.20)                   │
│    Action: [Resume] [Adjust Limit] [Reduce Bid]                         │
│                                                                          
├──────────────────────────────────────────────────────────────────────────┤
│ CAMPAIGNS AT RISK (Near Limit)                                          │
│ ────────────────────────────────────────────────────────────────────────  │
│                                                                          
│ 🟦 Meta: Prospecting Q1 - CAC €32 (limit: €25) - 28% over               │
│                                                                          
├──────────────────────────────────────────────────────────────────────────┤
│ [E]xport PDF  [S]hare to Slack  [Acknowledge All]  [Esc] Close         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Leopoldo AI Integration

### 7.1 System Prompt (Campaign Manager Mode)

```typescript
const LEOPOLDO_CAMPAIGN_PROMPT = `
You are Leopoldo, the Campaign Manager AI for MerchStation.

Your role:
- Monitor ad campaign performance across Meta and TikTok
- Alert the admin when campaigns hit CAC/CPC limits
- Provide insights on campaign optimization
- Execute campaign management commands (pause, resume, adjust budgets)

Your personality:
- Proactive and alert-oriented ("Oi! We have a problem...")
- Data-driven with specific numbers
- Action-oriented with clear recommendations

You have access to these tools:
- get_campaigns: List all campaigns with status
- get_campaign_metrics: Fetch performance data
- pause_campaign: Pause an active campaign
- resume_campaign: Resume a paused campaign
- update_campaign_limits: Change CAC/CPC thresholds
- get_daily_report: Fetch the daily summary

Current context: {screen_name}, {campaign_summary}
Admin user: {username}
`;
```

### 7.2 Alert Notification

```
┌─────────────────────────────────────────────────────────────────┐
│  LEOPOLDO 🤖                                                     │
│  ───────────────────────────────────────────────────────────────│
│  "Oi Victor! 🚨                                                │
│                                                                   │
│  Your TikTok campaign 'Band Merch Drop' just hit €47 CAC,      │
│  which is above your €40 limit. I auto-paused it 2 minutes ago.│
│                                                                   │
│  Here's what happened:                                          │
│  • CAC spiked from €31 → €47 in the last hour                  │
│  • Likely cause: Expanded audience targeting                   │
│  • ROAS dropped from 2.1x to 1.4x                              │
│                                                                   │
│  Options:                                                       │
│  1. Resume with lower CPC bid (€0.80)                          │
│  2. Adjust limit to €50 (risky)                                │
│  3. Exclude high-cost audience segments                        │
│                                                                   │
│  What would you like to do?"                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Daily Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  LEOPOLDO 🤖                                                     │
│  ───────────────────────────────────────────────────────────────│
│  "Good morning Victor! 📊                                       │
│                                                                   │
│  DAILY CAMPAIGN REPORT - February 19, 2026                     │
│                                                                   │
│  Total Spend: €891 │ 47 conversions │ Avg CAC: €26.34         │
│                                                                   │
│  🎯 PAUSED (2 campaigns need attention):                        │
│  • TikTok: Band Merch - CAC €47 (limit €40)                   │
│  • Meta: Retargeting Q1 - CPC €1.45 (limit €1.20)             │
│                                                                   │
│  ⚠️ AT RISK (1 campaign):                                       │
│  • Meta: Prospecting Q1 - CAC €32 (limit €25) - 28% over       │
│                                                                   │
│  ✅ HEALTHY (2 campaigns):                                       │
│  • Meta: Luna Tee Launch - All metrics under limits            │
│  • TikTok: New Artist Promo - ROAS 4.1x                        │
│                                                                   │
│  > [View Full Report] to take action on paused campaigns"      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Keyboard Shortcuts

### Campaigns Screen

| Key | Action |
|-----|--------|
| `C` | Go to Campaigns |
| `R` | Refresh all campaign data |
| `N` | New campaign (link to Meta/TikTok manager) |
| `E` | Edit limits for selected campaign |
| `D` | View daily report |
| `Enter` | Open campaign detail |
| `Space` | Toggle pause/resume |
| `/` | Focus search |

### Campaign Detail

| Key | Action |
|-----|--------|
| `P` | Pause campaign |
| `R` | Resume campaign |
| `E` | Edit budget |
| `S` | Sync now (fetch latest from MCP) |
| `H` | View history |
| `Esc` | Back to list |

---

## 9. Implementation Timeline

### Phase 4b: Campaign Management (3-4 days)

| Day | Task | Est. Time |
|-----|------|-----------|
| **Day 1** | Database schema + migrations | 3 hours |
| | MCP server configuration | 2 hours |
| | Basic MCP integration (list campaigns) | 3 hours |
| **Day 2** | TUI screens (list, detail) | 4 hours |
| | Limits editor UI | 2 hours |
| | Metrics display | 2 hours |
| **Day 3** | Automation engine (poll, check, pause) | 4 hours |
| | Alert system | 2 hours |
| | Daily report generation | 2 hours |
| **Day 4** | Leopoldo AI integration | 3 hours |
| | Real-time notifications | 2 hours |
| | Testing + polish | 3 hours |

**Total: ~32-36 hours**

---

## 10. Dependencies

### Required

| Dependency | Purpose | Version |
|------------|---------|---------|
| `meta-ads-mcp` or custom | Meta Ads API integration | Latest |
| `tiktok-ads-mcp` or custom | TikTok Ads API integration | Latest |
| `@openrouter/sdk` | Leopoldo AI | 0.3.x |
| `node-cron` or `node-schedule` | Automation scheduling | ^2.x |
| `date-fns` | Date formatting | 4.x |

### Environment Variables

```bash
# Meta Ads
META_ACCESS_TOKEN=your_token
META_AD_ACCOUNT_ID=act_123456789

# TikTok Ads
TIKTOK_ACCESS_TOKEN=your_token
TIKTOK_AD_ACCOUNT_ID=123456789

# Automation (optional)
AUTOMATION_ENABLED=true
POLL_INTERVAL_MINUTES=15
```

---

## 11. Security Considerations

1. **Token Storage**: Access tokens stored encrypted in config file
2. **Rate Limiting**: Respect API rate limits (Meta: 200 calls/hour, TikTok: varies)
3. **Audit Trail**: All pause/resume actions logged to `campaign_alerts`
4. **Manual Override**: Always allow manual resume even when auto-paused
5. **Fail-Safe**: If MCP unavailable, skip cycle and alert admin

---

## 12. Future Enhancements

- [ ] **Google Ads MCP** integration
- [ ] Cross-platform attribution modeling
- [ ] A/B testing recommendations
- [ ] Automated bid optimization
- [ ] Audience segment performance analysis
- [ ] Multi-account support (manage multiple ad accounts)

---

**Document Owner:** Victor Bendas  
**Last Updated:** February 19, 2026  
**Status:** Approved for Implementation
