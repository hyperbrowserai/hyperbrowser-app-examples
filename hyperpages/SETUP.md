# HyperPages Setup Guide

Follow these steps to get HyperPages running in production.

## 1. Install Dependencies

```bash
npm install
```

## 2. Get API Keys

### Hyperbrowser
1. Visit [https://hyperbrowser.ai](https://hyperbrowser.ai)
2. Sign up for an account
3. Get your API key from the dashboard

### OpenAI (GPT-5-nano)
1. Visit [https://platform.openai.com](https://platform.openai.com)
2. Create an account
3. Generate an API key
4. Make sure you have access to GPT-5-nano model

### Unsplash
1. Visit [https://unsplash.com/developers](https://unsplash.com/developers)
2. Create a new application
3. Get your Access Key

## 3. Configure Environment

Create `.env.local` file:

```env
HYPERBROWSER_API_KEY=your_hyperbrowser_key
OPENAI_API_KEY=your_openai_key
UNSPLASH_ACCESS_KEY=your_unsplash_key
```

**Note**: Pages are stored in browser localStorage. No database setup required!

## 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to test the application.

## 5. Test the Features

### Create a Page
1. Enter a topic (e.g., "Machine Learning Basics")
2. Select audience
3. Watch content generate in real-time
4. Add images to sections

### View Pages
1. Check sidebar for saved pages
2. Click to view published version
3. Test share functionality

## 6. Deploy to Production

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables in Vercel
Go to Project Settings → Environment Variables and add all keys from your `.env.local`.

## 7. Troubleshooting

### Content not generating
- Check OpenAI API key is valid
- Verify Hyperbrowser key has credits
- Check browser console for errors

### Images not loading
- Verify Unsplash API key is active
- Check for API rate limits

### Pages not saving
- Check browser console for localStorage errors
- Verify localStorage is not full (quota exceeded)
- Make sure browser allows localStorage

### Build errors
- Run `npm install` again
- Check Node.js version (18+)
- Clear `.next` folder and rebuild

## Production Checklist

- [ ] All API keys configured
- [ ] Environment variables set in production
- [ ] Test page creation end-to-end
- [ ] Test image upload/generation
- [ ] Test localStorage saving/loading
- [ ] Check mobile responsiveness
- [ ] Monitor API usage and costs

## Need Help?

- Check [Hyperbrowser Docs](https://docs.hyperbrowser.ai)
- Review [Next.js Documentation](https://nextjs.org/docs)

Built with [Hyperbrowser](https://hyperbrowser.ai)

