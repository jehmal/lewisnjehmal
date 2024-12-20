"use client";

import { ClauseReference } from "@/types/clauses";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ReactMarkdown from 'react-markdown';
import { motion } from "framer-motion";

interface ClauseCardProps {
  clause: ClauseReference;
  isOpen: boolean;
  onClose: () => void;
}

export function ClauseCard({ clause, isOpen, onClose }: ClauseCardProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-orange-500">Section {clause.id}</span>
            <span className="text-neutral-700 dark:text-neutral-200">{clause.title}</span>
          </DialogTitle>
        </DialogHeader>
        <BoxReveal>
          <div className="mt-4 space-y-4">
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{clause.fullText}</ReactMarkdown>
            </div>
            {clause.references && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
              >
                <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">References</h4>
                <div className="space-y-2">
                  {clause.references.sections && (
                    <p className="text-sm">
                      <span className="font-medium">Sections: </span>
                      {(Array.isArray(clause.references.sections) ? clause.references.sections : [clause.references.sections]).join(', ')}
                    </p>
                  )}
                  {clause.references.standards && (
                    <p className="text-sm">
                      <span className="font-medium">Standards: </span>
                      {Array.isArray(clause.references.standards) ? clause.references.standards.join(', ') : clause.references.standards}
                    </p>
                  )}
                  {clause.references.documents && (
                    <p className="text-sm">
                      <span className="font-medium">Documents: </span>
                      {(Array.isArray(clause.references.documents) ? clause.references.documents : [clause.references.documents]).join(', ')}
                    </p>
                  )}
                  {clause.references.regulations && (
                    <p className="text-sm">
                      <span className="font-medium">Regulations: </span>
                      {(Array.isArray(clause.references.regulations) ? clause.references.regulations : [clause.references.regulations]).join(', ')}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </BoxReveal>
      </DialogContent>
    </Dialog>
  );
} 