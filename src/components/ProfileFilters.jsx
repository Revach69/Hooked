import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MAIN_INTERESTS = [
  "music", "tech", "food", "books", "travel", "art",
  "fitness", "nature", "movies", "business", "photography", "dancing"
];

const ADDITIONAL_INTERESTS = [
  "yoga", "gaming", "comedy", "startups", "fashion", "spirituality",
  "volunteering", "crypto", "cocktails", "politics", "hiking", "design",
  "podcasts", "pets", "wellness"
];

export default function ProfileFilters({ filters, onFiltersChange, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdditionalInterests, setShowAdditionalInterests] = useState(false);

  const toggleInterest = (interest) => {
    setLocalFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      age_min: 18,
      age_max: 99,
      gender: "all",
      interests: []
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 modal-overlay">
        <div className="modal-content w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Filter className="w-5 h-5" />
                Filter Profiles
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Age Range */}
            <div>
              <Label className="text-base font-medium mb-4 block text-gray-900 dark:text-white">
                Age Range
              </Label>
              <div className="mb-4 flex justify-between items-center">
                <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                  Min Age: {localFilters.age_min}
                </span>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Max Age: {localFilters.age_max}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Drag the handles to set your preferred age range
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Minimum Age</Label>
                  <div className="relative">
                    <Slider
                      value={[localFilters.age_min]}
                      onValueChange={([value]) => setLocalFilters(prev => ({ 
                        ...prev, 
                        age_min: value < prev.age_max ? value : prev.age_max - 1 
                      }))}
                      min={18}
                      max={99}
                      step={1}
                      className="age-slider-min"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Maximum Age</Label>
                  <div className="relative">
                    <Slider
                      value={[localFilters.age_max]}
                      onValueChange={([value]) => setLocalFilters(prev => ({ 
                        ...prev, 
                        age_max: value > prev.age_min ? value : prev.age_min + 1 
                      }))}
                      min={18}
                      max={99}
                      step={1}
                      className="age-slider-max"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Shared Interests */}
            <div>
              <Label className="text-base font-medium mb-3 block text-gray-900 dark:text-white">
                Must Share These Interests
              </Label>
              <div className="flex flex-wrap gap-2">
                {MAIN_INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    variant={localFilters.interests.includes(interest) ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-2 rounded-full transition-all ${
                      localFilters.interests.includes(interest)
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                        : 'border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
                {/* Display selected additional interests if the additional section is collapsed */}
                {!showAdditionalInterests &&
                  localFilters.interests
                    .filter(interest => ADDITIONAL_INTERESTS.includes(interest))
                    .map(interest => (
                      <Badge
                        key={`selected-${interest}`}
                        variant="default"
                        className="cursor-pointer px-3 py-2 rounded-full transition-all bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700"
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    ))
                }
              </div>
              <div className="text-center mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAdditionalInterests(!showAdditionalInterests)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  aria-label={showAdditionalInterests ? "Show less interests" : "Show more interests"}
                >
                  {showAdditionalInterests ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              <AnimatePresence>
                {showAdditionalInterests && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {ADDITIONAL_INTERESTS.map(interest => (
                        <Badge
                          key={interest}
                          variant={localFilters.interests.includes(interest) ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-2 rounded-full transition-all ${
                            localFilters.interests.includes(interest)
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                              : 'border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => toggleInterest(interest)}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {localFilters.interests.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Showing only people who share at least one selected interest.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 rounded-xl border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Reset All
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        .age-slider-min [data-orientation="horizontal"] {
          height: 6px;
          background: linear-gradient(to right, #f87171 0%, #f87171 100%);
          border-radius: 3px;
        }
        
        .age-slider-max [data-orientation="horizontal"] {
          height: 6px;
          background: linear-gradient(to right, #a855f7 0%, #a855f7 100%);
          border-radius: 3px;
        }
        
        .age-slider-min [role="slider"],
        .age-slider-max [role="slider"] {
          width: 20px;
          height: 20px;
          background: white;
          border: 3px solid;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .age-slider-min [role="slider"] {
          border-color: #f87171;
        }
        
        .age-slider-max [role="slider"] {
          border-color: #a855f7;
        }
        
        .age-slider-min [role="slider"]:hover,
        .age-slider-max [role="slider"]:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .age-slider-min [role="slider"]:focus,
        .age-slider-max [role="slider"]:focus {
          outline: none;
          transform: scale(1.15);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </Dialog>
  );
}