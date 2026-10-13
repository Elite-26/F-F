/**
 * Utility functions for detecting similar/duplicated company names
 */

/**
 * Normalize a company name for comparison
 * - Convert to lowercase
 * - Remove common suffixes (Inc, LLC, Ltd, Corp, etc.)
 * - Remove extra whitespace
 * - Remove special characters
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  // Remove common company suffixes
  const suffixes = [
    /\s+inc\.?$/i,
    /\s+llc\.?$/i,
    /\s+ltd\.?$/i,
    /\s+corp\.?$/i,
    /\s+corporation$/i,
    /\s+company$/i,
    /\s+co\.?$/i,
    /\s+limited$/i,
  ];
  
  suffixes.forEach(suffix => {
    normalized = normalized.replace(suffix, '');
  });
  
  // Remove special characters except spaces
  normalized = normalized.replace(/[^\w\s]/g, '');
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;
  
  // Create a matrix for dynamic programming
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  
  // Convert distance to similarity (0-1 scale)
  return 1 - (distance / maxLen);
}

/**
 * Check if two company names are similar
 * Returns true if similarity is above threshold (default 0.8)
 */
export function areCompaniesSimilar(name1: string, name2: string, threshold: number = 0.8): boolean {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalizeCompanyName(name1);
  const normalized2 = normalizeCompanyName(name2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other (for cases like "Google" vs "Google Inc")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const shorter = Math.min(normalized1.length, normalized2.length);
    const longer = Math.max(normalized1.length, normalized2.length);
    // If the shorter name is at least 80% of the longer name, consider them similar
    if (shorter / longer >= 0.8) return true;
  }
  
  // Calculate similarity using Levenshtein distance
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Find duplicate/similar companies for a given application
 * Returns an array of similar applications with their company name, position, and status
 */
export function findSimilarCompanies(
  currentApp: { _id: string; company_info?: { name?: string }; title?: string },
  allApplications: Array<{ _id: string; company_info?: { name?: string }; title?: string; status?: string; statusDescription?: string }>
): Array<{ companyName: string; position: string; status?: string; statusDescription?: string }> {
  if (!currentApp.company_info?.name) return [];
  
  const similar: Array<{ companyName: string; position: string; status?: string; statusDescription?: string }> = [];
  
  for (const app of allApplications) {
    // Skip the current application
    if (app._id === currentApp._id) continue;
    
    // Skip if no company name
    if (!app.company_info?.name) continue;
    
    // Check if companies are similar
    if (areCompaniesSimilar(currentApp.company_info.name, app.company_info.name)) {
      similar.push({
        companyName: app.company_info.name,
        position: app.title || 'Not specified',
        status: app.status,
        statusDescription: app.statusDescription,
      });
    }
  }
  
  return similar;
}

