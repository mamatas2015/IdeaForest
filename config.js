/* ============================================================
   IdeaForest settings — this is the ONLY file you need to edit.
   Open it in GitHub (pencil icon), change the values, and save.
   ============================================================ */
window.IF_CONFIG = {

  /* 1) Your Firebase details (see the Setup Guide, Part 1).
        Until you replace the PASTE_... values, the site runs in
        DEMO MODE: it works, but nothing is shared between people. */
  firebase: {
    apiKey: "PASTE_YOUR_API_KEY",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    databaseURL: "PASTE_YOUR_DATABASE_URL",
    projectId: "PASTE_YOUR_PROJECT_ID",
    appId: "PASTE_YOUR_APP_ID"
  },

  /* 2) The name picklist: the attendees, plus Mamata (facilitator) so she
        can plant and delete test ideas. Each name appears exactly once.
        Keep every name inside quotes, separated by commas. */
  NAMES: [
    "Saloni Garg", "Gaurav Kapoor", "Abhishek Kumar", "Anupam Mallik",
    "Nikhil Puri", "Deepak Yadav", "Devendra Sharma", "Salvador Manuel Fialho",
    "Manish Sundriyal", "Latika Jaggi", "Bhavna Tiwari", "Ayushi Gupta",
    "Ruhi Kulshrestha", "Rishav Sircar", "Amit Nangia", "Niti Arora",
    "Mamata Shukla"
  ],

  /* 3) The two shared sign-in accounts. Leave these emails as they are.
        They are only labels (no email is ever sent). You create the two
        accounts in Firebase (Setup Guide, Part 1) and choose their passwords:
          TEAM  = the password you email to participants (pre-workshop page)
          ROOM  = the password you only share in the workshop room (workshop page)
        Your own admin email is NOT listed here; you type it when you log in. */
  TEAM_EMAIL: "team@ideaforest.example",
  ROOM_EMAIL: "room@ideaforest.example",

  /* 4) How many net votes turn an idea into a full tree.
        With ~15 people and no voting on your own idea, the maximum
        is 14, so keep this at 8 or below. */
  TREE_THRESHOLD: 8,

  /* 5) Wording shown on the site. */
  WORKSHOP_TITLE: "Transformation & Projects Workshop",

  /* 6) The journeys. Keep the ids as they are; edit the labels freely. */
  JOURNEYS: [
    { id: "disruption", label: "Disruption: communication, hotels & compensation" },
    { id: "assisted",   label: "Assisted travel: wheelchair & medical" },
    { id: "premium",    label: "Premium handling: VIP & CIP" },
    { id: "other",      label: "Other service-delivery moment (explain in the idea)" }
  ],

  /* 7) Demo mode only: the admin password to use while trying the
        site before Firebase is connected. Ignored once Firebase is set up. */
  DEMO_ADMIN_PASSWORD: "admin"
};
