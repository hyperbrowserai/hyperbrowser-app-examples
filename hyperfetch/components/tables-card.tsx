"use client";

import { Card, SectionLabel } from "./result-container";
import type { ExtractedTable } from "@/lib/types";

interface TablesCardProps {
  tables: ExtractedTable[];
}

export function TablesCard({ tables }: TablesCardProps) {
  if (!tables.length) return null;

  return (
    <Card className="p-8 sm:p-10">
      <SectionLabel>{`Tables. ${tables.length}`}</SectionLabel>

      <div className="space-y-8">
        {tables.map((table, i) => (
          <div key={i}>
            {table.title && (
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                {table.title}
              </h3>
            )}
            <div className="overflow-x-auto scrollbar-thin border border-border">
              <table className="w-full text-sm">
                <thead className="bg-subtle sticky top-0">
                  <tr>
                    {table.headers.map((header, hi) => (
                      <th
                        key={hi}
                        className="text-left px-4 py-3 font-medium text-neutral-700 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className={ri % 2 === 1 ? "bg-subtle/60" : "bg-surface"}
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-4 py-3 text-neutral-800 align-top"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
