# ⚡ Quick.Ai — Enterprise AI Productivity & RAG Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-quick--ai.vercel.app-00dfa2?style=for-the-badge&logo=vercel&logoColor=white)](https://quick-ai-client-ecru.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-QuickAI-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Sonuraj804456/QuickAI)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.6_Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://aistudio.google.com)
[![Stripe](https://img.shields.io/badge/Stripe-Subscription_Billing-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)
[![Clerk](https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com)

> **Quick.Ai** is a production-grade, full-stack AI SaaS platform combining **Retrieval-Augmented Generation (RAG)**, **ATS resume-to-job matching**, **multi-model media creation**, and **subscription monetization**. Built with React 19, Express 5, Neon Serverless PostgreSQL with `pgvector`, and Google Gemini.

---

## 🌟 Key Features

### 1. 📄 Chat with PDF (Native Vector RAG Knowledge Base)
* **Custom Sliding-Window Chunking:** Ingests PDF documents (up to 10MB) via `pdf-parse` and segments text into 350-word chunks with a **70-word (20%) sliding overlap** to preserve boundary context.
* **768-D Vector Embeddings:** Computes normalized dense vector representations using Google's `gemini-embedding-001`.
* **HNSW Cosine Similarity Search:** Uses Neon PostgreSQL's `pgvector` extension with an **HNSW (Hierarchical Navigable Small World)** vector index for sub-second, logarithmic nearest-neighbor retrieval (`<=>`).
* **Grounded Synthesis & Citations:** Injects the top-4 most relevant excerpts into `gemini-3.6-flash`, providing structured answers with expandable source cards (Chunk ID, Similarity %, and excerpts).
* **Zero-Crash Resilience:** Includes an automated local normalized semantic vector generator as a fail-safe against external API rate limits or credential revocations.

### 2. 🎯 ATS Resume & Job Description Matcher
* **Semantic Compatibility Scoring:** Evaluates candidate resumes against target job descriptions, outputting a quantifiable ATS compatibility score (0–100%).
* **Gap Analysis:** Identifies directly matched strengths vs. critical missing technical keywords and domain competencies.
* **Metric-Driven Bullet Rewrites:** Generates line-by-line resume optimizations structured around the Google XYZ formula (`Accomplished [X], as measured by [Y], by doing [Z]`).
* **Strategic Interview Guidance:** Flags potential concerns and probing questions technical interviewers might ask based on skill gaps.

### 3. ✍️ Generative Content Studio
* **Long-Form Article Generator:** Generates comprehensive, SEO-optimized articles with customizable length, tone, and structural constraints.
* **Viral Blog Title Generator:** Creates high-converting, click-worthy headline options tailored for engagement.
* **Creation History:** Automatically logs all generated artifacts in PostgreSQL for easy retrieval and management.

### 4. 🎨 AI Media & Vision Studio
* **Text-to-Image Generation:** Generates high-fidelity visual assets from natural language prompts using the **Clipdrop API** (Stability AI diffusion models).
* **AI Background Removal:** Removes image backgrounds with pixel precision via **Cloudinary Neural AI**.
* **AI Object Eraser / Inpainting:** Seamlessly detects and erases unwanted objects from photos with context-aware generative fill.

### 5. 💳 Monetization & Freemium Usage Gating
* **Freemium Tier:** Free accounts receive **10 complimentary AI operations**, tracked atomically in Clerk's `privateMetadata.free_usage`.
* **Stripe Subscription Billing:** Supports upgrade workflows with hosted Stripe Checkout sessions and customer portal self-service.
* **Tamper-Proof Webhook Engine:** Mounts `/api/payment/webhook` with `express.raw()` for HMAC-SHA256 signature verification, handling `checkout.session.completed` and `customer.subscription.deleted`.

### 6. 🔒 Enterprise-Grade Multi-Tenant Security
* **Stateless JWT Authentication:** Verified on every private route using Clerk JWKS cryptographic verification.
* **Strict Row-Level Isolation:** Every database operation binds `WHERE user_id = $userId`, completely preventing Insecure Direct Object Reference (IDOR) attacks across customer data.
* **Ephemeral File Lifecycle:** Uploaded files in Multer pipelines are processed and immediately purged via `fs.unlinkSync()`.

---

## 🏛️ System Architecture

```
                                      +-----------------------------------------+
                                      |         Client Tier (React 19)          |
                                      |  Vite • Tailwind CSS • Lucide • Axios   |
                                      +--------------------+--------------------+
                                                           |
                                           HTTPS + Clerk Session JWT
                                                           |
                                                           v
                                      +--------------------+--------------------+
                                      |         Backend Tier (Express 5)        |
                                      |   Clerk requireAuth() • Rate Limiter    |
                                      +----+---------------+---------------+----+
                                           |               |               |
               +---------------------------+               |               +---------------------------+
               |                                           |                                           |
               v                                           v                                           v
+--------------+-------------+             +---------------+--------------+            +---------------+---------------+
|       PostgreSQL (Neon)     |             |       Google Gemini API      |            |     Media & Billing APIs      |
|  * pgvector extension       |             |  * gemini-3.6-flash          |            |  * Stripe (Checkout & Webhooks|
|  * HNSW Cosine Index (<=>)  |             |  * gemini-embedding-001      |            |  * Clipdrop (Diffusion Image) |
|  * Multi-tenant Isolation   |             |  * Zero-crash Vector Fallback|            |  * Cloudinary (Vision AI)     |
+-----------------------------+             +------------------------------+            +-------------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technologies & Services |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide React, React Markdown, React Hot Toast, Axios |
| **Backend** | Node.js, Express 5, Multer, `pdf-parse`, FormData |
| **Database** | Neon Serverless PostgreSQL 17.11 with **`pgvector`** (HNSW Indexing) |
| **AI Models** | Google Gemini 3.6 Flash, Gemini 3 Flash Preview, Gemini-Embedding-001 (768-D) |
| **Vision & Media** | Clipdrop API (Text-to-Image), Cloudinary AI (Object / Background Removal) |
| **Authentication** | Clerk Auth (`@clerk/express`, JWT JWKS verification) |
| **Payments** | Stripe API (Subscriptions, Customer Portal, Webhook Handlers) |
| **Hosting** | Vercel (Frontend SPA & Serverless Node.js backend) |

---

## 🗄️ Database Schema (Neon PostgreSQL)

```sql
-- 1. Enable Vector Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Generations History
CREATE TABLE creations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'article', 'blog-title', 'resume-review', 'image'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Knowledge Base (RAG)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    total_chunks INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Document Chunks & Vector Embeddings (768-D)
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Performance Indexes
CREATE INDEX idx_doc_chunks_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_doc_chunks_user_doc ON document_chunks(user_id, document_id);
```

---

## 📁 Repository Structure

```
QuickAI/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── assets/             # Branding, illustrations, and tool metadata
│   │   ├── components/         # Navbar, Sidebar, Footer, Plan Modal
│   │   ├── pages/              # Dashboard, ChatPdf (RAG), ReviewResume, etc.
│   │   ├── App.jsx             # Router and navigation definitions
│   │   └── main.jsx            # Clerk provider mounting
│   ├── .env                    # Client environment configuration
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API (Node.js + Express 5)
│   ├── configs/                # DB (Neon pgvector), Cloudinary, Stripe configs
│   ├── controllers/            # aiController, ragController, paymentController
│   ├── middlewares/            # Clerk auth gating and freemium check
│   ├── routes/                 # aiRoutes, ragRoutes, paymentRoutes, userRoutes
│   ├── services/               # ragService (chunking, 768-D embedding, fallback)
│   ├── .env.example            # Backend environment template
│   ├── package.json
│   └── server.js               # Entrypoint & webhook raw body mount
│
└── README.md
```

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js** v18+ installed
* A **Neon PostgreSQL** database with `pgvector` enabled
* API Keys for **Clerk**, **Google Gemini**, **Stripe**, **Clipdrop**, and **Cloudinary**

---

### 1. Clone the Repository
```bash
git clone https://github.com/Sonuraj804456/QuickAI.git
cd QuickAI
```

### 2. Configure Backend (`server/`)
Create `server/.env`:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Models & APIs
Gemini_API_Key=AIzaSy...
CLIPDROP_API_KEY=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CURRENCY=usd
CLIENT_URL=http://localhost:5173
```

Install dependencies and start the backend:
```bash
cd server
npm install
npm run server
```

---

### 3. Configure Frontend (`client/`)
Create `client/.env`:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_BASE_URL=http://localhost:3000
```

Install dependencies and start Vite dev server:
```bash
cd ../client
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser!

---

## 🔌 API Endpoints Reference

### AI & Media Routes (`/api/ai`)
* `POST /api/ai/generate-article` — Generates long-form markdown articles.
* `POST /api/ai/generate-blog-title` — Generates viral, SEO-optimized title ideas.
* `POST /api/ai/generate-image` — Text-to-image synthesis via Clipdrop.
* `POST /api/ai/remove-background` — Automated background transparency via Cloudinary.
* `POST /api/ai/remove-object` — Neural object erasure & inpainting.
* `POST /api/ai/review-resume` — ATS semantic evaluation against target Job Descriptions.

### RAG Routes (`/api/rag`)
* `POST /api/rag/upload-document` — Ingests, chunks, embeds, and indexes PDF files into `pgvector`.
* `GET /api/rag/documents` — Fetches all indexed documents belonging to the authenticated user.
* `POST /api/rag/query` — Executes cosine similarity vector retrieval and returns grounded answers with citations.
* `DELETE /api/rag/document/:id` — Deletes document record and cascade-deletes vector chunks.

### Billing Routes (`/api/payment`)
* `POST /api/payment/stripe` — Creates a Stripe Checkout Session for subscription upgrade.
* `POST /api/payment/customer-portal` — Generates a self-service Stripe billing portal session.
* `POST /api/payment/webhook` — Handles raw Stripe events (`checkout.session.completed`, etc.).

---

## 💡 Engineering Highlights: Why Native RAG Over LangChain?

In Quick.Ai, we deliberately implemented our RAG pipeline natively in Node.js rather than pulling in LangChain:

1. **Serverless Latency & Cold Starts:** LangChain's large bundle footprint (~25MB+) degrades Vercel serverless cold starts by 3–5 seconds. Our native pipeline starts in milliseconds.
2. **Transparent Multi-Tenant SQL:** Direct relational filtering (`WHERE user_id = $userId AND document_id = $docId ORDER BY embedding <=> $vector`) ensures row-level multi-tenancy in a single database round-trip without complex wrapper configurations.
3. **Failsafe Architecture:** Allows deterministic local high-dimensional vector fallbacks when third-party API providers throttle requests.
4. **No Library Breaking Changes:** Eliminates reliance on rapidly evolving framework abstractions (`LCEL`, `RetrievalQAChain`), ensuring long-term maintainability.

---

## 👨‍💻 Author

**Sonu Kumar**
* **GitHub:** [@Sonuraj804456](https://github.com/Sonuraj804456)
* **Live App:** [Quick.Ai Platform](https://quick-ai-client-ecru.vercel.app)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
