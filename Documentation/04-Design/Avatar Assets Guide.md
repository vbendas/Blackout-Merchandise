# Avatar Assets Guide: The "Bento Portrait"

> **Objective:** Generate high-fidelity, layer-separated assets for Leopoldo, Francisca, and Antônia using Recraft.ai.
> **Style Target:** Premium 2D Vector/Raster Hybrid ("The Bento Portrait").

---

## 1. General Style Prompts (Recraft.ai)

Use these keywords to ensure consistency across all characters:
*   **Style:** "Flat Design", "Minimalist vector illustration", "Clean lines", "Premium tech aesthetic".
*   **Lighting:** "Soft studio lighting", "No hard shadows".
*   **Palette:** "Deep Zinc/Grey compatible", "Vibrant accents".

---

## 1. The "Style Recipe": Modern Rubber Hose (1930s Cartoon)

This is the "Cuphead" or "Felix the Cat" style. It is bold, full of personality, and makes the colored T-shirt pop against the black-and-white character.

### **Recraft.ai Settings**
*   **Style:** Select **"Vector Art"** or **"Digital Illustration"**.
*   **Sub-style:** **"Cartoon"** or **"Line Art"**.
*   **Detail Level:** Medium/High.
*   **Exclude/Negative Prompt:** `color, 3d, realistic, shading, gradient, modern clothes, chaotic, messy, sketch, noise, film grain, texture overlay`

### **The "Golden Prompt" Formula**
> "A **[Rubber hose animation style]** character of **[Character]**, **1930s vintage cartoon style**, **Cuphead style**, **black and white**, **pie eyes**, **white gloves**, **clean vector lines**, **white background**. Wearing a **white t-shirt**. Cute, retro but clean."

---

## 2. Character Specifications

### **Leopoldo (The Boss)**
*   **Vibe:** The smooth-talking Jazz Cat.
*   **Specifics:** Tuxedo Cat (Black body, white face/belly).
*   **Prompt:** "A tuxedo cat boss, 1930s cartoon style, wearing a white t-shirt, confident smirk, pie eyes, rubber hose limbs."

### **Francisca (The Designer)**
*   **Vibe:** The high-maintenance Diva.
*   **Specifics:** Fluffy white cat, maybe with a bow or eyelashes.
*   **Prompt:** "A fluffy white cat diva, 1930s cartoon style, long eyelashes, wearing a white t-shirt, judgmental but cute expression."

### **Antônia (The Ops)**
*   **Vibe:** The energetic Rascal.
*   **Specifics:** Tabby/Calico (Mapped to B&W patterns).
*   **Prompt:** "A crazy energetic cat, 1930s cartoon style, big eyes, messy fur, wearing a white t-shirt, running or excited pose."

---

## 3. Layer Generation Guide (The "Puppet" Method)

To achieve the "Bento Portrait" animation, you must generate (or mask out) these specific parts as separate PNGs with transparent backgrounds.

### **Layer 1: The Base Body (Static)**
*   **Prompt:** "[Character Description], upper torso and shoulders only, front facing, symmetrical pose, arms down at sides (not visible), wearing a plain white t-shirt."
*   **Why:** This is the anchor. It never moves.
*   **Filename:** `[name]_body.png`

### **Layer 2: The T-Shirt Mask (Dynamic)**
*   **Action:** In Photoshop/Figma, create a localized mask or cutout of the T-shirt chest area from Layer 1.
*   **Why:** We will programmatically overlay user designs onto this area.
*   **Filename:** `[name]_shirt_mask.png`

### **Layer 3: The Heads (Expression Swapping)**
*   **Strategy:** Generate multiple head variations to swap programmatically based on the AI state.
*   **Required Expressions:**
    1.  **Neutral:** Calm, waiting. (Default)
    2.  **Speaking (Open Mouth):** For lip-sync simulation (can be just 2 frames: Open/Closed).
    3.  **Happy/Success:** Big grin, eyes closed or wide. (For "Order Confirmed").
    4.  **Thinking:** Looking up, maybe tongue out or scratching chin. (For "AI Processing").
    5.  **Shock/Alert:** Big "Pie Eyes", mouth open. (For "Low Stock" or errors).
*   **Filename Format:** `[name]_head_[emotion].png`

### **Layer 4: The Eyes (Tracking)**
*   **Part A (Sclera/Face):** The head layer *without* pupils (or with blank white eyes).
*   **Part B (Pupils):** Just the black/colored pupils on a transparent background.
*   **Why:** We map mouse X/Y position to the Pupil layer to create eye-tracking.
*   **Filename:** `[name]_eyes_base.png` & `[name]_pupils.png`

### **Layer 5: "Break-Out" Elements (Depth)**

#### **A. The Tail (Background)**
*   **Prompt:** "Cat tail, [Color/Pattern], slightly curved upright."
*   **Placement:** Z-Index -1 (Behind the Bento Box).
*   **Animation:** Rotate `anchor: bottom-center` to simulate wagging from behind the UI.
*   **Filename:** `[name]_tail.png`

#### **B. The Paws (Interaction)**
*   **Prompt:** "Cat paws, [Color], resting position, flat."
*   **Placement:** Hidden (`bottom: -50px`) by default.
*   **Animation:** When User types: `translateY(-50px)` (Slide up from bottom edge).
*   **Filename:** `[name]_paws.png`

---

## 4. Assembly Logic (CSS/Framer Motion)

```jsx
<div className="bento-box relative overflow-visible">
  {/* Layer 5A: Tail (Behind) */}
  <img src="tail.png" className="absolute -z-10 bottom-0 left-10 animate-wag" />

  <div className="glass-container relative overflow-hidden rounded-xl">
     {/* Layer 1: Body */}
     <img src="body.png" className="absolute bottom-0 z-10" />
     
     {/* Layer 2: Shirt Overlay */}
     <div className="absolute top-[40%] left-[25%] width-[50%] z-20">
        <UserDesignOverlay />
     </div>

     {/* Layer 3: Head */}
     <motion.div animate={{ y: isSpeaking ? [0, -2, 0] : 0 }} className="z-30">
        <img src="head.png" />
        {/* Layer 4: Eyes */}
        <EyeTracker pupils="pupils.png" />
     </motion.div>

     {/* Layer 5B: Paws */}
     <motion.img 
        src="paws.png" 
        animate={{ y: isTyping ? 0 : 100 }} 
        className="absolute bottom-0 z-40" 
     />
  </div>
</div>
```

---

## 5. Midjourney Workflow (Recommended for Consistency)

Midjourney v6 is currently the **best tool** for keeping your character consistent while generating separate parts.

### **Step 1: The "Master Reference"**
1.  Take the best image you created in Gemini (the one you love).
2.  Upload it to Discord and copy the link.
3.  Use this link as a **Character Reference** (`--cref URL`) and **Style Reference** (`--sref URL`) in all future prompts.

### **Step 2: Generating Heads (Sprite Sheet Method)**
Instead of cutting one head, ask for a sheet:
> `/imagine prompt: [IMAGE_URL] A sprite sheet of [Character] heads with different facial expressions: happy, angry, thinking, speaking. White background, 1930s rubber hose style --cref [URL] --cw 100`

### **Step 3: The "Vary Region" Trick (For surgical separation)**
If you have a full body but want to change *just* the head:
1.  Upscale the full body image in Midjourney (`U1`).
2.  Click **"Vary Region"**.
3.  Select the **Head area** with the rectangle tool.
4.  Change the prompt to: "Head with mouth open speaking" -> Submit.
5.  It will generate *just* a new head on the exact same body. You can then crop it in Photoshop.

