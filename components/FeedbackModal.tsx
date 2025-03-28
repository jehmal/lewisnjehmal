import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { RatingDots } from './RatingDots';
import { supabase } from '../lib/supabase';

// Define the rating criteria
const CRITERIA = [
  {
    id: 'answer_rating',
    label: 'Answer to the Question',
    description: 'How well did the assistant answer the question?'
  },
  {
    id: 'figures_tables_rating',
    label: 'Relevant Figures and Tables',
    description: 'Were relevant figures and tables mentioned?'
  },
  {
    id: 'exact_paragraph_rating',
    label: 'Exact Paragraph(s) from the Documentation',
    description: 'Were exact paragraphs from the documentation included?'
  },
  {
    id: 'frontend_display_rating',
    label: 'Frontend Display of Tables & Figures',
    description: 'Were tables and figures properly displayed in the frontend?'
  },
  {
    id: 'relevant_clauses_rating',
    label: 'Relevant Clauses',
    description: 'Were relevant clauses included in the response?'
  }
];

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  userId?: string;
}

export function FeedbackModal({ isOpen, onClose, conversationId, userId }: FeedbackModalProps) {
  // Initialize state for ratings
  const [ratings, setRatings] = useState<Record<string, number>>({
    answer_rating: 0,
    figures_tables_rating: 0,
    exact_paragraph_rating: 0,
    frontend_display_rating: 0,
    relevant_clauses_rating: 0
  });
  
  // Initialize state for feedback text
  const [feedback, setFeedback] = useState<Record<string, string>>({
    answer_feedback: '',
    figures_tables_feedback: '',
    exact_paragraph_feedback: '',
    frontend_display_feedback: '',
    relevant_clauses_feedback: ''
  });
  
  // Track loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle rating change
  const handleRatingChange = (criteriaId: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [criteriaId]: value
    }));
  };
  
  // Handle feedback text change
  const handleFeedbackChange = (criteriaId: string, value: string) => {
    setFeedback(prev => ({
      ...prev,
      [`${criteriaId.replace('_rating', '_feedback')}`]: value
    }));
  };
  
  // Calculate total score
  const totalScore = Object.values(ratings).reduce((sum, rating) => sum + rating, 0);
  
  // Submit the feedback
  const handleSubmit = async () => {
    if (!conversationId) return;
    
    setIsSubmitting(true);
    
    try {
      // Fetch the conversation content to include in the review
      let userQuestion = '';
      let assistantResponse = '';
      
      // Get the conversation by ID
      const { data: conversationData, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching conversation:', fetchError);
      } else if (conversationData) {
        // This is the assistant response
        assistantResponse = conversationData.content || '';
        
        // Now fetch the related user question
        if (conversationData.related_question_id) {
          const { data: questionData } = await supabase
            .from('conversations')
            .select('content')
            .eq('id', conversationData.related_question_id)
            .single();
            
          if (questionData) {
            userQuestion = questionData.content || '';
          }
        }
      }
      
      // Create the review record
      const { error } = await supabase.from('reviews').insert({
        conversation_id: conversationId,
        user_id: userId,
        answer_rating: ratings.answer_rating,
        figures_tables_rating: ratings.figures_tables_rating,
        exact_paragraph_rating: ratings.exact_paragraph_rating,
        frontend_display_rating: ratings.frontend_display_rating,
        relevant_clauses_rating: ratings.relevant_clauses_rating,
        answer_feedback: feedback.answer_feedback,
        figures_tables_feedback: feedback.figures_tables_feedback,
        exact_paragraph_feedback: feedback.exact_paragraph_feedback,
        frontend_display_feedback: feedback.frontend_display_feedback,
        relevant_clauses_feedback: feedback.relevant_clauses_feedback,
        total_score: totalScore,
        user_question: userQuestion,
        assistant_response: assistantResponse
      });
      
      if (error) {
        console.error('Error submitting feedback:', error);
      } else {
        // Close the modal on success
        onClose();
        // Reset state
        setRatings({
          answer_rating: 0,
          figures_tables_rating: 0,
          exact_paragraph_rating: 0,
          frontend_display_rating: 0,
          relevant_clauses_rating: 0
        });
        setFeedback({
          answer_feedback: '',
          figures_tables_feedback: '',
          exact_paragraph_feedback: '',
          frontend_display_feedback: '',
          relevant_clauses_feedback: ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-amber-600 dark:text-amber-500">Rate Assistant Response</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Please rate each criterion from 0-2 points (10 points total).
          </p>
          
          <div className="space-y-6">
            {CRITERIA.map((criterion) => (
              <div key={criterion.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{criterion.label}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{criterion.description}</p>
                  </div>
                  <RatingDots 
                    value={ratings[criterion.id]} 
                    onChange={(value) => handleRatingChange(criterion.id, value)}
                    disabled={isSubmitting}
                  />
                </div>
                
                {/* Conditional feedback input - now shows for rating 0 as well */}
                {ratings[criterion.id] < 2 && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="What could be improved?"
                      className="w-full px-3 py-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      value={feedback[criterion.id.replace('_rating', '_feedback')]}
                      onChange={(e) => handleFeedbackChange(criterion.id, e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-right">
            <p className="font-bold text-lg">
              Total Score: <span className="text-amber-500">{totalScore}/10</span>
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 