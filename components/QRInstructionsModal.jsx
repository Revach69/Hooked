import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Smartphone, ScanLine, ExternalLink } from "lucide-react";

export default function QRInstructionsModal({ onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 modal-overlay">
        <div className="modal-content w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  How to Join Using QR Code
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Instructions */}
          <div className="p-6 space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                1
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Open your phone's Camera app</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No need for a special scanner.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                2
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ScanLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Point your camera at the QR code</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Make sure the full code is visible in the frame.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                3
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Tap the link that pops up</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  It will automatically open the event page.
                </p>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">💡</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Tip</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Make sure you have good lighting and hold your phone steady for the best scanning experience.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl py-3 text-base font-medium"
            >
              Got It!
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}