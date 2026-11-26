/** Shapes Question docs (with videoSolution populated as {published}) for API output. */
function serializeQuestion(q) {
  return {
    id: q._id,
    title: q.title,
    slug: q.slug,
    leetcodeUrl: q.leetcodeUrl,
    number: q.number,
    difficulty: q.difficulty,
    topics: q.topics,
    tags: q.tags,
    description: q.description,
    recommendedMinutes: q.recommendedMinutes,
    featured: q.featured,
    hasVideo: !!(q.videoSolution && q.videoSolution.published),
  };
}

const serializeQuestions = (list) => (list || []).map(serializeQuestion);

module.exports = { serializeQuestion, serializeQuestions };
