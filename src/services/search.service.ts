import {
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/excalidraw/types/element/types";

/**
 * Scoring weights for search results
 * NAME_MATCH_WEIGHT: Higher value to prioritize name matches over content
 * CONTENT_MATCH_WEIGHT: Lower value for content matches
 * MISSING_WORD_PENALTY: Penalty for drawings missing search terms
 * FUZZY_MATCH_THRESHOLD: Minimum similarity score for fuzzy matching (0-1)
 */
const NAME_MATCH_WEIGHT = 5;
const CONTENT_MATCH_WEIGHT = 1;
const MISSING_WORD_PENALTY = 3;
const FUZZY_MATCH_THRESHOLD = 0.8;

/**
 * Normalizes text by removing special characters and converting to lowercase
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates similarity score between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Searches through drawings using an enhanced scoring system that includes:
 * 1. Exact name matches (5x bonus)
 * 2. Fuzzy name matches (based on similarity threshold)
 * 3. Contextual content matches (considering word proximity and phrases)
 * 4. Penalties for missing search terms
 *
 * @param drawings - Array of drawings to search through
 * @param searchTerm - Search query to match against
 * @returns Sorted array of drawings matching the search criteria
 */
export function searchDrawings(drawings: any[], searchTerm: string) {
  const normalizedSearchTerm = normalizeText(searchTerm);
  const searchWords = normalizedSearchTerm
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const searchPhrase = normalizedSearchTerm;

  if (searchWords.length === 0) return drawings;

  return drawings
    .map((drawing) => {
      const drawingName = normalizeText(drawing.name || "");
      let nameScore = 0;
      let contentScore = 0;
      let foundWords = new Set<string>();

      // Name matching with fuzzy support
      if (drawingName === searchPhrase) {
        nameScore = NAME_MATCH_WEIGHT * 5; // Exact match bonus
      } else {
        // Check for fuzzy matches in name
        const nameSimilarity = calculateSimilarity(drawingName, searchPhrase);
        if (nameSimilarity >= FUZZY_MATCH_THRESHOLD) {
          nameScore = NAME_MATCH_WEIGHT * 3; // Fuzzy match bonus
        } else {
          // Check individual words in name
          const nameWords = drawingName.split(/\s+/);
          searchWords.forEach((searchWord) => {
            const wordMatch = nameWords.some(
              (nameWord) =>
                calculateSimilarity(nameWord, searchWord) >=
                FUZZY_MATCH_THRESHOLD
            );
            if (wordMatch) {
              nameScore += NAME_MATCH_WEIGHT;
              foundWords.add(searchWord);
            }
          });
        }
      }

      // Content matching with contextual awareness
      try {
        const elements = JSON.parse(
          drawing.data.excalidraw
        ) as ExcalidrawElement[];
        const textElements = elements.filter(
          (element): element is ExcalidrawTextElement => element.type === "text"
        );

        // First pass: Look for exact phrase matches
        textElements.forEach((element) => {
          const normalizedText = normalizeText(element.text);
          if (normalizedText.includes(searchPhrase)) {
            contentScore += CONTENT_MATCH_WEIGHT * 3; // Phrase match bonus
            searchWords.forEach((word) => foundWords.add(word));
          }
        });

        // Second pass: Look for individual word matches with proximity bonus
        textElements.forEach((element) => {
          const normalizedText = normalizeText(element.text);
          const textWords = normalizedText.split(/\s+/);

          searchWords.forEach((searchWord) => {
            if (!foundWords.has(searchWord)) {
              const wordMatches = textWords.filter(
                (textWord) =>
                  calculateSimilarity(textWord, searchWord) >=
                  FUZZY_MATCH_THRESHOLD
              );

              if (wordMatches.length > 0) {
                contentScore += CONTENT_MATCH_WEIGHT;
                foundWords.add(searchWord);

                // Bonus for words appearing close together
                if (wordMatches.length > 1) {
                  contentScore += CONTENT_MATCH_WEIGHT * 0.5;
                }
              }
            }
          });
        });
      } catch (e) {
        // Skip drawings with invalid excalidraw data
      }

      const missingWords = searchWords.length - foundWords.size;
      const missingWordsPenalty = missingWords * MISSING_WORD_PENALTY;

      return {
        drawing,
        score: nameScore + contentScore - missingWordsPenalty,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.drawing);
}
