import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Calculates the user's level based on total XP.
 * @param {number} xp - Total XP of the user.
 * @returns {number} - The calculated level.
 */
const calculateLevel = (xp) => {
  let level = 1;
  let xpThreshold = 100; // XP required for level 2

  while (xp >= xpThreshold) {
    level++;
    xp -= xpThreshold;
    xpThreshold += 50; // Increase threshold for each level
  }

  return level;
};

/**
 * Fetches the user's XP and calculates their level.
 * If the user document does not exist, initialises it with default values.
 * @param {string} userId - The user's ID.
 * @returns {Promise<{ xp: number, level: number }>} - The user's XP and level.
 */
export const fetchXPAndLevel = async (userId) => {
  const userDocRef = doc(db, "users", userId, "profile", "details");
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const totalXP = userDoc.data().totalXP || 0;
    const level = calculateLevel(totalXP);
    return { xp: totalXP, level };
  } else {
    // Initialise the document with default values
    const defaultData = {
      totalXP: 0,
      level: 1,
      preferredName: "User", // Optional additional field
    };

    await setDoc(userDocRef, defaultData);
    return { xp: defaultData.totalXP, level: defaultData.level };
  }
};
