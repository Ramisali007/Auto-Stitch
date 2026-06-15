# 🧵 Auto Stitch - Next-Gen Custom Tailoring E-Commerce

![Auto Stitch Banner](https://via.placeholder.com/1200x400.png?text=Auto+Stitch+-+MERN+Marketplace+with+AI+Try-On)

> A full-stack MERN marketplace revolutionizing custom tailoring. Auto Stitch empowers boutiques and customers to collaborate via a unique bidding system. Features include real-time Socket.io chat, Stripe payments, AI virtual try-ons, and dynamic animations for a premium shopping experience.

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-black.svg)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-blue.svg)](https://stripe.com/)

---

## ✨ Standout Features

### 🛒 Multi-Vendor Marketplace
Seamlessly bridges **Customers** (buyers) and **Boutique Owners** (sellers). Boutiques have dedicated dashboards to manage inventory, fulfill orders, and monitor analytics.

### 👔 Custom Clothing Bidding Engine
A unique system where customers can submit custom stitching requirements, and boutiques can bid on those requests, creating a dynamic marketplace for tailored clothing.

### 🤖 AI Virtual Try-On & Recommendations
Integrated with Gemini and FashionCLIP vector embeddings, allowing users to virtually test clothing and receive semantic, AI-driven product recommendations.

### 💬 Real-Time Messaging & Chatbot
Powered by **Socket.io**, customers can chat directly with boutiques instantly. An integrated AI chatbot is also available globally for support.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Framer Motion, GSAP, Tailwind / Vanilla CSS, React Router DOM
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB (Mongoose ODM)
- **Services**: Cloudinary (Image Hosting), Stripe (Payments), Nodemailer (Emails), Google OAuth

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)
- API Keys: Stripe, Cloudinary, Google Generative AI

### 1. Clone the repository
```bash
git clone https://github.com/Ramisali007/Auto-Stitch.git
cd Auto-Stitch
```

### 2. Setup Environment Variables
Create `.env` files in both the `frontend` and `backend` directories. Ensure you configure your MongoDB URI, JWT secrets, and API keys.

### 3. Install Dependencies & Run
**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173/`

---

## 🔒 Security
- **Helmet.js** for securing HTTP headers.
- **Express-rate-limit** to prevent DDoS and brute-force attacks.
- **Bcrypt.js** for password hashing.
- **Express-Validator & Zod** for robust payload sanitization.

---

**Developed for FYP.**
