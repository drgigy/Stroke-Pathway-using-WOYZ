// Review pages intentionally expose no recording or generation; protocol fields can be corrected in place.
export const isReviewPage = document.documentElement.dataset.pageMode === 'review';
