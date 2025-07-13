export interface SuggestionChipsProps {
  suggestions: string[],
  onSelectSuggestion: (question: string) => void;
}

function SuggestionChips({ suggestions, onSelectSuggestion }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {suggestions.map((q) => (
        <button
          key={q}
          className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold py-2 px-4 rounded-full"
          onClick={() => onSelectSuggestion(q)}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export default SuggestionChips;
