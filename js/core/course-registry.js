/**
 * Course registry. A tiny ordered map of course manifests.
 * Each course calls CourseRegistry.register(manifest) at import time from
 * main.js via explicit imports of each course's manifest module.
 */

const courses = new Map();

function validate(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('CourseRegistry.register: manifest must be an object');
  }
  if (!manifest.id || typeof manifest.id !== 'string') {
    throw new Error('CourseRegistry.register: manifest.id (string) is required');
  }
  if (!manifest.title || typeof manifest.title !== 'string') {
    throw new Error('CourseRegistry.register: manifest.title (string) is required');
  }
  if (!Array.isArray(manifest.chapters)) {
    throw new Error('CourseRegistry.register: manifest.chapters (array) is required');
  }
}

export const CourseRegistry = {
  register(manifest) {
    validate(manifest);
    if (courses.has(manifest.id)) {
      throw new Error(`CourseRegistry.register: '${manifest.id}' already registered`);
    }
    courses.set(manifest.id, manifest);
  },

  get(id) {
    return courses.get(id) ?? null;
  },

  has(id) {
    return courses.has(id);
  },

  list() {
    return [...courses.values()];
  },

  clear() {
    courses.clear();
  },
};
