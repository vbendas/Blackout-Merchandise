'use client';

import { Button, Link, Navbar, NavbarContent, NavbarItem, NavbarMenu, NavbarMenuItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, useScroll, useTransform } from 'framer-motion';
import React from 'react';
import { openAccessibilityMenu } from '@/components/accessibility-widget';

export const TopNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const { scrollY } = useScroll();
  const gradientOpacity = useTransform(scrollY, [0, 300], [0, 1]);

  // Menu items for mobile and desktop
  const menuItems = [
    { name: 'Portfolio', href: '#portfolio' },
    { name: 'Services', href: '#process' },
  ];

  return (
    <Navbar
      maxWidth="xl"
      position="sticky"
      isBlurred={false}
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="h-[97px] fixed top-0 left-0 right-0 z-[60] overflow-visible transition-all duration-300 bg-transparent"
      classNames={{
        wrapper: 'h-[97px] max-w-7xl px-6 overflow-visible',
        item: [
          'flex',
          'relative',
          'h-full',
          'items-center',
          "data-[active=true]:after:content-['']",
          'data-[active=true]:after:absolute',
          'data-[active=true]:after:bottom-0',
          'data-[active=true]:after:left-0',
          'data-[active=true]:after:right-0',
          'data-[active=true]:after:h-[2px]',
          'data-[active=true]:after:rounded-[2px]',
          'data-[active=true]:after:bg-foreground',
        ],
      }}
    >
      {/* Smoother, Taller Faded Background - Matching Bottom Blur */}
      <motion.div
        className="fixed top-0 left-0 w-full h-32 bg-black backdrop-blur-[2px] -z-10 pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, black 40%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          opacity: gradientOpacity,
        }}
      />

      {/* Left: Desktop Menu */}
      <NavbarContent justify="start" className="pt-[6px]">
        <div className="hidden md:flex gap-8">
          {menuItems.map((item) => (
            <NavbarItem key={item.name}>
              <Link
                color="foreground"
                href={item.href}
                className="text-sm font-medium uppercase tracking-wider hover:opacity-70 transition-opacity"
                style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
              >
                {item.name}
              </Link>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      {/* Mobile Menu Toggle - Custom implementation */}
      <Button
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        className="md:hidden !z-[9999] absolute right-4 top-4"
        isIconOnly
        variant="light"
        onPress={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Icon icon="solar:hamburger-menu-linear" width={32} height={32} />
      </Button>

      {/* Center: Logo - Absolutely positioned for true center */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[5px] -mt-2 z-40 overflow-visible pointer-events-auto">
        <Link href="/" className="text-foreground block overflow-visible">
          <img
            src="/logo/full.png"
            alt="Merch From"
            className="h-21 sm:h-20 md:h-24 lg:h-28 w-auto object-contain object-top md:pt-0 pt-[5px]"
            style={{
              filter:
                'drop-shadow(0 0 1px rgba(0,0,0,0.9)) drop-shadow(0 0 1px rgba(0,0,0,0.9)) drop-shadow(0 1px 1px rgba(0,0,0,0.8)) drop-shadow(0 2px 2px rgba(0,0,0,0.6))',
            }}
          />
        </Link>
      </div>

      {/* Right Side Actions */}
      <NavbarContent justify="end" className="pt-[6px] hidden md:flex">
        <NavbarItem className="hidden lg:flex">
          <Button
            as={Link}
            href="/app"
            variant="light"
            className="text-foreground text-sm font-medium uppercase tracking-wider hover:opacity-70"
            style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
          >
            Login
          </Button>
        </NavbarItem>
        <NavbarItem>
          <Button
            as={Link}
            href="/waitlist"
            variant="light"
            className="text-foreground text-sm font-medium uppercase tracking-wider hover:opacity-70 px-0 min-w-0"
            endContent={<Icon icon="solar:arrow-right-linear" width={18} />}
            style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
            disableAnimation
          >
            Join Waitlist
          </Button>
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-zinc-950/90 backdrop-blur-xl pt-8 !z-[100]">
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link color="foreground" className="w-full text-lg py-2" href={item.href} size="lg">
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
        <NavbarMenuItem className="mt-4">
          <Button as={Link} href="/app" variant="light" className="w-full justify-start text-foreground pl-0">
            Login
          </Button>
        </NavbarMenuItem>

        {/* Mobile Socials & Utilities */}
        <NavbarMenuItem className="mt-6 border-t border-white/10 pt-6">
          <div className="flex gap-6 items-center">
            <Link href="https://instagram.com" target="_blank" className="text-zinc-400 hover:text-white">
              <Icon icon="simple-icons:instagram" width={24} />
            </Link>
            <Link href="https://tiktok.com" target="_blank" className="text-zinc-400 hover:text-white">
              <Icon icon="simple-icons:tiktok" width={24} />
            </Link>
            <button
              onClick={() => {
                setIsMenuOpen(false); // Close menu when opening accessibility
                openAccessibilityMenu();
              }}
              className="text-zinc-400 hover:text-white"
              aria-label="Accessibility"
            >
              <Icon icon="mdi:accessibility" width={26} />
            </button>
          </div>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
};
