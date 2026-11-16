export const formatSearchResults = (searchResults) => {
  if (!searchResults) return '';

  // Empty / failed search agent fallback
  if (Array.isArray(searchResults) && searchResults.length === 0) {
    return 'No web search results were returned.';
  }

  if (typeof searchResults === 'string') {
    return searchResults;
  }

  const results = Array.isArray(searchResults)
    ? searchResults
    : searchResults.results || searchResults.organic || [];

  if (!Array.isArray(results) || results.length === 0) {
    try {
      return JSON.stringify(searchResults, null, 2);
    } catch {
      return String(searchResults);
    }
  }

  return results
    .map((item, index) => {
      const title = item.title || item.name || `Result ${index + 1}`;
      const url = item.url || item.link || '';
      const snippet = item.content || item.snippet || item.description || '';
      return `${index + 1}. ${title}\nURL: ${url}\n${snippet}`.trim();
    })
    .join('\n\n');
};
