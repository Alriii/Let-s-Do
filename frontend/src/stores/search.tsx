import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface SearchContextValue {
  query: string;
  setQuery: (value: string) => void;
  normalized: string;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');

  const value = useMemo<SearchContextValue>(
    () => ({ query, setQuery, normalized: query.trim().toLowerCase() }),
    [query],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error('useSearch must be used inside a SearchProvider.');
  }

  return context;
}
