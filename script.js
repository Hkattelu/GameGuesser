        // Get references to DOM elements
        const gameMessage = document.getElementById('game-message');
        const userGameInputSection = document.getElementById('user-game-input-section');
        const userGameTitleInput = document.getElementById('user-game-title');
        const questionDisplay = document.getElementById('question-display');
        const aiQuestion = document.getElementById('ai-question');
        const responseButtons = document.getElementById('response-buttons');
        const btnYes = document.getElementById('btn-yes');
        const btnNo = document.getElementById('btn-no');
        const btnUnsure = document.getElementById('btn-unsure');
        const btnStartGame = document.getElementById('btn-start-game');

        // Game state variables
        let gameStarted = false;
        let questionCount = 0;
        const maxQuestions = 20; // For a 20 Questions style game

        // Function to start the game
        function startGame() {
            gameStarted = true;
            questionCount = 0;
            gameMessage.textContent = "Okay, let's begin! I'll ask my first question.";
            userGameInputSection.classList.add('hidden'); // Hide input after starting
            btnStartGame.classList.add('hidden'); // Hide start button

            questionDisplay.classList.remove('hidden'); // Show question area
            responseButtons.classList.remove('hidden'); // Show response buttons

            // Simulate AI asking the first question
            askQuestion("Is your game a role-playing game (RPG)?");
        }

        // Function to simulate AI asking a question
        function askQuestion(questionText) {
            questionCount++;
            if (questionCount > maxQuestions) {
                endGame("I couldn't guess your game in 20 questions! You win!");
                return;
            }
            aiQuestion.textContent = `(${questionCount}/${maxQuestions}) ${questionText}`;
        }

        // Function to handle user's answer
        function handleAnswer(answer) {
            if (!gameStarted) return;

            console.log(`User answered: ${answer}`);
            // In a real game, this is where you'd send the answer to your LLM agent.
            // The LLM agent would then process the answer, filter its internal list
            // of possible games, and generate the next question or a guess.

            gameMessage.textContent = `You answered "${answer}". Thinking...`;

            // Simulate AI's next turn after a short delay
            setTimeout(() => {
                // Placeholder for next question or guess
                const nextQuestion = getNextSimulatedQuestion();
                if (nextQuestion) {
                    askQuestion(nextQuestion);
                    gameMessage.textContent = "Your turn to answer!";
                } else {
                    // Simulate AI making a guess or ending the game
                    endGame("I think your game is... [AI's Guess]! Am I right?");
                }
            }, 1500); // Simulate processing time
        }

        // Placeholder function to simulate AI's next question
        function getNextSimulatedQuestion() {
            const questions = [
                "Was this game released on a Nintendo console?",
                "Does your game feature a significant online multiplayer component?",
                "Is the main character a human?",
                "Does this game have an open world?",
                "Is your game primarily a single-player experience?",
                "Was this game released before 2010?",
                "Is it a first-person shooter?",
                "Does the game involve building or crafting?",
                "Is it a popular indie game?",
                "Does it have a strong narrative focus?",
                "Is the game played from a top-down perspective?",
                "Does it involve fantasy creatures or magic?",
                "Is it a platformer?",
                "Was it part of a well-known franchise?",
                "Is the game known for its challenging difficulty?",
                "Does it have a cartoonish or stylized art style?",
                "Is it a racing game?",
                "Does it involve space exploration?",
                "Is it a puzzle game?",
                "Is it a horror game?"
            ];
            // Cycle through questions for demonstration
            if (questionCount < questions.length) {
                return questions[questionCount];
            }
            return null; // No more questions
        }

        // Function to end the game
        function endGame(finalMessage) {
            gameStarted = false;
            aiQuestion.textContent = finalMessage;
            responseButtons.classList.add('hidden'); // Hide response buttons
            btnStartGame.textContent = "Play Again?";
            btnStartGame.classList.remove('hidden'); // Show play again button
            gameMessage.textContent = "Game Over!";
            userGameInputSection.classList.remove('hidden'); // Show input again for next round
        }

        // Event Listeners
        btnStartGame.addEventListener('click', startGame);
        btnYes.addEventListener('click', () => handleAnswer('Yes'));
        btnNo.addEventListener('click', () => handleAnswer('No'));
        btnUnsure.addEventListener('click', () => handleAnswer('Unsure'));

        // Initially hide question and response buttons
        questionDisplay.classList.add('hidden');
        responseButtons.classList.add('hidden');