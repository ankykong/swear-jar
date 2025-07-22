# 💰 SwearJar - Virtual Swear Jar with Bank Integration

Turn your bad habits into good money! SwearJar is a modern fintech application that helps you break bad habits by putting real money on the line. Connect your bank account, create shared swear jars with friends and family, and watch your money grow every time you slip up.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/swearjar)

## ✨ Features

### 🎯 **Core Features**
- **Virtual Swear Jars** - Create digital money containers for different bad habits
- **Multi-User Support** - Share jars with friends, family, or colleagues
- **Real Bank Integration** - Connect actual bank accounts via Plaid for real money transfers
- **Role-Based Permissions** - Owner, admin, and member roles with different capabilities
- **Transaction Tracking** - Complete history of deposits, withdrawals, and penalties

### 🏦 **Banking & Security**
- **Plaid Integration** - Secure bank account connectivity
- **Bank-Level Security** - Your credentials are encrypted and never stored
- **Multiple Account Support** - Connect checking, savings, and other account types
- **Instant Transfers** - Move money quickly between accounts and jars
- **Transaction Verification** - Micro-deposit verification for account security

### 🎨 **User Experience**
- **Beautiful Modern UI** - Clean, responsive design with Tailwind CSS
- **Smooth Animations** - Framer Motion powered transitions
- **Mobile Responsive** - Works perfectly on all devices
- **Dark/Light Themes** - Customizable appearance
- **Real-time Updates** - Live balance and transaction updates

### 🔧 **Technical Features**
- **Full-Stack Application** - Node.js backend, React frontend
- **Vercel Deployment** - Optimized for serverless deployment
- **RESTful API** - Well-structured API endpoints
- **JWT Authentication** - Secure user authentication
- **MongoDB Database** - Scalable NoSQL data storage
- **Input Validation** - Server-side and client-side validation
- **Error Handling** - Comprehensive error management

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (for database)
- Plaid Developer Account (for bank integration)
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swearjar
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - A secure random string for JWT tokens
   - `PLAID_CLIENT_ID` - Your Plaid client ID
   - `PLAID_SECRET` - Your Plaid secret key

4. **Start the development servers**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## 🌐 Deploy to Vercel

### One-Click Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/swearjar)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy the application**
   ```bash
   npm run deploy
   ```

4. **Set up environment variables in Vercel**
   
   Go to your Vercel dashboard → Project → Settings → Environment Variables and add:
   
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swearjar
   JWT_SECRET=your-super-secure-jwt-secret
   JWT_EXPIRE=7d
   PLAID_CLIENT_ID=your-plaid-client-id
   PLAID_SECRET=your-plaid-secret
   PLAID_ENV=production
   PLAID_PRODUCTS=transactions,accounts
   PLAID_COUNTRY_CODES=US,CA
   CLIENT_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```

5. **Redeploy after setting environment variables**
   ```bash
   vercel --prod
   ```

### Environment Setup for Production

#### MongoDB Atlas Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Whitelist Vercel's IP addresses (or use 0.0.0.0/0 for all IPs)

#### Plaid Setup
1. Create a Plaid account at https://dashboard.plaid.com/
2. Get your production credentials
3. Set up webhooks pointing to your Vercel URL
4. Configure allowed domains

#### Vercel Configuration
The project includes a `vercel.json` file that:
- Builds the React frontend as a static site
- Runs the backend as serverless functions
- Routes API calls to `/api/*`
- Serves the frontend from the root

## 🏗️ Project Structure

```
swearjar/
├── api/                    # Vercel serverless functions
│   └── index.js           # Main API entry point
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── styles/        # CSS and styling
│   └── public/            # Static assets
├── server/                # Node.js backend (for local dev)
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── middleware/        # Express middleware
│   └── services/          # Business logic services
├── vercel.json            # Vercel configuration
├── .vercelignore          # Files to ignore during deployment
└── package.json           # Root package.json
```

## 🔑 Environment Variables

### Required for Production
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swearjar
JWT_SECRET=your-super-secure-jwt-secret
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=production
CLIENT_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Optional
```env
JWT_EXPIRE=7d
PLAID_PRODUCTS=transactions,accounts
PLAID_COUNTRY_CODES=US,CA
```

## 📖 API Documentation

The API is available at `/api/*` when deployed to Vercel:

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Swear Jar Endpoints
- `GET /api/swear-jars` - Get user's swear jars
- `POST /api/swear-jars` - Create new swear jar
- `GET /api/swear-jars/:id` - Get specific swear jar
- `PUT /api/swear-jars/:id` - Update swear jar
- `DELETE /api/swear-jars/:id` - Delete swear jar
- `POST /api/swear-jars/:id/invite` - Invite user to jar

### Transaction Endpoints
- `GET /api/transactions` - Get transactions
- `POST /api/transactions/deposit` - Create deposit
- `POST /api/transactions/withdrawal` - Create withdrawal
- `POST /api/transactions/penalty` - Apply penalty

### Plaid Integration Endpoints
- `POST /api/plaid/link-token` - Create Plaid link token
- `POST /api/plaid/exchange-token` - Exchange public token
- `GET /api/plaid/accounts` - Get connected accounts
- `POST /api/plaid/accounts/:id/update-balance` - Update account balance

## 🎮 How to Use

### 1. **Create Account**
- Sign up with your email and password
- Access your dashboard

### 2. **Create a Swear Jar**
- Set a name and description
- Choose currency and deposit limits
- Configure penalty amounts for specific words

### 3. **Connect Bank Account**
- Use Plaid to securely connect your bank
- Choose which accounts to link
- Verify with micro-deposits if needed

### 4. **Invite Friends**
- Share jars with friends and family
- Set different permission levels
- Track everyone's contributions

### 5. **Start Using**
- Apply penalties when you swear
- Make deposits manually or automatically
- Watch your balance grow
- Withdraw money when you reach goals

## 🛠️ Development

### Available Scripts

**Root Level:**
- `npm run dev` - Start both client and server in development
- `npm run install-all` - Install dependencies for all packages
- `npm run build` - Build the client for production
- `npm run vercel-build` - Build for Vercel deployment
- `npm run deploy` - Deploy to Vercel

**Server:**
- `npm run dev` - Start server with nodemon
- `npm start` - Start production server

**Client:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Plaid API Integration
- Vercel Serverless Functions

**Frontend:**
- React 18
- React Router DOM
- Tailwind CSS
- Framer Motion
- Axios for API calls

**Deployment:**
- Vercel (Frontend & API)
- MongoDB Atlas (Database)
- Plaid (Banking Integration)

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcryptjs with salt rounds
- **Rate Limiting** - Prevent brute force attacks
- **Input Validation** - Server-side validation with express-validator
- **CORS Protection** - Configured for production domains
- **Helmet Security** - Security headers middleware
- **Plaid Security** - Bank-level encryption for financial data

## 🚀 Production Deployment

### Vercel Features Used
- **Static Site Generation** - React app built and served statically
- **Serverless Functions** - Backend API runs as serverless functions
- **Environment Variables** - Secure configuration management
- **Custom Domains** - Use your own domain
- **Automatic HTTPS** - SSL certificates managed automatically
- **Global CDN** - Fast worldwide content delivery

### Performance Optimizations
- **Code Splitting** - React lazy loading for optimal bundle sizes
- **Tree Shaking** - Unused code elimination
- **Asset Optimization** - Automatic image and file optimization
- **Caching** - Intelligent caching strategies
- **Serverless Cold Start Optimization** - Minimal function initialization time

## 📊 Monitoring & Analytics

### Vercel Analytics
- Real-time performance monitoring
- Core Web Vitals tracking
- Function execution metrics
- Error tracking and logging

### Database Monitoring
- MongoDB Atlas provides built-in monitoring
- Performance insights and optimization suggestions
- Automated backups and point-in-time recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](issues) page for known problems
2. Create a new issue with detailed information
3. Include error logs and steps to reproduce

## 🎯 Future Features

- [ ] Mobile app (React Native)
- [ ] Cryptocurrency integration
- [ ] Social features and leaderboards
- [ ] Advanced analytics and reporting
- [ ] Habit tracking integration
- [ ] Slack/Discord bot integrations
- [ ] Recurring penalty schedules
- [ ] Goal-based jar completion rewards

---

**Made with ❤️ for breaking bad habits with financial incentives!**  
**Deployed on ▲ Vercel** 