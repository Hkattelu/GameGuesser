import React from 'react';

const suggestionQuestions = [
  "Does the game feature an open world?",
  "Is the game known for its strong narrative or story?",
  "Does the game belong to the RPG genre?",
  "Is it a first-person shooter (FPS)?",
  "Does the game involve building or crafting mechanics?",
  "Is the game set in a fantasy world?",
  "Does the game take place in space or involve sci-fi themes?",
  "Is it a platformer?",
  "Is the game primarily played from a top-down perspective?",
  "Does the game have a cartoonish or stylized art style?",
  "Is it a horror game?",
  "Does the game involve vehicles or racing?",
  "Is it a puzzle game?",
  "Does the game feature turn-based combat?",
  "Is the game known for its challenging difficulty?",
  "Is the game part of a well-known franchise?",
  "Was the game originally released on a PlayStation console?",
  "Was the game originally released on an Xbox console?",
  "Was the game originally released on a Nintendo console?",
  "Is the game available on PC?",
  "Does the game involve magic or supernatural elements?",
  "Is the game rated 'Mature' (17+) by ESRB or equivalent?",
  "Does the game have a post-apocalyptic setting?",
  "Is the game played from a third-person perspective?",
  "Does the game have a significant emphasis on stealth?",
  "Was the game released before the year 2000?",
  "Does the game involve a large number of unique characters?",
  "Is the game known for its emotional impact?"
];

function SuggestionChips({ onSelectSuggestion }) {
  const shuffledQuestions = suggestionQuestions.sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffledQuestions.slice(0, 3);

  return (
    <div id="suggestion-chips" className="flex flex-wrap justify-center gap-2 mb-4">
      {selectedQuestions.map((question, index) => (
        <button
          key={index}
          className="suggestion-chip"
          onClick={() => onSelectSuggestion(question)}
        >
          {question}
        </button>
      ))}
    </div>
  );
}

export default SuggestionChips;
