'use client';

import { BloodTest } from '@/lib/types';

interface ResultsTableProps {
  tests: BloodTest[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'high':
      return 'text-red-400 bg-red-900/20';
    case 'low':
      return 'text-yellow-400 bg-yellow-900/20';
    case 'critical':
      return 'text-red-500 bg-red-900/40';
    default:
      return 'text-green-400 bg-green-900/20';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'high':
      return '↑';
    case 'low':
      return '↓';
    case 'critical':
      return '⚠';
    default:
      return '✓';
  }
};

export default function ResultsTable({ tests }: ResultsTableProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <div className="p-6 border-b border-gray-800">
        <h3 className="text-xl font-semibold">Blood Test Results</h3>
        <p className="text-gray-400 mt-1">Your values compared to reference ranges</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-4 font-medium text-gray-300">Test Name</th>
              <th className="text-left p-4 font-medium text-gray-300">Your Value</th>
              <th className="text-left p-4 font-medium text-gray-300">Reference Range</th>
              <th className="text-left p-4 font-medium text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test, index) => (
              <tr
                key={index}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                <td className="p-4">
                  <div className="font-medium">{test.name}</div>
                </td>
                <td className="p-4">
                  <div className="font-mono">
                    {test.value} {test.unit}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-mono text-gray-400">{test.refRange}</div>
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(test.status || 'normal')}`}>
                    <span className="mr-1">{getStatusIcon(test.status || 'normal')}</span>
                    {(test.status || 'normal').charAt(0).toUpperCase() + (test.status || 'normal').slice(1)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {tests.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          No test results to display
        </div>
      )}
    </div>
  );
}

