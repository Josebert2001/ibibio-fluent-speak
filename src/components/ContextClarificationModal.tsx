
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { HelpCircle, MessageSquare } from 'lucide-react';
import { DictionaryEntry } from '../types/dictionary';

interface ContextClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitContext: (context: string, selectedOption?: string) => void;
  query: string;
  alternatives: Array<{
    entry: DictionaryEntry;
    confidence: number;
    reason: string;
  }>;
  contextQuestions: string[];
  ambiguityReason?: string;
}

const ContextClarificationModal: React.FC<ContextClarificationModalProps> = ({
  isOpen,
  onClose,
  onSubmitContext,
  query,
  alternatives,
  contextQuestions,
  ambiguityReason
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customContext, setCustomContext] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'options' | 'custom'>('options');

  const handleSubmit = () => {
    if (activeTab === 'options' && selectedOption) {
      onSubmitContext(selectedOption, selectedOption);
    } else if (activeTab === 'custom' && customContext.trim()) {
      onSubmitContext(customContext.trim());
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedOption('');
    setCustomContext('');
    setActiveTab('options');
    onClose();
  };

  const canSubmit = (activeTab === 'options' && selectedOption) || 
                   (activeTab === 'custom' && customContext.trim());

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <DialogTitle>Need More Context</DialogTitle>
          </div>
          <DialogDescription>
            I found multiple possible translations for "<span className="font-medium">{query}</span>".
            {ambiguityReason && (
              <span className="block text-sm text-gray-600 mt-1">
                Reason: {ambiguityReason}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Selection */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'options' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('options')}
            >
              Choose Option
            </button>
            <button
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'custom' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('custom')}
            >
              Describe Context
            </button>
          </div>

          {/* Options Tab */}
          {activeTab === 'options' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Which meaning did you have in mind?</Label>
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                {alternatives.slice(0, 4).map((alt, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value={alt.entry.ibibio} id={`option-${index}`} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        <div className="font-medium text-blue-700">{alt.entry.ibibio}</div>
                        <div className="text-sm text-gray-600 mt-1">{alt.entry.meaning}</div>
                        {alt.entry.examples && alt.entry.examples[0] && (
                          <div className="text-xs text-gray-500 mt-1 italic">
                            Example: "{alt.entry.examples[0].english}"
                          </div>
                        )}
                      </Label>
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round(alt.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Custom Context Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-3">
              <Label htmlFor="context" className="text-sm font-medium">
                Describe how you plan to use this word:
              </Label>
              <Textarea
                id="context"
                placeholder="For example: 'I want to tell someone to stop walking' or 'I'm writing about stopping bad habits'"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="text-xs text-gray-500">
                Providing context helps me give you the most accurate translation.
              </div>
            </div>
          )}

          {/* Context Questions */}
          {contextQuestions.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Quick Questions:</span>
              </div>
              <div className="space-y-1">
                {contextQuestions.slice(0, 2).map((question, index) => (
                  <div key={index} className="text-xs text-blue-700">
                    • {question}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0">
          <Button variant="outline" onClick={handleClose} className="sm:mr-auto">
            Skip for Now
          </Button>
          <div className="flex space-x-2">
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit}
              className="flex-1 sm:flex-initial"
            >
              Get Translation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContextClarificationModal;
