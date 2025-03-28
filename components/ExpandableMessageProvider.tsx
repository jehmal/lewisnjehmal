'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { ExpandableMessage } from './ExpandableMessage';
import { TreeViewElement } from '@/components/ui/file-tree';
import { ClauseTreeViewElement } from '@/types/clauses';
import { Figure } from '@/types/chat';

export interface ExpandedMessageData {
  initialQuestion: string;
  initialAnswer: string;
  followUps: Array<{
    question: string;
    answer: string;
    figures?: Figure[];
    referencedClauses?: ClauseTreeViewElement[];
  }>;
  referencedClauses?: ClauseTreeViewElement[];
  figures?: Figure[];
  onFollowUp?: (question: string) => Promise<void>;
  source?: 'history' | 'chat';
}

interface ExpandableMessageContextType {
  showExpandedMessage: (data: ExpandedMessageData) => void;
  hideExpandedMessage: () => void;
}

export const ExpandableMessageContext = createContext<ExpandableMessageContextType | undefined>(undefined);

export const ExpandableMessageProvider = ({ children }: { children: ReactNode }) => {
  const [expandedMessage, setExpandedMessage] = useState<ExpandedMessageData | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Log mount for debugging
    console.log("ExpandableMessageProvider mounted");
  }, []);

  const showExpandedMessage = (data: ExpandedMessageData) => {
    // Log the data for debugging
    console.log("Showing expanded message with data:", {
      question: data.initialQuestion?.substring(0, 50) + "...",
      answer: data.initialAnswer?.substring(0, 50) + "...",
      hasFollowUps: !!data.followUps && data.followUps.length > 0,
      followUpsCount: data.followUps?.length || 0,
      referencedClausesCount: data.referencedClauses?.length || 0,
      referencedClausesSample: data.referencedClauses ? 
        data.referencedClauses.slice(0, 2).map(c => ({ id: c.id, standard: c.standardDoc })) : 
        'none'
    });
    
    // Check if the call is coming from the history timeline context
    // We can add a flag to the data to indicate which mode to use
    if (data.source === 'history') {
      // In this case, we'll let the CardDemo component handle the display
      console.log('Using new tab-based display for history view');
      return;
    }
    
    // Otherwise, use the traditional modal approach
    setExpandedMessage(data);
  };

  const hideExpandedMessage = () => {
    setExpandedMessage(null);
  };

  // Dummy handler for expandReference function
  const handleExpandReference = (ref: string) => {
    console.log("Expanding reference:", ref);
  };

  return (
    <ExpandableMessageContext.Provider value={{ showExpandedMessage, hideExpandedMessage }}>
      {children}
      {isMounted && expandedMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999 }}>
          <ExpandableMessage 
            initialQuestion={expandedMessage.initialQuestion}
            initialAnswer={expandedMessage.initialAnswer}
            followUps={expandedMessage.followUps}
            referencedClauses={expandedMessage.referencedClauses || []}
            figures={expandedMessage.figures}
            onFollowUp={expandedMessage.onFollowUp}
            onClose={hideExpandedMessage}
            message={expandedMessage.initialQuestion}
            onExpandReference={handleExpandReference}
            expandableType="chat"
          />
        </div>
      )}
    </ExpandableMessageContext.Provider>
  );
};

export const useExpandableMessage = () => {
  const context = useContext(ExpandableMessageContext);
  if (!context) {
    throw new Error('useExpandableMessage must be used within an ExpandableMessageProvider');
  }
  return context;
};