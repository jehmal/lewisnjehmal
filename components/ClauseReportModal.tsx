import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from "./ui/use-toast";

interface ClauseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clauseId: string;
  standardId: string;
}

type ReportType = 'clause_doesnt_exist' | 'incorrect_clause' | 'clause_not_loading';

export function ClauseReportModal({ isOpen, onClose, clauseId, standardId }: ClauseReportModalProps) {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [userComment, setUserComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClientComponentClient();
  
  const handleReportTypeChange = (type: ReportType, checked: boolean) => {
    if (checked) {
      setReportTypes(prev => [...prev, type]);
    } else {
      setReportTypes(prev => prev.filter(t => t !== type));
    }
  };
  
  const handleSubmit = async () => {
    if (reportTypes.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one issue type",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit a separate report for each selected type
      for (const reportType of reportTypes) {
        const { error } = await supabase
          .from('clause_reports')
          .insert({
            clause_id: clauseId,
            standard_id: standardId,
            issue_type: reportType,
            user_comment: userComment
          });
          
        if (error) throw error;
      }
      
      toast({
        title: "Report Submitted",
        description: "Thank you for helping us improve our clause database!",
        variant: "default"
      });
      
      // Reset form and close modal
      setReportTypes([]);
      setUserComment('');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Clause Issue</DialogTitle>
          <DialogDescription>
            Help us improve by reporting issues with clause {clauseId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="issue-type">What issue are you experiencing?</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="clause-doesnt-exist" 
                  checked={reportTypes.includes('clause_doesnt_exist')}
                  onCheckedChange={(checked: boolean) => 
                    handleReportTypeChange('clause_doesnt_exist', checked)
                  }
                />
                <Label htmlFor="clause-doesnt-exist">Clause doesn&apos;t exist</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="incorrect-clause" 
                  checked={reportTypes.includes('incorrect_clause')}
                  onCheckedChange={(checked: boolean) => 
                    handleReportTypeChange('incorrect_clause', checked)
                  }
                />
                <Label htmlFor="incorrect-clause">Incorrect clause content</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="clause-not-loading" 
                  checked={reportTypes.includes('clause_not_loading')}
                  onCheckedChange={(checked: boolean) => 
                    handleReportTypeChange('clause_not_loading', checked)
                  }
                />
                <Label htmlFor="clause-not-loading">Clause not loading</Label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comment">Additional comments (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Please provide any additional details about the issue..."
              value={userComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 