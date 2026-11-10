import Joi from 'joi';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { Review } from '../models/Review.js';

// SECURITY: never trust user-supplied markup. The client sanitizes again before
// rendering, but we also clean the HTML here so the database never stores an
// XSS payload (protects any other client / future page that renders reviews).
// DOMPurify needs a DOM, so on the server we give it one from jsdom.
const DOMPurify = createDOMPurify(new JSDOM('').window);

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i, // no javascript:, data:, vbscript:
  ALLOW_DATA_ATTR: false,
};

const reviewSchema = Joi.object({
  listing: Joi.string().hex().length(24).required(),
  rating: Joi.number().integer().min(1).max(5).default(5),
  // The body is light-formatting HTML (bold, links...). It is sanitized below.
  body: Joi.string().trim().min(1).max(5000).required(),
  // the author is always the logged-in user, never taken from the body
  author: Joi.forbidden()
});

// GET /api/reviews?listing=<id>  (public)
export async function getReviewsForListing(req, res, next) {
  try {
    const { listing } = req.query;
    // Must be a plain 24-char hex id string (blocks ?listing[$ne]=x style injection).
    if (typeof listing !== 'string' || !/^[a-f0-9]{24}$/i.test(listing)) {
      return res.status(400).json({ message: 'A valid listing query param is required' });
    }

    const reviews = await Review.find({ listing })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reviews });
  } catch (err) { next(err); }
}

// POST /api/reviews  (requires auth)
export async function createReview(req, res, next) {
  try {
    const { value, error } = reviewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    // Strip <script>, on* handlers, javascript: links, etc. Keep safe formatting.
    const body = DOMPurify.sanitize(value.body, PURIFY_CONFIG).trim();
    if (!body) return res.status(400).json({ message: 'Review body is empty after removing unsafe content' });

    const doc = await Review.create({ ...value, body, author: req.user.id });
    const review = await Review.findById(doc._id).populate('author', 'name').lean();
    res.status(201).json({ review });
  } catch (err) { next(err); }
}