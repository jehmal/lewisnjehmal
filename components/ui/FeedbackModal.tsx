import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';
import { RatingDots } from './RatingDots';
import { supabase } from '../../lib/supabase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

const criteria = [
  {
    id: 'answer_rating',
    name: 'Answer to the Question',
    description: 'How well did the response answer the question?'
  },
  {
    id: 'figures_tables_rating',
    name: 'Relevant Figures and Tables',
    description: 'Were relevant figures and tables provided?'
  },
  {
    id: 'exact_paragraph_rating',
    name: 'Exact Paragraph(s) from Documentation',
    description: 'Did the response include exact paragraphs from the documentation?'
  },
  {
    id: 'frontend_display_rating',
    name: 'Frontend Display of Tables/Figures',
    description: 'Were tables and figures properly displayed in the frontend?'
  },
  {
    id: 'relevant_clauses_rating',
    name: 'Relevant Clauses',
    description: 'Were relevant clauses included in the response?'
  }
];

export function FeedbackModal({ isOpen, onClose, conversationId }: FeedbackModalProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({
    answer_rating: 0,
    figures_tables_rating: 0,
    exact_paragraph_rating: 0,
    frontend_display_rating: 0,
    relevant_clauses_rating: 0
  });
  
  const [feedback, setFeedback] = useState<Record<string, string>>({
    answer_feedback: '',
    figures_tables_feedback: '',
    exact_paragraph_feedback: '',
    frontend_display_feedback: '',
    relevant_clauses_feedback: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  
  // Calculate total score when ratings change
  useEffect(() => {
    const sum = Object.values(ratings).reduce((acc, curr) => acc + curr, 0);
    setTotalScore(sum);
  }, [ratings]);
  
  const handleRatingChange = (criteriaId: string, value: number) => {
    setRatings({
      ...ratings,
      [criteriaId]: value
    });
  };
  
  const handleFeedbackChange = (criteriaId: string, value: string) => {
    const feedbackId = `${criteriaId.replace('_rating', '')}_feedback`;
    setFeedback({
      ...feedback,
      [feedbackId]: value
    });
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
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
        alert('Failed to submit feedback. Please try again.');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error in feedback submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-amber-600 dark:text-amber-500">Rate this Response</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {criteria.map((criterion) => (
            <div key={criterion.id} className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-md font-medium">
                  {criterion.name}
                </div>
                <RatingDots 
                  name={criterion.id}
                  value={ratings[criterion.id]} 
                  onChange={(value) => handleRatingChange(criterion.id, value)}
                  maxValue={2}
                />
              </div>
              <p className="text-sm text-gray-500">{criterion.description}</p>
              
              {/* Display feedback input when rating is 0 */}
              {(ratings[criterion.id] === 1 || ratings[criterion.id] === 0) && (
                <textarea
                  id={`${criterion.id}_feedback`}
                  placeholder="Please provide feedback on how this could be improved"
                  value={feedback[`${criterion.id.replace('_rating', '')}_feedback`]}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFeedbackChange(criterion.id, e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={3}
                />
              )}
            </div>
          ))}
          
          <div className="flex items-center justify-between mt-4 font-bold">
            <span>Total Score:</span>
            <span>{totalScore} / 10</span>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 