/**
 * Test examples and demonstrations for the sentence word search function
 */

import {
  cleanSentence,
  splitSentenceIntoWords,
  searchWordInSentence,
  getWordPositions,
  searchMultipleWords,
  containsAnyWord,
  containsAllWords,
  highlightWordsInSentence,
  type WordSearchOptions
} from './sentenceWordSearch';

// Example usage and test cases
export function runExamples() {
  console.log('=== SENTENCE WORD SEARCH EXAMPLES ===\n');

  // Example 1: Basic word search
  console.log('1. Basic Word Search:');
  const sentence1 = "Hello world, how are you today?";
  const search1 = searchWordInSentence(sentence1, "world");
  console.log(`Sentence: "${sentence1}"`);
  console.log(`Search: "world"`);
  console.log(`Found: ${search1.found}`);
  console.log(`Positions: [${search1.positions.join(', ')}]`);
  console.log(`Matched words: [${search1.matchedWords.join(', ')}]`);
  console.log(`Cleaned sentence: "${search1.cleanedSentence}"`);
  console.log();

  // Example 2: Case insensitive search
  console.log('2. Case Insensitive Search:');
  const sentence2 = "The Quick Brown Fox Jumps";
  const search2 = searchWordInSentence(sentence2, "quick", { caseSensitive: false });
  console.log(`Sentence: "${sentence2}"`);
  console.log(`Search: "quick" (case insensitive)`);
  console.log(`Found: ${search2.found}`);
  console.log(`Matched words: [${search2.matchedWords.join(', ')}]`);
  console.log();

  // Example 3: Phrase search
  console.log('3. Phrase Search:');
  const sentence3 = "I love programming in JavaScript and Python";
  const search3 = searchWordInSentence(sentence3, "programming in");
  console.log(`Sentence: "${sentence3}"`);
  console.log(`Search: "programming in"`);
  console.log(`Found: ${search3.found}`);
  console.log(`Positions: [${search3.positions.join(', ')}]`);
  console.log(`Matched words: [${search3.matchedWords.join(', ')}]`);
  console.log();

  // Example 4: Punctuation handling
  console.log('4. Punctuation Handling:');
  const sentence4 = "Hello, world! How are you? I'm fine, thanks.";
  const search4 = searchWordInSentence(sentence4, "world");
  console.log(`Sentence: "${sentence4}"`);
  console.log(`Search: "world"`);
  console.log(`Original words: [${search4.originalWords.join(', ')}]`);
  console.log(`Cleaned words: [${search4.cleanedWords.join(', ')}]`);
  console.log(`Found: ${search4.found}`);
  console.log();

  // Example 5: Whole word matching
  console.log('5. Whole Word vs Partial Matching:');
  const sentence5 = "The cat catches mice in the cathedral";
  const partialSearch = searchWordInSentence(sentence5, "cat", { matchWholeWords: false });
  const wholeWordSearch = searchWordInSentence(sentence5, "cat", { matchWholeWords: true });
  console.log(`Sentence: "${sentence5}"`);
  console.log(`Partial search for "cat": Found ${partialSearch.matchedWords.length} matches: [${partialSearch.matchedWords.join(', ')}]`);
  console.log(`Whole word search for "cat": Found ${wholeWordSearch.matchedWords.length} matches: [${wholeWordSearch.matchedWords.join(', ')}]`);
  console.log();

  // Example 6: Multiple spaces and special characters
  console.log('6. Edge Cases - Multiple Spaces and Special Characters:');
  const sentence6 = "  Hello    world!!!   How   are\tyou?\n\nFine,  thanks.  ";
  const search6 = searchWordInSentence(sentence6, "world");
  console.log(`Sentence: "${sentence6}"`);
  console.log(`Cleaned: "${search6.cleanedSentence}"`);
  console.log(`Words: [${search6.cleanedWords.join(', ')}]`);
  console.log(`Found "world": ${search6.found}`);
  console.log();

  // Example 7: Empty and invalid inputs
  console.log('7. Edge Cases - Empty and Invalid Inputs:');
  const emptySearch = searchWordInSentence("", "test");
  const nullSearch = searchWordInSentence("Hello world", "");
  console.log(`Empty sentence search: Found = ${emptySearch.found}`);
  console.log(`Empty search term: Found = ${nullSearch.found}`);
  console.log();

  // Example 8: Word positions with character indices
  console.log('8. Word Positions with Character Indices:');
  const sentence8 = "The quick brown fox";
  const positions = getWordPositions(sentence8);
  console.log(`Sentence: "${sentence8}"`);
  console.log('Word positions:');
  positions.forEach(pos => {
    console.log(`  "${pos.word}" at characters ${pos.startIndex}-${pos.endIndex} (word index: ${pos.wordIndex})`);
  });
  console.log();

  // Example 9: Multiple word search
  console.log('9. Multiple Word Search:');
  const sentence9 = "I love JavaScript, Python, and TypeScript programming";
  const searchTerms = ["JavaScript", "Python", "Ruby", "programming"];
  const multipleResults = searchMultipleWords(sentence9, searchTerms);
  console.log(`Sentence: "${sentence9}"`);
  console.log('Search results:');
  Object.entries(multipleResults).forEach(([term, result]) => {
    console.log(`  "${term}": Found = ${result.found}, Positions = [${result.positions.join(', ')}]`);
  });
  console.log();

  // Example 10: Contains any/all words
  console.log('10. Contains Any/All Words:');
  const sentence10 = "The weather is beautiful today";
  const wordList1 = ["weather", "sunny", "rain"];
  const wordList2 = ["weather", "beautiful", "today"];
  const wordList3 = ["snow", "cold", "winter"];
  
  console.log(`Sentence: "${sentence10}"`);
  console.log(`Contains any of [${wordList1.join(', ')}]: ${containsAnyWord(sentence10, wordList1)}`);
  console.log(`Contains all of [${wordList2.join(', ')}]: ${containsAllWords(sentence10, wordList2)}`);
  console.log(`Contains any of [${wordList3.join(', ')}]: ${containsAnyWord(sentence10, wordList3)}`);
  console.log();

  // Example 11: Text highlighting
  console.log('11. Text Highlighting:');
  const sentence11 = "JavaScript is a powerful programming language";
  const highlighted = highlightWordsInSentence(sentence11, "JavaScript", {}, "highlight");
  console.log(`Original: "${sentence11}"`);
  console.log(`Highlighted: "${highlighted}"`);
  console.log();

  // Example 12: Performance test with large text
  console.log('12. Performance Test:');
  const largeText = "Lorem ipsum dolor sit amet consectetur adipiscing elit ".repeat(100);
  const startTime = performance.now();
  const performanceResult = searchWordInSentence(largeText, "consectetur");
  const endTime = performance.now();
  console.log(`Large text search (${largeText.length} characters):`);
  console.log(`Found "consectetur": ${performanceResult.found}`);
  console.log(`Search time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`Total words processed: ${performanceResult.cleanedWords.length}`);
  console.log();

  console.log('=== ALL EXAMPLES COMPLETED ===');
}

// Expected outputs for testing
export const expectedResults = {
  basicSearch: {
    input: { sentence: "Hello world, how are you today?", searchTerm: "world" },
    expected: { found: true, positions: [1], matchedWords: ["world"] }
  },
  
  caseInsensitive: {
    input: { sentence: "The Quick Brown Fox", searchTerm: "quick", options: { caseSensitive: false } },
    expected: { found: true, matchedWords: ["quick"] }
  },
  
  phraseSearch: {
    input: { sentence: "I love programming in JavaScript", searchTerm: "programming in" },
    expected: { found: true, positions: [2, 3] }
  },
  
  wholeWordMatch: {
    input: { sentence: "The cat catches mice", searchTerm: "cat", options: { matchWholeWords: true } },
    expected: { found: true, matchedWords: ["cat"] }
  },
  
  partialMatch: {
    input: { sentence: "The cat catches mice", searchTerm: "cat", options: { matchWholeWords: false } },
    expected: { found: true, matchedWords: ["cat", "catches"] }
  },
  
  emptyInput: {
    input: { sentence: "", searchTerm: "test" },
    expected: { found: false, positions: [], matchedWords: [] }
  },
  
  multipleSpaces: {
    input: { sentence: "  Hello    world  ", searchTerm: "world" },
    expected: { found: true, cleanedSentence: "hello world" }
  }
};

// Utility function to run all tests
export function runTests(): boolean {
  console.log('=== RUNNING TESTS ===\n');
  
  let allTestsPassed = true;
  
  // Test 1: Basic search
  const test1 = searchWordInSentence(
    expectedResults.basicSearch.input.sentence,
    expectedResults.basicSearch.input.searchTerm
  );
  const test1Pass = test1.found === expectedResults.basicSearch.expected.found &&
                   JSON.stringify(test1.positions) === JSON.stringify(expectedResults.basicSearch.expected.positions);
  console.log(`Test 1 (Basic Search): ${test1Pass ? 'PASS' : 'FAIL'}`);
  if (!test1Pass) allTestsPassed = false;
  
  // Test 2: Case insensitive
  const test2 = searchWordInSentence(
    expectedResults.caseInsensitive.input.sentence,
    expectedResults.caseInsensitive.input.searchTerm,
    expectedResults.caseInsensitive.input.options
  );
  const test2Pass = test2.found === expectedResults.caseInsensitive.expected.found;
  console.log(`Test 2 (Case Insensitive): ${test2Pass ? 'PASS' : 'FAIL'}`);
  if (!test2Pass) allTestsPassed = false;
  
  // Test 3: Empty input
  const test3 = searchWordInSentence(
    expectedResults.emptyInput.input.sentence,
    expectedResults.emptyInput.input.searchTerm
  );
  const test3Pass = test3.found === expectedResults.emptyInput.expected.found;
  console.log(`Test 3 (Empty Input): ${test3Pass ? 'PASS' : 'FAIL'}`);
  if (!test3Pass) allTestsPassed = false;
  
  // Test 4: Cleaning function
  const test4 = cleanSentence("  Hello,   world!!!  ");
  const test4Pass = test4 === "hello world";
  console.log(`Test 4 (Sentence Cleaning): ${test4Pass ? 'PASS' : 'FAIL'}`);
  if (!test4Pass) allTestsPassed = false;
  
  // Test 5: Word splitting
  const test5 = splitSentenceIntoWords("Hello,   world! How are you?");
  const test5Pass = JSON.stringify(test5) === JSON.stringify(["hello", "world", "how", "are", "you"]);
  console.log(`Test 5 (Word Splitting): ${test5Pass ? 'PASS' : 'FAIL'}`);
  if (!test5Pass) allTestsPassed = false;
  
  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`All tests passed: ${allTestsPassed ? 'YES' : 'NO'}`);
  
  return allTestsPassed;
}