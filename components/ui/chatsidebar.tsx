"use client";
import React, { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu as IconMenu2 } from 'lucide-react';

interface Tab {
  label: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface ChatSidebarProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export function ChatSidebar({ open, setOpen, activeTab, setActiveTab, children }: ChatSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <ChatSidebarProvider 
      open={open} 
      setOpen={setOpen} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      <div className="relative">
        {isMobile && (
          <button
            onClick={() => setOpen(!open)}
            className="absolute top-4 left-4 z-50 p-2 bg-[#ee5622] hover:bg-[#ff6733] text-white rounded-md transition-colors duration-200"
          >
            <IconMenu2 className="w-6 h-6" />
          </button>
        )}
        <motion.div
          className={cn(
            "h-full flex flex-col bg-gray-100 dark:bg-neutral-800 shadow-xl transition-all duration-300 ease-in-out",
            isMobile ? (open ? "w-64" : "w-0") : (open || isHovered ? "w-64" : "w-12")
          )}
          onMouseEnter={() => !isMobile && setIsHovered(true)}
          onMouseLeave={() => !isMobile && setIsHovered(false)}
          initial={false}
          animate={{ width: isMobile ? (open ? 256 : 0) : (open || isHovered ? 256 : 48) }}
        >
          {children}
        </motion.div>
      </div>
    </ChatSidebarProvider>
  );
}

export function ChatSidebarBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col flex-1 overflow-y-auto", className)}>{children}</div>;
}

export function ChatSidebarTab({ tab }: { tab: Tab }) {
  const { open, animate, activeTab, setActiveTab } = useChatSidebar();

  return (
    <button
      onClick={() => setActiveTab(tab.label)}
      className={cn(
        "flex items-center gap-4 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors duration-150",
        activeTab === tab.label && "bg-neutral-200 dark:bg-neutral-700"
      )}
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
        {tab.icon}
      </div>
      <span className="font-medium whitespace-nowrap">
        {tab.label}
      </span>
    </button>
  );
}

interface ChatSidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ChatSidebarContext = React.createContext<ChatSidebarContextProps | undefined>(undefined);

export const useChatSidebar = () => {
  const context = useContext(ChatSidebarContext);
  if (!context) {
    throw new Error("useChatSidebar must be used within a ChatSidebarProvider");
  }
  return context;
};

interface ChatSidebarProviderProps {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ChatSidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
}: ChatSidebarProviderProps) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp || setOpenState;

  return (
    <ChatSidebarContext.Provider value={{ open, setOpen, animate, activeTab: activeTabProp, setActiveTab: setActiveTabProp }}>
      {children}
    </ChatSidebarContext.Provider>
  );
};