'use client';

import { AccessibilityWidget } from '@/components/accessibility-widget';
import { CatChat } from '@/components/chat/CatChat';
import { CatChatProvider } from '@/components/chat/CatChatProvider';
import { GradientMesh } from '@/components/GradientMesh';
import { IconStripNav } from '@/components/layout';
import { AvatarExpressionProvider } from '@/lib/AvatarExpressionContext';
import { ChatProvider } from '@/lib/ChatContext';
import { DesignWorkflowProvider } from '@/lib/DesignWorkflowContext';
import { HistoryProvider } from '@/lib/HistoryContext';
import { NavigationProvider, useNavigation } from '@/lib/NavigationContext';
import { NewChatDialogProvider } from '@/lib/NewChatDialogContext';
import { NotificationsProvider } from '@/lib/NotificationsContext';
import { ProductListProvider } from '@/lib/ProductListContext';
import { StudioProvider } from '@/lib/StudioContext';

function AvatarWrapper({ children }: { children: React.ReactNode }) {
  const { activeAgent } = useNavigation();
  return <AvatarExpressionProvider agentName={activeAgent}>{children}</AvatarExpressionProvider>;
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href="https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_400/merch-from/avatars/leopoldo/1_-_neutral_attr1_subject"
      />
      <div className="flex h-screen overflow-hidden bg-zinc-950 text-foreground">
        {/* Gradient Mesh Background - enables glass effect visibility */}
        <GradientMesh />

      {/* Icon Strip Navigation */}
      <IconStripNav />

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col min-w-0 md:ml-16 z-10">
        <main className="h-full flex-1 min-h-0 overflow-auto pb-4">{children}</main>

        {/* Accessibility Widget */}
        <AccessibilityWidget />
      </div>

      {/* Cat-Suite Unified Chat */}
      <CatChat />
    </div>
  </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <HistoryProvider>
        <NotificationsProvider>
          <NewChatDialogProvider>
            <ProductListProvider>
              <DesignWorkflowProvider>
                <StudioProvider>
                  <ChatProvider>
                    <CatChatProvider>
                      <AvatarWrapper>
                        <AppLayoutContent>{children}</AppLayoutContent>
                      </AvatarWrapper>
                    </CatChatProvider>
                  </ChatProvider>
                </StudioProvider>
              </DesignWorkflowProvider>
            </ProductListProvider>
          </NewChatDialogProvider>
        </NotificationsProvider>
      </HistoryProvider>
    </NavigationProvider>
  );
}
