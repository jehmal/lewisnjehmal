"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { ThumbsUp, ThumbsDown, MessageSquare, History, Calculator, Minus, Loader2, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";
import SparklesText from "@/components/magicui/sparkles-text";
import { ChatSidebar, ChatSidebarBody, ChatSidebarTab } from "@/components/ui/chatsidebar";
import { Timeline } from "@/components/ui/timeline";
import { MovingBorder } from "@/components/ui/moving-border";
import ShinyButton from "@/components/magicui/shiny-button";
import MaximumDemandCalculator from "@/components/MaximumDemandCalculator";
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import AuthUI from '@/components/AuthUI';
import { ExpandableCardDemo } from '@/components/blocks/expandable-card-demo-grid';
import { formatDateForDisplay, formatDateForDatabase } from '@/utils/date-formatter';
import { Message, Figure, TimelineEntry, DatabaseMessage } from '@/types/chat';
import { ContinueButton } from '@/components/ui/continue-button';
import { retry } from '@/utils/retry';
import { formatDatabaseMessage, formatMessageForDatabase } from '@/utils/message-formatter';
import { ClauseReference, TreeViewElement, WaClausesData } from '@/types/clauses';
import { waClauses, findClauseById, ausnzClauses } from '@/lib/waClauses';
import { findAusnzClauseByIdSync } from '@/lib/ausnzClauses';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tree, File, Folder } from "@/components/ui/file-tree";
import { FileTextIcon } from 'lucide-react';
import { ClauseSearch } from "@/components/ui/clause-search";
import { extractFigureReferences } from '@/utils/figure-references';

// Add this utility function after imports
const checkImageExists = async (path: string): Promise<boolean> => {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Add this component at the top of your file, before CardDemo
const FollowUpInput = ({ messageId, onSubmit, onCancel }: { 
  messageId: string, 
  onSubmit: (input: string) => void, 
  onCancel: () => void 
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm"
    >
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Follow-up Question
          </label>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your follow-up question..."
            className="w-full bg-white dark:bg-gray-600"
          />
        </div>
        <div className="flex gap-2">
          <ShimmerButton
            type="submit"
            disabled={!input.trim()}
            shimmerColor="#eca72c"
            background="#ee5622"
            className="px-4 py-2"
          >
            Send
          </ShimmerButton>
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="px-4 py-2"
          >
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

// Update the extractClauseReferences function to better handle clause mentions
const extractClauseReferences = (content: string): TreeViewElement[] => {
  const referencedClauses = new Set<string>();

  // Look for clauses in the entire content with multiple patterns
  const patterns = [
    // Pattern for direct clause references
    /(?:ASNZ ?3000|AS\/?NZS ?\s*3000|ASNZ)\s*(?:Clause|CL\.?)?\s*(\d+(?:\.\d+)*(?:\.\d+)*)/gi,
    // Pattern for colon-separated references
    /(?:ASNZ ?3000|AS\/?NZS ?\s*3000|ASNZ)\s*(?:Clause|CL\.?)?\s*:\s*(\d+(?:\.\d+)*(?:\.\d+)*)/gi,
    // Pattern for references without ASNZ prefix in lists
    /^(?:Clause|CL\.?)?\s*(\d+(?:\.\d+)*(?:\.\d+)*)/gim
  ];

  // Use Array.from to handle the iterator
  patterns.forEach(pattern => {
    const matches = Array.from(content.matchAll(pattern));
    
    matches.forEach(match => {
      let clauseNumber = match[1].trim();
      console.debug('Found clause reference:', clauseNumber);

      // Normalize clause number (remove leading/trailing dots and spaces)
      clauseNumber = clauseNumber.replace(/^\.+|\.+$/g, '').trim();
      
      // Try to find the clause in ausnzClauses
      const clause = findAusnzClauseByIdSync(clauseNumber);
      if (clause) {
        console.debug(`Found clause ${clauseNumber}: ${clause.title}`);
        referencedClauses.add(`ASNZ:${clauseNumber}`);
      } else {
        console.warn(`Clause ${clauseNumber} not found in ASNZ clauses:`, clauseNumber);
      }
    });
  });

  // Also look specifically in the "List of Related Clauses" section
  const relatedClausesSection = content.match(/List of Related Clauses([\s\S]*?)(?:\n\n|$)/i);
  if (relatedClausesSection) {
    const lines = relatedClausesSection[1].split('\n');
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // Extract numbers from the line
      const numbers = cleanLine.match(/\d+(?:\.\d+)*(?:\.\d+)*/g);
      if (numbers) {
        numbers.forEach(number => {
          const clauseNumber = number.trim();
          const clause = findAusnzClauseByIdSync(clauseNumber);
          if (clause) {
            console.debug(`Found clause ${clauseNumber} in related clauses list`);
            referencedClauses.add(`ASNZ:${clauseNumber}`);
          }
        });
      }
    });
  }

  // Convert the Set to TreeViewElements and sort them
  const tree: TreeViewElement[] = Array.from(referencedClauses)
    .map(clauseId => {
      const [standard, number] = clauseId.split(':');
      const clause = findAusnzClauseByIdSync(number);
      
      if (!clause) {
        return {
          id: clauseId,
          name: `${standard} Clause ${number}`,
          isSelectable: true,
          children: []
        };
      }

      return {
        id: clauseId,
        name: `${standard} Clause ${number} - ${clause.title}`,
        isSelectable: true,
        children: []
      };
    })
    .sort((a, b) => {
      const aNum = a.id.split(':')[1].split('.').map(Number);
      const bNum = b.id.split(':')[1].split('.').map(Number);
      
      // Compare each segment
      for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
        const aVal = aNum[i] || 0;
        const bVal = bNum[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });

  return tree;
};

// Update the findClause function
const findClause = (id: string): ClauseReference | null => {
  console.log('Finding clause with id:', id); // Debug log
  return findClauseById(id);
};

// Add this function to convert the clauses data into TreeViewElements
const convertClausesToTreeView = (clauses: any): TreeViewElement[] => {
  const treeData: TreeViewElement[] = [];

  Object.entries(clauses.sections).forEach(([sectionId, sectionData]: [string, any]) => {
    const section: TreeViewElement = {
      id: sectionId,
      name: `${sectionId} - ${sectionData.title}`,
      isSelectable: true,
      children: []
    };

    // If section has subsections, process them
    if (sectionData.subsections) {
      Object.entries(sectionData.subsections).forEach(([subId, subData]: [string, any]) => {
        const subsection: TreeViewElement = {
          id: subId,
          name: `${subId} - ${subData.title}`,
          isSelectable: true,
          children: []
        };

        // If subsection has further subsections, process them
        if (subData.subsections) {
          Object.entries(subData.subsections).forEach(([subSubId, subSubData]: [string, any]) => {
            subsection.children?.push({
              id: subSubId,
              name: `${subSubId} - ${subSubData.title}`,
              isSelectable: true
            });
          });
        }

        section.children?.push(subsection);
      });
    }

    treeData.push(section);
  });

  return treeData;
};

export function CardDemo() {
  const [inputValue, setInputValue] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'calculator' | 'clauses'>('chat');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [ratings, setRatings] = useState<{[key: string]: 'up' | 'down' | 'neutral' | null}>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isNewRequestPending, setIsNewRequestPending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState<number | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [continuationError, setContinuationError] = useState<string | null>(null);
  const [continuationProgress, setContinuationProgress] = useState(0);
  const [showFollowUpInput, setShowFollowUpInput] = useState<string | null>(null);
  const [followUpInput, setFollowUpInput] = useState('');
  const [showClauseTree, setShowClauseTree] = useState(false);
  const [selectedClause, setSelectedClause] = useState<ClauseReference | null>(null);
  const [referencedClauses, setReferencedClauses] = useState<TreeViewElement[]>([]);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [referencedFigures, setReferencedFigures] = useState<Figure[]>([]);
  const [clausesTree, setClausesTree] = useState<TreeViewElement[]>([]);

  const filteredConversation = conversation.filter(message =>
    message.content.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const filteredTimelineData: TimelineEntry[] = filteredConversation
    .filter(message => message.role === 'user')
    .map((message) => {
      // Find the actual index in the full conversation
      const messageIndex = conversation.findIndex(msg => msg.id === message.id);
      return {
        title: message.timestamp || '',
        content: (
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-grow relative min-h-[100px]">
            <p className="font-bold mb-2">You:</p>
            <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none pr-24">
              {message.content}
            </ReactMarkdown>
            <div className="mt-3">
              <ShinyButton
                text="View Answer"
                className="text-xs"
                onClick={() => setExpandedAnswerIndex(messageIndex + 1)} // Use actual index
                shimmerColor="#eca72c"
                background="#ee5622"
              />
            </div>
          </div>
        ),
      };
    })
    .reverse();

  const tabs = [
    {
      label: "Chat",  // This will show "Chat" in the sidebar
      icon: <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "History",  // This will show "History" in the sidebar
      icon: <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Calculators",  // This will show "Calculators" in the sidebar
      icon: <Calculator className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Clauses",  // This will show "Clauses" in the sidebar
      icon: <Book className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgressValue(0);
      interval = setInterval(() => {
        setProgressValue((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);
    } else {
      setProgressValue(100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const fetchLatestConversation = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Fetching conversations for user:', user.id);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*, good_response, neutral_response, bad_response')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Raw conversation data:', data);

      if (data && data.length > 0) {
        const formattedData = data.map((message: DatabaseMessage) => {
          const formatted = formatDatabaseMessage(message);
          console.log('Formatted message:', formatted);
          return formatted;
        });
        
        setConversation(formattedData);
        console.log('Updated conversation state:', formattedData);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setError('Failed to fetch conversation');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLatestConversation();
    }
  }, [user, fetchLatestConversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    setIsNewRequestPending(true);
    
    const now = new Date();
    const userMessage: Message = { 
      role: 'user', 
      content: inputValue.trim(),
      created_at: formatDateForDatabase(now),
      timestamp: formatDateForDisplay(now.toISOString()),
      user_id: user.id,
      isComplete: true,
      threadId: '',
      runId: '',
      assistantId: null
    };
    
    console.log('Saving user message:', userMessage);

    try {
      // When saving to Supabase, only send the necessary fields with ISO date
      const supabaseMessage = {
        role: userMessage.role,
        content: userMessage.content,
        created_at: formatDateForDatabase(now),
        user_id: user.id,
        is_complete: true,
        thread_id: '',
        run_id: ''
      };

      const { data: savedQuestion, error: questionError } = await supabase
        .from('conversations')
        .insert([{
          role: 'user',
          content: inputValue.trim(),
          created_at: new Date().toISOString(),
          user_id: user.id,
          context: null
        }])
        .select()
        .single();

      console.log('Saved user message:', savedQuestion);

      if (questionError) {
        console.error('Error saving question:', questionError);
        throw new Error('Failed to save question');
      }

      console.log('Question saved successfully:', savedQuestion);

      // Format the saved question for display
      const savedQuestionWithDisplay = formatDatabaseMessage(savedQuestion);

      setConversation(prev => [...prev, savedQuestionWithDisplay]);
      setInputValue(''); // Clear input immediately

      // Get AI response - Remove assistantId from the request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
        },
        body: JSON.stringify({ 
          message: inputValue,
          conversation: [userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      
      const figures = extractFigureReferences(data.response);
      
      // Check each figure/table path and filter out non-existent ones
      const validFigures = await Promise.all(
        figures.map(async (fig) => {
          const exists = await checkImageExists(fig.image);
          if (!exists && fig.image.endsWith('.png')) {
            // Try jpg if png doesn't exist
            const jpgPath = fig.image.replace('.png', '.jpg');
            const jpgExists = await checkImageExists(jpgPath);
            if (jpgExists) {
              return { ...fig, image: jpgPath };
            }
          }
          return exists ? fig : null;
        })
      );

      const filteredFigures = validFigures.filter((fig): fig is Figure => fig !== null);

      // Create assistant message with continuation properties
      const assistantNow = new Date();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        context: data.context,
        created_at: formatDateForDatabase(assistantNow),
        timestamp: formatDateForDisplay(assistantNow.toISOString()),
        user_id: user.id,
        related_question_id: savedQuestion.id,
        isComplete: data.isComplete,
        threadId: data.threadId,
        runId: data.runId,
        assistantId: data.assistantId, // This will now come from the backend
        figures: filteredFigures
      };

      console.log('Saving assistant message:', assistantMessage);

      // Save the assistant's response using raw SQL
      const { data: savedResponse, error: responseError } = await supabase
        .from('conversations')
        .insert([{
          role: 'assistant',
          content: data.response,
          context: data.context,
          created_at: new Date().toISOString(),
          user_id: user.id,
          related_question_id: savedQuestion.id
        }])
        .select()
        .single();

      console.log('Saved assistant message:', savedResponse);

      if (responseError) {
        console.error('Error saving response:', responseError);
        throw new Error('Failed to save response');
      }

      console.log('Response saved successfully:', savedResponse);

      // Format the saved response for display
      const savedResponseWithDisplay = {
        ...formatDatabaseMessage(savedResponse),
        figures: filteredFigures
      };

      // Update local state with the response including figures
      setConversation(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== savedQuestionWithDisplay.id);
        return [...withoutTemp, savedQuestionWithDisplay, savedResponseWithDisplay];
      });

      console.log('Message pair verified and saved');

      if (savedQuestion.id) {
        // Update the question with the assistant_id using raw SQL
        const { error: updateError } = await supabase
          .rpc('update_conversation_assistant_id', {
            conversation_id: savedQuestion.id,
            new_assistant_id: data.assistantId
          });

        if (updateError) {
          console.error('Error updating question with assistant_id:', updateError);
        }
      }

      // If response is not complete, automatically continue generating
      if (!data.isComplete) {
        let continuedResponse = data.response;
        let isComplete = false;
        let currentThreadId = data.threadId;
        let currentRunId = data.runId;

        while (!isComplete) {
          try {
            const continuationResponse = await fetch('/api/chat/continue', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                threadId: currentThreadId,
                runId: currentRunId,
                previousContent: continuedResponse,
                assistantId: data.assistantId
              }),
            });

            if (!continuationResponse.ok) {
              throw new Error('Failed to continue generation');
            }

            const continuationData = await continuationResponse.json();
            continuedResponse += continuationData.response;
            isComplete = continuationData.isComplete;
            currentThreadId = continuationData.threadId;
            currentRunId = continuationData.runId;

            // Update UI with continued response
            const updatedMessage = {
              ...savedResponse,
              content: continuedResponse,
              figures: extractFigureReferences(continuedResponse)
            };

            setConversation(prev => {
              const withoutTemp = prev.filter(msg => msg.id !== savedQuestionWithDisplay.id);
              return [...withoutTemp, savedQuestionWithDisplay, updatedMessage];
            });

          } catch (error) {
            console.error('Error in continuation:', error);
            break;
          }
        }

        // Final update to database with complete response
        await supabase
          .from('conversations')
          .update({ content: continuedResponse })
          .eq('id', savedResponse.id);
      }

    } catch (error) {
      console.error('Error in submission:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setIsNewRequestPending(false);
    }
  };

  const clearConversation = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConversation([]);
      setError(null);
    } catch (error) {
      console.error('Error clearing conversation:', error);
      setError('Failed to clear conversation history');
    }
  };

  const handleRating = async (messageId: string, rating: 'up' | 'down' | 'neutral') => {
    const message = conversation.find(msg => msg.id === messageId);
    console.log('Rating message:', message);

    if (!message || message.role !== 'assistant') {
      console.error('Invalid message for rating:', message);
      return;
    }

    try {
      const updateData = {
        good_response: rating === 'up',
        neutral_response: rating === 'neutral',
        bad_response: rating === 'down'
      };
      console.log('Updating database with:', updateData);

      const { data, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', messageId)
        .select();

      if (error) throw error;

      console.log('Database update result:', data);

      // Update the local state
      setRatings(prev => ({ ...prev, [messageId]: rating }));

      // Update the conversation state
      setConversation(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updateData } : msg
      ));

      setFeedbackMessage("Thank you for your feedback!");
      setTimeout(() => setFeedbackMessage(null), 2000);
    } catch (error) {
      console.error('Error saving rating:', error);
      setError('Failed to save rating');
    }
  };

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab.toLowerCase() as 'chat' | 'history' | 'calculator' | 'clauses');
    setSidebarOpen(false);
  };

  const ExpandableAnswer = ({ answerIndex, onClose }: { answerIndex: number, onClose: () => void }) => {
    const answer = conversation[answerIndex];
    if (!answer || answer.role !== 'assistant') {
      return null;
    }

    // Extract both clauses and figures
    const referencedClauses = extractClauseReferences(answer.content);
    const figures = extractFigureReferences(answer.content);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <MovingBorder duration={3000} rx="25" ry="25">
            <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg" />
          </MovingBorder>
          <div className="relative z-10 p-6">
            <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
              {answer.content}
            </ReactMarkdown>
            
            {/* Display Figures and Tables */}
            {figures.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-2">Referenced Figures:</h4>
                <ExpandableCardDemo figures={figures} />
              </div>
            )}

            {/* Referenced Clauses Section */}
            {referencedClauses.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
                  Referenced Clauses
                </h4>
                <div className="space-y-4">
                  {referencedClauses.map((clause) => {
                    const [standard, number] = clause.id.split(':');
                    const fullClause = standard === 'WA' ? 
                      findClauseById(number) : 
                      findAusnzClauseByIdSync(number);
                      
                    return (
                      <BoxReveal
                        key={clause.id}
                        width="100%"
                        boxColor="#eca72c"
                        duration={0.5}
                      >
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {clause.name}
                          </h5>
                          {fullClause && (
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                              {fullClause.fullText}
                            </p>
                          )}
                        </div>
                      </BoxReveal>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <ShinyButton
                text="Close"
                className="bg-gray-500 hover:bg-gray-600"
                onClick={onClose}
                shimmerColor="#eca72c"
                background="#ee5622"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const handleContinueGeneration = async (message: Message) => {
    if (!message.threadId || !message.runId) {
      console.error('Missing thread or run ID for continuation');
      return;
    }

    setIsContinuing(true);
    setContinuationError(null);
    setContinuationProgress(0);

    const progressInterval = setInterval(() => {
      setContinuationProgress(prev => Math.min(prev + 5, 90));
    }, 1000);

    try {
      const response = await retry(
        async () => {
          const res = await fetch('/api/chat/continue', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              threadId: message.threadId,
              runId: message.runId,
              previousContent: message.content,
              assistantId: message.assistantId
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.details || 'Failed to continue generation');
          }

          return res.json();
        },
        { maxAttempts: 3, delay: 1000 }
      );

      setContinuationProgress(100);

      // Create a new message with the continued content
      const continuedMessage: Message = {
        ...message,
        content: message.content + '\n\n' + response.response,
        isComplete: response.isComplete,
        threadId: response.threadId,
        runId: response.runId,
        assistantId: response.assistantId,
        figures: extractFigureReferences(response.response)
      };

      // Update the conversation with the continued message
      setConversation(prev => prev.map(msg => 
        msg.id === message.id ? continuedMessage : msg
      ));

      // Save to Supabase
      if (user) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update(formatMessageForDatabase(continuedMessage))
          .eq('id', message.id);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
          throw updateError;
        }
      }

    } catch (error) {
      console.error('Error continuing generation:', error);
      setContinuationError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      clearInterval(progressInterval);
      setIsContinuing(false);
      setContinuationProgress(0);
    }
  };

  const handleFollowUp = async (messageId: string, followUpQuestion: string) => {
    if (!user) return;
    
    setIsContinuing(true);
    setContinuationProgress(0);
    
    try {
      const originalMessage = conversation.find(msg => msg.id === messageId);
      if (!originalMessage) throw new Error('Message not found');

      // First update UI to show the follow-up question
      const followUpUserSection = `

-------------------
**Follow-up Question:**
${followUpQuestion}

*Generating response...*`;

      // Immediately update UI with the follow-up question
      setConversation(prev => prev.map(msg => 
        msg.id === messageId ? {
          ...msg,
          content: msg.content + followUpUserSection
        } : msg
      ));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
        },
        body: JSON.stringify({
          message: followUpQuestion,
          conversation: conversation
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      // Format the complete follow-up Q&A
      const followUpSection = `

-------------------
**Follow-up Question:**
${followUpQuestion}

**TradeGuru's Answer:**
${data.response}`;

      // Create updated message with follow-up
      const updatedMessage = {
        ...originalMessage,
        content: originalMessage.content + followUpSection,
        figures: [
          ...(originalMessage.figures || []),
          ...extractFigureReferences(data.response)
        ]
      };

      // Update conversation with the complete response
      setConversation(prev => prev.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));

      // Update in database with the combined content
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          content: updatedMessage.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (updateError) throw updateError;
      
      // Clear the follow-up input
      setShowFollowUpInput(null);

    } catch (error) {
      console.error('Error in follow-up:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsContinuing(false);
      setContinuationProgress(0);
    }
  };

  const handleClauseSelect = (clauseId: string) => {
    console.log('Handling clause selection for:', clauseId);
    
    const [standard, number] = clauseId.split(':');
    console.log('Standard:', standard, 'Number:', number);
    
    let clause;
    if (standard === 'WA') {
      clause = findClauseById(number);
      console.log('Found WA clause:', clause);
    } else {
      clause = findAusnzClauseByIdSync(number);
      console.log('Found AUSNZ clause:', clause);
    }
    
    if (clause) {
      // Add standard prefix to clause id to maintain context
      const enrichedClause = {
        ...clause,
        id: `${standard}:${clause.id}`,
        standard: standard // Add standard info to help with UI rendering
      };
      console.log('Setting selected clause:', enrichedClause);
      setSelectedClause(enrichedClause);
      setShowClauseTree(true);
    } else {
      console.log('No clause found for:', clauseId);
    }
  };

  const renderTreeContent = (elements: TreeViewElement[]) => {
    return elements.map((element) => {
      if (element.children && element.children.length > 0) {
        return (
          <Folder
            key={element.id}
            element={element.name}
            value={element.id}
            isSelectable={element.isSelectable}
          >
            {renderTreeContent(element.children)}
          </Folder>
        );
      }
      return (
        <File
          key={element.id}
          value={element.id}
          isSelectable={element.isSelectable}
          fileIcon={<FileTextIcon className="size-4" />}
          handleSelect={() => handleClauseSelect(element.id)}
        >
          {element.name}
        </File>
      );
    });
  };

  const renderChatMessages = () => {
    let messagesToRender: Message[] = [];

    if (activeTab === 'chat') {
      // Find the last user message
      const lastUserIndex = conversation.findLastIndex(msg => msg.role === 'user');
      if (lastUserIndex !== -1) {
        messagesToRender.push(conversation[lastUserIndex]);
        // Get the corresponding assistant message if it exists
        if (lastUserIndex + 1 < conversation.length && conversation[lastUserIndex + 1].role === 'assistant') {
          messagesToRender.push(conversation[lastUserIndex + 1]);
        }
      }
    } else {
      messagesToRender = conversation;
    }

    console.log('Messages to render:', messagesToRender);

    return (
      <div className="space-y-4">
        {messagesToRender.map((message) => (
          <BoxReveal key={`${message.role}-${message.id}-${message.timestamp}`} width="100%" boxColor="#eca72c" duration={0.5}>
            <div className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white/70 dark:bg-gray-600'}`}>
              <p className="font-bold">{message.role === 'user' ? 'You:' : 'TradeGuru:'}</p>
              <p className="text-xs text-gray-500 mb-2">{message.timestamp}</p>
              <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                {message.content}
              </ReactMarkdown>
              {message.role === 'assistant' && !message.isComplete && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <ContinueButton
                      onClick={() => handleContinueGeneration(message)}
                      isLoading={isContinuing}
                      progress={continuationProgress}
                      text={showFollowUpInput === message.id && followUpInput.trim() ? "Follow Up" : "Continue Generating"}
                    />
                    <ShimmerButton
                      onClick={() => setShowFollowUpInput(message.id!)}
                      shimmerColor="#eca72c"
                      background="#ee5622"
                      className="px-4 py-2"
                    >
                      Ask Follow-up
                    </ShimmerButton>
                  </div>
                  {showFollowUpInput === message.id && (
                    <FollowUpInput
                      messageId={message.id!}
                      onSubmit={(input) => handleFollowUp(message.id!, input)}
                      onCancel={() => setShowFollowUpInput(null)}
                    />
                  )}
                </div>
              )}
              {message.role === 'assistant' && (
                <>
                  <div className="mt-4">
                    <ExpandableCardDemo figures={extractFigureReferences(message.content)} />
                  </div>
                  
                  {/* Add Referenced Clauses Section - Same style as history tab */}
                  {(() => {
                    const referencedClauses = extractClauseReferences(message.content);
                    return referencedClauses.length > 0 && (
                      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h4 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
                          Referenced Clauses
                        </h4>
                        <div className="space-y-4">
                          {referencedClauses.map((clause) => {
                            const [standard, number] = clause.id.split(':');
                            const fullClause = standard === 'WA' ? 
                              findClauseById(number) : 
                              findAusnzClauseByIdSync(number);
                              
                            return (
                              <BoxReveal
                                key={clause.id}
                                width="100%"
                                boxColor="#eca72c"
                                duration={0.5}
                              >
                                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    {clause.name}
                                  </h5>
                                  {fullClause && (
                                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                                      {fullClause.fullText}
                                    </p>
                                  )}
                                </div>
                              </BoxReveal>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-4 flex items-center justify-center space-x-4">
                    <Button
                      onClick={() => handleRating(message.id!, 'up')}
                      className={cn("p-2", ratings[message.id!] === 'up' ? "bg-green-400" : "bg-gray-200")}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRating(message.id!, 'neutral')}
                      className={cn("p-2", ratings[message.id!] === 'neutral' ? "bg-yellow-500" : "bg-gray-200")}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRating(message.id!, 'down')}
                      className={cn("p-2", ratings[message.id!] === 'down' ? "bg-red-500" : "bg-gray-200")}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center justify-center">
                    <ShimmerButton
                      onClick={() => setShowFollowUpInput(message.id!)}
                      shimmerColor="#eca72c"
                      background="#ee5622"
                      className="px-4 py-2"
                    >
                      Ask Follow-up
                    </ShimmerButton>
                  </div>
                  
                  {showFollowUpInput === message.id && (
                    <FollowUpInput
                      messageId={message.id!}
                      onSubmit={(input) => handleFollowUp(message.id!, input)}
                      onCancel={() => setShowFollowUpInput(null)}
                    />
                  )}

                  {feedbackMessage && (
                    <div className="mt-2 text-center text-sm text-gray-500">
                      {feedbackMessage}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                  
                  </div>

                  <Dialog open={showClauseTree} onOpenChange={setShowClauseTree}>
                    <DialogContent 
                      className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 p-6"
                      aria-describedby="clause-dialog-description"
                    >
                      <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <DialogTitle className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            <SparklesText
                              text={selectedClause ? `${selectedClause.standard} Clause ${selectedClause.id.split(':')[1]}` : "Referenced Clauses"}
                              colors={{ first: "#ee5622", second: "#eca72c" }}
                              className="text-2xl font-bold"
                              sparklesCount={3}
                            />
                          </div>
                          {selectedClause && (
                            <Button
                              onClick={() => setSelectedClause(null)}
                              className="flex items-center gap-2 text-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                            >
                              <FileTextIcon className="w-4 h-4" />
                              Back to Clauses
                            </Button>
                          )}
                        </DialogTitle>
                        <DialogDescription id="clause-dialog-description" className="sr-only">
                          View and navigate through referenced clauses from the Standards
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-6">
                        {referencedClauses.length > 0 ? (
                          <div className="space-y-6">
                            {referencedClauses.map((clause) => {
                              const [standard, number] = clause.id.split(':');
                              const fullClause = standard === 'WA' ? 
                                findClauseById(number) : 
                                findAusnzClauseByIdSync(number);
                                
                              return (
                                <BoxReveal
                                  key={clause.id}
                                  width="100%"
                                  boxColor="#eca72c"
                                  duration={0.5}
                                >
                                  <div
                                    className={cn(
                                      "p-6 rounded-lg border border-gray-200 dark:border-gray-700",
                                      "hover:border-orange-500 dark:hover:border-amber-500 transition-all",
                                      "bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm",
                                      "shadow-lg hover:shadow-orange-500/20",
                                      selectedClause?.id === clause.id ? "border-orange-500 dark:border-amber-500" : ""
                                    )}
                                    onClick={() => handleClauseSelect(clause.id)}
                                  >
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                      {clause.name}
                                    </h3>
                                    
                                    <AnimatePresence>
                                      {selectedClause?.id === clause.id && fullClause && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-4"
                                        >
                                          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm">
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                              {fullClause.fullText}
                                            </p>
                                            
                                            {fullClause.requirements && fullClause.requirements.length > 0 && (
                                              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <h4 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
                                                  Requirements
                                                </h4>
                                                <ul className="space-y-2 list-disc ml-6 text-gray-600 dark:text-gray-400">
                                                  {fullClause.requirements.map((req, index) => (
                                                    <li key={index} className="leading-relaxed">{req}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            
                                            {fullClause.references && Object.keys(fullClause.references).length > 0 && (
                                              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <h4 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
                                                  References
                                                </h4>
                                                <div className="space-y-4">
                                                  {Object.entries(fullClause.references).map(([key, value]) => (
                                                    <div key={key} className="text-gray-600 dark:text-gray-400">
                                                      <span className="font-medium text-gray-800 dark:text-gray-200">
                                                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                                                      </span>
                                                      <ul className="list-disc ml-6 mt-1 space-y-1">
                                                        {Array.isArray(value) ? (
                                                          value.map((item, index) => (
                                                            <li key={index} className="leading-relaxed">{item}</li>
                                                          ))
                                                        ) : (
                                                          <li className="leading-relaxed">{String(value)}</li>
                                                        )}
                                                      </ul>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </BoxReveal>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">
                              No specific clauses referenced in this response.
                            </p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </BoxReveal>
        ))}
        {isNewRequestPending && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
            Generating response...
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (currentMessage?.content) {
      const figures = extractFigureReferences(currentMessage.content);
      const clauses = extractClauseReferences(currentMessage.content);
      
      if (figures.length > 0) {
        setReferencedFigures(figures);
      }
      
      if (clauses.length > 0) {
        setReferencedClauses(clauses);
      }
    }
  }, [currentMessage]);

  useEffect(() => {
    console.log('Loaded clauses data:', waClauses);
    const treeData = convertClausesToTreeView(waClauses);
    setClausesTree(treeData);
  }, []);

  if (!user) {
    return <AuthUI />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg relative flex flex-col md:flex-row">
      <ChatSidebar 
        open={sidebarOpen} 
        setOpen={setSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
      >
        <ChatSidebarBody className="justify-between gap-10 bg-gray-200 dark:bg-gray-700">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mt-8 flex flex-col gap-2">
              {tabs.map((tab, idx) => (
                <ChatSidebarTab 
                  key={idx} 
                  tab={tab}
                />
              ))}
            </div>
          </div>
        </ChatSidebarBody>
      </ChatSidebar>

      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && (
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 shadow-md sticky-header z-[50]">
            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-1 mb-4">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Chat
              </span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <SparklesText
                  text="TradeGuru"
                  colors={{ first: "#ee5622", second: "#eca72c" }}
                  className="inline-block"
                  sparklesCount={3}
                />
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 md:space-x-4">
                <div className="w-full md:flex-grow">
                  <Input
                    type="text"
                    placeholder="Type your question here..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <ShimmerButton
                    type="submit"
                    disabled={isLoading}
                    shimmerColor="#eca72c"
                    background="#ee5622"
                    className="flex items-center justify-center px-4 py-2"
                  >
                    {isLoading ? 'Thinking...' : 'Send'}
                  </ShimmerButton>
                  {isLoading && (
                    <div className="relative">
                      <AnimatedCircularProgressBar
                        max={100}
                        min={0}
                        value={progressValue}
                        gaugePrimaryColor="#ee5622"
                        gaugeSecondaryColor="rgba(238, 86, 34, 0.2)"
                        className="w-10 h-10"
                      />
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold">
                        {progressValue}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-140px)]" ref={chatContainerRef}>
          <div className="flex flex-col gap-6">
            {activeTab === 'chat' && (
              <div className="w-full space-y-6">
                <div className="hidden md:flex md:space-x-6">
                  <div className="w-1/4 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
                      <AnimatedListDemo className="h-40" />
                    </div>
                  </div>
                  <div className="w-3/4">
                    {renderChatMessages()}
                  </div>
                </div>

                <div className="md:hidden">
                  {renderChatMessages()}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SparklesText
                    text="Conversation History"
                    colors={{ first: "#ee5622", second: "#eca72c" }}
                    className="text-lg font-semibold"
                    sparklesCount={3}
                  />
                </div>
                <Input
                  type="text"
                  placeholder="Search what you've spoken about before..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 mb-4"
                />
                <ShimmerButton
                  onClick={clearConversation}
                  shimmerColor="#eca72c"
                  background="#ee5622"
                  className="px-4 py-2"
                >
                  Clear Conversation History
                </ShimmerButton>
                {filteredConversation.length > 0 ? (
                  <Timeline data={filteredTimelineData} lineColor="#ee5622" />
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No conversation history found for the keyword.</p>
                )}
                <AnimatePresence>
                  {expandedAnswerIndex !== null && (
                    <ExpandableAnswer 
                      answerIndex={expandedAnswerIndex}
                      onClose={() => setExpandedAnswerIndex(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className="space-y-4">
                <MaximumDemandCalculator />
                {/* You can add more calculators here */}
              </div>
            )}

            {activeTab === 'clauses' && (
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between mb-4">
                  <SparklesText
                    text="Search Clauses"
                    colors={{ first: "#ee5622", second: "#eca72c" }}
                    className="text-lg font-semibold"
                    sparklesCount={3}
                  />
                </div>
                <div className="h-[calc(100vh-200px)] overflow-y-auto rounded-lg bg-white/50 dark:bg-gray-800/50 p-4">
                  <ClauseSearch />
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
