'use client';

import Script from 'next/script';

// UserWay Accessibility Widget
// NOTE: You need to replace "YOUR_USERWAY_ACCOUNT_ID" with your actual UserWay account ID.
// You can get this by signing up at UserWay.org
const USERWAY_ID = 'JM009LE6d4';

export const AccessibilityWidget = () => {
  return (
    <>
      <Script
        id="userway-widget"
        src={`https://cdn.userway.org/widget.js`}
        data-account={USERWAY_ID}
        strategy="lazyOnload"
      />
      {/* 
        Hide the default accessibility button so we can use our custom trigger.
        UserWay usually allows managing the button position/visibility in their dashboard,
        but we can also force hide the default trigger with CSS to ensure our UI stays clean.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Hide standard UserWay trigger button if it appears */
            .uwy.userway_p1 .uwy-accessibility-widget {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
            }
            /* Ensure it doesn't block clicks */
            #userwayAccessibilityIcon {
              display: none !important;
            }
          `,
        }}
      />
    </>
  );
};

// Helper function to trigger the UserWay widget manually
export const openAccessibilityMenu = () => {
  if (typeof window === 'undefined') return;

  // Method 1: Try the DOM click (Most reliable for custom triggers)
  // UserWay injects an element that intercepts clicks.
  const widgetTrigger =
    (document.querySelector('.uwy-accessibility-widget') as HTMLElement) ||
    (document.querySelector('div[id^="userway-accessibility-widget"]') as HTMLElement) ||
    (document.getElementById('userwayAccessibilityIcon') as HTMLElement);

  if (widgetTrigger) {
    widgetTrigger.click();
    return;
  }

  // Method 2: Try the Global API safely
  // @ts-expect-error - UserWay global
  if (window.UserWay && window.UserWay.accessibility && typeof window.UserWay.accessibility.open === 'function') {
    // @ts-expect-error - UserWay global
    window.UserWay.accessibility.open();
  }
};
