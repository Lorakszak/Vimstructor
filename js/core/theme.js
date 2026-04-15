/**
 * Theme switcher. On course activation, loads the course's theme.css via
 * a <link> tag and adds `course-<id>` to <html> so the :root.course-<id>
 * selectors in the theme file take effect. On deactivation, removes both.
 *
 * Verified end-to-end via Playwright MCP in Plan 3.
 */

let currentLink = null;
let currentClass = null;

export function activateCourseTheme(course) {
  deactivateCourseTheme();
  if (!course || !course.themeHref) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = course.themeHref;
  document.head.appendChild(link);
  currentLink = link;

  currentClass = `course-${course.id}`;
  document.documentElement.classList.add(currentClass);
}

export function deactivateCourseTheme() {
  if (currentLink) {
    currentLink.remove();
    currentLink = null;
  }
  if (currentClass) {
    document.documentElement.classList.remove(currentClass);
    currentClass = null;
  }
}
