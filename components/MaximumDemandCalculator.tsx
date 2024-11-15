import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import ReactMarkdown from 'react-markdown';
import { Trash2 } from 'lucide-react';
import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";
import { formatDateForDisplay } from '@/utils/date-formatter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at: string;
}

const MaximumDemandCalculator: React.FC = () => {
  const { user } = useUser();
  const [conversation, setConversation] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalculateButton, setShowCalculateButton] = useState(false);
  const [calculationResult, setCalculationResult] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    
    const now = new Date();
    const userMessage: Message = { 
      role: 'user', 
      content: inputValue,
      created_at: now.toISOString(),
      timestamp: formatDateForDisplay(now)
    };
    
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setInputValue('');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputValue, 
          assistantId: 'asst_80fC3gnzl1jXGB4VvmlFaFbI',
          conversation: updatedConversation
        }),
      });

      if (!response.ok) throw new Error('Failed to get response from server');

      const data = await response.json();
      const assistantNow = new Date();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response,
        created_at: assistantNow.toISOString(),
        timestamp: formatDateForDisplay(assistantNow)
      };
      const newConversation = [...updatedConversation, assistantMessage];
      setConversation(newConversation);

      if (data.response.includes('MaxDemand')) {
        setShowCalculateButton(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    const lastAssistantMessage = conversation.filter(m => m.role === 'assistant').pop();
    if (!lastAssistantMessage) return;

    const calculationQuery = lastAssistantMessage.content.split('MaxDemand')[1].trim();

    setIsLoading(true);
    try {
      const response = await fetch('/api/wolfram-alpha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: calculationQuery }),
      });

      if (!response.ok) throw new Error('Failed to get response from Wolfram Alpha');

      const data = await response.json();
      setCalculationResult(data.result);
      
      const now = new Date();
      const resultMessage: Message = {
        role: 'assistant',
        content: `Calculation Result: ${data.result}`,
        created_at: now.toISOString(),
        timestamp: formatDateForDisplay(now)
      };
      setConversation([...conversation, resultMessage]);
    } catch (error) {
      console.error('Error calculating with Wolfram Alpha:', error);
      setError('Error in calculation. Please try again.');
    } finally {
      setIsLoading(false);
      setShowCalculateButton(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setShowCalculateButton(false);
    setCalculationResult(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg relative flex flex-col md:flex-row">
      <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex flex-col gap-6">
          <div ref={chatContainerRef} className="space-y-4">
            {conversation.map((message, index) => (
              <BoxReveal key={index} width="100%" boxColor="#eca72c" duration={0.5}>
                <div className={cn(
                  "p-3 rounded-lg",
                  message.role === 'user' ? "bg-gray-100 dark:bg-gray-700" : "bg-white/70 dark:bg-gray-600"
                )}>
                  <p className="font-bold">{message.role === 'user' ? 'You:' : 'TradeGuru:'}</p>
                  <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                    {message.content}
                  </ReactMarkdown>
                </div>
              </BoxReveal>
            ))}
            {isLoading && (
              <div className="text-center text-gray-500 dark:text-gray-400">
                Generating response...
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 md:space-x-4">
              <div className="w-full md:flex-grow">
                <Input
                  type="text"
                  placeholder="Describe your maximum demand calculation..."
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

          {showCalculateButton && (
            <ShimmerButton
              onClick={handleCalculate}
              shimmerColor="#eca72c"
              background="#ee5622"
              className="flex items-center justify-center px-4 py-2"
            >
              Calculate
            </ShimmerButton>
          )}

          <ShimmerButton
            onClick={clearConversation}
            shimmerColor="#eca72c"
            background="#ee5622"
            className="flex items-center justify-center px-4 py-2"
          >
            <Trash2 className="mr-2" /> Clear Conversation
          </ShimmerButton>

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          {calculationResult && (
            <div className="mt-4 p-4 bg-yellow-100 rounded">
              <h3 className="font-bold">Calculation Result:</h3>
              <p>{calculationResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaximumDemandCalculator;