# Kubernetes Pod Monitoring Dashboard

Modern React + Tailwind CSS dashboard for real-time Kubernetes pod monitoring.

## Features

- 🎨 Modern, clean UI with Tailwind CSS
- 📊 Real-time statistics dashboard
- 🔄 Auto-refresh every 5 seconds
- 📱 Responsive design
- 🎯 Namespace-based pod grouping
- ❌ Error log viewer with modal
- 🟢 Visual status indicators (green for running, red for errors)

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API URL

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## UI Components

### Header
- Project title with gradient
- Live status indicator

### Stats Cards
Display real-time metrics:
- Total Namespaces
- Running Pods (green)
- Error Pods (red)
- Errors Today (yellow)

### Namespace List
- Sidebar with all monitored namespaces
- Click to view pods in that namespace
- Active namespace highlighted

### Pod Dashboard
- Grid layout showing all pods
- Color-coded status indicators:
  - ✅ Green border = Running
  - ❌ Red border = Error
- Error count badges
- Click pod to view detailed errors

### Error Modal
- Full error logs for selected pod
- Error type badges
- Timestamps
- Scrollable log viewer

### Recent Errors
- Real-time error feed
- Shows latest errors across all namespaces
- Pod name and namespace context
- Error type and message preview

## Customization

### Colors

The dashboard uses a dark theme with:
- Background: Gray-900 gradient
- Cards: Gray-800
- Accents: Blue, Green, Red, Yellow

To customize, edit the Tailwind classes in `src/App.jsx`.

### Refresh Interval

To change the auto-refresh interval (default 5 seconds):

```javascript
// In src/App.jsx, find this line:
const interval = setInterval(() => {
  // ...
}, 5000); // Change 5000 to your desired milliseconds
```

## Requirements

- Node.js 18+
- Backend API running on configured URL
- Modern web browser

## Troubleshooting

### API Connection Failed

1. Check if backend is running
2. Verify `VITE_API_URL` in `.env`
3. Check browser console for CORS errors

### Blank Dashboard

1. Make sure backend is running
2. Check if any namespaces exist in database
3. Run the test simulator to create test data

### Styling Issues

1. Clear browser cache
2. Rebuild the project: `npm run build`
3. Check Tailwind CSS is properly installed

