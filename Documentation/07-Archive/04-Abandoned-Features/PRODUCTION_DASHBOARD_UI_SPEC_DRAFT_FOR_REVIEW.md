# Production Dashboard UI Specification
## 🚨 DRAFT - REQUIRES PRODUCTION TEAM REVIEW 🚨

**Project:** Merch From  
**Version:** 0.1 DRAFT  
**Created:** January 3, 2025  
**Status:** ⚠️ PENDING PRODUCTION TEAM FEEDBACK  
**Reviewers:** Production Team Lead + Operations Manager  
**Author:** Technical Team

---

## ⚠️ REVIEW INSTRUCTIONS

**This document requires validation from the production team before implementation.**

**Please review and provide feedback on:**
1. ✅ Information hierarchy - Is the most important info visible first?
2. ✅ File download workflow - Are all necessary files included?
3. ✅ Color specifications format - Is the halftone angle info clear?
4. ✅ Print specifications - Any missing details for production?
5. ✅ Action buttons - Are the workflow steps correct?
6. ✅ Missing features - What else would be helpful?
7. ✅ Priority sorting - Should rush orders be at the top?
8. ✅ Mobile usability - Will team use this on tablets/phones?

**Feedback method:** Add comments directly to this document or schedule review meeting.

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [Desktop Layout](#2-desktop-layout-1920x1080)
3. [Order Card Components](#3-order-card-components)
4. [File Download Section](#4-file-download-section)
5. [Color Specifications](#5-color-specifications)
6. [Print Specifications](#6-print-specifications)
7. [Action Buttons & Workflow](#7-action-buttons--workflow)
8. [Mobile Layout](#8-mobile-layout)
9. [Filtering & Search](#9-filtering--search)
10. [Notifications System](#10-notifications-system)
11. [Real-Time Updates](#11-real-time-updates)
12. [Recommended Improvements](#12-recommended-improvements)

---

## 1. Dashboard Overview

### 1.1 Purpose

Centralized dashboard for production team to:
- View all pending orders requiring printing
- Download universal production files (one master PSD for all print methods)
- Track order status (Ready → Downloading → Printing → Complete)
- Access print specifications and color details
- Prioritize rush orders

**Universal Standard:** Every order uses the same halftoned, color-separated layers regardless of print method (DTG, DTF, or screen). This ensures perfect visual consistency across all products.

### 1.2 Key Metrics

- **Processing Time Saved:** Eliminates 1.5 hours of manual color separation per design
- **Universal Standard:** 100% visual consistency across all print methods
- **Files Provided:** 
  - Master PSD with halftoned layers (for all print methods)
  - Reference layer (for color verification, not printing)
  - PDF placement guide
  - Product mockup preview
- **Target Users:** 3-5 production team members
- **Access:** Role-based (production team only, no artist access)
- **Single Workflow:** Same process for DTG, DTF, and screen printing

### 1.3 User Flow

```
Production Team Member Logs In
           ↓
Dashboard shows all "Ready" orders
           ↓
Team member selects order
           ↓
Downloads Master PSD file
           ↓
Marks order as "Downloading" (automatic on first download)
           ↓
Opens PSD in Photoshop
           ↓
           ├─ DTG/DTF: Prints halftoned layers 1-3 combined
           └─ Screen: Prints halftoned layers 1-3 as separate films
           ↓
Marks as "Printing"
           ↓
Finishes printing, marks as "Complete"
           ↓
Order moves to completed section
```

**Note:** Same halftoned layers used for all print methods ensures visual consistency.

---

## 2. Desktop Layout (1920×1080)

### 2.1 Full Dashboard View

```
╔═══════════════════════════════════════════════════════════════════════╗
║  MERCH FROM - PRODUCTION DASHBOARD                    👤 Team Member  ║
║  [New Orders] [In Progress] [Completed] [All]         🔔 3 Notifications║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  📈 TODAY'S SUMMARY                                                   ║
║  ┌────────────┬────────────┬────────────┬────────────┐              ║
║  │ Ready      │ Printing   │ Complete   │ Total      │              ║
║  │ 12 orders  │ 5 orders   │ 8 orders   │ 25 orders  │              ║
║  └────────────┴────────────┴────────────┴────────────┘              ║
║                                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  🔴 URGENT - PRIORITY ORDERS                                          ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ Order #MF-2025-001234                        🔴 Rush (48h left) │ ║
║  │ Artist: The Echoes | Product: T-Shirt Black | Qty: 50           │ ║
║  │ Submitted: Jan 3, 2025 10:30 AM | Due: Jan 5, 2025 10:30 AM     │ ║
║  │                                                                   │ ║
║  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ║
║  │                                                                   │ ║
│ 📦 PRODUCTION FILES                           ✅ Auto-processed   │ ║
║  │                                               ⏱️  Completed in 24s│ ║
║  │                                                                   │ ║
║  │ ┌─ DOWNLOAD SECTION ──────────────────────────────────────────┐ │ ║
║  │ │                                                               │ │ ║
║  │ │ 📄 MASTER PSD FILE (Universal for All Print Methods)         │ │ ║
║  │ │                                                               │ │ ║
║  │ │ ⬇️  [Download Master PSD]                                     │ │ ║
║  │ │     design_production_master.psd (15.8 MB)                    │ │ ║
║  │ │     ↳ Works for: DTG, DTF, and Screen Printing               │ │ ║
║  │ │     ↳ Contains: Reference layer + 3 halftoned layers + specs │ │ ║
║  │ │     ↳ Universal standard for brand consistency               │ │ ║
║  │ │                                                               │ │ ║
║  │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │ ║
║  │ │                                                               │ │ ║
║  │ │ 📖 HOW TO USE THIS FILE:                                      │ │ ║
║  │ │                                                               │ │ ║
║  │ │ Inside the PSD:                                               │ │ ║
║  │ │   • Layer 0: Reference (hidden) - Color verification only    │ │ ║
║  │ │   • Layers 1-3: Halftoned (visible) - PRINT THESE            │ │ ║
║  │ │                                                               │ │ ║
║  │ │ For DTG/DTF: Print layers 1-3 combined                        │ │ ║
║  │ │ For Screen: Print layers 1-3 as separate films               │ │ ║
║  │ │                                                               │ │ ║
║  │ │ ⚠️  IMPORTANT: Never print the reference layer               │ │ ║
║  │ │    Always use halftoned layers (1-3) for all methods        │ │ ║
║  │ │                                                               │ │ ║
║  │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │ ║
║  │ │                                                               │ │ ║
║  │ │ 📐 PRINT GUIDES & REFERENCE                                   │ │ ║
║  │ │                                                               │ │ ║
║  │ │ ⬇️  [Download Placement Guide]                                │ │ ║
║  │ │     placement_guide.pdf (1.2 MB)                              │ │ ║
║  │ │     ↳ Print area dimensions, positioning instructions         │ │ ║
║  │ │                                                               │ │ ║
║  │ │ 🖼️  [View Product Mockup]                                     │ │ ║
║  │ │     Opens high-res preview (4500×5400px)                      │ │ ║
║  │ │     ↳ Shows final product appearance                          │ │ ║
║  │ │                                                               │ │ ║
║  │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │ ║
║  │ │                                                               │ │ ║
║  │ │ 📦 [Download Complete Package]                                │ │ ║
║  │ │     production_package.zip (20.2 MB)                          │ │ ║
║  │ │     ↳ Master PSD + Placement Guide + Mockup                   │ │ ║
║  │ │                                                               │ │ ║
║  │ └───────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                   │ ║
║  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ║
║  │                                                                   │ ║
║  │ 🎨 COLOR SPECIFICATIONS                                           │ ║
║  │                                                                   │ ║
║  │ Print Method: Screen Printing (3-color)                           │ ║
║  │                                                                   │ ║
║  │ Print Order (bottom to top):                                      │ ║
║  │                                                                   │ ║
║  │   Layer 1: White - Underbase                                      │ ║
║  │            Pantone: Pantone White                                 │ ║
║  │            Halftone Angle: 22.5°                                  │ ║
║  │            Frequency: 35 LPI (lines per inch)                     │ ║
║  │            Purpose: Base layer for dark garment                   │ ║
║  │                                                                   │ ║
║  │   Layer 2: Black - Main Design                                    │ ║
║  │            Pantone: Pantone Black C                               │ ║
║  │            Halftone Angle: 45°                                    │ ║
║  │            Frequency: 45 LPI                                      │ ║
║  │            Purpose: Primary design element                        │ ║
║  │                                                                   │ ║
║  │   Layer 3: Red - Accent                                           │ ║
║  │            Pantone: Pantone 185 C                                 │ ║
║  │            Halftone Angle: 30°                                    │ ║
║  │            Frequency: 45 LPI                                      │ ║
║  │            Purpose: Highlight/accent color                        │ ║
║  │                                                                   │ ║
║  │ 💡 AI-Generated Info:                                             │ ║
║  │    • Angles optimized to prevent moiré patterns                   │ ║
║  │    • Colors automatically detected and separated                  │ ║
║  │                                                                   │ ║
║  │ ⚠️  PRODUCTION NOTES:                                              │ ║
║  │    • White underbase required (printing on dark garment)          │ ║
║  │    • Test print recommended for color accuracy                    │ ║
║  │                                                                   │ ║
║  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ║
║  │                                                                   │ ║
║  │ 📐 PRINT SPECIFICATIONS                                           │ ║
║  │                                                                   │ ║
║  │ Design Dimensions: 4500×5400px @ 300 DPI (15×18 inches)          │ ║
║  │ Print Area: 12×16 inches                                          │ ║
║  │ Position: Centered chest, 3 inches from collar                    │ ║
║  │                                                                   │ ║
║  │ Garment Details:                                                  │ ║
║  │   • Type: 100% organic cotton t-shirt                             │ ║
║  │   • Color: Black                                                  │ ║
║  │   • Sizes: M (15), L (20), XL (15)                                │ ║
║  │   • Total Quantity: 50 units                                      │ ║
║  │                                                                   │ ║
║  │ Quality Checks:                                                   │ ║
║  │   ✅ 300 DPI verified                                             │ ║
║  │   ✅ Bleed zone added (0.125 inches)                              │ ║
║  │   ✅ Print-ready format                                           │ ║
║  │   ✅ Color-separated with halftone                                │ ║
║  │   ✅ Moiré-prevention angles applied                              │ ║
║  │                                                                   │ ║
║  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ║
║  │                                                                   │ ║
║  │ 🤖 AI OPTIMIZATIONS APPLIED                                       │ ║
║  │                                                                   │ ║
║  │   ✅ Color reduction: 7 colors → 3 colors                         │ ║
║  │      💰 Cost savings: €8.00 per unit (€400 total for 50 units)   │ ║
║  │                                                                   │ ║
║  │   ✅ Halftone conversion: Gradients optimized for screen printing │ ║
║  │      🎯 Prevents printing artifacts, ensures clean output         │ ║
║  │                                                                   │ ║
║  │   ✅ Bleed zone added: 0.125 inch safety margin                   │ ║
║  │      ✂️  Prevents white borders from cutting variance             │ ║
║  │                                                                   │ ║
║  │   ⏱️  Processing Time: 24 seconds                                 │ ║
║  │   💵 Processing Cost: $0.047 (automated)                          │ ║
║  │                                                                   │ ║
║  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ║
║  │                                                                   │ ║
║  │ 🛠️  ACTIONS                                                        │ ║
║  │                                                                   │ ║
║  │ [✅ Mark as Downloading] [🖨️ Mark as Printing]                    │ ║
║  │ [✔️ Mark Complete] [💬 Add Production Note] [⚠️ Report Issue]     │ ║
║  │                                                                   │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║                                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  📋 STANDARD ORDERS (11 orders)                                       ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ Order #MF-2025-001235                        📅 Standard (5 days)│ ║
║  │ Artist: Neon Dreams | Product: Hoodie Navy | Qty: 25            │ ║
║  │ 🎨 4 colors | 📐 DTG Print | ✅ Files ready                       │ ║
║  │ [⬇️ Download Files] [View Details] [🖨️ Start Printing]           │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ Order #MF-2025-001236                        📅 Standard (6 days)│ ║
║  │ Artist: Vinyl Revival | Product: Tote Bag | Qty: 100            │ ║
║  │ 🎨 2 colors | 📐 Screen Print | ✅ Files ready                    │ ║
║  │ [⬇️ Download Files] [View Details] [🖨️ Start Printing]           │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  [Load More Orders...]                                                ║
║                                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  🖨️ CURRENTLY PRINTING (5 orders)                                     ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ Order #MF-2025-001220 | The Resonance | 30 T-Shirts             │ ║
║  │ Started: 2 hours ago | Estimated completion: 2h remaining        │ ║
║  │ Progress: [████████░░] 80% complete                              │ ║
║  │ [✔️ Mark Complete] [💬 Add Note] [⚠️ Report Issue]               │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │ Order #MF-2025-001215 | Echo Chamber | 15 Hoodies               │ ║
║  │ Started: 1 hour ago | Estimated completion: 4h remaining         │ ║
║  │ Progress: [███░░░░░░░] 30% complete                              │ ║
║  │ [✔️ Mark Complete] [💬 Add Note] [⚠️ Report Issue]               │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  [Show All Printing Orders...]                                        ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 3. Order Card Components

### 3.1 Collapsed View (Standard Orders)

**Purpose:** Show essential info at a glance for non-urgent orders

```
┌─────────────────────────────────────────────────────────────────┐
│ Order #MF-2025-001235                        📅 Standard (5 days)│
│ Artist: Neon Dreams | Product: Hoodie Navy | Qty: 25            │
│ 🎨 4 colors | 📐 DTG Print | ✅ Files ready                       │
│ [⬇️ Download Files] [View Details] [🖨️ Start Printing]           │
└─────────────────────────────────────────────────────────────────┘
```

**Data displayed:**
- Order number
- Deadline (days remaining)
- Artist name
- Product type and color
- Quantity
- Number of colors
- Print method
- File status

### 3.2 Expanded View (Rush Orders)

**Purpose:** Show full details for urgent orders requiring immediate attention

See Section 2.1 for complete expanded view layout.

**Additional data displayed:**
- Submission timestamp
- Due date/time
- Processing time
- Download section with all files
- Complete color specifications
- Print specifications
- AI optimization details
- Action buttons

---

## 4. File Download Section

### 4.1 File Types Provided

**Universal Standard:** One master PSD file works for all print methods (DTG, DTF, screen).

| File Type | Filename | Size | Contents |
|-----------|----------|------|----------|
| **Master PSD (Universal)** | `design_production_master.psd` | ~15.8 MB | • Reference layer (hidden, for verification)<br>• 3 halftoned layers (visible, for printing)<br>• Production info layer<br>**Works for all print methods** |
| **Placement Guide** | `placement_guide.pdf` | ~1.2 MB | Print positioning instructions |
| **Mockup Preview** | `product_mockup.jpg` | ~3 MB | High-res product preview |

**Total package:** ~20 MB

**PSD Layer Structure:**
```
Layer 0: 🖼️ REFERENCE - Full Composite [HIDDEN] ❌ DO NOT PRINT
         Purpose: Color verification only

Layer 1: White - Underbase (22.5°, 35 LPI) [VISIBLE] ✅ PRINT THIS
Layer 2: Black (45°, 45 LPI) [VISIBLE] ✅ PRINT THIS  
Layer 3: Red (30°, 45 LPI) [VISIBLE] ✅ PRINT THIS
         Purpose: Use for ALL print methods (DTG, DTF, screen)

Layer 4: __PRODUCTION_INFO__ [HIDDEN]
         Purpose: Order specifications
```

### 4.2 Universal PSD Workflow

**How to Use the Master PSD:**

```
╔═══════════════════════════════════════════════════════════════╗
║ 📖 UNIVERSAL PRODUCTION WORKFLOW                              ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ FOR ALL PRINT METHODS (DTG, DTF, Screen):                    ║
║                                                               ║
║   1. Open design_production_master.psd in Photoshop          ║
║                                                               ║
║   2. Verify these layers are VISIBLE:                        ║
║      ✅ Layer 1: White - Underbase (22.5°)                   ║
║      ✅ Layer 2: Black (45°)                                  ║
║      ✅ Layer 3: Red (30°)                                    ║
║                                                               ║
║   3. Verify this layer is HIDDEN:                            ║
║      ❌ Layer 0: REFERENCE (for verification only)           ║
║                                                               ║
║   4A. FOR DTG/DTF (Single orders):                           ║
║       • Print all visible layers (1-3) combined              ║
║       • Printer will composite halftoned layers automatically║
║       • Same halftone pattern as screen printing             ║
║                                                               ║
║   4B. FOR SCREEN PRINTING (Bulk orders 50+):                 ║
║       • Print each layer (1-3) separately as film positive   ║
║       • Layer 1 → Screen 1 (White underbase)                 ║
║       • Layer 2 → Screen 2 (Black main design)               ║
║       • Layer 3 → Screen 3 (Red accent)                      ║
║                                                               ║
║ REFERENCE LAYER (Optional):                                   ║
║   • Unhide 👁️ "REFERENCE" layer to verify colors            ║
║   • Compare: Do separated layers match reference?           ║
║   • Use for Pantone ink mixing verification                  ║
║   • ⚠️  DO NOT PRINT: This is visual reference only          ║
║                                                               ║
║ WHY THIS WORKS:                                               ║
║   • DTG and Screen use SAME halftoned layers                 ║
║   • Result: Perfect visual match across all methods          ║
║   • Fan's DTG shirt = Artist's screen printed shirt          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**File Specifications:**
- **Blend Mode:** Multiply (all halftone layers for proper color mixing)
- **Color Mode:** RGB (can convert to CMYK if needed)
- **Resolution:** 300 DPI
- **Dimensions:** 4500×5400px (15×18 inches)
- **Halftone:** 45 LPI (lines per inch) - invisible to naked eye, perfect for consistency

### 4.3 Download Workflow

**Auto-tracking:**
1. User clicks "Download PSD File"
2. System logs download timestamp
3. Order status auto-updates to "Downloading" (if first download)
4. Download counter increments (for analytics)

**Multiple downloads allowed:**
- Team can re-download files if needed
- No limits on download count
- Previous downloads logged for audit trail

---

## 5. Color Specifications

### 5.1 Information Provided

For each color layer:
- **Layer number** (print order)
- **Color name** (e.g., "Black", "Red", "White")
- **Purpose** (Main Design, Underbase, Accent)
- **Pantone code** (if matched, e.g., "Pantone 185 C")
- **Halftone angle** (e.g., 45°)
- **Frequency** (Lines per inch, e.g., 45 LPI)

### 5.2 Halftone Angles Explained

**Why different angles?**
- Prevents moiré patterns (interference patterns when screens overlap)
- Industry-standard angles used:
  - Black: 45°
  - Cyan: 15°
  - Magenta: 75°
  - Yellow: 0°
  - White: 22.5°
  - Custom spot colors: 30°, 37.5°, 52.5°, 60°

**Visual representation:**
```
Layer 1: White (22.5°)    Layer 2: Black (45°)     Layer 3: Red (30°)
   ╱╱╱╱╱╱╱╱╱╱╱╱               \\\\\\\\\\\\\\\\           ╱╱╱╱╱╱╱
  ╱╱╱╱╱╱╱╱╱╱╱╱╱             \\\\\\\\\\\\\\\\\\         ╱╱╱╱╱╱╱╱
 ╱╱╱╱╱╱╱╱╱╱╱╱╱╱           \\\\\\\\\\\\\\\\\\\\       ╱╱╱╱╱╱╱╱╱
```

### 5.3 Production Notes

**Automatically generated notes:**
- "White underbase required (printing on dark garment)"
- "Test print recommended for color accuracy"
- "Halftone optimized for 45 LPI (standard t-shirt mesh)"

**Manual notes (added by production team):**
- Can add custom notes for specific orders
- Visible to all team members
- Attached to order for future reference

---

## 6. Print Specifications

### 6.1 Standard Information

**Design specs:**
- Pixel dimensions (e.g., 4500×5400px)
- DPI (always 300 for print quality)
- Physical size (inches, calculated from pixels/DPI)

**Print area:**
- Printable region (e.g., 12×16 inches)
- Position description (e.g., "Centered chest, 3 inches from collar")

**Garment details:**
- Material (e.g., "100% organic cotton")
- Color (e.g., "Black")
- Size breakdown (e.g., "M: 15, L: 20, XL: 15")
- Total quantity

### 6.2 Quality Checks

**Automated validations:**
- ✅ 300 DPI verified
- ✅ Bleed zone added (0.125 inches)
- ✅ Print-ready format
- ✅ Color-separated with halftone
- ✅ Moiré-prevention angles applied

**If any check fails:**
- ❌ Red X instead of ✅
- Warning message explaining issue
- Option to download anyway (with warning)

---

## 7. Action Buttons & Workflow

### 7.1 Status Flow

```
Ready → Downloading → Printing → Complete
  ↓          ↓            ↓
[Download] [Start]    [Finish]
```

### 7.2 Available Actions

| Action | Button | When Available | Effect |
|--------|--------|----------------|--------|
| **Download Files** | ⬇️ Download Files | Always | Opens file download section |
| **Mark as Downloading** | ✅ Mark as Downloading | Status: Ready | Changes status to "Downloading" |
| **Mark as Printing** | 🖨️ Mark as Printing | Status: Ready or Downloading | Changes status to "Printing" |
| **Mark Complete** | ✔️ Mark Complete | Status: Printing | Changes status to "Complete", moves to completed section |
| **Add Production Note** | 💬 Add Note | Always | Opens text field for custom notes |
| **Report Issue** | ⚠️ Report Issue | Always | Opens issue form, notifies admin |

### 7.3 Automatic Status Updates

**Download triggers:**
- First file download → Auto-updates to "Downloading"
- Logs timestamp and user who downloaded

**No automatic transitions for:**
- Downloading → Printing (requires manual action)
- Printing → Complete (requires manual action)

**Reasoning:**
- Production team controls workflow pace
- No assumptions about printing start time
- Completion requires human verification

---

## 8. Mobile Layout

### 8.1 Responsive Design (375px width - iPhone SE)

```
╔═══════════════════════════════════╗
║  MERCH FROM         [☰]       🔔3 ║
╠═══════════════════════════════════╣
║                                   ║
║  📊 TODAY                          ║
║  ┌───────────────────────────────┐║
║  │ Ready:     12                 │║
║  │ Printing:   5                 │║
║  │ Complete:   8                 │║
║  │ Total:     25                 │║
║  └───────────────────────────────┘║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  🔴 URGENT (2)                     ║
║                                   ║
║  ┌───────────────────────────────┐║
║  │ #MF-2025-001234               │║
║  │ The Echoes                    │║
║  │ 50 T-Shirts, Black            │║
║  │ 🔴 Rush: 48h left             │║
║  │                               │║
║  │ [▼ Show Details]              │║
║  └───────────────────────────────┘║
║                                   ║
║  ┌───────────────────────────────┐║
║  │ #MF-2025-001237               │║
║  │ Urban Beats                   │║
║  │ 30 Hoodies, Navy              │║
║  │ 🔴 Rush: 24h left             │║
║  │                               │║
║  │ [▼ Show Details]              │║
║  └───────────────────────────────┘║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  📋 STANDARD (11)                  ║
║  [View All →]                      ║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  🖨️ PRINTING (5)                   ║
║  [View All →]                      ║
║                                   ║
╚═══════════════════════════════════╝
```

### 8.2 Expanded Order Card (Mobile)

```
╔═══════════════════════════════════╗
║  Order #MF-2025-001234            ║
║  [← Back to Dashboard]            ║
╠═══════════════════════════════════╣
║                                   ║
║  🔴 Rush: 48h left                ║
║                                   ║
║  Artist: The Echoes               ║
║  Product: T-Shirt Black           ║
║  Quantity: 50 units               ║
║  Due: Jan 5, 2025 10:30 AM        ║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  📦 DOWNLOADS                      ║
║                                   ║
║  [⬇️ Download PSD (15.2 MB)]      ║
║  [⬇️ Download Layers (8.4 MB)]    ║
║  [⬇️ Download Guide (1.2 MB)]     ║
║  [🖼️ View Mockup]                 ║
║  [📦 Download All (24.8 MB)]      ║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  🎨 COLORS (3)                     ║
║  [▼ Show Details]                 ║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  📐 PRINT SPECS                    ║
║  [▼ Show Details]                 ║
║                                   ║
╠═══════════════════════════════════╣
║                                   ║
║  🛠️  ACTIONS                       ║
║                                   ║
║  [🖨️ Start Printing]              ║
║  [✔️ Mark Complete]               ║
║  [💬 Add Note]                    ║
║  [⚠️ Report Issue]                ║
║                                   ║
╚═══════════════════════════════════╝
```

### 8.3 Mobile Considerations

**Tap targets:**
- Minimum 44×44px for touch
- Sufficient spacing between buttons
- Clear visual feedback on tap

**Collapsible sections:**
- Color details collapsed by default
- Print specs collapsed by default
- Expand on tap to conserve screen space

**Download buttons:**
- Large, easy to tap
- File sizes visible
- Single tap to download

---

## 9. Filtering & Search

### 9.1 Filter Bar

```
╔═══════════════════════════════════════════════════════════════════════╗
║  🔍 Search: [_________________] [🔎 Search]                           ║
║                                                                       ║
║  Filters:                                                             ║
║  Status:    [Ready ✓] [Printing ✓] [Complete ☐] [All]               ║
║  Priority:  [Rush ✓] [Standard ✓]                                    ║
║  Method:    [Screen ✓] [DTG ✓] [Hybrid ☐]                           ║
║  Date:      [Today ✓] [This Week ☐] [Custom Range]                  ║
║  Artist:    [All Artists ▼]                                           ║
║                                                                       ║
║  Sort by:   [🔴 Priority ▼] | Date | Artist | Quantity               ║
║                                                                       ║
║  [Clear Filters] [Apply]                                              ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### 9.2 Search Functionality

**Searchable fields:**
- Order number (e.g., "MF-2025-001234")
- Artist name (e.g., "The Echoes")
- Product type (e.g., "T-Shirt", "Hoodie")
- Garment color (e.g., "Black", "Navy")

**Search behavior:**
- Real-time filtering as you type
- Case-insensitive
- Partial matches (e.g., "echo" matches "The Echoes")

### 9.3 Default Filters

**On dashboard load:**
- Status: Ready + Printing (excludes Completed)
- Priority: Rush + Standard (all priorities)
- Method: All
- Date: Today
- Sort: Priority (rush orders first)

---

## 10. Notifications System

### 10.1 Notification Center

```
╔═══════════════════════════════════════════════════════════════════════╗
║  🔔 NOTIFICATIONS (3 unread)                             [Mark All Read]║
╠═══════════════════════════════════════════════════════════════════════╣
║  🔴 URGENT: Order #MF-2025-001234 needs printing (48h deadline)       ║
║  ⏰ 2 minutes ago                                            [Dismiss] ║
║  [View Order →]                                                        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  ✅ Order #MF-2025-001210 production files ready                      ║
║  ⏰ 15 minutes ago                                           [Dismiss] ║
║  [View Order →]                                                        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  📊 Daily summary: 25 orders processed today                          ║
║  ⏰ 1 hour ago                                               [Dismiss] ║
║  [View Report →]                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║  ⚠️ Order #MF-2025-001180 issue reported: "Color mismatch"            ║
║  ⏰ 2 hours ago                                              [Dismiss] ║
║  [View Issue →]                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### 10.2 Notification Types

| Type | Icon | Trigger | Priority |
|------|------|---------|----------|
| **Rush Order Due Soon** | 🔴 | <48h until deadline | Urgent |
| **New Order Ready** | ✅ | Production files generated | High |
| **Order Completed** | ✔️ | Team member marks complete | Normal |
| **Issue Reported** | ⚠️ | Problem flagged on order | High |
| **Daily Summary** | 📊 | End of day | Low |

### 10.3 Notification Preferences (Future)

**Per-user settings:**
- Email notifications: Yes/No
- Push notifications: Yes/No
- Sound alerts: Yes/No
- Types to receive: Select all or specific types

---

## 11. Real-Time Updates

### 11.1 Live Data Sync

**Technology:** Supabase Realtime (WebSocket)

**Updates automatically when:**
- New order added to queue
- Order status changes (by any team member)
- Files downloaded (shows who downloaded)
- Notes added to order
- Issues reported

**Visual feedback:**
- New orders: Slide in from top with animation
- Status changes: Badge updates instantly
- Other team members' actions: Toast notification

### 11.2 Collaborative Indicators

**Show who's working on what:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Order #MF-2025-001234                                           │
│ 👤 John Doe is currently viewing this order                     │
│ ⏱️  Downloaded files 5 minutes ago                              │
└─────────────────────────────────────────────────────────────────┘
```

**Prevents conflicts:**
- Shows if someone already started printing
- Alerts if multiple people try to mark complete
- Activity log visible to all team members

---

## 12. Recommended Improvements

### 12.1 Questions for Production Team

**🔴 HIGH PRIORITY - Please answer:**

1. **File format preferences:**
   - Is PSD the preferred format, or would you prefer TIFF/PDF?
   - Do you need CMYK color mode instead of RGB?
   - Should we include vector (AI/EPS) files for screen printing?

2. **Color specifications:**
   - Is the halftone angle information useful as displayed?
   - Do you need Pantone codes, or are RGB values sufficient?
   - Should we add ink coverage percentage estimates?

3. **Print positioning:**
   - Is "centered chest, 3 inches from collar" clear enough?
   - Do you need a visual diagram in the placement guide?
   - Should we add garment templates with ruler measurements?

4. **Workflow steps:**
   - Are the status options correct (Ready → Downloading → Printing → Complete)?
   - Do you need additional statuses (e.g., "Quality Check", "Shipped")?
   - Should we add batch actions (e.g., "Mark 5 orders as printing")?

5. **Urgency indicators:**
   - Is 48 hours the right threshold for "rush" badges?
   - Do you need hourly countdown timers for urgent orders?
   - Should we send alerts at specific thresholds (24h, 12h, 6h)?

6. **Information hierarchy:**
   - Is the most important info visible without scrolling?
   - What details can we hide in collapsed sections?
   - Any missing information you frequently need?

---

### 12.2 Future Enhancements (Post-Review)

**Phase 2 features (if requested):**

1. **Barcode/QR code generation**
   - Print barcode labels for each order
   - Scan to mark status changes
   - Track inventory with scanner

2. **Batch processing**
   - Select multiple orders
   - Download all files at once
   - Mark multiple as printing/complete

3. **Production scheduling**
   - Calendar view of orders
   - Assign orders to specific team members
   - Drag-and-drop to reschedule

4. **Quality control checklist**
   - Mandatory checkboxes before marking complete
   - Photo upload of finished product
   - Customer approval workflow

5. **Inventory management**
   - Track blank garment stock
   - Low stock alerts
   - Auto-reorder notifications

6. **Analytics dashboard**
   - Production volume charts
   - Average turnaround time
   - Error rate tracking
   - Team member performance

7. **Print equipment integration**
   - Send files directly to DTG printer
   - Track printer status
   - Maintenance schedules

8. **Customer communication**
   - Auto-send "in production" emails
   - Upload tracking numbers
   - Delivery confirmations

---

### 12.3 Technical Considerations

**Performance targets:**
- Dashboard load time: <2 seconds
- File download speed: Depends on connection (avg 15 MB in 5-10 seconds)
- Real-time update latency: <500ms
- Mobile responsiveness: Works on tablets (iPad) and phones

**Browser compatibility:**
- Chrome, Firefox, Safari (latest 2 versions)
- Edge (latest version)
- No IE11 support

**Security:**
- Role-based access (production team only)
- Audit log of all downloads and status changes
- Secure file storage (HTTPS, encrypted)

---

## 13. Implementation Checklist

### 13.1 Development Tasks

**Backend:**
- [ ] Database tables for production packages
- [ ] API endpoints for status updates
- [ ] File storage setup (Supabase Storage)
- [ ] Real-time subscription channels
- [ ] Role-based access control
- [ ] Audit logging system

**Frontend:**
- [ ] Dashboard layout (desktop)
- [ ] Order card components (collapsed/expanded)
- [ ] File download section
- [ ] Filter and search UI
- [ ] Mobile responsive layout
- [ ] Notification center
- [ ] Real-time update handlers

**Testing:**
- [ ] Load testing (100+ orders)
- [ ] Mobile device testing (iOS/Android)
- [ ] File download verification
- [ ] Real-time sync testing
- [ ] User acceptance testing with production team

---

## 14. Approval & Sign-Off

### 14.1 Review Process

**Step 1: Production Team Review (This Document)**
- Review all sections
- Add comments and feedback
- Schedule walkthrough meeting if needed

**Step 2: Revised Specification**
- Incorporate production team feedback
- Update design based on requirements
- Create revised version 1.0

**Step 3: Final Approval**
- Production team lead signs off
- Operations manager approves
- Move to development phase

### 14.2 Feedback Form

**Please provide feedback on:**

```
═══════════════════════════════════════════════════════════════════════
PRODUCTION DASHBOARD REVIEW FORM

Reviewer Name: _______________________
Role: _______________________
Date: _______________________

═══════════════════════════════════════════════════════════════════════

1. Information Hierarchy (1-5 stars)
   Rating: ☐☐☐☐☐
   Comments: ___________________________________________________________

2. File Download Workflow (1-5 stars)
   Rating: ☐☐☐☐☐
   Comments: ___________________________________________________________

3. Color Specifications Clarity (1-5 stars)
   Rating: ☐☐☐☐☐
   Comments: ___________________________________________________________

4. Print Specifications Completeness (1-5 stars)
   Rating: ☐☐☐☐☐
   Comments: ___________________________________________________________

5. Action Buttons & Workflow (1-5 stars)
   Rating: ☐☐☐☐☐
   Comments: ___________________________________________________________

6. Mobile Usability (1-5 stars)
   Rating: ☐☐☐☐☐
   Comments: ___________________________________________________________

═══════════════════════════════════════════════════════════════════════

Missing Features:
___________________________________________________________________
___________________________________________________________________

Unnecessary Features:
___________________________________________________________________
___________________________________________________________________

Critical Changes Required:
___________________________________________________________________
___________________________________________________________________

Nice-to-Have Additions:
___________________________________________________________________
___________________________________________________________________

Overall Approval Status:
☐ Approved as-is
☐ Approved with minor changes
☐ Requires major revisions
☐ Needs complete redesign

Signature: _______________________     Date: _______________________

═══════════════════════════════════════════════════════════════════════
```

---

## 15. Contact & Support

**For questions or feedback on this specification:**

**Technical Team:**
- Email: tech@merchfrom.com
- Slack: #production-dashboard-project

**Project Manager:**
- Email: pm@merchfrom.com
- Phone: +XX XXX XXX XXXX

**Scheduled Review Meeting:**
- Date: [To be scheduled after initial review]
- Location: [Conference room or video call]
- Attendees: Production team lead, operations manager, technical team

---

**Document Status:** 🚨 DRAFT - AWAITING REVIEW  
**Next Steps:** Production team reviews → Feedback meeting → Revisions → Approval  
**Target Approval Date:** Within 2 weeks of distribution  
**Development Start:** After approval

---

**END OF DOCUMENT**
