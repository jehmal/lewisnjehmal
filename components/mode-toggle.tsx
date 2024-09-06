import React from 'react';
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";

export function ModeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState('light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    // Add logic here to actually change the theme in your app
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className={className}>
      {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
    </Button>
  );
}