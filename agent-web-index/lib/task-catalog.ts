// Task metadata shared by the app (URL matching) and harness (full runs).
// Success checks live in harness/tasks.ts — only sites listed here can be scored.

export type TaskCatalogEntry = {
  id: string;
  name: string;
  url: string;
  goal: string;
  obstacles: string[];
};

export const TASK_CATALOG: TaskCatalogEntry[] = [
  {
    id: "hacker-news-thread",
    name: "news.ycombinator.com",
    url: "https://news.ycombinator.com",
    goal: "Open the comments page for the number one ranked story on the front page.",
    obstacles: ["static dom", "multi-step"],
  },
  {
    id: "mdn-string-replace",
    name: "developer.mozilla.org",
    url: "https://developer.mozilla.org/en-US/",
    goal: "Find and open the MDN reference page for the JavaScript String.prototype.replace() method.",
    obstacles: ["dynamic dom", "multi-step"],
  },
  {
    id: "books-toscrape-travel",
    name: "books.toscrape.com",
    url: "https://books.toscrape.com",
    goal: "Open the 'Travel' category, then open the detail page of the first book listed in it.",
    obstacles: ["multi-step"],
  },
];
