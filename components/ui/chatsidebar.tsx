"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Tab {
  label: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface ChatSidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextProps | undefined>(
  undefined
);

export const useChatSidebar = () => {
  const context = useContext(ChatSidebarContext);
  if (!context) {
    throw new Error("useChatSidebar must be used within a ChatSidebarProvider");
  }
  return context;
};

export const ChatSidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <ChatSidebarContext.Provider value={{ open, setOpen, animate, activeTab: activeTabProp, setActiveTab: setActiveTabProp }}>
      {children}
    </ChatSidebarContext.Provider>
  );
};

export const ChatSidebar = ({
  children,
  open,
  setOpen,
  animate,
  activeTab,
  setActiveTab,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  return (
    <ChatSidebarProvider open={open} setOpen={setOpen} animate={animate} activeTab={activeTab} setActiveTab={setActiveTab}>
      {children}
    </ChatSidebarProvider>
  );
};

export const ChatSidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopChatSidebar {...props} />
      <MobileChatSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopChatSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useChatSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0",
          className
        )}
        animate={{
          width: animate ? (open ? "300px" : "60px") : "300px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileChatSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useChatSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
                onClick={() => setOpen(!open)}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const ChatSidebarTab = ({
  tab,
  className,
}: {
  tab: Tab;
  className?: string;
}) => {
  const { open, animate, activeTab, setActiveTab } = useChatSidebar();
  return (
    <button
      onClick={() => setActiveTab(tab.label)}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        className,
        activeTab === tab.label ? "text-blue-500" : "text-neutral-700 dark:text-neutral-200"
      )}
    >
      {tab.icon}

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {tab.label !== "Ask" ? tab.label : ""}
      </motion.span>
    </button>
  );
};