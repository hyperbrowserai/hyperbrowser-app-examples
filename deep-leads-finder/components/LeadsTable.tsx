import { motion } from "framer-motion";

export default function LeadsTable({ leads }: { leads: any[] }) {
  if (!leads?.length) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="card mt-8"
    >
      <div className="flex items-center mb-4">
        <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <h3 className="font-medium">Results ({leads.length})</h3>
      </div>
      
      <div className="overflow-hidden border border-border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="py-3 px-4 text-left font-medium">Source</th>
                <th className="py-3 px-4 text-left font-medium">Title</th>
                <th className="py-3 px-4 text-left font-medium">Location</th>
                <th className="py-3 px-4 text-left font-medium whitespace-nowrap">Phone</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <motion.tr 
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12, delay: i * 0.03 }}
                  className="border-t border-border hover:bg-muted/5"
                >
                  <td className="py-3 px-4 align-top">
                    <div className="flex items-center">
                      {lead.source === "Yelp" ? (
                        <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"></path>
                        </svg>
                      ) : lead.source.includes("Google") ? (
                        <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          <path d="M2 12h20"></path>
                        </svg>
                      ) : (
                        <svg className="icon mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="2" width="20" height="20" rx="5"></rect>
                        </svg>
                      )}
                      <span>{lead.source}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <a href={lead.url} target="_blank" rel="noopener noreferrer" className="flex items-start">
                      <span className="line-clamp-2">{lead.title}</span>
                      {lead.url && (
                        <svg className="icon ml-1 w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      )}
                    </a>
                  </td>
                  <td className="py-3 px-4 align-top">{lead.location}</td>
                  <td className="py-3 px-4 align-top whitespace-nowrap phone text-sm">{lead.price}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
} 