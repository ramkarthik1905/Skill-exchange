import User from "./models/User.js";
import ExchangeRequest from "./models/ExchangeRequest.js";
import Review from "./models/Review.js";
import Skill from "./models/Skill.js";
import bcrypt from "bcryptjs";

const SAMPLE_USERS = [
  {
    email: "alice@example.com",
    password: "password123",
    name: "Alice Johnson",
    age: 28,
    dateOfBirth: new Date("1996-01-15"),
    headline: "Frontend Developer passionate about React",
    bio: "I love building user interfaces and teaching others about modern web development.",
    location: { city: "San Francisco", country: "USA" },
    timezone: "America/Los_Angeles",
    skillsOffered: [],
    skillsWanted: [],
  },
  {
    email: "bob@example.com",
    password: "password123",
    name: "Bob Smith",
    age: 32,
    dateOfBirth: new Date("1992-05-22"),
    headline: "Data Analyst with Python expertise",
    bio: "Experienced in data visualization and machine learning basics.",
    location: { city: "New York", country: "USA" },
    timezone: "America/New_York",
    skillsOffered: [],
    skillsWanted: [],
  },
  {
    email: "carol@example.com",
    password: "password123",
    name: "Carol Davis",
    age: 25,
    dateOfBirth: new Date("1999-08-30"),
    headline: "UX Designer and researcher",
    bio: "Passionate about creating intuitive user experiences and conducting user research.",
    location: { city: "London", country: "UK" },
    timezone: "Europe/London",
    skillsOffered: [],
    skillsWanted: [],
  },
  {
    email: "david@example.com",
    password: "password123",
    name: "David Wilson",
    age: 35,
    dateOfBirth: new Date("1989-11-12"),
    headline: "Project Manager with Agile expertise",
    bio: "Certified Scrum Master helping teams deliver better software.",
    location: { city: "Toronto", country: "Canada" },
    timezone: "America/Toronto",
    skillsOffered: [],
    skillsWanted: [],
  },
  {
    email: "eve@example.com",
    password: "password123",
    name: "Eve Brown",
    age: 29,
    dateOfBirth: new Date("1997-03-25"),
    headline: "Content Writer and Marketing Specialist",
    bio: "Creating compelling content and managing social media campaigns.",
    location: { city: "Sydney", country: "Australia" },
    timezone: "Australia/Sydney",
    skillsOffered: [],
    skillsWanted: [],
  },
];

const SAMPLE_EXCHANGE_REQUESTS = [
  {
    status: "completed",
    initiatorNotes: "Looking forward to learning Python data analysis!",
    recipientNotes: "Happy to teach React development basics.",
    completedAt: new Date("2024-03-15T10:00:00Z"),
  },
  {
    status: "completed",
    initiatorNotes: "Excited to learn UX research methods.",
    recipientNotes: "Great session on data analysis techniques.",
    completedAt: new Date("2024-03-20T14:00:00Z"),
  },
  {
    status: "in_progress",
    initiatorNotes: "Need help with Agile project management.",
    recipientNotes: "Can provide guidance on UX research.",
  },
  {
    status: "pending",
    initiatorNotes: "Want to improve my content writing skills.",
    recipientNotes: "Open to learning more about project management.",
  },
  {
    status: "accepted",
    initiatorNotes: "Looking for React development mentorship.",
    recipientNotes: "Happy to share my data analysis knowledge.",
    confirmedSession: {
      start: new Date("2024-04-10T15:00:00Z"),
      end: new Date("2024-04-10T16:00:00Z"),
      timezone: "UTC",
    },
  },
];

const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: "Excellent React tutorial!",
    comment: "Alice was very patient and explained React concepts clearly. I learned a lot about component lifecycle and state management.",
    dimensions: {
      communication: 5,
      punctuality: 5,
      skillQuality: 5,
    },
    wouldExchangeAgain: true,
  },
  {
    rating: 4,
    title: "Great data analysis session",
    comment: "Bob helped me understand pandas and data visualization. Very knowledgeable and responsive to questions.",
    dimensions: {
      communication: 4,
      punctuality: 5,
      skillQuality: 4,
    },
    wouldExchangeAgain: true,
  },
  {
    rating: 5,
    title: "Outstanding UX research guidance",
    comment: "Carol's insights into user research methods were invaluable. She provided practical examples and resources.",
    dimensions: {
      communication: 5,
      punctuality: 5,
      skillQuality: 5,
    },
    wouldExchangeAgain: true,
  },
  {
    rating: 4,
    title: "Helpful Agile coaching",
    comment: "David explained Scrum methodology well and shared real-world examples from his experience.",
    dimensions: {
      communication: 4,
      punctuality: 4,
      skillQuality: 4,
    },
    wouldExchangeAgain: true,
  },
  {
    rating: 5,
    title: "Amazing content writing workshop",
    comment: "Eve taught me how to structure compelling blog posts and improve my writing style. Highly recommended!",
    dimensions: {
      communication: 5,
      punctuality: 5,
      skillQuality: 5,
    },
    wouldExchangeAgain: true,
  },
  {
    rating: 3,
    title: "Decent session but could be better",
    comment: "The information was useful but the pace was a bit fast. Would appreciate more hands-on examples next time.",
    dimensions: {
      communication: 3,
      punctuality: 4,
      skillQuality: 3,
    },
    wouldExchangeAgain: false,
  },
];

export async function seedSampleDataIfEmpty() {
  try {
    // Check if users already exist
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log("Sample data already exists, skipping seeding.");
      return;
    }

    console.log("Seeding sample data...");

    // Get all skills
    const skills = await Skill.find({});
    if (skills.length === 0) {
      console.log("No skills found. Please run seedSkillsIfEmpty first.");
      return;
    }

    // Create skill mappings for users
    const skillMap = {};
    skills.forEach(skill => {
      skillMap[skill.slug] = skill._id;
    });

    // Assign skills to users
    SAMPLE_USERS[0].skillsOffered = [
      {
        skill: skillMap["react-development"],
        proficiency: "advanced",
        yearsExperience: 3,
        teachingAvailability: "regular",
        sessionLengthMinutes: 60,
        notes: "Specializing in React hooks and modern patterns",
      },
    ];
    SAMPLE_USERS[0].skillsWanted = [
      {
        skill: skillMap["python-data-analysis"],
        priority: "high",
        urgency: 7,
        desiredProficiencyTarget: "intermediate",
      },
    ];

    SAMPLE_USERS[1].skillsOffered = [
      {
        skill: skillMap["python-data-analysis"],
        proficiency: "advanced",
        yearsExperience: 4,
        teachingAvailability: "flexible",
        sessionLengthMinutes: 90,
        notes: "Expert in pandas, numpy, and matplotlib",
      },
    ];
    SAMPLE_USERS[1].skillsWanted = [
      {
        skill: skillMap["ux-research"],
        priority: "medium",
        urgency: 5,
        desiredProficiencyTarget: "beginner",
      },
    ];

    SAMPLE_USERS[2].skillsOffered = [
      {
        skill: skillMap["ux-research"],
        proficiency: "expert",
        yearsExperience: 5,
        teachingAvailability: "regular",
        sessionLengthMinutes: 75,
        notes: "Conducting user interviews, usability testing, and analysis",
      },
    ];
    SAMPLE_USERS[2].skillsWanted = [
      {
        skill: skillMap["project-management-agile"],
        priority: "high",
        urgency: 8,
        desiredProficiencyTarget: "intermediate",
      },
    ];

    SAMPLE_USERS[3].skillsOffered = [
      {
        skill: skillMap["project-management-agile"],
        proficiency: "expert",
        yearsExperience: 6,
        teachingAvailability: "occasional",
        sessionLengthMinutes: 60,
        notes: "Certified Scrum Master with enterprise experience",
      },
    ];
    SAMPLE_USERS[3].skillsWanted = [
      {
        skill: skillMap["content-writing"],
        priority: "medium",
        urgency: 4,
        desiredProficiencyTarget: "intermediate",
      },
    ];

    SAMPLE_USERS[4].skillsOffered = [
      {
        skill: skillMap["content-writing"],
        proficiency: "advanced",
        yearsExperience: 3,
        teachingAvailability: "flexible",
        sessionLengthMinutes: 45,
        notes: "Specializing in blog posts, social media, and marketing copy",
      },
    ];
    SAMPLE_USERS[4].skillsWanted = [
      {
        skill: skillMap["react-development"],
        priority: "high",
        urgency: 6,
        desiredProficiencyTarget: "beginner",
      },
    ];

    // Create users
    const createdUsers = [];
    for (const userData of SAMPLE_USERS) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        passwordHash,
      });
      await user.save();
      createdUsers.push(user);
    }

    console.log(`Created ${createdUsers.length} sample users`);

    // Create exchange requests
    const createdExchanges = [];
    for (let i = 0; i < SAMPLE_EXCHANGE_REQUESTS.length; i++) {
      const exchangeData = SAMPLE_EXCHANGE_REQUESTS[i];
      const initiator = createdUsers[i % createdUsers.length];
      const recipient = createdUsers[(i + 1) % createdUsers.length];

      const initiatorSkill = initiator.skillsWanted[0]?.skill;
      const recipientSkill = recipient.skillsOffered[0]?.skill;

      if (!initiatorSkill || !recipientSkill) continue;

      const exchange = new ExchangeRequest({
        ...exchangeData,
        initiator: initiator._id,
        recipient: recipient._id,
        skillOfferedByInitiator: recipientSkill, // What initiator will receive
        skillRequestedFromRecipient: initiatorSkill, // What initiator wants
        matchScore: Math.floor(Math.random() * 40) + 60, // 60-100
      });

      await exchange.save();
      createdExchanges.push(exchange);
    }

    console.log(`Created ${createdExchanges.length} sample exchange requests`);

    // Create reviews for completed exchanges
    const completedExchanges = createdExchanges.filter(ex => ex.status === "completed");
    const createdReviews = [];

    for (let i = 0; i < Math.min(completedExchanges.length, SAMPLE_REVIEWS.length); i++) {
      const exchange = completedExchanges[i];
      const reviewData = SAMPLE_REVIEWS[i];

      // Review from recipient about initiator (who received the skill)
      const review = new Review({
        ...reviewData,
        exchangeRequest: exchange._id,
        reviewer: exchange.recipient,
        reviewee: exchange.initiator,
      });

      await review.save();
      createdReviews.push(review);

      // Update exchange with review reference
      exchange.relatedReviews.push(review._id);
      await exchange.save();
    }

    console.log(`Created ${createdReviews.length} sample reviews`);

    // Update user stats
    for (const user of createdUsers) {
      const reviewsReceived = await Review.find({ reviewee: user._id });
      const completedExchanges = await ExchangeRequest.find({
        $or: [
          { initiator: user._id, status: "completed" },
          { recipient: user._id, status: "completed" },
        ],
      });

      user.reviewCount = reviewsReceived.length;
      user.completedExchangeCount = completedExchanges.length;
      user.averageRating = reviewsReceived.length > 0
        ? reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length
        : 0;

      await user.save();
    }

    console.log("Sample data seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding sample data:", error);
  }
}