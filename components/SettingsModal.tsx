import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { AppSettings, ModelIds } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model
            </label>
            <select
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value={ModelIds.FLASH}>Gemini 3.0 Flash (Fast & Efficient)</option>
              <option value={ModelIds.PRO}>Gemini 3.0 Pro (Complex Reasoning)</option>
            </select>
          </div>

          {/* System Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              System Instructions
            </label>
            <p className="text-xs text-gray-400 mb-3">
              These instructions will be applied to <strong>every</strong> chat session. Use this to define the persona, strict rules, or formatting preferences for Gemini.
            </p>
            <textarea
              value={localSettings.systemInstruction}
              onChange={(e) => setLocalSettings({ ...localSettings, systemInstruction: e.target.value })}
              className="w-full h-48 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed"
              placeholder="e.g., You are a senior Python engineer. Always provide code snippets. Be concise."
            />
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
            <p className="text-sm text-yellow-200">
              Updating system instructions will apply to new messages in current chats and all new chats. Existing context in active chats remains until reset.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-gray-800/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;