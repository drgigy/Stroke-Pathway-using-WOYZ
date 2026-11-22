// Review pages intentionally expose no recording, generation or case-editing actions.
export const isReviewPage = document.documentElement.dataset.pageMode === 'review';
