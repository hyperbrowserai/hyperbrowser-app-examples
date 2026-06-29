import type { Page } from "playwright";

import { TASK_CATALOG } from "../lib/task-catalog.ts";

export type Task = {
  id: string;
  name: string;
  url: string;
  goal: string;
  success: (page: Page) => Promise<boolean>;
  obstacles: string[];
};

const SUCCESS: Record<string, (page: Page) => Promise<boolean>> = {
  "hacker-news-thread": async (page) => /item\?id=\d+/.test(page.url()),
  "mdn-string-replace": async (page) =>
    /\/String\/replace(\/|$|\?|#)/i.test(page.url()),
  "books-toscrape-travel": async (page) => {
    if (!/\/catalogue\//.test(page.url())) return false;
    return (await page.locator(".product_main h1").count()) > 0;
  },
};

export const TASKS: Task[] = TASK_CATALOG.map((entry) => ({
  ...entry,
  success: SUCCESS[entry.id],
}));

export function taskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}
