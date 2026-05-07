'use client';

import { Link } from '@heroui/react';
import { Icon } from '@iconify/react';
import React from 'react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Services',
      links: [
        { name: 'Portfolio', href: '#portfolio' },
        { name: 'About Us', href: '#hero' },
        { name: 'Services', href: '#process' },
        { name: 'Pricing', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'Contact', href: '#' },
        { name: 'Blog', href: '#' },
        { name: 'Careers', href: '#' },
        { name: 'Press', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms of Service', href: '#' },
        { name: 'Cookie Policy', href: '#' },
      ],
    },
  ];

  const socialLinks = [
    { name: 'Instagram', href: 'https://instagram.com', icon: 'simple-icons:instagram' },
    { name: 'TikTok', href: 'https://tiktok.com', icon: 'simple-icons:tiktok' },
    { name: 'Discord', href: 'https://discord.gg', icon: 'simple-icons:discord' },
  ];

  return (
    <footer className="w-full pt-16 pb-8 -mt-[50px] selection:bg-white selection:text-black">
      {/* Divider: Gradient Line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12"></div>

      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
        {/* 5-Column Grid - All Centered */}
        <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-8 mb-12 items-start justify-items-center">
          {/* Col 1: Mascot Image */}
          <div className="flex justify-center w-full">
            <div className="relative w-44 h-44 overflow-hidden mix-blend-screen opacity-90 transition-opacity hover:opacity-100">
              <img
                src="https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto/leopoldo_footer_tp6cg4"
                alt="Leopoldo"
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Col 2: Brand Text & Socials */}
          <div className="flex flex-col text-center items-center pt-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-white text-xl font-medium tracking-tight text-balance">Merch&nbsp;From.</h4>
              <p className="text-zinc-500 text-sm leading-snug max-w-xs text-pretty">
                Fueled by coffee, sunsets, and three cats in a&nbsp;campervan.
              </p>
            </div>

            <p className="text-zinc-500 text-xs font-medium my-4">Quality first,&nbsp;always.</p>

            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <Icon icon={social.icon} width={20} />
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3-5: Links */}
          {footerLinks.map((column) => (
            <div key={column.title} className="flex flex-col gap-4 text-center md:text-left items-center md:items-start pt-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{column.title}</h3>
              <ul className="flex flex-col gap-2 items-center md:items-start">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-zinc-500 hover:text-white transition-colors text-sm">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar - Centered with Gradient Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>
        <div className="w-full flex flex-col items-center text-center">
          <p className="text-zinc-700 text-xs">&copy; {currentYear} Merch&nbsp;From. All rights&nbsp;reserved.</p>
        </div>
      </div>
    </footer>
  );
};
