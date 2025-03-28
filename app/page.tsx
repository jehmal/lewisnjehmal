'use client';

import { useState, useEffect } from 'react';
import { FadeText } from "@/components/magicui/fade-text";
import TypingAnimation from "@/components/magicui/typing-animation";
import { FileTextIcon, GlobeIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { Dock, DockIcon } from "@/components/magicui/dock";
import { AnimatedSubscribeButton } from "@/components/magicui/animated-subscribe-button";
import Globe from "@/components/magicui/globe";
import { CardDemo } from "@/components/feature-block-animated-card-new";
import DotPattern from "@/components/magicui/dot-pattern";
import BlurFade from "@/components/magicui/blur-fade";
import Meteors from "@/components/magicui/meteors";
import { ExpandableMessageProvider } from '@/components/ExpandableMessageProvider';
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
  IconSearch,
} from "@tabler/icons-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChatSidebar, ChatSidebarBody, ChatSidebarTab } from "@/components/ui/chatsidebar";
import { ClauseSearch } from "@/components/ui/clause-search";
import dynamic from 'next/dynamic';

// Dynamically import components that cause hydration issues
const Sidebar = dynamic(() => import('@/components/ui/sidebar').then(mod => mod.Sidebar), { ssr: false });
const SidebarBody = dynamic(() => import('@/components/ui/sidebar').then(mod => mod.SidebarBody), { ssr: false });
const SidebarLink = dynamic(() => import('@/components/ui/sidebar').then(mod => mod.SidebarLink), { ssr: false });
const Logo = dynamic(() => import('@/components/ui/sidebar').then(mod => mod.Logo), { ssr: false });
const LogoIcon = dynamic(() => import('@/components/ui/sidebar').then(mod => mod.LogoIcon), { ssr: false });

const features = [
  {
    Icon: FileTextIcon,
    name: "AUS/NZ Standards Expertise",
    description: "Access up-to-date information on Australian and New Zealand electrical standards and regulations, ensuring your work is always compliant.",
    href: "#",
    cta: "Explore standards",
    className: "col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg className="w-64 h-64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#ECA72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#ECA72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 13H8" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 17H8" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 9H9H8" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
  },
  {
    Icon: GlobeIcon,
    name: "Built by Tradies, for Tradies",
    description: "Our platform is built by experienced electricians who understand the daily challenges and needs of tradies in Australia and New Zealand.",
    href: "#",
    cta: "Learn more",
    className: "col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg className="w-64 h-64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ECA72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12H22" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2V2Z" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
  },
];

function BentoDemo() {
  return (
    <div className="relative overflow-hidden">
      <Meteors number={40} color="hunyadi-yellow" />
      <BentoGrid className="grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {features.map((feature, idx) => (
          <BentoCard key={idx} {...feature} />
        ))}
      </BentoGrid>
    </div>
  );
}

function DockDemo({ onChatToggle }: { onChatToggle: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Dock>
        <DockIcon onClick={onChatToggle}>
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <ChatBubbleIcon className="w-8 h-8" />
          </div>
        </DockIcon>
      </Dock>
    </div>
  );
}

export default function Home() {
  const [hasError, setHasError] = useState(false);
  const [showCardDemo, setShowCardDemo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Ask");
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    console.log('Home component mounted');
    setClientLoaded(true);
  }, []);

  const handleToggleCardDemo = () => {
    setShowCardDemo(prev => !prev);
  };

  const links = [
    {
      label: "Home",
      href: "/",
      icon: <IconBrandTabler className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      isActive: true, // Set this based on the current route
    },
    {
      label: "Profile",
      href: "/profile",
      icon: <IconUserBolt className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      isActive: false,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      isActive: false,
    },
    {
      label: "Logout",
      href: "#",
      icon: <IconArrowLeft className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      isActive: false,
    },
  ];

  if (hasError) {
    setHasError(true);
    return <div>Something went wrong. Please refresh the page.</div>;
  }

  return (
    <ExpandableMessageProvider>
      {clientLoaded ? (
        <div className={cn(
          "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full min-h-screen",
        )}>
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
            <SidebarBody className="justify-between gap-10">
              {sidebarOpen ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-2">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
              <div>
                <SidebarLink
                  link={{
                    label: "User",
                    href: "#",
                    icon: (
                      <Image
                        src="/images/default-avatar.png"
                        className="h-7 w-7 flex-shrink-0 rounded-full"
                        width={50}
                        height={50}
                        alt="Avatar"
                      />
                    ),
                  }}
                />
              </div>
            </SidebarBody>
          </Sidebar>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="min-h-screen flex flex-col bg-white text-gray-800 relative overflow-hidden">
              {/* Hero Section */}
              <section className="py-12 md:py-24 bg-white bg-opacity-80 relative">
                <div className="absolute inset-0 z-0">
                  <Globe />
                </div>
                <div className="container mx-auto text-center relative z-10 flex flex-col items-center">
                  <FadeText
                    text="Master Your Trade with TradeGuru"
                    className="text-3xl md:text-5xl font-extrabold mb-6 text-hunyadi-yellow font-sans"
                    direction="up"
                    framerProps={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
                    }}
                  />
                  <TypingAnimation
                    text="Always have an answer on the job."
                    duration={30}
                    className="text-lg md:text-xl mb-10 font-sans text-gray-600"
                  />
                  <AnimatedSubscribeButton
                    buttonColor="#ee5622"
                    buttonTextColor="#000000"
                    subscribeStatus={showCardDemo}
                    initialText="Try Demo"
                    changeText={showCardDemo ? "Hide Demo" : "Try Demo"}
                    onClick={handleToggleCardDemo}
                  />
                </div>
              </section>

              {/* CardDemo Section */}
              <BlurFade delay={0.25} inView={showCardDemo}>
                {showCardDemo && (
                  <section className="py-12 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                    <DotPattern
                      width={32}
                      height={32}
                      cx={1}
                      cy={1}
                      cr={1}
                      className="absolute inset-0 h-full w-full text-gray-300 dark:text-gray-700 [mask-image:radial-gradient(white,transparent_85%)]"
                    />
                    <div className="container mx-auto relative z-10">
                      <CardDemo />
                    </div>
                  </section>
                )}
              </BlurFade>

              {/* Features Section */}
              <section id="features" className="py-12 md:py-24 bg-white bg-opacity-90 relative overflow-hidden">
                <div className="container mx-auto relative">
                  <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-16 text-hunyadi-yellow relative z-10">Key Features</h2>
                  <div className="max-w-4xl mx-auto relative">
                    <BentoDemo />
                  </div>
                </div>
              </section>

              {/* CTA Section */}
              <section className="bg-gray-100 bg-opacity-90 text-gray-800 py-12 md:py-24 border-t border-gray-200">
                <div className="container mx-auto text-center px-4">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-hunyadi-yellow">Ready to Elevate Your Trading?</h2>
                  <p className="text-lg md:text-xl mb-6 md:mb-10 text-gray-600">Join TradeGuru today and start making smarter trades.</p>
                  <div className="flex flex-col items-center gap-4 md:gap-6">
                    <button className="bg-flame text-black px-6 py-3 md:px-8 md:py-4 rounded-full text-base md:text-lg font-semibold hover:bg-hunyadi-yellow hover:text-black transition duration-300">
                      Sign Up Now
                    </button>
                    <AnimatedSubscribeButton
                      buttonColor="#eca72c"
                      buttonTextColor="#000000"
                      subscribeStatus={false}
                      initialText="Subscribe to Updates"
                      changeText="Subscribed!"
                    />
                  </div>
                </div>
              </section>

              {/* Footer */}
              <footer className="bg-white bg-opacity-90 text-gray-600 py-6 md:py-8 border-t border-gray-200 relative z-10">
                <div className="container mx-auto text-center">
                  <p>&copy; 2024 TradeGuru. All rights reserved.</p>
                </div>
              </footer>

              {/* Dock */}
              <DockDemo onChatToggle={handleToggleCardDemo} />

              <ChatSidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                open={sidebarOpen}
                setOpen={setSidebarOpen}
              >
                <ChatSidebarBody>
                  {/* Your existing tabs */}
                  <ChatSidebarTab
                    tab={{
                      label: "Search Clauses",
                      icon: <IconSearch className="h-5 w-5" />,
                    }}
                  />
                </ChatSidebarBody>
              </ChatSidebar>

              <main className="flex-1 overflow-auto">
                {activeTab === "Search Clauses" ? (
                  <ClauseSearch />
                ) : (
                  // Your existing content
                  <div>Other content</div>
                )}
              </main>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-800">
          <div className="animate-pulse text-2xl font-bold text-hunyadi-yellow">Loading...</div>
        </div>
      )}
    </ExpandableMessageProvider>
  );
}