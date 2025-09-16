import { BloodTest, AnalysisInsight, ResearchArticle } from '@/lib/types';

export const sampleTests: BloodTest[] = [
  { name: 'Hemoglobin', value: 13.6, unit: 'g/dL', refRange: '12.0 - 16.0', status: 'normal' },
  { name: 'WBC', value: 7.2, unit: '×10^3/µL', refRange: '4.0 - 10.0', status: 'normal' },
  { name: 'Platelets', value: 235, unit: '×10^3/µL', refRange: '150 - 450', status: 'normal' },
  { name: 'Fasting Glucose', value: 92, unit: 'mg/dL', refRange: '70 - 99', status: 'normal' },
  { name: 'LDL Cholesterol', value: 94, unit: 'mg/dL', refRange: '< 100', status: 'normal' },
];

export const sampleResearch: ResearchArticle[] = [
  {
    title: 'Normal Hemoglobin Levels and Clinical Implications',
    summary: 'Hemoglobin below reference may indicate anemia or iron deficiency; correlate with MCV, ferritin.',
    link: 'https://example.org/hemoglobin-reference',
    source: 'example.org',
  },
  {
    title: 'Fasting Glucose Interpretation',
    summary: 'Fasting glucose 100–125 mg/dL is impaired fasting glucose; recommend lifestyle modification, repeat testing.',
    link: 'https://example.org/glucose-ifg',
    source: 'example.org',
  },
  {
    title: 'LDL Targets in Primary Prevention',
    summary: 'Elevated LDL increases ASCVD risk; lifestyle plus statin therapy may be considered based on risk score.',
    link: 'https://example.org/ldl-guidelines',
    source: 'example.org',
  },
];

export const sampleInsights: AnalysisInsight[] = [
  {
    test: 'Hemoglobin',
    status: 'normal',
    comparison: 'Your value 13.6 g/dL within reference 12.0–16.0 g/dL',
    message: 'Hemoglobin is within the expected range.',
    sources: [],
    recommendations: [],
  },
  {
    test: 'Fasting Glucose',
    status: 'normal',
    comparison: 'Your value 92 mg/dL within reference 70–99 mg/dL',
    message: 'Fasting glucose is within the normal range.',
    sources: [],
    recommendations: [],
  },
  {
    test: 'LDL Cholesterol',
    status: 'normal',
    comparison: 'Your value 94 mg/dL within target < 100 mg/dL',
    message: 'LDL cholesterol is within target.',
    sources: [],
    recommendations: [],
  },
];

export const sampleEvidenceMd = `# Evidence

- All values fall within referenced normal ranges.
`;

export const sampleSummary = 'All values are within normal ranges.';
