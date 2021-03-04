export namespace Events {
  export interface CreateRequest {
    eventName: string;
    when: Date;
    info: string;
    contactInfo: string;
  }
}
