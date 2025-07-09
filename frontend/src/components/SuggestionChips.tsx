// @ts-nocheck
import React from 'react';

const suggestions = [
  'Is it an RPG?',
  'Was it released after 2010?',
  'Is it a first-person shooter?',
  'Is it a multiplayer game?',
  'Is it exclusive to a single platform?',
];

function SuggestionChips({ onSelectSuggestion }: { onSelectSuggestion: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {suggestions.map((q) => (
        <button
          key={q}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold py-2 px-4 rounded-full"
          onClick={() => onSelectSuggestion(q)}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export default SuggestionChips;
