// Lightweight re-export helpers so unit tests can import a single utility
// module instead of repeating the same boilerplate imports everywhere.

export * from '@testing-library/react';

// Ensure extended matchers are available in every test file that uses this
// helper without having to import the package explicitly.
import '@testing-library/jest-dom';
