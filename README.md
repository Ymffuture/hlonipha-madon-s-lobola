# Hlonipha & Madon’s Lobola

Build a beautiful, premium, mobile-responsive online invitation website for H & M's Lobola Celebration, a traditional Xitsonga wedding celebration in South Africa.

Use background images in footer and favicon 

You have to sign in for Admin part and no need to sign up for filling out the form Google and apple sign up/in

Admin email futurekgomotso@gmail.com 

TECH STACK:

React, TypeScript, Tailwind CSS, Supabase PostgreSQL, Supabase Authentication, and Row Level Security (RLS).



1. DESIGN AND VIDEO HERO

Create an elegant, culturally inspired design using ivory (#F8F0DF), chocolate brown (#4B2A18), gold (#B87924), and beige (#E9DCC8). Use elegant typography, subtle Xitsonga-inspired patterns, and floral decorations.



The hero must feature a full-screen cinematic background video showing tasteful traditional celebration details, warm lighting, or elegant fabrics. The video must autoplay muted, loop, play inline on mobile, and have a poster image and fallback. Never fabricate footage of the couple.



Display:

"H & M"

"It's Time to Ululate"

"Hlonipha & Madon's Lobola Luncheon"



Include "View Invitation" and "RSVP Now" buttons.



2. EVENT DETAILS

Couple: Hlonipha & Madon

Event: Lobola Luncheon

Date: 22 December 2026

Time: 10:30 AM

Venue: Xihoko Village, Tzaneen, South Africa

Dress code: Traditional Xitsonga Attire

RSVP contact: 078 326 4716



Include a welcome message celebrating love, family, and tradition, a dynamic countdown using the Africa/Johannesburg time zone, and a directions button. Make event details editable by the administrator.



3. RSVP FORM

Create a functional attendance form collecting:

- Full name (required)

- Phone number (required)

- Email (optional)

- Attendance: Attending, Not Attending, or Undecided

- Number of guests

- Additional guest names

- Dietary requirements (optional)

- Accessibility requirements (optional)

- Message to the couple (optional)



Validate inputs, prevent duplicate submissions, display loading and error states, and show a success message only after the database confirms the response was saved. Include a privacy notice.



4. SECURE ADMIN DASHBOARD

Create a protected /admin route with Supabase Authentication. Only authorised administrators may access it. Do not provide public administrator registration.



Dashboard features:

- View all RSVP submissions in a searchable, sortable table.

- Filter by attendance status.

- View complete guest details.

- Edit and delete records with confirmation.

- Display actual totals for responses, attending guests, expected attendees, declines, and undecided responses.

- Export real guest data to CSV.

- Edit event details, welcome message, hero video URL, theme colours, and maximum guest count.

- Sign out securely.



All statistics and records must come from the real database, never hardcoded or mock data.



5. DATABASE AND SECURITY

Use Supabase PostgreSQL to persist RSVP submissions and Supabase Authentication for administrators.



Create an RSVP table containing guest details, attendance status, guest count, and timestamps.



Enable and correctly configure Row Level Security. Public visitors may submit RSVPs through a restricted, secure mechanism but must never read the guest list or access other guests' private information.



Verify administrator permissions on the backend. Protect all administrative operations and CSV exports. Never expose service-role keys or secrets in frontend code.



6. TECHNICAL QUALITY

Use reusable React components, TypeScript types, accessible forms, responsive layouts, optimised video loading, and proper loading, empty, success, and error states.



Ensure the website works on mobile, tablet, and desktop.



Build the public invitation, functional RSVP submission, real database integration, and protected admin dashboard. Test database persistence, permissions, authentication, filtering, editing, deletion, and CSV export.



Do not simulate functionality or claim that data has been saved unless the operation succeeds. Explain any configuration still required before deployment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5d3fa7f1-6f0c-40b3-901d-923cd0b930dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
