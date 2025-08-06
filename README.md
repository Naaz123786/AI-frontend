# 🚀 AI Interview Assistant - Modern Frontend

A beautiful, modern frontend for the AI Interview Assistant with enhanced UX/UI features.

## ✨ New Features

### 🎨 Modern Design
- **Gradient backgrounds** with animated floating elements
- **Glassmorphism effects** for a premium look
- **Smooth animations** and micro-interactions
- **Responsive design** that works on all devices
- **Modern typography** with Inter font family

### 🔥 Enhanced UX
- **Typewriter effect** for AI responses
- **Real-time typing indicators** while processing
- **Keyboard shortcuts** for power users
- **Hover effects** and button animations
- **Status indicators** for live mode
- **Enhanced loading states**

### ⌨️ Keyboard Shortcuts
- **Enter** - Ask AI (from input field)
- **Ctrl/Cmd + Enter** - Ask AI (from anywhere)
- **Ctrl/Cmd + M** - Start voice recording
- **Ctrl/Cmd + L** - Toggle live mode

### 🎯 UI Improvements
- **Larger, more accessible buttons**
- **Better contrast and readability**
- **Smooth transitions** between states
- **Modern card layouts** with backdrop blur
- **Enhanced visual feedback**

## 🛠️ Technical Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Modern CSS animations**
- **Responsive design principles**

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Backend server running on port 8000

### Installation
```bash
# Navigate to frontend directory
cd D:\project\AI\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage
1. Open your browser and go to `http://localhost:3000` (or the port shown in terminal)
2. Type your interview question in the input field
3. Click "Ask AI" or press Enter
4. Use voice features with the "Speak" button
5. Enable "Live Mode" for continuous listening

## 🎨 Design System

### Color Palette
- **Primary**: Indigo gradients (#6366f1 to #4f46e5)
- **Secondary**: Purple gradients (#8b5cf6 to #7c3aed)
- **Accent**: Blue to purple gradients
- **Background**: Soft gradient from indigo to purple

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Fallback**: System font stack for optimal performance
- **Weights**: 300, 400, 500, 600, 700, 800, 900

### Animations
- **Subtle hover effects** on interactive elements
- **Smooth transitions** (300ms duration)
- **Pulse animations** for active states
- **Bounce animations** for feedback
- **Gradient animations** for backgrounds

## 🔧 Customization

### Modifying Colors
Edit the Tailwind config or CSS variables in `globals.css`:
```css
:root {
  --primary-gradient: linear-gradient(135deg, #6366f1, #8b5cf6);
  --secondary-gradient: linear-gradient(135deg, #3b82f6, #6366f1);
}
```

### Adding New Animations
Add custom keyframes in `globals.css`:
```css
@keyframes customAnimation {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

## 📱 Responsive Design

- **Mobile-first approach** with breakpoints
- **Adaptive layouts** for different screen sizes
- **Touch-friendly** button sizes
- **Optimized typography** scaling

## 🔒 Accessibility

- **Keyboard navigation** support
- **Focus indicators** for all interactive elements
- **ARIA labels** for screen readers
- **High contrast** text and backgrounds
- **Responsive font sizes**

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - The app will automatically find an available port
   - Check the terminal output for the correct URL

2. **Backend connection errors**
   - Ensure backend server is running on port 8000
   - Check network connectivity

3. **Voice features not working**
   - Ensure microphone permissions are granted
   - Use HTTPS in production for voice features

### Performance Tips

- Use **Chrome or Firefox** for best performance
- Enable **hardware acceleration** in browser settings
- Clear browser cache if experiencing issues

## 🚀 Future Enhancements

- [ ] Dark mode toggle
- [ ] Multiple language support
- [ ] Voice recognition improvements
- [ ] Analytics dashboard
- [ ] Export conversation history
- [ ] PWA (Progressive Web App) support

## 📄 License

This project is part of the AI Interview Assistant suite. All rights reserved.

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
