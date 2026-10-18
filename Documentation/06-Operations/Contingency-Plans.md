# Production Contingency Plans


  ### 14.1 Scenario: Viral PoD Spike (Single Unit Orders)
  **Trigger:** 1,000+ individual orders received in 24h (Exceeds daily internal capacity of ~300-500 units).

  **Metric Reality Check:**
  - **Constraint:** Brother GTXpro B (~75s/print avg, high-speed mode) = ~540 units/10h shift.
  - **Backup:** TexPro Series 2 (~4 min/print) = ~150 units/10h shift.
  - **Total Internal Capacity:** ~300-500 units/day (realistic operational capacity).
  - **Bottleneck:** Finishing/packing (not printing speed).

  **Response Strategy (72h Shipping Turnaround):**
  - **Day 1 (The Spike):**
    - Instant implementation of **"Dynamic Shipping Windows"**: New orders automatically update to "Ships in 5-7 days" once the 72h capacity bucket (1,800 units) is full.
    - **Activate Extended Shifts:** Run 14-16h shifts to push daily output to ~850 units.
  - **Day 2 (The Equipment Scaling):**
    - **Purchase Order Trigger:** If volume sustains >800/day for 48h, order a **Second Brother GTXpro B**.
    - **Benefit:** 2-day delivery time to Portugal. Cashflow from the spike covers the down payment/purchase immediately.
  - **Day 3 (The Overflow):**
    - While waiting for the new machine, route overflow to **Barcelos Partner Network** (only for "Standard" designs).

  ### 14.2 Scenario: Viral Bulk "Drop" (The 5,000 Unit Pre-Order)
  **Trigger:** A major influencer drops a collection, selling 5,000 units in 48h.

  **Metric Reality Check:**
  - **Main Engine:** Anatol VOLT-M = 2,500 prints/day (conservative).
  - **Secondary Engine:** Semi-Auto Press = 500 prints/day.
  - **Total Internal Capacity:** ~3,000 prints/day.
  - **The Bottleneck:** *Not* printing. The bottlenecks are **Stock Availability** and **Finishing/Packing**.

  **Response Strategy:**
  - **Inventory Logistics:**
    - **WATC Studio Direct Supply:** We leverage direct relationship with **WATC Studio (Barcelos, Portugal)** to verify real-time stock availability via API, then coordinate express local shipping to restock up to 5,000 units in **48 hours** (domestic supply chain advantage).
  - **Algorithmic Expectation Management (The "Francisca" Rule):**

    - Instead of fixed promises, the system dynamically adjusts the "Ships In" window based on real-time SKU velocity:
      - **>100 units sold/24h:** +1 Day Shipping Turnaround
      - **>500 units sold/24h:** +2 Days Shipping Turnaround
      - **>1,000 units sold/24h:** +3 Days Shipping Turnaround
    - *Result:* Customers get transparent, realistic timelines immediately, reducing support tickets.
  - **Production Sprint:**
    - 5,000 units = **2 days of printing** at full capacity. This fits perfectly within the adjusted 5-7 day window even with 48h blank delivery time.
  - **The Real Bottleneck (Packing):**
    - **Hire Temporary Staff:** Activate a pre-vetted pool of local packers (students/part-time) to handle folding/tagging/shipping.

  ### 14.3 Scenario: Critical Equipment Breakdown
  **Trigger:** Main automatic press (Anatol VOLT-M) suffers catastrophic part failure (e.g., servo driver board) needing 2 weeks for replacement.   

  **Contingency Plan (Redundancy Layers):**
  - **Layer 1: The "Blackout" Backup (Internal):**
    - Switch production to the **existing Semi-Automatic 8-Color Press** (from Blackout Merchandise assets).
    - *Impact:* Throughput drops from ~500/hr to ~100/hr.
    - *Action:* Prioritize "Rush" and VIP orders.
  - **Layer 2: Digital Pivot (Internal):**
    - Shift applicable designs (full color/gradients) to **Brother GTXpro B (DTG/DTF)**.
    - *Note:* Notify customers of "Free Digital Upgrade" (often perceived as premium for detail, though slower for bulk).
  - **Layer 3: Local Offload (External):**
    - Activate the "Neighbor Network." In Barcelos, we are surrounded by industrial printers.
    - *Protocol:* Victor personally oversees QC at partner facility to maintain the "Blackout Merchandise Standard."

  **Prevention Strategy:**
  - **Spare Parts Kit:** Hold critical spares (relays, sensors, print heads) on-site (Value: ~€2k investment).
  - **SLA:** Purchase "Gold Support" from equipment vendor for 48h part dispatch.

  ### 14.4 The "Neighbor Network" Vetting Standard (Quality Assurance)
  To ensure outsourced orders (Scenario 1 & 2) are indistinguishable from in-house production:

  1.  **The "Magna Mandate":** Partners must agree to use **Magna Colours HB** (Water-based) inks. If they don't stock it, *we supply the ink kits* for our jobs. Zero tolerance for Plastisol substitution.
  2.  **The "First Pull" Protocol:** For any overflow batch >100 units, a Blackout Merchandise Quality Manager (or Victor) must physically visit the partner facility to sign off on the first printed unit (registration, cure, hand feel) before the run proceeds.
  3.  **Blind Logistics:** We supply the blanks and the shipping labels. The partner functions solely as a labor unit; they never interact with shipping software or branding.
  4.  **The "Ghost" Audit:** Twice a year, we run a test "Ghost" order (fake customer) to verify their unmonitored quality and pack presentation.

  ### 14.5 Operational Excellence: The "Palmprint" Standard
  To guarantee the Anatol VOLT-M operates at theoretical limits from Day 1, we have budgeted for **Tony Palmer (@palmprint)**—the global reference for automatic press optimization—to conduct a 3-day on-site certification in Barcelos.

  **Value to Investors:**
  - **De-Risking:** Removes the "learning curve" of new equipment. We don't guess; we execute best practices immediately.
  - **Maximized ROI:** Ensures the expensive machinery hits its 500-800 unit/hour target, rather than idling at 50% efficiency due to operator skill gaps.
  - **Predictive Maintenance:** Training includes specific protocols to prevent the mechanical failures listed in Scenario 14.3.

  ---

