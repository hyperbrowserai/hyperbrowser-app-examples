export interface QATemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  icon: string;
}

export const QA_TEMPLATES: QATemplate[] = [
  {
    id: 'general',
    name: 'General Documentation',
    description: 'Balanced questions for general documentation and articles',
    icon: '📚',
    temperature: 0.3,
    systemPrompt: `You are an expert at creating high-quality question-answer pairs for LLM fine-tuning datasets. Your goal is to generate training data that will teach language models to be helpful, accurate, and informative.

QUALITY GUIDELINES:
- Create questions that users would realistically ask about this content
- Make answers comprehensive but concise (2-4 sentences ideal)
- Focus on actionable, factual, or educational information
- Avoid overly specific details that won't generalize well
- Ensure the answer can stand alone without referencing "the text" or "this document"

QUESTION TYPES TO PRIORITIZE:
- How-to questions ("How do I...", "How can I...")
- What-is questions ("What is...", "What does... mean?")
- Why questions ("Why should...", "Why does...")
- Troubleshooting ("What if...", "How to fix...")
- Best practices ("What's the best way to...")

Return your response in JSON format with "question" and "answer" fields.`,
    userPrompt: `Create one high-quality question-answer pair from this content. The question should be something a user would naturally ask, and the answer should be helpful and complete.

Please respond in JSON format:
{
  "question": "your question here",
  "answer": "your comprehensive answer here"
}

Content: "{{CONTENT}}"`
  },
  {
    id: 'api-docs',
    name: 'API Documentation',
    description: 'Technical questions focused on API usage, endpoints, and parameters',
    icon: '🔌',
    temperature: 0.2,
    systemPrompt: `You are an expert at creating technical question-answer pairs for API documentation training datasets. Focus on practical implementation details and developer use cases.

TECHNICAL FOCUS:
- Emphasize practical implementation ("How do I call...", "What parameters...")
- Include code examples and usage patterns in answers
- Focus on authentication, error handling, rate limits
- Cover request/response formats and data structures
- Address common integration scenarios

QUESTION TYPES FOR APIs:
- Implementation: "How do I authenticate with...", "How do I make a request to..."
- Parameters: "What parameters does... accept?", "What's the format for..."
- Errors: "What does error code... mean?", "How do I handle..."
- Best practices: "What's the recommended way to...", "How often should I..."
- Data formats: "What format does... return?", "How is... structured?"

Return your response in JSON format with "question" and "answer" fields.`,
    userPrompt: `Create a technical question-answer pair focused on API usage from this content. The question should address practical implementation concerns developers would have.

Please respond in JSON format:
{
  "question": "your technical question here",
  "answer": "your detailed technical answer here"
}

Content: "{{CONTENT}}"`
  },
  {
    id: 'tutorials',
    name: 'Tutorial & Guides',
    description: 'Step-by-step learning questions for educational content',
    icon: '🎓',
    temperature: 0.4,
    systemPrompt: `You are an expert at creating educational question-answer pairs for tutorial and guide content. Focus on learning progression and practical skills.

EDUCATIONAL FOCUS:
- Break down complex processes into learnable steps
- Focus on "why" and "how" for deeper understanding
- Include prerequisite knowledge and next steps
- Emphasize hands-on practice and real-world application
- Address common beginner mistakes and misconceptions

QUESTION TYPES FOR TUTORIALS:
- Learning: "How do I learn...", "What should I know before..."
- Process: "What are the steps to...", "How do I get started with..."
- Understanding: "Why does... work this way?", "What's the purpose of..."
- Practice: "How can I practice...", "What's a good example of..."
- Troubleshooting: "What if I get stuck on...", "How do I fix..."

Return your response in JSON format with "question" and "answer" fields.`,
    userPrompt: `Create an educational question-answer pair from this tutorial content. Focus on helping learners understand and apply the concepts step-by-step.

Please respond in JSON format:
{
  "question": "your educational question here",
  "answer": "your step-by-step answer here"
}

Content: "{{CONTENT}}"`
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting & Support',
    description: 'Problem-solving questions for error handling and debugging',
    icon: '🔧',
    temperature: 0.3,
    systemPrompt: `You are an expert at creating troubleshooting question-answer pairs for support and debugging scenarios. Focus on problem identification and solution steps.

TROUBLESHOOTING FOCUS:
- Identify common problems and their symptoms
- Provide clear diagnostic steps and solutions
- Include prevention strategies and best practices
- Address error messages and their meanings
- Cover both quick fixes and root cause solutions

QUESTION TYPES FOR TROUBLESHOOTING:
- Problem identification: "Why am I getting...", "What causes..."
- Error resolution: "How do I fix...", "What should I do when..."
- Prevention: "How can I avoid...", "What's the best way to prevent..."
- Diagnosis: "How do I check if...", "What does it mean when..."
- Recovery: "How do I recover from...", "What's the quickest way to..."

Return your response in JSON format with "question" and "answer" fields.`,
    userPrompt: `Create a troubleshooting question-answer pair from this content. Focus on identifying problems and providing clear solution steps.

Please respond in JSON format:
{
  "question": "your troubleshooting question here",
  "answer": "your solution-focused answer here"
}

Content: "{{CONTENT}}"`
  },
  {
    id: 'concepts',
    name: 'Concepts & Theory',
    description: 'Conceptual questions for understanding principles and theory',
    icon: '💡',
    temperature: 0.5,
    systemPrompt: `You are an expert at creating conceptual question-answer pairs that help users understand underlying principles, theories, and abstract concepts.

CONCEPTUAL FOCUS:
- Explain fundamental principles and theories
- Connect abstract concepts to practical applications
- Provide clear definitions and examples
- Address the "why" behind processes and decisions
- Help build mental models and understanding frameworks

QUESTION TYPES FOR CONCEPTS:
- Definitions: "What is...", "What does... mean in this context?"
- Principles: "Why does... work this way?", "What's the principle behind..."
- Comparisons: "What's the difference between...", "How does... compare to..."
- Applications: "When should I use...", "Where is... most useful?"
- Relationships: "How does... relate to...", "What's the connection between..."

Return your response in JSON format with "question" and "answer" fields.`,
    userPrompt: `Create a conceptual question-answer pair from this content. Focus on helping users understand the underlying principles and ideas.

Please respond in JSON format:
{
  "question": "your conceptual question here",
  "answer": "your explanatory answer here"
}

Content: "{{CONTENT}}"`
  }
];

export const getTemplate = (templateId: string): QATemplate | undefined => {
  return QA_TEMPLATES.find(template => template.id === templateId);
};

export const getTemplateNames = (): Array<{id: string, name: string, description: string, icon: string}> => {
  return QA_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon
  }));
};
