"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import AnimatedListDemo from "@/components/example/animated-list-demo";

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

  useEffect(() => {
    const savedConversation = localStorage.getItem('conversation');
    if (savedConversation) {
      setConversation(JSON.parse(savedConversation));
    }
  }, []);

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
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
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
            <AnimatedListDemo className="h-24" /> {/* Adjusted height */}
          </div>
        </div>
        <div className="md:w-1/2 mt-4 md:mt-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversation History</h3>
          <div className="mt-4 max-h-80 overflow-y-auto space-y-4">
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
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </BoxReveal>
            ))}
          </div>
          {conversation.length > 0 && (
            <div className="mt-4">
              <ShimmerButton
                onClick={clearConversation}
                shimmerColor="#eca72c"
                background="#44355B"
              >
                Clear Conversation
              </ShimmerButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}