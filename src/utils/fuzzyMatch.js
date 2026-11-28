// utils/fuzzyMatch.js
import Fuse from "fuse.js";

export const fuzzyMatchItem = (itemName, menuItems) => {
  const fuse = new Fuse(menuItems, {
    keys: ["name"],
    includeScore: true,
    threshold: 0.175,
  });

  const results = fuse.search(itemName);
  
  if (results.length === 0) return null;
  return results[0]; // best match
};