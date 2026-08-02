# KrishiSeva — Government Agriculture Booking & Subsidy Portal

KrishiSeva is a full-stack booking system designed for government distribution of subsidized agricultural supplies (seeds and fertilizers). This project is specifically designed to demonstrate **high-concurrency safety** and **transaction verification** (like payment processing) to placement interviewers.

---

## 🚀 Key Architectural Features
1. **Subsidy Quota Control**: Restricts the maximum bags of subsidized goods a farmer can book based on land size.
2. **Concurrency-Safe Inventory Checks**: Uses atomic MongoDB updates (`$inc` and query limits) to guarantee stock never drops below zero, avoiding race conditions during peak load.
3. **Interactive Stress Tester**: A built-in frontend testing panel that lets you fire 10 concurrent requests simultaneously to demonstrate the difference between unsafe and safe endpoints.

---

## 🛠️ Tech Stack
*   **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphic Dark UI), Vanilla JS
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (Mongoose ODM)

---

## 📂 Project Structure
```
fullstack/
├── public/                 # Static frontend assets
│   ├── index.html          # Main UI
│   ├── style.css           # Premium styling
│   └── app.js              # Client state, rendering, and concurrency test runner
├── src/
│   ├── config/             # MongoDB connection setup
│   │   └── db.js
│   ├── models/             # Mongoose Schemas (Farmer, Supply, Booking)
│   ├── controllers/        # Business logic containing safe & unsafe endpoints
│   │   └── bookingController.js
│   ├── routes/             # API routes
│   │   └── api.js
│   └── server.js           # Server runner
├── scripts/
│   └── seed.js             # Script to populate initial database state
├── package.json            # Dependencies & start scripts
└── .env                    # Environment variables (port, db connection)
```

---

## ⚙️ Setup and Installation

### 1. Install Dependencies
Run the following command in the root folder to install dependencies:
```bash
npm install
```

### 2. Configure MongoDB
Ensure you have MongoDB running locally. The default connection URI is configured in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/krishiseva
```

### 3. Seed Database
Load the initial mock farmer (Rajesh Kumar) and supplies (Wheat Seeds starting with exactly **10 bags** in stock):
```bash
npm run seed
```

### 4. Start Server
Run the Express application:
```bash
npm start
```
Open your browser and navigate to **[http://localhost:5000](http://localhost:5000)**.

---

## 🧠 Concurrency Demonstration (Interview Guide)

### 🔴 Unsafe Booking (Race Condition)
*   **Endpoint**: `/api/book/unsafe`
*   **Mechanism**: Read-Then-Write. The server fetches the stock level, checks if there's enough inventory, waits/processes for 1.5 seconds, then decrements stock and writes to the DB.
*   **The Bug**: If 10 requests hit the server concurrently, all 10 read the stock before any write has occurred. All 10 approve the purchase.
*   **Result**: Stock falls to **negative values** (e.g., stock starts at 10, but 10 bags are booked and Rajesh's quota usage goes past the limit).

### 🟢 Safe Booking (Atomic Validation)
*   **Endpoint**: `/api/book/safe`
*   **Mechanism**: Atomic updates. Utilizes Mongoose's `findOneAndUpdate` checking conditions on-the-fly:
    ```javascript
    const updatedSupply = await Supply.findOneAndUpdate(
      { _id: supplyId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );
    ```
*   **The Guard**: MongoDB ensures operations are serialized. If the stock check `stock: { $gte: quantity }` fails during updates, no update is executed. The same pattern is applied to the Farmer's Quota.
*   **Result**: Inventory is correctly decremented, requests exceeding the available stock or farmer quota are safely rejected, and stock **never drops below 0**.
