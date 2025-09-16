import jsPDF from 'jspdf';
import { BloodTest, AnalysisInsight } from './types';

interface ExportData {
  tests: BloodTest[];
  insights: AnalysisInsight[];
  summary: string;
}

export async function exportToPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper function to check page break
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return yPosition;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Blood Test Analysis Report', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 10;

  doc.text('Built with Hyperbrowser (https://hyperbrowser.ai)', margin, yPosition);
  yPosition += 20;

  // Test Results Table
  yPosition = checkPageBreak(60);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Blood Test Results', margin, yPosition);
  yPosition += 15;

  // Table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Name', margin, yPosition);
  doc.text('Value', margin + 80, yPosition);
  doc.text('Reference Range', margin + 120, yPosition);
  doc.text('Status', margin + 180, yPosition);
  yPosition += 8;

  // Table line
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  // Table data
  doc.setFont('helvetica', 'normal');
  for (const test of data.tests) {
    yPosition = checkPageBreak(15);
    
    doc.text(test.name.length > 25 ? test.name.substring(0, 25) + '...' : test.name, margin, yPosition);
    doc.text(`${test.value} ${test.unit}`, margin + 80, yPosition);
    doc.text(test.refRange.length > 15 ? test.refRange.substring(0, 15) + '...' : test.refRange, margin + 120, yPosition);
    
    // Status with color
    const status = (test.status || 'normal').toUpperCase();
    if (status === 'HIGH' || status === 'CRITICAL') {
      doc.setTextColor(220, 38, 38); // Red
    } else if (status === 'LOW') {
      doc.setTextColor(245, 158, 11); // Yellow
    } else {
      doc.setTextColor(34, 197, 94); // Green
    }
    doc.text(status, margin + 180, yPosition);
    doc.setTextColor(0, 0, 0); // Reset to black
    
    yPosition += 12;
  }

  yPosition += 10;

  // Summary
  yPosition = checkPageBreak(30);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Analysis Summary', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPosition = addWrappedText(data.summary, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 15;

  // Detailed Insights
  yPosition = checkPageBreak(30);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Insights', margin, yPosition);
  yPosition += 15;

  for (const insight of data.insights) {
    yPosition = checkPageBreak(50);
    
    // Test name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${insight.test} - ${insight.status.toUpperCase()}`, margin, yPosition);
    yPosition += 10;

    // Comparison
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Comparison:', margin, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(insight.comparison, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 5;

    // Analysis
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis:', margin, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(insight.message, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 5;

    // Recommendations
    if (insight.recommendations && insight.recommendations.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations:', margin, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      for (const rec of insight.recommendations) {
        yPosition = checkPageBreak(15);
        yPosition = addWrappedText(`• ${rec}`, margin, yPosition, pageWidth - 2 * margin);
        yPosition += 3;
      }
    }

    yPosition += 10;
  }

  // Footer disclaimer
  yPosition = checkPageBreak(30);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const disclaimer = 'IMPORTANT DISCLAIMER: This analysis is for educational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper medical diagnosis and treatment recommendations.';
  yPosition = addWrappedText(disclaimer, margin, yPosition, pageWidth - 2 * margin, 8);

  // Save the PDF
  const fileName = `blood-test-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

