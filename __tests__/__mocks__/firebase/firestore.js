// __mocks__/firebase/firestore.js
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn().mockReturnValue({}),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));
