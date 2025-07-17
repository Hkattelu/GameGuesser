import React from 'react';

interface TextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string | string[];
}

const TextDialog: React.FC<TextDialogProps> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  const contentArray = Array.isArray(content) ? content : [content];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">{title}</h3>
        <div className="text-left text-gray-700 mb-6">
          {contentArray.map((paragraph, index) => (
            <p key={index} className="mb-2">{paragraph}</p>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextDialog;
