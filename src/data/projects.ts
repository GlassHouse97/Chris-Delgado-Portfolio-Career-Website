import catalog from "./projects.json";

export interface PortfolioProject {
  slug: string;
  category: string;
  emoji: string;
  title: string;
  summary: string;
  repo: string;
  caseStudy?: string;
  live?: string;
  liveLabel?: string;
  accent: string;
  skills: string[];
  preview?: string;
  image?: string;
  imageAlt?: string;
}

const projects: PortfolioProject[] = catalog;
export default projects;
