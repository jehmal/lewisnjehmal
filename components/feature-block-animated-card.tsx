"use client";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import NumberTicker from "@/components/magicui/number-ticker";
import { ThumbsUp, ThumbsDown, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpandableMessage } from '@/components/ExpandableMessageProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  context?: string;
  timestamp: string;
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

export function CardDemo() {
  const [inputValue, setInputValue] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [factCheckResults, setFactCheckResults] = useState<{[key: number]: { result: string, isCorrect: boolean } }>({});
  const [isFactChecking, setIsFactChecking] = useState<{[key: number]: boolean}>({});
  const [ratings, setRatings] = useState<{[key: number]: 'up' | 'down' | null}>({});
  const [goodAnswers, setGoodAnswers] = useState(0);
  const [badAnswers, setBadAnswers] = useState(0);
  const { showExpandedMessage } = useExpandableMessage();

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const savedConversation = localStorage.getItem('conversation');
    if (savedConversation) {
      setConversation(JSON.parse(savedConversation));
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setError(null);
    
    const userMessage: Message = { 
      role: 'user', 
      content: inputValue, 
      timestamp: formatDate(new Date())
    };
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    localStorage.setItem('conversation', JSON.stringify(updatedConversation));
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
        },
        body: JSON.stringify({ message: inputValue }),
      });

      if (!response.ok) throw new Error('Failed to get response from server');

      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response,
        context: data.context,
        timestamp: formatDate(new Date())
      };
      const newConversation = [...updatedConversation, assistantMessage];
      setConversation(newConversation);
      localStorage.setItem('conversation', JSON.stringify(newConversation));
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const clearConversation = () => {
    setConversation([]);
    localStorage.removeItem('conversation');
  };

  const handleFactCheck = async (index: number) => {
    const message = conversation[index - 1];
    const assistantResponse = conversation[index];
    
    if (message.role !== 'user' || assistantResponse.role !== 'assistant') return;

    setIsFactChecking({...isFactChecking, [index]: true});

    try {
      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message.content, 
          assistantResponse: assistantResponse.content
        }),
      });

      if (!response.ok) throw new Error('Failed to get fact-check response');

      const data = await response.json();
      setFactCheckResults({...factCheckResults, [index]: data});
    } catch (error) {
      console.error('Fact-check error:', error);
      setError('An error occurred during fact-checking.');
    } finally {
      setIsFactChecking({...isFactChecking, [index]: false});
    }
  };

  const handleRating = (index: number, rating: 'up' | 'down') => {
    setRatings(prev => {
      const newRatings = { ...prev, [index]: rating };
      const goodCount = Object.values(newRatings).filter(r => r === 'up').length;
      const badCount = Object.values(newRatings).filter(r => r === 'down').length;
      setGoodAnswers(goodCount);
      setBadAnswers(badCount);
      return newRatings;
    });
  };

  const handleExpand = (message: Message) => {
    console.log("handleExpand called with message:", message);
    showExpandedMessage(message.content);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg relative">
      {/* Remove the debug button */}
      
      <div className="absolute top-2 right-2 flex items-center space-x-4">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Response Ratings:</span>
        <div className="flex items-center">
          <ThumbsUp className="w-4 h-4 mr-1 text-green-500" />
          <NumberTicker value={goodAnswers} className="text-sm" />
        </div>
        <div className="flex items-center">
          <ThumbsDown className="w-4 h-4 mr-1 text-red-500" />
          <NumberTicker value={badAnswers} className="text-sm" />
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ask TradeGuru</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Type your question here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
            <ShimmerButton
              type="submit"
              disabled={isLoading}
              shimmerColor="#eca72c"
              background="#ee5622"
            >
              {isLoading ? 'Thinking...' : 'Send'}
            </ShimmerButton>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
            <AnimatedListDemo className="h-24" />
          </div>
        </div>
        <div className="md:w-1/2 mt-4 md:mt-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversation History</h3>
          <ShimmerButton
            onClick={clearConversation}
            shimmerColor="#eca72c"
            background="#44355B"
            className="mb-4"
          >
            Clear Conversation
          </ShimmerButton>
          <div 
            ref={chatHistoryRef}
            className="mt-4 max-h-80 overflow-y-auto space-y-4"
          >
            {conversation.map((message, index) => (
              <BoxReveal key={index} width="100%" boxColor="#eca72c" duration={0.5}>
                <div className={cn(
                  "p-3 rounded-lg relative",
                  message.role === 'user' ? "bg-gray-100 dark:bg-gray-700" : "bg-white/70 dark:bg-gray-600"
                )}>
                  <span className="absolute top-1 right-2 text-xs text-gray-500 dark:text-gray-400">
                    {message.timestamp}
                  </span>
                  <p className="font-bold mt-4">{message.role === 'user' ? 'You' : 'TradeGuru'}:</p>
                  {message.role === 'assistant' ? (
                    <>
                      <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                        {message.content}
                      </ReactMarkdown>
                      <div className="mt-2 flex items-center space-x-2 flex-wrap">
                        <Button
                          onClick={() => {
                            console.log("Expand button clicked for message:", message);
                            handleExpand(message);
                          }}
                          className="text-xs bg-gray-500 hover:bg-gray-600 mt-2"
                        >
                          <Maximize2 className="w-4 h-4 mr-1" /> Expand
                        </Button>
                        <Button
                          onClick={() => handleFactCheck(index)}
                          disabled={isFactChecking[index]}
                          className={cn(
                            "text-xs mt-2",
                            factCheckResults[index] ? (factCheckResults[index].isCorrect ? "bg-green-500" : "bg-red-500") : "bg-blue-500"
                          )}
                        >
                          {isFactChecking[index] ? 'Checking...' : (factCheckResults[index] ? 'View Fact-Check' : 'Fact Check')}
                        </Button>
                        <Button
                          onClick={() => handleRating(index, 'up')}
                          className={cn("p-2 mt-2", ratings[index] === 'up' ? "bg-green-500" : "bg-gray-200")}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRating(index, 'down')}
                          className={cn("p-2 mt-2", ratings[index] === 'down' ? "bg-red-500" : "bg-gray-200")}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                      {factCheckResults[index] && (
                        <div className={cn(
                          "mt-2 p-2 rounded",
                          factCheckResults[index].isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        )}>
                          <p className="font-bold mb-2">
                            {factCheckResults[index].isCorrect ? "Correct" : "Incorrect"}
                          </p>
                          <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                            {factCheckResults[index].result}
                          </ReactMarkdown>
                        </div>
                      )}
                    </>
                  ) : (
                    <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              </BoxReveal>
            ))}
            <div ref={conversationEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}