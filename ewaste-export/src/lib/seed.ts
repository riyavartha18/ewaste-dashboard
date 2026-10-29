// Initial seed metadata for the E-Waste Submission Portal.
// These records intentionally have NO uploaded files and published=false.
// The owner will attach files later via the dashboard.

import type { SubmissionStatus } from "@/lib/types";

export interface SeedSubmission {
  title: string;
  category: string;
  submission_date: string;   // ISO YYYY-MM-DD
  status: SubmissionStatus;
  description?: string;
  published: boolean;
}

export const SEED_SUBMISSIONS: SeedSubmission[] = [
  {
    title: "IEEE Paper Submission Folder",
    category: "Research Paper",
    submission_date: "2026-10-20",
    status: "completed",
    description: "Submission folder for the IEEE-format academic paper on e-waste management.",
    published: false,
  },
  {
    title: "Case Study Report Submission",
    category: "Case Study",
    submission_date: "2026-10-04",
    status: "completed",
    description: "Final case study report submission for course evaluation.",
    published: false,
  },
  {
    title: "LEED Certificate Rating System of Green Building in India",
    category: "Report",
    submission_date: "2026-09-28",
    status: "completed",
    description: "Overview of the LEED certificate rating system applied to green buildings in India.",
    published: false,
  },
  {
    title: "E-waste Campaign Documents — Class Activity",
    category: "Class Activity",
    submission_date: "2026-09-07",
    status: "completed",
    description: "Campaign documents prepared as part of an in-class activity on e-waste awareness.",
    published: false,
  },
  {
    title: "Companies Following E-waste Rules in India",
    category: "Report",
    submission_date: "2026-08-31",
    status: "completed",
    description: "Survey of companies in India that follow established e-waste rules.",
    published: false,
  },
  {
    title: "E-waste Recovery Process — Description with Suggested Changes",
    category: "Report",
    submission_date: "2026-08-25",
    status: "draft",
    description: "Description of the e-waste recovery process with suggested improvements.",
    published: false,
  },
  {
    title: "E-waste — Comparison of Rules of Different Countries",
    category: "Comparison",
    submission_date: "2026-08-25",
    status: "completed",
    description: "Comparative analysis of e-waste regulations across multiple countries.",
    published: false,
  },
  {
    title: "Novel Ideas for E-waste — PPT Submission for Pitch Deck",
    category: "Pitch Deck",
    submission_date: "2026-08-21",
    status: "completed",
    description: "Pitch-deck slides presenting novel ideas for managing e-waste.",
    published: false,
  },
  {
    title: "Carbon Footprint Tracker — Data Upload",
    category: "Data Tracker",
    submission_date: "2026-08-11",
    status: "completed",
    description: "Carbon footprint tracker data compiled for the assignment.",
    published: false,
  },
  {
    title: "State-wise E-waste Tracker — PPT",
    category: "Data Tracker",
    submission_date: "2026-08-11",
    status: "completed",
    description: "State-wise e-waste generation tracker presented as a slide deck.",
    published: false,
  },
  {
    title: "E-waste India Scenario — Comparison",
    category: "Comparison",
    submission_date: "2026-08-04",
    status: "completed",
    description: "Comparison of the e-waste scenario in India across multiple dimensions.",
    published: false,
  },
  {
    title: "Assignment ZERO",
    category: "Assignment",
    submission_date: "2026-07-26",
    status: "completed",
    description: "Initial Assignment ZERO marker for the course.",
    published: false,
  },
  {
    title: "Assignment 1 — E-waste Tracker by Excel",
    category: "Assignment",
    submission_date: "2026-07-23",
    status: "completed",
    description: "Excel-based e-waste tracker submitted as Assignment 1.",
    published: false,
  },
  {
    title: "Class Task — Upload the Write-up Done in Class",
    category: "Class Activity",
    submission_date: "2026-07-02",
    status: "completed",
    description: "Write-up completed during class and uploaded for review. This is the first submission of the course.",
    published: false,
  },
];
