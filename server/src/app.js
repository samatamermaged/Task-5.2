import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';

const app = express();

// Security headers. The Content-Security-Policy is the browser-enforced second
// layer of defense: even if malicious markup slipped past the client-side
// DOMPurify sanitizer, the browser refuses to run inline/injected script and
// refuses to send data to attacker-controlled origins.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        // Scripts only from our own origin. No 'unsafe-inline', no 'unsafe-eval'
        // -> <script>...</script> and javascript: URLs are blocked.
        scriptSrc: ["'self'"],
        // Inline event handlers (onerror=, onload=, onclick=) are blocked.
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        // fetch/XHR only to ourselves and the API, so a stolen token can't be
        // sent to https://attacker.example.
        connectSrc: ["'self'", 'http://localhost:4000'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(morgan('dev'));
app.use(cors({ origin: 'http://localhost:5175', credentials: false }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);

// Not found
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

export default app;