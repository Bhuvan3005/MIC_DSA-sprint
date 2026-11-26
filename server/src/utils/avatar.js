/** Public URL of a user's picture, or null. `version` (a timestamp) busts caches whenever the picture changes. */
const avatarUrl = (id, version) => (version ? `/api/users/${id}/avatar?v=${version}` : null);
module.exports = { avatarUrl };
