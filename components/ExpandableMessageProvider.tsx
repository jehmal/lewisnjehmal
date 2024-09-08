'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { ExpandableMessage } from './ExpandableMessage';

interface ExpandableMessageContextType {
  showExpandedMessage: (content: string) => void;
  hideExpandedMessage: () => void;
}

const ExpandableMessageContext = createContext<ExpandableMessageContextType | undefined>(undefined);

export const useExpandableMessage = () => {
  const context = useContext(ExpandableMessageContext);
  if (!context) {
    throw new Error('useExpandableMessage must be used within an ExpandableMessageProvider');
  }
  return context;
};

export const ExpandableMessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const showExpandedMessage = (content: string) => {
    console.log("showExpandedMessage called with content:", content);
    setExpandedMessage(content);
  };

  const hideExpandedMessage = () => {
    console.log("hideExpandedMessage called");
    setExpandedMessage(null);
  };

  useEffect(() => {
    console.log("Expanded message state changed:", expandedMessage);
  }, [expandedMessage]);

  return (
    <ExpandableMessageContext.Provider value={{ showExpandedMessage, hideExpandedMessage }}>
      {children}
      {expandedMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <ExpandableMessage message={expandedMessage} onClose={hideExpandedMessage} />
        </div>
      )}
    </ExpandableMessageContext.Provider>
  );
};