"use client";

import { motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { ScoreIssue } from "@/lib/types";

interface Props {
  issues: ScoreIssue[];
}

const ICONS = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

export function IssuesList({ issues }: Props) {
  if (!issues.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
        Issues Found
      </h3>
      <div className="flex flex-col gap-3">
        {issues.map((issue, i) => {
          const Icon = ICONS[issue.severity];
          const isCritical = issue.severity === "critical";
          const isInfo = issue.severity === "info";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
              className={`flex gap-4 p-4 border-4 border-black bg-white shadow-brutal ${
                isInfo ? "opacity-80" : ""
              }`}
            >
              <Icon
                size={20}
                strokeWidth={2.5}
                className={`mt-0.5 shrink-0 ${
                  isCritical
                    ? "text-black"
                    : isInfo
                    ? "text-gray-400"
                    : "text-black"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${
                      isCritical ? "text-black" : isInfo ? "text-gray-500" : "text-black"
                    }`}
                  >
                    {issue.label}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-black px-1.5 py-0.5">
                    {issue.severity}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed font-medium ${
                    isCritical ? "text-black" : "text-gray-700"
                  }`}
                >
                  {issue.detail}
                </p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
                  <span className="font-bold uppercase tracking-wider">Fix.</span>{" "}
                  {issue.fix}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
