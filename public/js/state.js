// state.js — tiny shared app state. No DOM, no fetch; just plain data other
// modules read and mutate.
//
// draft: the quiz currently being BUILT in the create view. `questions` is an
//   editable array of { text, options[], answer } — answer is null until the
//   creator taps one. This shape is the contract future create-view features
//   build on: a swap-dropdown replaces {text,options} for a row, custom-question
//   entry pushes a new row, add/delete/edit options mutate `options` and clamp
//   `answer`. On submit the create view POSTs { creatorName, questions } as-is.
//
// attempt: the friend currently TAKING a quiz. `guesses` is an array of chosen
//   option indexes (or null), one per question, aligned to the fetched quiz.

export const state = {
  draft: {
    creatorName: '',
    questions: [], // [{ text: string, options: string[], answer: number|null }]
  },
  attempt: {
    quizId: null,
    friendName: '',
    guesses: [], // (number|null)[]
  },
};

// Reset the build draft (call when entering the create view).
export function resetDraft() {
  state.draft = { creatorName: '', questions: [] };
  return state.draft;
}

// Reset the take-quiz attempt (call when entering a quiz).
export function resetAttempt(quizId) {
  state.attempt = { quizId: quizId || null, friendName: '', guesses: [] };
  return state.attempt;
}
