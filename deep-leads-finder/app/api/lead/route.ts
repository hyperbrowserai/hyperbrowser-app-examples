import { NextResponse } from "next/server";
import { hbClient } from "../../../lib/hb";
import { findLeads } from "../../../lib/deep-research";
import { leadsToCSV } from "../../../lib/csv";
import { filterRelevantLeads } from "../../../lib/claude-filter";

export async function POST(req: Request) {
  try {
    const { query, city } = await req.json();
    console.log('🔬 API: Starting Hyperleads research:', { query, city });
    
    if (!query || !city)
      return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const hb = hbClient();
    console.log('📱 API: Hyperbrowser client created');

    // Use Hyperleads research instead of basic scraping
    console.log('🕷️ API: Starting Hyperleads research crawl...');
    const researchResult = await findLeads(hb, query, city);

    console.log('📊 API: Research result:', {
      extractedDataCount: researchResult.extractedData?.length || 0,
      sources: researchResult.metadata?.sources || [],
      duration: researchResult.metadata?.duration || 0
    });

    // Log each extracted item for debugging
    researchResult.extractedData?.forEach((item, i) => {
      console.log(`📄 API: Item ${i+1}:`, {
        source: item.source,
        hasBusinesses: !!item.data?.businesses,
        businessCount: item.data?.businesses?.length || 0,
        hasLeads: !!item.data?.leads,
        leadsCount: item.data?.leads?.length || 0,
        hasListings: !!item.data?.listings,
        listingsCount: item.data?.listings?.length || 0,
        dataKeys: Object.keys(item.data || {})
      });
    });

    // Transform research results to lead format (FAST processing)
    const leads = researchResult.extractedData.flatMap(item => {
      // Handle new optimized business format
      if (item.data.businesses) {
        return item.data.businesses.map((business: any) => ({
          source: item.source,
          title: business.name || 'Business',
          url: business.website || item.url || '',
          location: business.address || city,
          price: business.phone || business.email || '' // Note: "price" field stores phone/email for contact info
        }));
      }
      
      // Fallback for other formats
      if (item.data.leads) {
        return item.data.leads.map((lead: any) => ({
          source: item.source,
          title: lead.title || lead.name || '',
          url: lead.url || item.url || '',
          location: lead.location || lead.address || city,
          price: lead.price || lead.contact || ''
        }));
      }
      
      if (item.data.listings) {
        return item.data.listings.map((listing: any) => ({
          source: item.source,
          title: listing.title || '',
          url: item.url || '',
          location: listing.location || city,
          price: listing.price || ''
        }));
      }
      
      return [];
    });

    console.log('🔄 API: Leads after transformation:', {
      totalLeads: leads.length,
      sampleLead: leads[0] || null
    });

    // Filter leads using Claude to ensure relevance
    console.log('🔍 API: Filtering leads with Claude...');
    const filteredLeads = await filterRelevantLeads(leads, query);
    const csv = leadsToCSV(filteredLeads);

    console.log('✅ API: Hyperleads research complete:', { 
      totalLeads: leads.length,
      filteredLeads: filteredLeads.length, 
      sources: researchResult.metadata.sources,
      duration: `${researchResult.metadata.duration}ms`
    });
    
    return NextResponse.json({ 
      leads: filteredLeads, 
      csv,
      metadata: {
        ...researchResult.metadata,
        originalCount: leads.length,
        filteredCount: filteredLeads.length
      }
    });
  } catch (error) {
    console.error('❌ API: Hyperleads research failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 