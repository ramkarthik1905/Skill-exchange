import Skill from "./models/Skill.js";

const DEFAULT_SKILLS = [
  { name: "Public speaking", slug: "public-speaking", category: "Communication", tags: ["presentation"] },
  { name: "LinkedIn profile optimization", slug: "linkedin-profile", category: "Career", tags: ["branding"] },
  { name: "React development", slug: "react-development", category: "Engineering", tags: ["frontend"] },
  { name: "Python data analysis", slug: "python-data-analysis", category: "Data", tags: ["pandas"] },
  { name: "UX research", slug: "ux-research", category: "Design", tags: ["interviews"] },
  { name: "Guitar basics", slug: "guitar-basics", category: "Music", tags: ["instrument"] },
  { name: "Project management (Agile)", slug: "project-management-agile", category: "Leadership", tags: ["scrum"] },
  { name: "Gen AI Developer", slug: "gen-ai-developer", category: "Engineering", tags: ["ai", "genai", "llm"] },
  { name: "Game Developer", slug: "game-developer", category: "Engineering", tags: ["game-dev", "unity", "unreal"] },
  { name: "UI/UX Developer", slug: "ui-ux-developer", category: "Design", tags: ["ui", "ux", "frontend"] },
  { name: "Data Analyst Role", slug: "data-analyst-role", category: "Data", tags: ["analytics", "sql", "visualization"] },
  { name: "Backend Developer (Node.js)", slug: "backend-nodejs", category: "Engineering", tags: ["nodejs", "api", "express"] },
  { name: "Frontend Developer (JavaScript)", slug: "frontend-javascript", category: "Engineering", tags: ["javascript", "web", "frontend"] },
  { name: "Java Developer", slug: "java-developer", category: "Engineering", tags: ["java", "spring", "backend"] },
  { name: "Mobile App Developer", slug: "mobile-app-developer", category: "Engineering", tags: ["android", "ios", "flutter"] },
  { name: "DevOps Fundamentals", slug: "devops-fundamentals", category: "Engineering", tags: ["docker", "ci-cd", "cloud"] },
  { name: "Machine Learning Basics", slug: "machine-learning-basics", category: "Data", tags: ["ml", "models", "python"] },
  { name: "SQL and Database Design", slug: "sql-database-design", category: "Data", tags: ["sql", "database", "schema"] },
  { name: "Power BI Dashboarding", slug: "power-bi-dashboarding", category: "Data", tags: ["powerbi", "bi", "reporting"] },
  { name: "Graphic Design", slug: "graphic-design", category: "Design", tags: ["visual", "branding", "creative"] },
  { name: "Figma UI Design", slug: "figma-ui-design", category: "Design", tags: ["figma", "ui", "prototype"] },
  { name: "Video Editing", slug: "video-editing", category: "Creative", tags: ["editing", "premiere", "content"] },
  { name: "Content Writing", slug: "content-writing", category: "Communication", tags: ["writing", "copy", "blog"] },
  { name: "English Communication", slug: "english-communication", category: "Communication", tags: ["speaking", "fluency", "language"] },
  { name: "Interview Preparation", slug: "interview-preparation", category: "Career", tags: ["interview", "job", "career"] },
  { name: "Resume Building", slug: "resume-building", category: "Career", tags: ["resume", "cv", "career"] },
  { name: "Entrepreneurship Basics", slug: "entrepreneurship-basics", category: "Business", tags: ["startup", "business", "strategy"] },
  { name: "Sales and Negotiation", slug: "sales-negotiation", category: "Business", tags: ["sales", "negotiation", "communication"] },
  { name: "Digital Marketing", slug: "digital-marketing", category: "Marketing", tags: ["seo", "ads", "social"] },
  { name: "Social Media Management", slug: "social-media-management", category: "Marketing", tags: ["instagram", "linkedin", "content"] },
  { name: "UI/UX Designer", slug: "ui-ux-designer", category: "Design", tags: ["ui", "ux", "design", "user-experience"] },
  { name: "Content Writer", slug: "content-writer", category: "Communication", tags: ["writing", "content", "copywriting", "blogging"] },
  { name: "SEO Specialist", slug: "seo-specialist", category: "Marketing", tags: ["seo", "search", "optimization", "analytics"] },
  { name: "Social Media Marketing", slug: "social-media-marketing", category: "Marketing", tags: ["social", "marketing", "content", "strategy"] },
  { name: "Product Manager", slug: "product-manager", category: "Leadership", tags: ["product", "management", "strategy", "roadmap"] },
  { name: "Data Visualization", slug: "data-visualization", category: "Data", tags: ["visualization", "charts", "dashboard", "analytics"] },
  { name: "Cybersecurity Fundamentals", slug: "cybersecurity-fundamentals", category: "Engineering", tags: ["security", "privacy", "hacking", "protection"] },
  { name: "Blockchain Development", slug: "blockchain-development", category: "Engineering", tags: ["blockchain", "crypto", "smart-contracts", "web3"] },
  { name: "Cloud Architecture", slug: "cloud-architecture", category: "Engineering", tags: ["cloud", "aws", "azure", "architecture"] },
  { name: "Technical Writing", slug: "technical-writing", category: "Communication", tags: ["documentation", "api", "guides", "tutorials"] },
  { name: "Public Relations", slug: "public-relations", category: "Marketing", tags: ["pr", "media", "communication", "branding"] },
  { name: "Financial Analysis", slug: "financial-analysis", category: "Business", tags: ["finance", "analysis", "budgeting", "forecasting"] },
  { name: "Legal Research", slug: "legal-research", category: "Business", tags: ["legal", "research", "contracts", "compliance"] },
  { name: "Event Planning", slug: "event-planning", category: "Business", tags: ["events", "planning", "organization", "logistics"] },
  { name: "Customer Service Excellence", slug: "customer-service", category: "Business", tags: ["support", "service", "communication", "satisfaction"] },
];

export async function seedSkillsIfEmpty() {
  for (const s of DEFAULT_SKILLS) {
    await Skill.updateOne(
      { slug: s.slug },
      {
        $setOnInsert: {
          ...s,
          description: `${s.name} — community skill for peer exchange.`,
        },
      },
      { upsert: true }
    );
  }
}
