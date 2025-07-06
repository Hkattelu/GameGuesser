# AI Game Guesser

This is a simple web-based game where an AI tries to guess a video game you're thinking of by asking a series of yes/no questions.

## Setup

To run this project, you need to provide your own Gemini API key. Follow these steps:

1.  **Create a `config.js` file:** In the root of the project, create a new file named `config.js`.

2.  **Add your API key:** Inside `config.js`, add the following line of code, replacing `"YOUR_API_KEY_HERE"` with your actual Gemini API key:

    ```javascript
    const API_KEY = "YOUR_API_KEY_HERE";
    ```

3.  **Open `index.html`:** Open the `index.html` file in your web browser to play the game.

**Important:** The `config.js` file is included in the `.gitignore` file, so it will not be committed to the repository. This is to ensure that your API key remains private.