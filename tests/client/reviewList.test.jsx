import { render } from '@testing-library/react';
import ReviewList from '../../client/src/components/ReviewList';

// A review body a malicious user could submit: it tries to run script that
// reads the JWT out of localStorage (the app stores the token there).
const XSS_BODY =
  'Nice item! ' +
  '<img src=x onerror="window.__xssToken = localStorage.getItem(\'token\')">' +
  '<script>window.__xssRan = true</script>' +
  '<a href="javascript:alert(1)">click me</a>';

function renderReview(body) {
  const reviews = [{ _id: 'r1', rating: 5, author: { name: 'attacker' }, body }];
  return render(<ReviewList reviews={reviews} />);
}

describe('ReviewList renders review HTML safely', () => {
  test('does not render any <script> element from the review body', () => {
    const { container } = renderReview(XSS_BODY);
    expect(container.querySelector('script')).toBeNull();
  });

  test('strips inline event-handler attributes such as onerror', () => {
    const { container } = renderReview(XSS_BODY);
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('[onload]')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();

    const img = container.querySelector('img');
    if (img) expect(img.getAttribute('onerror')).toBeNull();
  });

  test('does not keep javascript: URLs on links', () => {
    const { container } = renderReview(XSS_BODY);
    const link = container.querySelector('a');
    if (link) {
      expect((link.getAttribute('href') || '').toLowerCase()).not.toMatch(/^javascript:/);
    }
  });

  test('still renders the benign review text', () => {
    const { container } = renderReview(XSS_BODY);
    expect(container.textContent).toContain('Nice item!');
  });
});
