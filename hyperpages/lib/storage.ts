export type Page = {
  id: string;
  slug: string;
  title: string;
  topic?: string;
  audience: string;
  sections: Section[];
  hero_image?: string;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: string;
  title: string;
  content: string;
  image?: string;
};

const STORAGE_KEY = 'hyperpages_pages';

export const getPages = (): Page[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

export const savePage = (page: Page): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const pages = getPages();
    // Check by id first, then slug
    const existingIndex = pages.findIndex(p => p.id === page.id || p.slug === page.slug);
    
    if (existingIndex >= 0) {
      // Update existing page
      pages[existingIndex] = {
        ...page,
        updated_at: new Date().toISOString(),
      };
    } else {
      pages.push(page);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getPageBySlug = (slug: string): Page | null => {
  const pages = getPages();
  return pages.find(p => p.slug === slug) || null;
};

export const deletePage = (slug: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const pages = getPages();
    const filtered = pages.filter(p => p.slug !== slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting from localStorage:', error);
  }
};

export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

