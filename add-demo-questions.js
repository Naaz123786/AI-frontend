// Demo script to add sample questions to localStorage
// Run this in browser console to test question history

// Sample questions for testing
const sampleQuestions = [
  {
    id: '1',
    question: 'Tell me about yourself and your background in software development?',
    answer: 'I am a passionate software developer with over 3 years of experience in full-stack development. I have worked with various technologies including React, Node.js, Python, and databases like PostgreSQL and MongoDB. I enjoy solving complex problems and building scalable applications.',
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    userId: 'demo-user-id'
  },
  {
    id: '2', 
    question: 'What are your greatest strengths as a developer?',
    answer: 'My greatest strengths include strong problem-solving skills, attention to detail, and the ability to work well in a team. I am also very adaptable to new technologies and frameworks, and I have excellent communication skills which help me collaborate effectively with both technical and non-technical stakeholders.',
    timestamp: new Date(Date.now() - 43200000), // 12 hours ago
    userId: 'demo-user-id'
  },
  {
    id: '3',
    question: 'How do you handle challenging technical problems?',
    answer: 'When facing challenging technical problems, I follow a systematic approach: First, I break down the problem into smaller, manageable parts. Then I research existing solutions and best practices. I also collaborate with team members and seek feedback when needed. Finally, I test my solution thoroughly and document the process for future reference.',
    timestamp: new Date(Date.now() - 21600000), // 6 hours ago  
    userId: 'demo-user-id'
  },
  {
    id: '4',
    question: 'Why do you want to work for our company?',
    answer: 'I am excited about the opportunity to work for your company because of your reputation for innovation and commitment to cutting-edge technology. I believe my skills and experience align well with your mission, and I am eager to contribute to your team while continuing to grow professionally in such a dynamic environment.',
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    userId: 'demo-user-id'
  }
];

// Function to add demo questions
function addDemoQuestions() {
  const userId = 'demo-user-id'; // Replace with actual user ID
  const storageKey = `questionHistory_${userId}`;
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(sampleQuestions));
    console.log('✅ Demo questions added successfully!');
    console.log(`Added ${sampleQuestions.length} questions to localStorage`);
    console.log('Key:', storageKey);
  } catch (error) {
    console.error('❌ Error adding demo questions:', error);
  }
}

// Function to clear questions  
function clearDemoQuestions() {
  const userId = 'demo-user-id';
  const storageKey = `questionHistory_${userId}`;
  localStorage.removeItem(storageKey);
  console.log('🗑️ Demo questions cleared');
}

// Auto-run
console.log('🚀 Demo Questions Script Loaded');
console.log('Run addDemoQuestions() to add sample questions');
console.log('Run clearDemoQuestions() to clear questions');

// Export functions for global use
window.addDemoQuestions = addDemoQuestions;
window.clearDemoQuestions = clearDemoQuestions;
