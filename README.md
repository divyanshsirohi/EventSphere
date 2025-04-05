# EventSphere

## Overview

EventSphere is a comprehensive event management platform designed to streamline the process of hosting, attending, and managing events. It provides a user-friendly interface for hosts to create and manage events, members to discover and register for events, and administrators to oversee the entire system.

## Key Features

- **User Authentication:** Secure login and registration with role-based access control.
- **Event Management:** Hosts can create, edit, and delete events with detailed information.
- **Registration System:** Members can register for events, with status tracking (confirmed, pending, cancelled).
- **Notifications:** Real-time updates for event changes, registrations, and reminders.
- **Admin Dashboard:** Comprehensive tools for managing users, events, locations, and categories.
- **Responsive Design:** Built with Tailwind CSS for a modern, responsive user interface.
- **Database Integration:** PostgreSQL for robust data storage and retrieval.

## Tech Stack

- **Frontend:** 
  - EJS for templating
  - Tailwind CSS for styling
  - JavaScript for client-side interactions
- **Backend:** 
  - Node.js with Express.js
  - PostgreSQL for database management
- **Authentication:** 
  - Session-based authentication with bcrypt for password hashing
- **File Handling:** 
  - Multer for handling event image uploads

## Project Structure

eventsphere/
├── public/

│ ├── css/

│ ├── js/

│ └── images/

├── views/

│ ├── auth/

│ ├── member/

│ ├── host/

│ ├── admin/

│ └── partials/

├── routes/

├── models/

├── middleware/

├── config/

├── app.js

├── package.json

└── .env


## Getting Started

1. **Clone the Repository:**
git clone https://github.com/yourusername/eventsphere.git
cd eventsphere


2. **Install Dependencies:**
npm install


3. **Set Up Environment Variables:**
- Create a `.env` file in the root directory with your database credentials and session secret.


4. **Set Up the Database:**
node setup-db.js


5. **Run the Application:**
npm run dev


6. **Access the Website:**
Open your browser and navigate to `http://localhost:3000`.

## Usage

- **Admin:** Log in with the default admin credentials to access the admin dashboard for system-wide management.
- **Host:** Create and manage events, view registrations, and send notifications to participants.
- **Member:** Discover events, register, and track your event participation.


---

*This project was developed with a focus on scalability, security, and user experience, making it an excellent showcase of full-stack development skills.*
