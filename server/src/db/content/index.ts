import type { SeedCourse } from './types.js';
import { itSystemsFoundations } from './courses/it-systems-foundations.js';
import { webDevelopmentFoundations } from './courses/web-development-foundations.js';
import { linuxCommandLineEssentials } from './courses/linux-command-line-essentials.js';
import { relationalDatabasesAndSql } from './courses/relational-databases-and-sql.js';
import { backendApisWithNode } from './courses/backend-apis-with-node.js';
import { gitAndCicdWorkflows } from './courses/git-and-cicd-workflows.js';
import { cloudArchitectureAndScalability } from './courses/cloud-architecture-and-scalability.js';
import { appliedCybersecurity } from './courses/applied-cybersecurity.js';

/** Order here becomes the catalog display order within each level. */
export const catalog: SeedCourse[] = [
  itSystemsFoundations,
  webDevelopmentFoundations,
  linuxCommandLineEssentials,
  relationalDatabasesAndSql,
  backendApisWithNode,
  gitAndCicdWorkflows,
  cloudArchitectureAndScalability,
  appliedCybersecurity,
];

export type { SeedCourse, SeedChapter, SeedQuestion, CourseLevel } from './types.js';
