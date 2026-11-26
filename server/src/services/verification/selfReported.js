module.exports = {
  method: 'SELF_REPORTED',
  // Trust-based: no external check is performed, and the record says so.
  async verify() {
    return { method: 'SELF_REPORTED', status: 'self_reported' }; // dev/testing only (VERIFICATION_MODE=self)
  },
};
