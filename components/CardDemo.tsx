"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from '../contexts/UserContext';
import { useConversation, useMessageSubmission } from '../hooks/conversation';
import { MessageDisplay } from './card-components/MessageDisplay';
import { MessageInput } from './card-components/MessageInput';
import { ExpandableAnswer } from './card-components/ExpandableAnswer';
import { FollowUpInput } from './card-components/FollowUpInput';
import { LoadingPhraseAnimation } from './card-components/LoadingPhraseAnimation';
import { Message, Figure } from '../types/chat';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from './ui/input';
import AuthUI from './AuthUI';
import { ClauseTreeViewElement } from '../types/clauses';
import { ThumbsUp, ThumbsDown, MessageSquare, History, Calculator, Book } from 'lucide-react';
import { Timeline } from "./ui/timeline";
import type { TimelineEntry } from "../types/timeline";
import { ClauseSearch } from "./ui/clause-search";
import { Tree, File, Folder, type TreeViewElement as FileTreeElement } from './ui/file-tree';
import ReactMarkdown from 'react-markdown';
import { ChatSidebar, ChatSidebarBody, ChatSidebarTab } from "./ui/chatsidebar";
import MaximumDemandCalculator from "./MaximumDemandCalculator";
import ShimmerButton from "./magicui/shimmer-button";
import AnimatedCircularProgressBar from "./magicui/animated-circular-progress-bar";
import ShinyButton from "./magicui/shiny-button";
import AnimatedListDemo from "./example/animated-list-demo";
import SparklesText from "./magicui/sparkles-text";
import { MultiStandardFigureDisplay } from './MultiStandardFigureDisplay';
import { ClauseDisplay } from './ClauseDisplay';
import { formatDateForDisplay } from '../utils/date-formatter';
import { extractFiguresFromAllStandards, extractClauseReferences } from '../utils/figure-references';
import { useExpandableMessage } from './ExpandableMessageProvider';
import { 
  ClauseContent, 
  StandardReference, 
  ClauseReference as TypedClauseReference 
} from '../types/references';
import { BoxReveal } from "./magicui/box-reveal";
import { DotPattern } from "./magicui/dot-pattern";
import { extractStandardInfo } from '../utils/card-utils/clause-helpers';
import { verifyDatabaseSchema } from '../utils/card-utils/database-helpers';
import { supabase } from '../lib/supabase';
import { RatingButton } from './ui/RatingButton';
import { processMessageForMarkdown } from '../utils/markdown-processor';
import { MathEquation } from './MathEquation';
import Marquee from './magicui/marquee';
import { Button } from './ui/button';
import { ConversationTracingBeam } from './ui/conversation-tracing-beam';
import { ExpandableClauseCard } from './ui/expandable-clause-card';
import { ExpandableFigureCard } from "./ui/expandable-figure-card";
import { BentoCard, BentoGrid } from "./magicui/bento-grid";
import { AnimatedList } from "@/components/magicui/animated-list";
import { cn } from "@/lib/utils";
import { 
  Bell,
  FileText as FileTextIcon, 
  Image as ImageIcon,
  Book as BookIcon,
  Table as TableIcon,
  Star as StarIcon,
  AlertTriangle as AlertIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

interface ClauseSection {
  id: string;
  title: string;
  fullText?: string;
  subsections?: Record<string, ClauseSection>;
  references?: {
    documents: string[];
    sections: string[];
    crossStandards: StandardReference[];
  };
  requirements?: string[];
  standard?: StandardReference;
}

interface SearchResult {
  id: string;
  content: string;
  relevance: number;
  title?: string;
  source?: string;
}

interface CardDemoProps {
  initialMessages?: Message[];
}

interface ConversationThread {
  rootMessage: Message;
  assistantResponse: Message | undefined;
  followUps: FollowUpPair[];
}

interface FollowUpPair {
  question: Message;
  answer: Message;
}

export function CardDemo({ initialMessages = [] }: CardDemoProps) {
  // State management
  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'calculator' | 'clauses'>('chat');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState<number | null>(null);
  const [showFollowUpInput, setShowFollowUpInput] = useState<string | null>(null);
  const [showClauseTree, setShowClauseTree] = useState(false);
  const [selectedClause, setSelectedClause] = useState<TypedClauseReference | null>(null);
  const [loadedClauses, setLoadedClauses] = useState<Record<string, ClauseSection>>({});
  const [clausesTree, setClausesTree] = useState<ClauseTreeViewElement[]>([]);
  const [progressValue, setProgressValue] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<'list' | 'detail'>('list');
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [clauseExpanded, setClauseExpanded] = useState(false);
  const [activeClauseFigures, setActiveClauseFigures] = useState<Figure[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<{
    question: Message;
    answer: Message | undefined;
    followUps: Array<{
      question: string;
      answer: string;
      figures?: Figure[];
      referencedClauses?: ClauseTreeViewElement[];
    }>;
    referencedClauses?: ClauseTreeViewElement[];
  } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [expandedFigure, setExpandedFigure] = useState<Figure | null>(null);
  const [showClauseFileTree, setShowClauseFileTree] = useState(false);
  const [showFigureFileTree, setShowFigureFileTree] = useState(false);
  const [allConversationFigures, setAllConversationFigures] = useState<Figure[]>([]);
  
  // Loading phrases that will cycle while generating a response
  const loadingPhrases = [
    "Processing your request...",
    "Consulting electrical standards...",
    "Analyzing safety regulations...",
    "Checking code requirements...",
    "Processing your technical query...",
    "Examining electrical code details...",
    "Reviewing technical documentation...",
    "Finding relevant information...",
    "Connecting technical concepts...",
    "Compiling comprehensive answer...",
    "Calculating voltage parameters...",
    "Verifying code compliance...",
    "Checking AS/NZS 3000 requirements...",
    "Reviewing wiring regulations...",
    "Analyzing circuit specifications...",
    "Consulting industry standards...",
    "Checking installation guidelines...",
    "Reviewing safety protocols...",
    "Calculating maximum demand values...",
    "Examining protection requirements...",
    "Checking earthing specifications...",
    "Analyzing cable requirements...",
    "Reviewing switchboard standards...",
    "Checking RCD specifications...",
    "Powering up knowledge circuits..."
  ];
  
  // Hooks
  const { user } = useUser();
  const { showExpandedMessage } = useExpandableMessage();
  
  const {
    conversation,
    setConversation,
    isLoading: conversationLoading,
    error: conversationError,
    clearConversation,
    handleRating,
    ratings,
    fetchLatestConversation
  } = useConversation();
  
  const {
    isLoading,
    error: submitError,
    handleSubmit,
    handleContinueGeneration,
    handleFollowUp,
    isNewRequestPending
  } = useMessageSubmission({
    onConversationUpdate: setConversation,
    conversation,
    setInputValue
  });

  // Clear states for expanded clauses when changing to list view
  useEffect(() => {
    if (historyView === 'list') {
      setSelectedClauseId(null);
      setClauseExpanded(false);
    }
  }, [historyView]);

  // Verify database schema when component mounts
  useEffect(() => {
    if (user) {
      // Verify the database schema to help with debugging
      verifyDatabaseSchema(supabase)
        .then(isValid => {
          if (isValid) {
            console.log('✅ Database schema verification completed');
          } else {
            console.warn('⚠️ Database schema verification failed - check console for details');
          }
        })
        .catch(error => {
          console.error('❌ Error during database schema verification:', error);
        });
    }
  }, [user]);
  
  // Progress bar effect
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
  
  // Set initial messages if provided
  useEffect(() => {
    if (initialMessages.length > 0 && conversation.length === 0) {
      setConversation(initialMessages);
    }
  }, [initialMessages, conversation.length, setConversation]);

  // Initialize figures from any available clauses and conversation
  useEffect(() => {
    if (conversation.length > 0 || selectedConversation) {
      // Extract figures specifically mentioned in conversations
      const conversationContent = conversation
        .map((msg: Message) => msg.content || '')
        .join(' ');
      
      // Look for common figure references
      const commonFigureIds = ['4.18', '4.20']; // Figures 4.18 and 4.20 are very common
      const commonFigures: Figure[] = [];
      
      // Check if any key figures are mentioned in the conversation
      for (const figId of commonFigureIds) {
        if (conversationContent.includes(`Figure ${figId}`) || 
            conversationContent.includes(`ASNZS3000 Figure ${figId}`)) {
          commonFigures.push({
            name: `Figure ${figId}`,
            title: figId === '4.18' ? 'Hazardous area surrounding gas cylinder' :
                   figId === '4.20' ? 'Hazardous area surrounding gas regulator' : 
                   `Figure ${figId}`,
            image: `/All Tables & Figures/AN3000_Figure_${figId.replace('.', '_')}.png`,
            quote: figId === '4.18' ? 'Hazardous area/exclusion zone surrounding heavier-than-air gas cylinder' :
                   figId === '4.20' ? 'Hazardous area/exclusion zone surrounding a reticulated (natural) gas system regulator' :
                   `Figure ${figId} from AS/NZS 3000`,
            standardDoc: '3000'
          });
        }
      }
      
      // If we have detected common figures, add them to activeClauseFigures
      if (commonFigures.length > 0) {
        setActiveClauseFigures(prev => {
          const newFigures = [...prev];
          for (const fig of commonFigures) {
            if (!newFigures.some(f => f.name === fig.name)) {
              newFigures.push(fig);
            }
          }
          return newFigures;
        });
      }
    }
  }, [conversation, selectedConversation]);

  // Effect to update conversation figures when selectedConversation changes
  useEffect(() => {
    if (!selectedConversation) {
      setAllConversationFigures([]);
      return;
    }

    const { answer, followUps, referencedClauses } = selectedConversation;
    const figureMap = new Map<string, Figure>();
    let allClauseText = '';

    // First, collect all figures from the main conversation
    const mainFigures = answer?.content ? extractFiguresFromAllStandards(answer.content) : [];

    // Then collect figures from follow-ups
    const followUpFigures = followUps.flatMap(followUp => 
      followUp.figures || extractFiguresFromAllStandards(followUp.answer)
    );

    // Collect figures from referenced clauses
    if (referencedClauses) {
      referencedClauses.forEach(clause => {
        if (clause.id) {
          const clauseFigures = extractFiguresFromAllStandards(allClauseText);
          clauseFigures.forEach(figure => {
            const key = `${figure.standardDoc || '3000'}_${figure.name}`;
            if (!figureMap.has(key)) {
              figureMap.set(key, figure);
            }
          });
        }
      });
    }

    // Combine all figures, removing duplicates using a Map
    const figureEntries = [
      ...mainFigures.map(fig => [`${fig.standardDoc || '3000'}_${fig.name}`, fig] as [string, Figure]),
      ...followUpFigures.map(fig => [`${fig.standardDoc || '3000'}_${fig.name}`, fig] as [string, Figure]),
      ...Array.from(figureMap.entries())
    ];
    const uniqueFigures = Array.from(new Map(figureEntries).values());

    setAllConversationFigures(uniqueFigures);
  }, [selectedConversation]);

  // Handle form submission
  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(inputValue);
  };
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab.toLowerCase() as 'chat' | 'history' | 'calculator' | 'clauses');
    setSidebarOpen(false);
  };

  // Filter conversation based on search keyword
  const filteredConversation = conversation.filter(message =>
    message && message.content && 
    typeof message.content === 'string' && 
    message.content.toLowerCase().includes((searchKeyword || '').toLowerCase())
  );

  // Create timeline data for history view
  const filteredTimelineData: TimelineEntry[] = conversation
    .filter(message => 
      message && message.role === 'user' && !message.related_question_id &&
      message.content && typeof message.content === 'string' &&
      message.content.toLowerCase().includes((searchKeyword || '').toLowerCase())
    )
    .map((message) => {
      // Find the initial answer
      const initialAnswer = conversation.find(msg => 
        msg.role === 'assistant' && 
        msg.related_question_id === message.id
      );

      // Find all follow-up questions and their answers
      const followUps = initialAnswer ? conversation.reduce((acc: Array<{
        question: string,
        answer: string,
        figures?: Figure[],
        referencedClauses?: ClauseTreeViewElement[]
      }>, msg) => {
        if (msg.role === 'user' && msg.related_question_id === message.id && msg.isFollowUp) {
          const followUpAnswer = conversation.find(ans => 
            ans.role === 'assistant' && 
            ans.related_question_id === msg.id
          );
          if (followUpAnswer) {
            acc.push({
              question: msg.content,
              answer: followUpAnswer.content,
              figures: extractFiguresFromAllStandards(followUpAnswer.content),
              referencedClauses: extractClauseReferences(followUpAnswer.content)
            });
          }
        }
        return acc;
      }, []) : [];

      return {
        title: message.timestamp || '',
        content: (
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-grow relative min-h-[100px]">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xl font-bold">User Question</p>
              <span className="text-xs text-gray-500">{message.timestamp}</span>
            </div>
            <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none pr-24">
              {message.content}
            </ReactMarkdown>
            <div className="mt-3">
              <ShinyButton
                text="View Answer"
                className="text-xs"
                onClick={() => {
                  if (initialAnswer) {
                    // Extract clauses if they don't exist
                    const answerClauses = initialAnswer.referencedClauses || 
                      extractClauseReferences(initialAnswer.content);
                    
                    // Switch to detail view
                    setSelectedConversation({
                      question: message,
                      answer: initialAnswer,
                      followUps: followUps,
                      referencedClauses: answerClauses
                    });
                    setHistoryView('detail');
                  }
                }}
                shimmerColor="#eca72c"
                background="#ee5622"
              />
            </div>
          </div>
        ),
        onDotClick: () => {
          if (initialAnswer) {
            // Extract clauses if they don't exist
            const answerClauses = initialAnswer.referencedClauses || 
              extractClauseReferences(initialAnswer.content);
            
            // Switch to detail view
            setSelectedConversation({
              question: message,
              answer: initialAnswer,
              followUps: followUps,
              referencedClauses: answerClauses
            });
            setHistoryView('detail');
          }
        },
        isTimelineView: true
      };
    })
    .reverse();

  // Sidebar tabs
  const tabs = [
    {
      label: "Chat",
      icon: <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "History",
      icon: <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Calculators",
      icon: <Calculator className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Clauses",
      icon: <Book className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    }
  ];

  const renderChatMessages = () => {
    if (activeTab !== 'chat' || conversation.length === 0) {
      return null;
    }
    
    // Group messages into conversation threads
    const conversationThreads: ConversationThread[] = [];
    
    // First, get all root messages (regular user questions that aren't follow-ups)
    const rootMessages = conversation.filter(msg => 
      msg.role === 'user' && !msg.related_question_id && !msg.isFollowUp
    );
    
    // If no user messages yet, show empty state
    if (rootMessages.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          No conversation yet. Type a question to get started.
        </div>
      );
    }

    // Map each message to its parent question
    const messageMap = new Map<string, Message[]>();
    
    // Map each message to its parent question
    conversation.forEach(msg => {
      if (msg.related_question_id) {
        const list = messageMap.get(msg.related_question_id) || [];
        list.push(msg);
        messageMap.set(msg.related_question_id, list);
      }
    });
    
    // Process each root message to build a thread
    rootMessages.forEach(rootMessage => {
      // Find the initial assistant response for this root question
      const responses = messageMap.get(rootMessage.id || '') || [];
      const assistantResponse = responses.find(msg => 
        msg.role === 'assistant' && !msg.isFollowUp
      );
      
      // Find all direct follow-up questions for this root question
      const followUps: FollowUpPair[] = [];
      
      // Get all user follow-up questions that have this root message as their related_question_id
      const followUpQuestions = conversation.filter(msg => 
        msg.role === 'user' && 
        msg.related_question_id === rootMessage.id && 
        msg.isFollowUp === true && 
        msg.id !== rootMessage.id
      );
      
      // For each follow-up question, find its corresponding answer
      followUpQuestions.forEach(followUpQuestion => {
        const followUpAnswers = messageMap.get(followUpQuestion.id || '') || [];
        const followUpAnswer = followUpAnswers.find(msg => msg.role === 'assistant');
        
        if (followUpAnswer) {
          followUps.push({
            question: followUpQuestion,
            answer: followUpAnswer
          });
        }
      });
      
      // Add this thread to our collection
      conversationThreads.push({
        rootMessage,
        assistantResponse,
        followUps
      });
    });

    // Only display the most recent thread in the chat view
    const latestThread = conversationThreads[conversationThreads.length - 1];
    
    // Display only the latest thread
    return (
      <div className="space-y-4">
        <BoxReveal 
          key={latestThread.rootMessage.id || 'latest-thread'} 
          width="100%" 
          boxColor="#eca72c" 
          duration={0.5}
        >
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xl font-bold">User Question</p>
              <span className="text-xs text-gray-500">{latestThread.rootMessage.timestamp}</span>
            </div>
            <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
              {latestThread.rootMessage.content}
            </ReactMarkdown>
            
            {/* Show loading indicator if we're waiting for a response */}
            {isNewRequestPending && !latestThread.assistantResponse && (
              <div className="mt-4 p-4 bg-white/70 dark:bg-gray-600 rounded-lg flex items-center">
                <LoadingPhraseAnimation 
                  phrases={loadingPhrases}
                  isLoading={true}
                  className="ml-2"
                  iconColor="#ee5622"
                />
              </div>
            )}
            
            {/* Render the assistant response if available */}
            {latestThread.assistantResponse && (
              <div className="mt-4 bg-white/70 dark:bg-gray-600 p-4 rounded-lg">
                <p className="text-xl font-bold mb-2">TradeGuru</p>
                <div className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                  {renderMessageWithMath(processMessageForMarkdown(latestThread.assistantResponse.content))}
                </div>
                
                {/* Clauses - Show them first as they're now more important than figures */}
                {latestThread.assistantResponse?.referencedClauses && 
                 latestThread.assistantResponse.referencedClauses.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-lg font-semibold mb-3">Referenced Clauses</h4>
                    <div className="space-y-4">
                      {latestThread.assistantResponse.referencedClauses.map((clause: ClauseTreeViewElement, index: number) => {
                        // Extract standardId and cleanedClauseId
                        const standardId = clause.standardDoc || extractStandardInfo(clause.id).standardId;
                        const cleanedClauseId = clause.id.replace(/^[A-Z]+:/, '');
                        
                        // Add debug logging for 3019 clauses
                        if (standardId === '3019' || cleanedClauseId.startsWith('6.3.')) {
                          console.log(`Selected 3019 clause from tree: ${cleanedClauseId}`);
                        }
                        
                        // Skip any clauses that don't have valid IDs (should be rare)
                        if (!cleanedClauseId.match(/^\d+(\.\d+)*$/)) {
                          return null;
                        }
                        
                        return (
                          <ClauseDisplay
                            key={`${clause.id}-${index}`}
                            standardId={standardId}
                            clauseId={cleanedClauseId}
                            onError={(error) => {
                              if (standardId === '3019') {
                                console.error(`Error loading 3019 clause ${cleanedClauseId}:`, error);
                              }
                            }}
                            className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                )}
                
                {/* Rating buttons */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => handleRating(latestThread.assistantResponse?.id || '', 'up')}
                    className={`flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 ${
                      latestThread.assistantResponse?.good_response ? 'border-2 border-green-500' : ''
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Helpful
                  </button>
                  <button
                    onClick={() => handleRating(latestThread.assistantResponse?.id || '', 'down')}
                    className={`flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 ${
                      latestThread.assistantResponse?.bad_response ? 'border-2 border-red-500' : ''
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    Not Helpful
                  </button>
                  {latestThread.assistantResponse?.id && (
                    <RatingButton conversationId={latestThread.assistantResponse.id} />
                  )}
                </div>
              </div>
            )}
          </div>
        </BoxReveal>
      </div>
    );
  };

  // Function to render the conversation detail view with vertical marquee
  const renderConversationDetail = () => {
    if (!selectedConversation) return null;
    
    const { question, answer, followUps, referencedClauses } = selectedConversation;
    
    // Create timeline data for the selected conversation
    const conversationItems = [
      {
        title: question.timestamp || 'Question',
        content: (
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-grow relative">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xl font-bold">User Question</p>
              <span className="text-xs text-gray-500">{question.timestamp}</span>
            </div>
            <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
              {question.content}
            </ReactMarkdown>
          </div>
        )
      },
      answer ? {
        title: answer.timestamp || 'Answer',
        content: (
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xl font-bold">Answer</p>
              <span className="text-xs text-gray-500">{answer.timestamp}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {renderMessageWithMath(processMessageForMarkdown(answer.content))}
            </div>
          </div>
        )
      } : {
        title: 'No Answer',
        content: <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">No answer available</div>
      }
    ];
    
    // Add follow-up questions and answers to the timeline
    followUps.forEach((followUp, index) => {
      conversationItems.push({
        title: `Follow-up ${index + 1}`,
        content: (
          <div className="space-y-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium">Follow-up Question</p>
              </div>
              <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                {followUp.question}
              </ReactMarkdown>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="prose dark:prose-invert max-w-none">
                {renderMessageWithMath(processMessageForMarkdown(followUp.answer))}
              </div>
            </div>
          </div>
        )
      });
    });
    
    // Function to handle going back to history view
    const handleBackToHistory = () => {
      setHistoryView('list');
      setSelectedConversation(null);
      setSelectedClauseId(null);
      setClauseExpanded(false);
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SparklesText
            text="Conversation"
            colors={{ first: "#ee5622", second: "#eca72c" }}
            className="text-lg font-semibold"
            sparklesCount={3}
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left/Middle column: Conversation content - replacing the tracing beam with direct content */}
          <div className="w-full md:w-2/3 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Conversation Content</h2>
            <div className="space-y-10">
              {conversationItems.map((item, index) => (
                <div key={`content-${index}`} className="space-y-2">
                  <BoxReveal 
                    width="100%" 
                    boxColor="#ee5622" 
                    duration={0.5 + index * 0.1}
                  >
                    <div>
                      <div className="mb-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                        {item.title}
                      </div>
                      {item.content}
                    </div>
                  </BoxReveal>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right column: Bento grid for clauses and figures */}
          <div className="w-full md:w-1/3">
            <div className="space-y-8 sticky top-4 pt-2 pb-16">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Access</h2>
              
              {/* Unified Bento grid for clauses and figures */}
              <BentoGrid className="grid-cols-1 gap-4">
                {/* Main Clause Card - make it a big square taking full width */}
                {referencedClauses && referencedClauses.length > 0 && (
                  <BentoCard
                    name=""
                    Icon={FileTextIcon}
                    description=""
                    href="javascript:void(0)"
                    cta="View All"
                    className="col-span-1 aspect-square"
                    background={
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-14 right-4 h-[calc(100%-20px)] w-full overflow-y-auto px-8">
                          {!showClauseFileTree ? (
                            <AnimatedList className="space-y-2 w-full" delay={2000}>
                              {referencedClauses.map((clause, index) => (
                                <div 
                                  key={`clause-${clause.id}`}
                                  onClick={() => {
                                    const standardId = clause.standardDoc || extractStandardInfo(clause.id).standardId;
                                    const cleanedClauseId = clause.id.replace('AUSNZ:', '');
                                    
                                    // Add debug logging for 3019 clauses
                                    if (standardId === '3019' || cleanedClauseId.startsWith('6.3.')) {
                                      console.log(`Selected 3019 clause from tree: ${cleanedClauseId}`);
                                    }
                                    
                                    showExpandedMessage({
                                      initialQuestion: "",
                                      initialAnswer: "",
                                      referencedClauses: [clause],
                                      followUps: []
                                    });

                                    // Also extract any figures from the clause to display in the figures section,
                                    // but don't make that the primary focus
                                    import('../utils/figure-references').then(({ extractFiguresFromAllStandards }) => {
                                      // Extract any figures in the clause to show in the figures bento grid
                                      let clauseFigures: Figure[] = [];
                                      
                                      // Specific common figures for certain clauses
                                      if (cleanedClauseId === '2.10.2.5') {
                                        clauseFigures = [
                                          {
                                            name: 'Figure 4.18',
                                            title: 'Hazardous area surrounding gas cylinder',
                                            image: '/All Tables & Figures/AN3000_Figure_4_18.png',
                                            quote: 'Hazardous area/exclusion zone surrounding heavier-than-air gas cylinder',
                                            standardDoc: '3000'
                                          },
                                          {
                                            name: 'Figure 4.20',
                                            title: 'Hazardous area surrounding gas regulator',
                                            image: '/All Tables & Figures/AN3000_Figure_4_20.png',
                                            quote: 'Hazardous area/exclusion zone surrounding a reticulated (natural) gas system regulator',
                                            standardDoc: '3000'
                                          }
                                        ];
                                      } else if (cleanedClauseId.startsWith('2.10')) {
                                        clauseFigures = [
                                          {
                                            name: 'Figure 4.18',
                                            title: 'Hazardous area surrounding gas cylinder',
                                            image: '/All Tables & Figures/AN3000_Figure_4_18.png',
                                            quote: 'Hazardous area/exclusion zone surrounding heavier-than-air gas cylinder',
                                            standardDoc: '3000'
                                          }
                                        ];
                                      } else {
                                        // For other clauses, try to extract figures from context
                                        const clausePattern = new RegExp(`(?:clause|section)\\s+${cleanedClauseId}\\s+(?:.+?)(?:figure|table)\\s+(\\d+\\.\\d+)`, 'gi');
                                        let match;
                                        const allClauseText = conversation
                                          .map((msg: Message) => msg.content || '')
                                          .join(' ');
                                        
                                        // Extract any figures mentioned with this clause
                                        while ((match = clausePattern.exec(allClauseText)) !== null) {
                                          const figureRef = match[1];
                                          const type = match[0].toLowerCase().includes('table') ? 'Table' : 'Figure';
                                          
                                          clauseFigures.push({
                                            name: `${type} ${figureRef}`,
                                            title: `Reference to ${type} ${figureRef} from Clause ${cleanedClauseId}`,
                                            image: `/All Tables & Figures/AN${standardId}_${type}_${figureRef.replace('.', '_')}.png`,
                                            quote: `This is ${type} ${figureRef} from AS/NZS ${standardId}, referenced in Clause ${cleanedClauseId}`,
                                            standardDoc: standardId
                                          });
                                        }
                                      }
                                      
                                      // Update the figures section if we found any
                                      if (clauseFigures.length > 0) {
                                        setActiveClauseFigures(clauseFigures);
                                      }
                                    });
                                  }}
                                  className={cn(
                                    "p-3 flex justify-between items-center rounded-lg cursor-pointer transition-all duration-200",
                                    "bg-white/60 hover:bg-white dark:bg-gray-800/60 dark:hover:bg-gray-800",
                                    "border border-gray-200 dark:border-gray-700", 
                                    "backdrop-blur-md"
                                  )}
                                >
                                  <div className="flex gap-3 items-center">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                      <FileTextIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-orange-600 dark:text-orange-400">
                                          {clause.id.replace('AUSNZ:', '')}
                                        </span>
                                      </div>
                                      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                                        {clause.name || `Clause ${clause.id.replace('AUSNZ:', '')}`}
                                      </h3>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {clause.standardDoc || extractStandardInfo(clause.id).standardId}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400">
                                    <ExternalLink size={16} />
                                  </div>
                                </div>
                              ))}
                            </AnimatedList>
                          ) : (
                            <div className="h-full w-full">
                              <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium">Clauses File Tree</span>
                                <button 
                                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                                  onClick={() => setShowClauseFileTree(false)}
                                >
                                  Back to List
                                </button>
                              </div>
                              <Tree
                                className="w-full h-[calc(100%-30px)] bg-white/80 dark:bg-gray-800/80 rounded-lg p-2"
                                elements={convertClausesToTreeElements(referencedClauses)}
                                initialExpandedItems={[`standard-${referencedClauses[0]?.standardDoc || extractStandardInfo(referencedClauses[0]?.id || '').standardId}`]}
                              >
                                {/* We can specify custom rendering here if needed */}
                              </Tree>
                            </div>
                          )}
                        </div>
                      </div>
                    }
                    onClick={() => setShowClauseFileTree(true)}
                  />
                )}

                {/* No clauses or figures message */}
                {referencedClauses?.length === 0 && allConversationFigures.length === 0 && (
                  <div className="h-[300px] flex flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <AlertIcon size={40} className="text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No clauses, figures, or tables referenced</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try asking about a specific electrical standard</p>
                  </div>
                )}
              </BentoGrid>
            </div>
            
            {/* Small Back button in the bottom right corner with better spacing */}
            <div className="absolute bottom-6 right-6 z-10">
              <ShimmerButton
                onClick={handleBackToHistory}
                shimmerColor="#eca72c"
                background="#ee5622"
                className="px-3 py-1.5 text-sm flex items-center justify-center gap-1.5 shadow-md"
              >
                <History className="h-3.5 w-3.5" />
                Back
              </ShimmerButton>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handlers for file tree interactions
  const handleClauseSelect = (id: string) => {
    // Find the selected clause from the tree
    const clause = findClauseById(id, selectedConversation?.referencedClauses || []);
    if (clause) {
      // Add debug logging for 3019 clauses
      if (clause.standardDoc === '3019' || clause.id.includes('6.3.')) {
        console.log(`Selected 3019 clause from tree: ${clause.id}`);
      }
      showExpandedMessage({
        initialQuestion: "",
        initialAnswer: "",
        referencedClauses: [clause],
        followUps: []
      });
      setShowClauseFileTree(false); // Go back to card view after selection
    }
  };
  
  const handleFigureSelect = (id: string) => {
    // Extract figure ID from the tree item ID
    const match = id.match(/figure-(.+?)-(.+?)-(\d+)/);
    if (match && allConversationFigures && allConversationFigures.length > 0) {
      const index = parseInt(match[3], 10);
      if (!isNaN(index) && index < allConversationFigures.length) {
        const figure = allConversationFigures[index];
        setExpandedFigure(figure);
        setShowFigureFileTree(false); // Go back to card view after selection
      }
    }
  };
  
  // Helper to find a clause by its tree ID
  const findClauseById = (treeId: string, clauses: ClauseTreeViewElement[]): ClauseTreeViewElement | null => {
    // Check if the ID matches one of our formatted tree IDs
    const match = treeId.match(/clause-(.+?)-(.+)/);
    if (match) {
      const standardId = match[1];
      const clauseId = match[2];
      
      // Find the clause with this ID
      for (const clause of clauses) {
        const cleanedClauseId = clause.id.replace(/^[A-Z]+:/, '');
        if (cleanedClauseId === clauseId && 
            (clause.standardDoc === standardId || extractStandardInfo(clause.id).standardId === standardId)) {
          return clause;
        }
      }
    }
    return null;
  };

  // Effect to listen for tree item selections
  useEffect(() => {
    // Set up a listener for tree item selection events
    const treeListener = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        const id = customEvent.detail.id;
        
        // Check if it's a clause or figure ID
        if (id.startsWith('clause-')) {
          handleClauseSelect(id);
        } else if (id.startsWith('figure-')) {
          handleFigureSelect(id);
        }
      }
    };
    
    window.addEventListener('tree-item-selected', treeListener);
    
    return () => {
      window.removeEventListener('tree-item-selected', treeListener);
    };
  }, []);
  
  // Auth check
  if (!user) {
    return <AuthUI />;
  }

  // Main component render
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
            <form onSubmit={onFormSubmit} className="space-y-4">
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
                    Send
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
                {historyView === 'list' ? (
                  /* List view of conversation history */
                  <>
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
                      <p className="text-gray-500 dark:text-gray-400">No conversation history found for the keyword.</p>
                    )}
                  </>
                ) : (
                  /* Detail view of a specific conversation */
                  renderConversationDetail()
                )}
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className="space-y-4">
                <MaximumDemandCalculator />
                {/* Additional calculators can be added here */}
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
            
            {conversationError && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                <p>{conversationError}</p>
              </div>
            )}
            
            {submitError && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                <p>{submitError}</p>
              </div>
            )}
            
            {feedbackMessage && (
              <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg">
                {feedbackMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {expandedFigure && (
        <div className="fixed inset-0 z-[100]">
          <ExpandableFigureCard 
            figures={[expandedFigure]} 
            groupedByStandard={false}
            onClose={() => setExpandedFigure(null)}
          />
        </div>
      )}
    </div>
  );
}

// Helper function to render message content with math equation support
const renderMessageWithMath = (content: string): React.ReactNode => {
  if (!content) return null;
  
  // Regular expression to match LaTeX equations
  const equationPattern = /\\[\(\[](.+?)\\[\)\]]/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  // Make a copy of the content to work with
  let remainingContent = content;
  
  // Find all math equations in the text
  while ((match = equationPattern.exec(content)) !== null) {
    // Add the text before the equation as markdown
    if (match.index > lastIndex) {
      parts.push(
        <ReactMarkdown key={`text-${lastIndex}`} className="inline">
          {content.substring(lastIndex, match.index)}
        </ReactMarkdown>
      );
    }
    
    // Add the equation
    const equationText = match[0];
    const displayMode = equationText.startsWith('\\[') && equationText.endsWith('\\]');
    
    parts.push(
      <MathEquation 
        key={`eq-${match.index}`}
        latex={equationText}
        displayMode={displayMode}
      />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push(
      <ReactMarkdown key={`text-${lastIndex}`}>
        {content.substring(lastIndex)}
      </ReactMarkdown>
    );
  }
  
  // If no equations were found, just return the content as markdown
  if (parts.length === 0) {
    return <ReactMarkdown>{content}</ReactMarkdown>;
  }
  
  return <>{parts}</>;
};

// Helper function to convert clauses to tree structure
const convertClausesToTreeElements = (clauses: ClauseTreeViewElement[]): FileTreeElement[] => {
  const standardsMap: Map<string, FileTreeElement> = new Map();
  const result: FileTreeElement[] = [];
  
  // Group clauses by standard
  clauses.forEach((clause) => {
    const standardId = clause.standardDoc || extractStandardInfo(clause.id).standardId;
    const cleanedClauseId = clause.id.replace(/^[A-Z]+:/, '');
    
    // Create a unique ID for this clause in the tree
    const treeId = `clause-${standardId}-${cleanedClauseId}`;
    
    // Get or create the standard entry
    if (!standardsMap.has(standardId)) {
      standardsMap.set(standardId, {
        id: `standard-${standardId}`,
        name: `AS/NZS ${standardId} - ${getStandardTitle(standardId)}`,
        isSelectable: true,
        children: []
      });
    }
    
    // Get the parts of the clause ID (e.g., "1.2.3" -> ["1", "2", "3"])
    const parts = cleanedClauseId.split('.');
    
    // Start with the standard as the current parent
    let currentParent = standardsMap.get(standardId)!;
    let currentPath = "";
    
    // Build the tree structure based on clause numbering
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}.${part}` : part;
      
      // Make sure currentParent.children exists
      currentParent.children = currentParent.children || [];
      
      // For the last part (leaf node), add the clause as a File
      if (i === parts.length - 1) {
        currentParent.children.push({
          id: treeId,
          name: `${currentPath} - ${clause.name || 'Clause ' + currentPath}`,
          isSelectable: true,
          originalClause: clause
        } as any);
      } 
      // For intermediate parts, create or find the folder
      else {
        // Check if we already have a folder for this level
        let folderFound = false;
        for (const child of currentParent.children) {
          if (child.name.startsWith(currentPath)) {
            currentParent = child;
            currentParent.children = currentParent.children || [];
            folderFound = true;
            break;
          }
        }
        
        // If we didn't find a folder, create one
        if (!folderFound) {
          const newFolder: FileTreeElement = {
            id: `clause-part-${standardId}-${currentPath}`,
            name: `${currentPath} - Section`,
            isSelectable: true,
            children: []
          };
          
          currentParent.children.push(newFolder);
          currentParent = newFolder;
        }
      }
    }
  });
  
  // Convert the map to an array
  standardsMap.forEach((standard) => {
    result.push(standard);
  });
  
  return result;
};

// Helper function to convert figures to tree structure
const convertFiguresToTreeElements = (figures: Figure[]): FileTreeElement[] => {
  const standardsMap: Map<string, FileTreeElement> = new Map();
  const result: FileTreeElement[] = [];
  
  // Group figures by standard
  figures.forEach((figure, index) => {
    const standardId = figure.standardDoc || '3000';
    
    // Create a unique ID for this figure in the tree
    const treeId = `figure-${standardId}-${figure.name}-${index}`;
    
    // Get or create the standard entry
    if (!standardsMap.has(standardId)) {
      standardsMap.set(standardId, {
        id: `standard-fig-${standardId}`,
        name: `AS/NZS ${standardId} - ${getStandardTitle(standardId)}`,
        isSelectable: true,
        children: []
      });
    }
    
    // Check if it's a figure or table
    const isTable = figure.name.toLowerCase().includes('table');
    const figureType = isTable ? 'Table' : 'Figure';
    
    // Get or create folder for figures or tables
    const standard = standardsMap.get(standardId)!;
    if (!standard.children) standard.children = [];
    
    let typeFolder = standard.children.find(c => c.name === figureType);
    if (!typeFolder) {
      typeFolder = {
        id: `${figureType.toLowerCase()}-folder-${standardId}`,
        name: figureType,
        isSelectable: true,
        children: []
      };
      standard.children.push(typeFolder);
    }
    
    // Add the figure as a leaf node
    if (!typeFolder.children) typeFolder.children = [];
    
    typeFolder.children.push({
      id: treeId,
      name: figure.name,
      isSelectable: true,
      originalFigure: figure
    } as any);
  });
  
  // Convert the map to an array
  standardsMap.forEach((standard) => {
    result.push(standard);
  });
  
  return result;
};

// Helper function to get standard titles
const getStandardTitle = (standardId: string): string => {
  const standardTitles: Record<string, string> = {
    '3000': 'Electrical Installations',
    '3001.1': 'Electrical Installations - Transportable Structures',
    '3001.2': 'Electrical Installations - Transportable Structures',
    '3003': 'Electrical Installations - Patient Areas',
    '3008': 'Electrical Installations - Selection of Cables',
    '3017': 'Electrical Installations - Verification Guidelines',
    '3019': 'Electrical Installations - Periodic Verification',
    '2293.1': 'Emergency Lighting - System Design',
    '2293.2': 'Emergency Lighting - Maintenance',
    '4836': 'Safe Working On or Near Low-voltage Electrical Installations',
  };
  
  return standardTitles[standardId] || 'Electrical Standard';
};
