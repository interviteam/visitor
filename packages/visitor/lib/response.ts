export type Meta = {
  type: 'title',
  content: string;
} | {
  type: 'meta',
  name: string;
  content: string;
} | {
  type: 'snippet',
  content: string;
};

export type Session = {
  is_authenticated: boolean;
  user: any;
  via_remember: boolean;
  flash: Record<string, any>;
};

export type State = {
  // Redirect URL to perform after partial state update.
  redirect?: string;

  // Request query parameters processed from backend.
  query: Record<string, any>;

  // Session state from server.
  session: Session;

  // Location returned by backend.
  location: string;

  // Path to view component for given page.
  view: string;

  // Shared props updates.
  shared: Record<string, any> | undefined;

  // Props passed to component once it's resolved.
  props: Record<string, any> & {
    meta?: Meta[];
  };

  // Page assets version.
  version: string;
}


export class Response {
  private readonly xhr: XMLHttpRequest;

  constructor(xhr: XMLHttpRequest) {
    this.xhr = xhr;
  }

  public get status() {
    return this.xhr.status;
  }

  public get message() {
    return this.xhr.statusText;
  }

  public get data() {
    return this.xhr.response as State;
  }

  public get redirect() {
    return this.data.redirect;
  }

  public get visitor() {
    return this.success && !!this.xhr.getResponseHeader('x-visitor');
  }

  public get partial() {
    return this.success && !!this.xhr.getResponseHeader('x-partial');
  }

  public get success() {
    return this.status >= 200 && this.status < 300;
  }

  public get failed() {
    return this.status >= 400 && this.status < 600;
  }
}
