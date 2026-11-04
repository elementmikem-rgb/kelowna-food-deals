// Public identity details for the site's Organization structured data. Only real, owner-confirmed
// values go here: an empty list or null leaves the field out of the markup rather than guessing.
export interface OrgProfile {
  // Official profile pages (Facebook page, Instagram, LinkedIn...) for knowledge-graph matching.
  sameAs: string[];
  // A mailbox people can reach, published as a ContactPoint.
  contactEmail: string | null;
}

export const ORG_PROFILE: OrgProfile = {
  sameAs: [],
  contactEmail: null,
};
