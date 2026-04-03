# Riskiest Assumptions & Contingency Matrix

Draft for PRD Section 12 or 16.

| Assumption | Risk Level | How We Test (Validation) | Kill Criteria (Red Flag) | Pivot Option |
| :--- | :--- | :--- | :--- | :--- |
| **1. UX Intuitiveness**<br>(Proactive UI > Passive Dashboard) | **Low**<br>(Mitigated) | **Design is Guided, not Open-Ended.** The AI leads with options (cards, buttons) rather than waiting for text. Users just "react" rather than "initiate." Validation: Monitor click-through rate on proactive suggestions. | Users stop engaging when AI asks open-ended questions. | **Reinforce Shortcuts:** Increase prominence of visual menu for common tasks. |
| **2. Value Proposition**<br>(Premium Quality @ Standard Price) | **Medium** | **Price Parity, Quality Superiority.** We sell for €30 (standard venue price), but give a €50 quality shirt. Risk is artists lowering price to €20 and eroding margin. Validation: Monitor average retail price set by artists. | Average artist markup drops below 20% (indicating they feel forced to race-to-the-bottom). | **Education & Niche Focus:** Double down on "Buy Less, Buy Better" messaging. Disqualify budget-focused artists early. We do NOT compromise on quality to compete on price. |
| **3. Expansion Scalability**<br>(Quality relies on Systems, not Heroes) | **Low** | **Expert is Support, NOT Lead.** Expansion relies on the "Merch From Playbook" and a hired Ops Manager, not Expert's daily presence. Validation: Document 100% of SOPs by Month 12. | Brazil hub fails quality audits despite following SOPs. | **Founder Deployment:** Victor relocates to Brazil for 3 months to retrain/restructure personally. |
| **4. AI Reliability & Failure Value**<br>(Failures become Training Assets) | **Low**<br>(Mitigated) | **The "Frustration Protocol":** Repeated user edits trigger auto-handoff to Human Designer (Brazil Agency). Critical Twist: Every manual fix is instantly tagged for the training dataset, turning today's failure into tomorrow's capability. | Human intervention rate exceeds 30% (unsustainable agency cost). | **Scale Human Layer:** If AI struggles, we simply treat the "Human Desk" as a core feature (charging a small fee for "Pro Design Support") while the model catches up. |
| **5. Portugal Logistics**<br>(Shipping Competitiveness from PT) | **Low** | **Contract Leverage:** We don't pay consumer rates. Contracts with DHL/DPD provide competitive flat rates across EU Zones. Network effects mean costs *decrease* as we scale. Validation: Compare DPD Zone 1 rate vs Printful Local. | Shipping costs exceed competitor total landed cost by >20%. | **Dynamic Carrier Aggregation:** Integrate multi-carrier API (Packlink/SendCloud) to algorithmically select the cheapest route per package if single-contract rates fail. |

## Key Definitions
- **Kill Criteria:** The specific metric that tells us "This hypothesis is wrong, stop now."
- **Pivot Option:** The pre-planned "Plan B" so we don't panic if the assumption fails.
