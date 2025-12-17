export const DOCS_STRUCTURE = {
app: {
title: "The App Folder (The Website Rooms)",
description: `
This folder represents **everything users can see and visit** on the website.


If the website was a house 🏠:
- This folder contains all the rooms
- Each room is a page


If this folder did not exist, the website would not exist.
`,
files: {
"(auth)": {
title: "Public Pages (Front Desk)",
explanation: `
These pages are open to **everyone**, even people who are not logged in.


Examples:
- Sign in page
- Sign up page


Think of this like:
> The reception area of a building
`
},
"(protected)": {
title: "Private Pages (Locked Rooms)",
explanation: `
These pages are **locked**.


Only users who are logged in can enter.


If someone tries to enter without permission:
➡️ They are sent back to the sign‑in page.Think of this like:
> An office room that needs a key card 🔐
`
},
"layout.tsx": {
title: "The Building Structure",
explanation: `
This file controls things that **never disappear**.


For example:
- Sidebar
- Background color
- Page layout


Think of this like:
> Walls, floor, and ceiling of a building
`
},
"page.tsx": {
title: "A Single Page",
explanation: `
Each page.tsx file represents **one screen** a user can see.


Examples:
- The Docs page
- The Sign‑In page


Think of this like:
> One room inside the house
`
}
}
},


lib: {
title: "The Brain (Decisions & Logic)",
description: `
This folder is the **brain** of the application.


Users never see this part.


It makes decisions like:
- Who is logged in?
- Who is allowed in?
- What happens when a button is clicked?


Think of this like:
> The brain inside a human body 🧠
`,
files: {
actions: {
title: "Actions (Doing Things)",
explanation: `
This folder performs actions when users do something.


Examples:
- Logging in
- Logging out
- Checking user identity


Think of this like:
> Pressing buttons on a remote control
`
},
appwrite: {
title: "Server Communication",
explanation: `
This folder talks to the online server where data is stored.


It handles:
- User accounts
- Emails
- Passwords
- Avatars


Think of this like:
> Making a phone call to a storage warehouse ☁️
`
},
utils: {
title: "Small Helper Tools",
explanation: `
These are tiny helpers used everywhere.


They save time and reduce mistakes.


Think of this like:
> Tools inside a toolbox 🧰
`
}
}
},


components: {
title: "Reusable Building Blocks",
description: `
This folder contains **pieces of the website** that can be reused many times.


Build once → use everywhere.


Think of this like:
> LEGO blocks 🧩
`,
files: {
ui: {
title: "Basic Design Pieces",
explanation: `
These are basic visual parts.


Examples:
- Buttons
- Input boxes
- Cards


Think of this like:
> LEGO shapes
`
},
docs: {
title: "Documentation System",
explanation: `
This folder controls how documentation is displayed.


It powers:
- Sidebar
- Docs pages
- Navigation


Think of this like:
> A book's table of contents 📖
`
},
modals: {
title: "Popup Windows",
explanation: `
These are small windows that appear on top of the screen.


Examples:
- Warnings
- Confirmations


Think of this like:
> A popup asking "Are you sure?"
`
}
}
}
} 