
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, ArrowRight, X } from "lucide-react";

export default function EventCodeEntry({ onSubmit, onClose }) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setIsLoading(true);
    await onSubmit(code.trim().toUpperCase());
    setIsLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 modal-overlay">
        <div className="modal-content w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="text-center pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1" />
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <Hash className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Enter Event Code</DialogTitle>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Enter the code provided by the event organizer
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="e.g., WED2025"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider border-2 border-gray-200 dark:border-gray-600 focus:border-purple-400 dark:focus:border-purple-400 rounded-xl py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Codes are usually 6-8 characters
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl py-3 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!code.trim() || isLoading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl py-3"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    Join Event
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
