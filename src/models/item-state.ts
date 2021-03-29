export const enum ItemState {
  AWAITING_REVIEW = 'AwaitingReview',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export namespace States {
  export interface State {
    state: ItemState;
  }
}
