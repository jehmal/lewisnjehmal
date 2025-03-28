"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser } from '@/contexts/UserContext';
import { Menu as IconMenu2 } from 'lucide-react';

interface Links {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sidebar({ open, setOpen, children }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same structure but no client-side logic
    return <div className="fixed left-0 top-0 bottom-0 flex flex-col bg-gray-100 dark:bg-neutral-800 shadow-xl w-0"></div>;
  }

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setOpen(!open)}
          className="fixed top-4 left-4 z-50 p-2 bg-[#ee5622] hover:bg-[#ff6733] text-white rounded-md transition-colors duration-200"
        >
          <IconMenu2 className="w-6 h-6" />
        </button>
      )}
      <motion.div
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-gray-100 dark:bg-neutral-800 shadow-xl transition-all duration-300 ease-in-out",
          isMobile ? (open ? "w-64" : "w-0") : (open || isHovered ? "w-64" : "w-12")
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        initial={false}
        animate={{ width: isMobile ? (open ? 256 : 0) : (open || isHovered ? 256 : 48) }}
      >
        {children}
      </motion.div>
    </>
  );
}

export function SidebarBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col flex-1 overflow-y-auto", className)}>{children}</div>;
}

export function SidebarLink({ link }: { link: Links }) {
  const { logout } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (link.label.toLowerCase() === 'logout' && mounted) {
      e.preventDefault();
      await logout();
    }
  };

  return (
    <Link
      href={link.href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-4 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors duration-150",
        link.isActive && "bg-neutral-200 dark:bg-neutral-700"
      )}
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">{link.icon}</div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="font-medium whitespace-nowrap overflow-hidden"
      >
        {link.label}
      </motion.span>
    </Link>
  );
}

export function Logo() {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 px-3 mb-4"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-nowrap overflow-hidden"
      >
        TradeGuru
      </motion.span>
    </Link>
  );
}

export function LogoIcon() {
  return (
    <div className="font-normal flex items-center text-sm text-black dark:text-white py-1 px-3 mb-4">
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </div>
  );
}
