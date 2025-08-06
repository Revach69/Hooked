# Hooked Marketing Website

A modern, responsive marketing website for Hooked - the event networking platform that helps people connect at events.

## 🚀 Features

- **Modern Design**: Built with Next.js 15 and TailwindCSS
- **Responsive**: Mobile-first design that works on all devices
- **Fast**: Optimized for performance with Next.js App Router
- **SEO Ready**: Proper meta tags and structured content
- **Accessible**: WCAG compliant design patterns

## 📋 Pages

- **Home** (`/`) - Hero section with CTA and feature highlights
- **About** (`/about`) - Company information, purpose, and team
- **Events** (`/events`) - Showcase upcoming and past events
- **Pricing** (`/pricing`) - Pricing plans and FAQ
- **Privacy** (`/privacy`) - Privacy policy
- **Terms** (`/terms`) - Terms of service
- **Contact** (`/contact`) - Contact form and information

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Deployment**: Vercel
- **Code Quality**: ESLint + Prettier

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/hooked-website.git
   cd hooked-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
hooked-website/
├── src/
│   └── app/
│       ├── layout.tsx          # Root layout with header/footer
│       ├── page.tsx            # Home page
│       ├── about/
│       │   └── page.tsx        # About page
│       ├── events/
│       │   └── page.tsx        # Events page
│       ├── pricing/
│       │   └── page.tsx        # Pricing page
│       ├── privacy/
│       │   └── page.tsx        # Privacy policy
│       ├── terms/
│       │   └── page.tsx        # Terms of service
│       └── contact/
│           └── page.tsx        # Contact page
├── public/                     # Static assets
├── package.json
├── tailwind.config.js
└── README.md
```

## 🎨 Customization

### Styling

The website uses TailwindCSS for styling. Key customization points:

- **Colors**: Update the color scheme in `tailwind.config.js`
- **Typography**: Modify font settings in `src/app/layout.tsx`
- **Components**: Each page component can be customized independently

### Content

- **Text Content**: Update content directly in the page components
- **Images**: Replace placeholder images in the `public/` directory
- **Contact Information**: Update contact details in `src/app/contact/page.tsx`

### Adding New Pages

1. Create a new directory in `src/app/`
2. Add a `page.tsx` file
3. Update navigation in `src/app/layout.tsx`

Example:
```bash
mkdir src/app/blog
touch src/app/blog/page.tsx
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Vercel will automatically detect Next.js and deploy

2. **Environment Variables** (if needed)
   - Add any environment variables in Vercel dashboard
   - Update `.env.local` for local development

3. **Custom Domain**
   - Add your custom domain in Vercel dashboard
   - Update DNS settings to point to Vercel

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality

- **ESLint**: Configured for Next.js and TypeScript
- **Prettier**: Automatic code formatting
- **TypeScript**: Full type safety

### Best Practices

1. **Component Structure**: Use functional components with TypeScript
2. **Styling**: Use TailwindCSS classes, avoid custom CSS
3. **Performance**: Optimize images and use Next.js Image component
4. **Accessibility**: Follow WCAG guidelines
5. **SEO**: Use proper meta tags and semantic HTML

## 📱 Responsive Design

The website is built with a mobile-first approach:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🔍 SEO

- Meta tags configured in each page
- Semantic HTML structure
- Open Graph tags for social sharing
- Structured data ready for implementation

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Build errors**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

3. **TypeScript errors**
   ```bash
   # Check TypeScript
   npx tsc --noEmit
   ```

## 📞 Support

For questions or issues:

- **Email**: hello@hooked-app.com
- **Documentation**: [Next.js Docs](https://nextjs.org/docs)
- **TailwindCSS**: [TailwindCSS Docs](https://tailwindcss.com/docs)

## 📄 License

This project is proprietary to Hooked. All rights reserved.

---

**Built with ❤️ by the Hooked team**
